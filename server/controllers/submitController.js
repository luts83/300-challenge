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

// 1. 빈 피드백 체크 함수 추가
function isEmptyFeedback(feedbackObj) {
  return (
    feedbackObj &&
    feedbackObj.overall_score === 0 &&
    Object.keys(feedbackObj.criteria_scores || {}).length === 0 &&
    (!feedbackObj.strengths || feedbackObj.strengths.length === 0) &&
    (!feedbackObj.improvements || feedbackObj.improvements.length === 0) &&
    !feedbackObj.writing_tips
  );
}

// AI 평가 함수 수정
const evaluateSubmission = async (text, mode, topic, retryCount = 2) => {
  const { AI } = require("../config");

  try {
    logger.debug("AI 평가 시작:", {
      mode,
      textLength: text.length,
      retryCount,
    });

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
          "HTTP-Referer": "https://dwriting.ai",
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30초 타임아웃
      }
    );

    // 응답 로깅
    logger.debug("AI 응답 받음:", response.data);

    const evaluation = response.data.choices[0].message.content;

    // AI 응답 로깅
    logger.debug("원본 AI 응답:", evaluation);

    // 응답 정제 - 수정된 버전
    let cleaned = evaluation
      .replace(/```json|```/g, "") // 코드 블록 제거
      .replace(/```/g, "") // 남은 백틱 제거
      .replace(/\\n/g, " ") // 이스케이프된 줄바꿈
      .replace(/\n/g, " ") // 실제 줄바꿈
      .replace(/[<>]/g, "") // HTML 태그 제거
      .replace(/\s+/g, " ") // 연속된 공백
      .replace(/\r/g, " ") // 캐리지리턴
      .replace(/\t/g, " ") // 탭
      .trim();

    // 2. 잘못된 작은따옴표(') → 쌍따옴표(")로 변환 (AI가 key에 '를 쓸 때)
    cleaned = cleaned.replace(/'(\w+)':/g, '"$1":');

    // 3. JSON key에만 쌍따옴표가 없을 때 보정 (key: → "key":)
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    // 4. 문자열 내부 쌍따옴표 이스케이프 (value만)
    const escapeInnerQuotes = (jsonStr) => {
      return jsonStr.replace(/: "((?:[^"\\]|\\.)*)"/g, (match, p1) => {
        // value 내 쌍따옴표를 모두 이스케이프
        const escaped = p1.replace(/"/g, '\\"');
        return `: "${escaped}"`;
      });
    };
    cleaned = escapeInnerQuotes(cleaned);

    // 5. 마지막 쉼표(,) 제거 (AI가 배열/객체 끝에 ,를 남기는 경우)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    // 6. 백슬래시가 2개 이상 연속될 때 1개로 줄이기
    cleaned = cleaned.replace(/\\\\+/g, "\\");

    // 7. JSON 전체가 문자열로 감싸져 있을 때(따옴표로 시작/끝) 제거
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }

    // 8. 기타: 잘못된 null, undefined, NaN 등 문자열로 변환
    cleaned = cleaned.replace(/: (null|undefined|NaN)/g, ': ""');

    // 9. (선택) 한글 key/value만 남기고 나머지 특수문자 제거 (필요시)
    // cleaned = cleaned.replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s.,:;'"{}\[\]_\-]/g, "");

    // 10. (선택) JSON이 아닌 경우 fallback
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // fallback: 중괄호만 추출해서 다시 시도
      const match = cleaned.match(/{[\s\S]+}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          // 마지막 fallback: 에러 메시지와 원본 저장
          parsed = { error: "AI 응답 파싱 실패", raw: evaluation };
        }
      } else {
        parsed = { error: "AI 응답 파싱 실패", raw: evaluation };
      }
    }

    // 정제된 응답 로깅
    logger.debug("정제된 AI 응답:", cleaned);

    try {
      const validatedFeedback = {
        overall_score: Number(parsed.overall_score) || 0,
        criteria_scores: parsed.criteria_scores || {},
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements
          : [],
        writing_tips: parsed.writing_tips || "",
      };

      // writing_tips 처리
      if (parsed.writing_tips) {
        if (typeof parsed.writing_tips === "string") {
          validatedFeedback.writing_tips = parsed.writing_tips;
        } else if (typeof parsed.writing_tips === "object") {
          validatedFeedback.writing_tips = Object.entries(parsed.writing_tips)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
        }
      }

      // criteria_scores 검증
      Object.keys(validatedFeedback.criteria_scores).forEach((key) => {
        const criteria = validatedFeedback.criteria_scores[key];
        if (typeof criteria !== "object") {
          validatedFeedback.criteria_scores[key] = {
            score: 0,
            feedback: "평가 정보가 없습니다.",
          };
        } else {
          validatedFeedback.criteria_scores[key] = {
            score: Number(criteria.score) || 0,
            feedback: String(criteria.feedback || "평가 정보가 없습니다."),
          };
        }
      });

      // 3. 빈 피드백이면 리트라이 (최대 2회)
      if (isEmptyFeedback(validatedFeedback) && retryCount > 0) {
        logger.warn(
          `[AI 평가] 빈 피드백 감지, 재시도 남은 횟수: ${retryCount}.`,
          { validatedFeedback }
        );
        await new Promise((res) => setTimeout(res, 1000));
        return await evaluateSubmission(text, mode, topic, retryCount - 1);
      }

      return {
        score: validatedFeedback.overall_score,
        feedback: JSON.stringify(validatedFeedback),
      };
    } catch (parseError) {
      logger.error("AI 응답 파싱 오류:", {
        error: parseError.message,
        errorStack: parseError.stack,
        original: evaluation,
        cleaned: cleaned,
        text: text,
        mode: mode,
        topic: topic,
      });
      throw new Error("AI 응답 파싱에 실패했습니다.");
    }
  } catch (error) {
    logger.error("AI 평가 오류:", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      text: text.substring(0, 100) + "...",
      mode,
      topic,
    });

    const errorFeedback = {
      overall_score: 0,
      criteria_scores: {},
      strengths: [],
      improvements: [],
      writing_tips: `AI 평가 중 오류가 발생했습니다: ${error.message}`,
    };

    return {
      score: 0,
      feedback: JSON.stringify(errorFeedback),
    };
  }
};

const handleSubmit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { text, title, topic, user, mode, sessionCount, duration } = req.body;

    // 제출 시점 로깅 추가
    console.log("\n📝 새로운 글 제출:", {
      작성자: user.displayName,
      이메일: user.email,
      제목: title,
      모드: mode,
      글자수: text.length,
      시간: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });

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
        {
          session,
          user: {
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
          },
        }
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
        {
          session,
          user: {
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
          },
        }
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

    // AI 평가 실행
    const { score, feedback } = await evaluateSubmission(text, mode, topic);

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
      score,
      aiFeedback: feedback, // JSON 문자열로 저장
    });
    await submission.save({ session });

    // 저장 성공 로깅
    console.log("✅ 글 저장 완료:", {
      작성자: user.displayName,
      제목: title,
      모드: mode,
      글자수: text.length,
      시간: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });

    // 토큰 차감 (공통 로직)
    userToken[tokenField] -= 1;
    await handleTokenChange(
      user.uid,
      {
        type: "WRITING_USE",
        amount: -1,
        mode,
        timestamp: now,
      },
      {
        session,
        user: {
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
        },
      }
    );

    // 콘솔 로그 추가
    console.log(
      `[토큰차감] ${user.userName || user.displayName || user.email} (${
        user.uid
      }) | ${now.toISOString()} | ${mode} | 남은 토큰: ${userToken[tokenField]}`
    );

    // 1000자 모드 글 작성 시 황금열쇠만 지급
    if (mode === "mode_1000") {
      console.log(`[황금열쇠 지급 시작] 유저: ${user.uid}`);
      console.log("현재 황금열쇠 개수:", userToken.goldenKeys);

      try {
        // 황금열쇠 지급
        userToken.goldenKeys += TOKEN.GOLDEN_KEY;

        // 토큰 히스토리 업데이트
        await handleTokenChange(
          user.uid,
          {
            type: "GOLDEN_KEY",
            amount: TOKEN.GOLDEN_KEY,
            mode: "mode_1000",
            timestamp: now,
          },
          {
            session,
            user: {
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
            },
          }
        );

        console.log("[황금열쇠 지급 완료]", {
          userId: user.uid,
          previousGoldenKeys: userToken.goldenKeys - TOKEN.GOLDEN_KEY,
          currentGoldenKeys: userToken.goldenKeys,
          givenAmount: TOKEN.GOLDEN_KEY,
          timestamp: now,
        });
      } catch (error) {
        console.error("[황금열쇠 지급 실패]", {
          userId: user.uid,
          error: error.message,
          timestamp: now,
        });
        throw error;
      }
    }

    // 스트릭 처리 - 수정된 부분
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      try {
        streak = await WritingStreak.findOne({ uid: user.uid });

        if (!streak) {
          streak = new WritingStreak({
            uid: user.uid,
            user: {
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
            },
            weeklyProgress: Array(5).fill(false),
            celebrationShown: false,
            lastStreakCompletion: null,
            currentWeekStartDate: monday,
          });
        }

        // 새로운 주 시작 체크
        if (streak.shouldStartNewWeek()) {
          // 이전 주 기록을 히스토리에 저장
          if (streak.weeklyProgress?.some((day) => day)) {
            const wasCompleted = streak.weeklyProgress.every((day) => day);
            streak.streakHistory.push({
              weekStartDate: streak.currentWeekStartDate,
              completed: wasCompleted,
              completionDate: wasCompleted ? streak.lastStreakCompletion : null,
            });
          }

          // 새로운 주 시작
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
              {
                session,
                user: {
                  email: user.email,
                  displayName: user.displayName || user.email.split("@")[0],
                },
              }
            );

            // 스트릭 완료 기록
            streak.celebrationShown = true;
            streak.lastStreakCompletion = now;

            // 이번 주 완료를 히스토리에 추가
            streak.streakHistory.push({
              weekStartDate: streak.currentWeekStartDate,
              completed: true,
              completionDate: now,
            });

            console.log("스트릭 완료 기록:", {
              uid: user.uid,
              weekStartDate: streak.currentWeekStartDate,
              completionDate: now,
            });
          }

          await streak.save({ session });
        }
      } catch (error) {
        console.error("❌ Streak 업데이트 중 오류:", error);
        throw error;
      }
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
    console.error("❌ 제출 처리 오류:", {
      작성자: user.displayName,
      제목: title,
      모드: mode,
      오류: error.message,
      시간: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    });
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
      {
        session,
        user: {
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
        },
      }
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
