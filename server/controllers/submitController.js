// server/controllers/submitController.js
const Submission = require("../models/Submission");
const Token = require("../models/Token");
const TokenHistory = require("../models/TokenHistory");
const { TOKEN, SUBMISSION, FEEDBACK } = require("../config");
const axios = require("axios");
const WritingStreak = require("../models/WritingStreak");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

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

// AI 평가 함수 추가
const evaluateSubmission = async (text, mode) => {
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
            content: AI.PROMPT_TEMPLATE[mode](text, ""),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://edu-ocean.com",
          "Content-Type": "application/json",
        },
      }
    );

    const evaluation = response.data.choices[0].message.content;
    try {
      const parsed = JSON.parse(evaluation);
      return {
        score: parsed.overall_score, // overall_score를 score로 사용
        feedback: JSON.stringify(parsed, null, 2),
      };
    } catch (parseError) {
      logger.error("AI 응답 파싱 오류:", parseError);
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

  try {
    const now = new Date();
    const today = now.toDateString();
    const tokenField = mode === "mode_1000" ? "tokens_1000" : "tokens_300";
    let streak = null;

    // 토큰 처리
    let userToken = await Token.findOne({ uid: user.uid });
    if (!userToken) {
      userToken = await Token.create({
        uid: user.uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.DAILY_LIMIT_1000,
        bonusTokens: 0,
        lastRefreshed: now,
      });
    }

    // 토큰 리셋 체크
    if (userToken.lastRefreshed?.toDateString() !== today) {
      userToken.tokens_300 = TOKEN.DAILY_LIMIT_300;
      userToken.tokens_1000 = TOKEN.DAILY_LIMIT_1000;
      userToken.lastRefreshed = now;
    }

    // 토큰 체크
    if (userToken[tokenField] <= 0) {
      return res
        .status(403)
        .json({ message: "오늘의 토큰이 모두 소진되었습니다." });
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
    await submission.save();

    // AI 평가 실행
    const { score, feedback } = await evaluateSubmission(text, mode);
    submission.score = score;
    submission.aiFeedback = feedback;
    await submission.save();

    // ✅ 모든 모드에서 피드백 미션 생성
    const candidates = await Submission.find({
      "user.uid": { $ne: user.uid },
      mode, // 같은 모드의 글만 타겟팅
    });

    const shuffled = candidates
      .sort(() => 0.5 - Math.random())
      .slice(0, FEEDBACK.PER_SUBMISSION);

    const missions = shuffled.map((target) => ({
      fromUid: user.uid,
      toSubmissionId: target._id,
      userUid: user.uid,
    }));


    // 토큰 차감
    userToken[tokenField] -= 1;
    await userToken.save();

    // 스트릭 처리
    const dayOfWeek = now.getDay();

    // 월-금요일인 경우에만 처리
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      try {
        streak = await WritingStreak.findOne({ uid: user.uid });

        // streak가 없으면 새로 생성
        if (!streak) {
          streak = new WritingStreak({
            uid: user.uid,
            weeklyProgress: Array(5).fill(false),
            celebrationShown: false,
            lastStreakCompletion: null,
            currentWeekStartDate: new Date(),
          });
        }

        // 새로운 주 시작 체크
        if (streak.shouldStartNewWeek()) {
          streak.weeklyProgress = Array(5).fill(false);
          streak.celebrationShown = false;
          streak.currentWeekStartDate = new Date();
        }

        // 해당 요일 업데이트
        const dayIndex = dayOfWeek - 1;
        if (!streak.weeklyProgress[dayIndex]) {
          streak.weeklyProgress[dayIndex] = true;

          // 모든 날짜가 완료되었는지 체크
          const allDaysCompleted = streak.weeklyProgress.every((day) => day);
          if (allDaysCompleted && !streak.celebrationShown) {
            // Token 모델의 bonusTokens 업데이트
            const userToken = await Token.findOne({ uid: user.uid });
            if (userToken) {
              userToken.bonusTokens =
                (userToken.bonusTokens || 0) + TOKEN.STREAK_BONUS;
              await userToken.save();
            }

            streak.celebrationShown = true;
            streak.lastStreakCompletion = now;
          }

          await streak.save();
        } else {
        }
      } catch (error) {
        console.error("❌ Streak 업데이트 중 오류:", error);
      }
    }

    // 응답
    return res.status(200).json({
      success: true,
      data: {
        submissionId: submission._id,
        tokens: userToken[tokenField],
        bonusTokens: userToken.bonusTokens,
        streak: streak
          ? {
              progress: streak.weeklyProgress,
              completed: streak.weeklyProgress.every((day) => day),
              shouldShowCelebration:
                streak.weeklyProgress.every((day) => day) &&
                !streak.celebrationShown,
            }
          : {
              progress: Array(5).fill(false),
              completed: false,
              shouldShowCelebration: false,
            },
      },
    });
  } catch (error) {
    logger.error("❌ 서버 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const handleStreakCompletion = async (user, streak, userToken) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 보너스 토큰 지급 및 기록
    userToken.bonusTokens += TOKEN.STREAK_BONUS;
    await userToken.save({ session });

    // 스트릭 상태 업데이트
    streak.celebrationShown = true;
    streak.lastStreakCompletion = new Date();
    await streak.save({ session });

    // 히스토리 기록
    await TokenHistory.create(
      [
        {
          uid: user.uid,
          type: "STREAK_BONUS",
          amount: TOKEN.STREAK_BONUS,
          timestamp: new Date(),
        },
      ],
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
