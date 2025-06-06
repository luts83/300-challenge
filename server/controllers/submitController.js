// server/controllers/submitController.js
const Submission = require("../models/Submission");
const Token = require("../models/Token");
const { TOKEN, SUBMISSION, FEEDBACK } = require("../config");
const axios = require("axios");
const WritingStreak = require("../models/WritingStreak");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { handleTokenChange } = require("../utils/tokenHistory");

// 1. 먼저 함수 정의를 파일 상단에 추가
const checkFirstSubmissionOfDay = async (uid) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaySubmission = await Submission.findOne({
    "user.uid": uid,
    submissionDate: {
      $gte: todayStart.toISOString().slice(0, 10),
      $lte: todayEnd.toISOString().slice(0, 10),
    },
  });

  return todaySubmission;
};

// feedbackUnlocked 필드 업데이트
const unlockFeedback = async (req, res) => {
  const { id } = req.params;
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ message: "사용자 정보가 필요합니다." });
  }

  try {
    const updated = await Submission.findOneAndUpdate(
      { _id: id, "user.uid": uid },
      { feedbackUnlocked: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "해당 글을 찾을 수 없습니다." });
    }

    return res.status(200).json({ message: "피드백 열람이 해제되었습니다." });
  } catch (error) {
    logger.error("❌ feedbackUnlocked 업데이트 오류:", error);
    return res.status(500).json({ message: "서버 오류입니다." });
  }
};

// AI 평가 함수 수정
const evaluateSubmission = async (text, mode, topic) => {
  const { AI } = require("../config");

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI.MODEL,
        messages: [
          {
            role: "system",
            content: AI.SYSTEM_MESSAGE,
          },
          {
            role: "user",
            content: AI.PROMPT_TEMPLATE[mode](text, topic),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://www.dwriting.com",
          "Content-Type": "application/json",
        },
      }
    );

    const evaluation = response.data.choices[0].message.content;

    // 응답 로깅 추가
    logger.debug("AI 응답:", evaluation);

    // 응답 정제
    const cleaned = evaluation
      .replace(/```json|```/g, "") // 마크다운 코드 블록 제거
      .replace(/[<>]/g, "") // 꺾쇠 괄호 제거
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        score: parsed.overall_score,
        feedback: JSON.stringify(parsed, null, 2),
      };
    } catch (parseError) {
      logger.error("AI 응답 파싱 오류:", {
        error: parseError,
        original: evaluation,
        cleaned: cleaned,
      });
      return {
        score: null,
        feedback: "AI 응답을 처리하는 중 오류가 발생했습니다.",
      };
    }
  } catch (error) {
    logger.error("AI 평가 오류:", error);
    let errorMessage = "평가 중 오류가 발생했습니다.";
    if (error.code === "ENOTFOUND") {
      errorMessage =
        "API 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.";
    } else if (error.response?.status === 401) {
      errorMessage = "API 인증 오류가 발생했습니다.";
    } else if (error.response?.status === 429) {
      errorMessage = "API 요청 한도를 초과했습니다.";
    }
    return { score: null, feedback: errorMessage };
  }
};

const handleSubmit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { text, title, topic, user, mode, sessionCount, duration } = req.body;

    if (!text || !title || !user || !user.uid || !user.email || !mode) {
      return res.status(400).json({
        message: "유효하지 않은 요청입니다.",
        details: {
          text: !text,
          title: !title,
          user: !user,
          mode: !mode,
        },
      });
    }

    if (!["mode_300", "mode_1000"].includes(mode)) {
      return res.status(400).json({ message: "유효하지 않은 mode입니다." });
    }

    if (title.length > SUBMISSION.TITLE.MAX_LENGTH) {
      return res.status(400).json({
        message: `제목은 ${SUBMISSION.TITLE.MAX_LENGTH}자 이하로 작성해주세요.`,
      });
    }

    const MIN_LENGTH = SUBMISSION[mode.toUpperCase()].MIN_LENGTH;
    const MAX_LENGTH = SUBMISSION[mode.toUpperCase()].MAX_LENGTH;

    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
      return res.status(400).json({
        message: `글자 수는 ${MIN_LENGTH}자 이상, ${MAX_LENGTH}자 이하로 작성해주세요.`,
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    let streak = null;

    // 토큰 처리
    let userToken = await Token.findOne({ uid: user.uid });
    if (!userToken) {
      userToken = await Token.create({
        uid: user.uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.WEEKLY_LIMIT_1000,
        goldenKeys: 0,
        lastRefreshed: now,
        lastWeeklyRefreshed: new Date(),
      });
    }

    // 토큰 리셋 체크 - 수정된 부분
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (userToken.lastRefreshed < today) {
      userToken.tokens_300 = TOKEN.DAILY_LIMIT_300;
      userToken.lastRefreshed = now;
      await handleTokenChange(
        user.uid,
        {
          type: "DAILY_RESET",
          amount: TOKEN.DAILY_LIMIT_300,
          mode: "mode_300",
          timestamp: now,
        },
        { session }
      );
    }

    // 주간 토큰 리셋 체크 - 수정된 부분
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    if (userToken.lastWeeklyRefreshed < monday) {
      userToken.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
      userToken.lastWeeklyRefreshed = monday;
      await handleTokenChange(
        user.uid,
        {
          type: "WEEKLY_RESET",
          amount: TOKEN.WEEKLY_LIMIT_1000,
          mode: "mode_1000",
          timestamp: now,
        },
        { session }
      );
    }

    // 토큰 체크
    const tokenField = mode === "mode_1000" ? "tokens_1000" : "tokens_300";
    if (userToken[tokenField] <= 0) {
      return res.status(403).json({
        message:
          mode === "mode_1000"
            ? "이번 주 토큰이 모두 소진되었습니다."
            : "오늘의 토큰이 모두 소진되었습니다.",
      });
    }

    // 제출물 저장
    const submission = new Submission({
      text,
      title,
      topic,
      user,
      mode,
      sessionCount,
      duration,
      submissionDate: now.toISOString().slice(0, 10),
    });
    await submission.save({ session });

    // AI 평가 실행
    const { score, feedback } = await evaluateSubmission(text, mode, topic);
    submission.score = score;
    submission.aiFeedback = feedback;
    await submission.save({ session });

    // 토큰 차감
    userToken[tokenField] -= 1;
    await handleTokenChange(
      user.uid,
      {
        type: "WRITING_USE",
        amount: -1,
        mode,
        timestamp: now,
      },
      { session }
    );

    // 스트릭 처리 - 수정된 부분
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      try {
        streak = await WritingStreak.findOne({ uid: user.uid });

        if (!streak) {
          streak = new WritingStreak({
            uid: user.uid,
            weeklyProgress: Array(5).fill(false),
            celebrationShown: false,
            lastStreakCompletion: null,
            currentWeekStartDate: monday, // 이번 주 월요일로 설정
          });
        }

        // 새로운 주 시작 체크
        if (streak.shouldStartNewWeek()) {
          streak.weeklyProgress = Array(5).fill(false);
          streak.celebrationShown = false;
          streak.currentWeekStartDate = monday;
        }

        const dayIndex = dayOfWeek - 1;
        if (!streak.weeklyProgress[dayIndex]) {
          streak.weeklyProgress[dayIndex] = true;

          const allDaysCompleted = streak.weeklyProgress.every((day) => day);
          if (allDaysCompleted && !streak.celebrationShown) {
            // 황금열쇠 지급
            userToken.goldenKeys += TOKEN.GOLDEN_KEY;
            await handleTokenChange(
              user.uid,
              {
                type: "GOLDEN_KEY",
                amount: TOKEN.GOLDEN_KEY,
                mode: "streak_completion",
                timestamp: now,
              },
              { session }
            );

            streak.celebrationShown = true;
            streak.lastStreakCompletion = now;
          }

          await streak.save({ session });
        }
      } catch (error) {
        console.error("❌ Streak 업데이트 중 오류:", error);
        throw error;
      }
    }

    // 1000자 모드 글 작성 시 황금열쇠 지급
    if (mode === "mode_1000") {
      userToken.goldenKeys += TOKEN.GOLDEN_KEY;
      await handleTokenChange(
        user.uid,
        {
          type: "GOLDEN_KEY",
          amount: TOKEN.GOLDEN_KEY,
          mode: "mode_1000",
          timestamp: now,
        },
        { session }
      );
    }

    await userToken.save({ session });
    await session.commitTransaction();

    // 응답 수정 - streak 상태를 더 명확하게 전달
    return res.status(200).json({
      success: true,
      data: {
        submissionId: submission._id,
        tokens: userToken[tokenField],
        goldenKeys: userToken.goldenKeys,
        streak: streak
          ? {
              progress: streak.weeklyProgress,
              completed: streak.weeklyProgress.every((day) => day),
              shouldShowCelebration:
                streak.weeklyProgress.every((day) => day) &&
                !streak.celebrationShown,
              currentWeekStartDate: streak.currentWeekStartDate,
              lastStreakCompletion: streak.lastStreakCompletion,
            }
          : {
              progress: Array(5).fill(false),
              completed: false,
              shouldShowCelebration: false,
              currentWeekStartDate: monday,
              lastStreakCompletion: null,
            },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ 서버 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

const handleStreakCompletion = async (user, streak, userToken) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 황금열쇠 지급 및 기록
    userToken.goldenKeys += TOKEN.GOLDEN_KEY;
    await userToken.save({ session });

    // 스트릭 상태 업데이트
    streak.celebrationShown = true;
    streak.lastStreakCompletion = new Date();
    await streak.save({ session });

    // 히스토리 기록
    await handleTokenChange(
      user.uid,
      {
        type: "GOLDEN_KEY",
        amount: TOKEN.GOLDEN_KEY,
        mode: "streak_completion",
        timestamp: new Date(),
      },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// 새로운 주인지 확인하는 헬퍼 함수
function isNewWeek(lastDate, currentDate) {
  const lastMonday = new Date(lastDate);
  lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() - 1));

  const currentMonday = new Date(currentDate);
  currentMonday.setDate(currentMonday.getDate() - (currentMonday.getDay() - 1));

  return lastMonday.getTime() < currentMonday.getTime();
}

// 전역 에러 핸들러 추가
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Promise Rejection:", error);
});

// 에러 응답 표준화
const handleError = (res, error) => {
  logger.error("서버 오류:", error);
  return res.status(500).json({
    message: "서버 오류가 발생했습니다.",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

module.exports = {
  handleSubmit,
  unlockFeedback, // 이 줄 추가!
};
