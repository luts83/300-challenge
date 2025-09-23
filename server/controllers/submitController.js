// server/controllers/submitController.js
const Submission = require("../models/Submission");
const Token = require("../models/Token");
const { TOKEN, SUBMISSION, FEEDBACK } = require("../config");
const axios = require("axios");
const WritingStreak = require("../models/WritingStreak");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { handleTokenChange } = require("../utils/tokenHistory");
const {
  checkEmailAccess,
  detectNonWhitelistedUserActivity,
} = require("../controllers/userController");
const User = require("../models/User");
const userProfileService = require("../services/userProfileService");
const {
  generatePersonalizedPrompt,
} = require("../prompts/personalizedEvaluationPrompts");
const { calculateWeightedScore } = require("../utils/responseFormatter");

/**
 * UTC 오프셋을 기반으로 대략적인 위치 정보를 반환
 * @param {number} offsetHours - UTC 기준 시간 차이 (시간 단위)
 * @returns {string} 위치 정보
 */
const getLocationByOffset = (offsetHours) => {
  const locationMap = {
    "-12": "🇺🇸 하와이",
    "-11": "🇺🇸 알래스카",
    "-10": "🇺🇸 하와이",
    "-9": "🇺🇸 알래스카",
    "-8": "🇺🇸 로스앤젤레스",
    "-7": "🇺🇸 덴버",
    "-6": "🇺🇸 시카고",
    "-5": "🇺🇸 뉴욕",
    "-4": "🇺🇸 뉴욕 (서머타임)",
    "-3": "🇧🇷 상파울루",
    "-2": "🇧🇷 상파울루 (서머타임)",
    "-1": "🇵🇹 아조레스",
    0: "🇬🇧 런던",
    1: "🇬🇧 런던 (서머타임) / 🇫🇷 파리 / 🇩🇪 베를린",
    2: "🇺🇦 키예프 / 🇹🇷 이스탄불",
    3: "🇷🇺 모스크바",
    4: "🇷🇺 모스크바 (서머타임)",
    5: "🇮🇳 뭄바이",
    5.5: "🇮🇳 뭄바이",
    6: "🇰🇿 알마티",
    7: "🇹🇭 방콕",
    8: "🇨🇳 베이징 / 🇭🇰 홍콩",
    9: "🇰🇷 서울 / 🇯🇵 도쿄",
    10: "🇦🇺 시드니",
    11: "🇦🇺 시드니 (서머타임)",
    12: "🇳🇿 오클랜드",
    13: "🇳🇿 오클랜드 (서머타임)",
  };

  // 가장 가까운 오프셋 찾기
  const closestOffset = Object.keys(locationMap).reduce((prev, curr) => {
    return Math.abs(curr - offsetHours) < Math.abs(prev - offsetHours)
      ? curr
      : prev;
  });

  return locationMap[closestOffset] || `알 수 없는 지역`;
};

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

// AI 평가 함수 수정 (개인화 지원)
const evaluateSubmission = async (
  text,
  title,
  mode,
  topic,
  userId,
  retryCount = 2
) => {
  const { AI } = require("../config");

  try {
    logger.debug("AI 평가 시작:", {
      mode,
      textLength: text.length,
      titleLength: title.length,
      userId,
      retryCount,
    });

    // 개인화된 프롬프트 생성
    const personalizedPrompt = await generatePersonalizedPrompt(
      userId,
      text,
      title,
      mode,
      topic
    );

    let response;
    try {
      response = await axios.post(
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
              content: personalizedPrompt,
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
    } catch (axiosError) {
      logger.error("❌ AI API 요청 실패:", {
        error: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        text,
        title,
        mode,
        topic,
        userId,
      });

      if (retryCount > 0) {
        logger.warn(
          `[AI 평가] API 요청 실패, 재시도 남은 횟수: ${retryCount}.`
        );
        await new Promise((res) => setTimeout(res, 2000)); // 재시도 간격 증가
        return await evaluateSubmission(
          text,
          title,
          mode,
          topic,
          userId,
          retryCount - 1
        );
      }

      throw new Error(`AI API 요청 실패: ${axiosError.message}`);
    }

    // AI 응답 구조 검증
    if (
      !response.data ||
      !response.data.choices ||
      !response.data.choices[0] ||
      !response.data.choices[0].message
    ) {
      logger.error("❌ AI 응답 구조 오류:", {
        responseData: response.data,
        status: response.status,
        statusText: response.statusText,
      });

      if (retryCount > 0) {
        logger.warn(
          `[AI 평가] 응답 구조 오류, 재시도 남은 횟수: ${retryCount}.`
        );
        await new Promise((res) => setTimeout(res, 1000));
        return await evaluateSubmission(
          text,
          title,
          mode,
          topic,
          userId,
          retryCount - 1
        );
      }

      throw new Error("AI 응답 구조가 올바르지 않습니다.");
    }

    const evaluation = response.data.choices[0].message.content;
    logger.debug("원본 AI 응답:", evaluation);

    // 더 강화된 응답 정제 (마크다운 코드 블록 완전 제거)
    let cleaned = evaluation
      .replace(/```json\s*/gi, "") // ```json 제거
      .replace(/```\s*/g, "") // ``` 제거
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\r/g, " ")
      .replace(/\t/g, " ")
      .trim();

    // JSON 시작과 끝 부분 정리
    cleaned = cleaned.replace(/^[^{]*/, ""); // { 이전의 모든 문자 제거
    cleaned = cleaned.replace(/[^}]*$/, ""); // } 이후의 모든 문자 제거

    // JSON 파싱 시도
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      logger.error("❌ JSON 파싱 실패:", {
        error: e.message,
        cleaned: cleaned.substring(0, 500) + "...", // 로그 길이 제한
        originalEvaluation: evaluation.substring(0, 500) + "...",
        text: text.substring(0, 100) + "...",
        title,
        mode,
        topic,
      });

      // 파싱 실패 시 재시도
      if (retryCount > 0) {
        logger.warn(`[AI 평가] 파싱 오류, 재시도 남은 횟수: ${retryCount}.`);
        await new Promise((res) => setTimeout(res, 2000));
        return await evaluateSubmission(
          text,
          title,
          mode,
          topic,
          userId,
          retryCount - 1
        );
      }

      // 재시도 횟수 소진 시 기본 피드백 반환
      logger.error("❌ JSON 파싱 재시도 실패, 기본 피드백 반환");
      return {
        score: 50,
        feedback: JSON.stringify({
          overall_score: 50,
          criteria_scores: {
            content: { score: 50, feedback: "AI 평가 중 오류가 발생했습니다." },
            expression: {
              score: 50,
              feedback: "AI 평가 중 오류가 발생했습니다.",
            },
            structure: {
              score: 50,
              feedback: "AI 평가 중 오류가 발생했습니다.",
            },
            technical: {
              score: 50,
              feedback: "AI 평가 중 오류가 발생했습니다.",
            },
          },
          strengths: ["AI 평가 시스템 점검 중입니다."],
          improvements: ["잠시 후 다시 시도해주세요."],
          writing_tips:
            "AI 평가 시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
          improved_version: { title: title, content: text },
        }),
      };
    }

    // AI 평가 품질 검증 (정제된 JSON으로 검증)
    const ImprovedEvaluationSystem = require("../utils/evaluationSystem");
    const qualityValidation = ImprovedEvaluationSystem.validateAIEvaluation(
      parsed,
      mode
    );

    if (!qualityValidation.isValid) {
      logger.warn("⚠️ AI 평가 품질 문제 감지:", {
        mode,
        qualityScore: qualityValidation.qualityScore,
        issues: qualityValidation.issues,
        recommendation: qualityValidation.recommendation,
        text: text.substring(0, 100) + "...",
        title,
        topic,
      });
    }

    // 약점 앵커 포함 여부 검증 및 보강 재요청
    try {
      const profile = await userProfileService.getUserProfile(userId);
      const modeKey = mode === "mode_300" ? "mode_300" : "mode_1000";
      const weaknessAreas =
        profile?.writingStats?.[modeKey]?.weaknessAreas || [];
      const haystack = [
        ...(Array.isArray(parsed.improvements) ? parsed.improvements : []),
        parsed.writing_tips || "",
      ].join(" ");
      const hasAnchor = weaknessAreas.some(
        (w) => w && typeof w === "string" && haystack.includes(w)
      );

      const hasEvidence =
        parsed.personalization_evidence &&
        (Array.isArray(parsed.personalization_evidence.recent_titles_or_topics)
          ? parsed.personalization_evidence.recent_titles_or_topics.length > 0
          : false);
      const hasPeer = parsed.peer_learning && parsed.peer_learning.technique;

      if (!(hasAnchor && hasEvidence && hasPeer) && retryCount > 0) {
        const reinforcement = `\n\n[강화 지시]\n- 사용자 약점 영역(${weaknessAreas.join(
          ", "
        )}) 중 최소 1개를 'improvements'에 명시하고, 해당 영역 'Before->After' 예시 포함.\n- 'personalization_evidence'에 최근 글 제목/주제 1개 이상과 점수 흐름 설명 1개 이상을 반드시 기입.\n- 'peer_learning'에 다른 사용자들의 강점에서 배울 수 있는 구체적 기법 1개와 현재 글 적용 예시를 반드시 포함.`;

        const reinforced = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: AI.MODEL,
            messages: [
              { role: "system", content: AI.SYSTEM_MESSAGE },
              { role: "user", content: personalizedPrompt + reinforcement },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://dwriting.ai",
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        const reEval = reinforced.data.choices?.[0]?.message?.content || "";
        let reClean = reEval
          .replace(/```json|```/g, "")
          .replace(/```/g, "")
          .replace(/\\n/g, " ")
          .replace(/\n/g, " ")
          .replace(/[<>]/g, "")
          .replace(/\s+/g, " ")
          .replace(/\r/g, " ")
          .replace(/\t/g, " ")
          .trim();
        try {
          const reParsed = JSON.parse(reClean);
          parsed = reParsed;
        } catch (_) {}
      }
    } catch (anchorErr) {
      logger.warn("개인화 요소 검증 중 경고:", anchorErr.message);
    }

    // 응답 검증
    const validatedFeedback = {
      overall_score: Number(parsed.overall_score) || 0,
      criteria_scores: {},
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
      writing_tips: parsed.writing_tips || "",
      improved_version: parsed.improved_version || {
        title: "",
        content: "",
      },
    };

    if (parsed.criteria_scores && typeof parsed.criteria_scores === "object") {
      Object.entries(parsed.criteria_scores).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          // { score: number, feedback: string } 구조
          validatedFeedback.criteria_scores[key] = {
            score: Number(value.score) || 0,
            feedback: String(value.feedback || "평가 정보가 없습니다."),
          };
        } else if (typeof value === "number") {
          // 단순 숫자 값
          validatedFeedback.criteria_scores[key] = {
            score: Number(value) || 0,
            feedback: "평가 정보가 없습니다.",
          };
        } else {
          // 기타 경우 - 기본값 설정
          validatedFeedback.criteria_scores[key] = {
            score: 0,
            feedback: "평가 정보가 없습니다.",
          };
        }
      });
    }

    // 빈 피드백 체크
    if (isEmptyFeedback(validatedFeedback) && retryCount > 0) {
      logger.warn(
        `[AI 평가] 빈 피드백 감지, 재시도 남은 횟수: ${retryCount}.`,
        { validatedFeedback }
      );
      await new Promise((res) => setTimeout(res, 1000));
      return await evaluateSubmission(
        text,
        title,
        mode,
        topic,
        userId,
        retryCount - 1
      );
    }

    // 주제 타입 판단 (지정 주제 vs 자유 주제)
    const isAssignedTopic =
      topic &&
      topic !== "자유주제" &&
      topic !== "주말에는 자유 주제로 글을 써보세요" &&
      (mode === "mode_300"
        ? require("../data/manualTopics").topics300.concat(
            require("../data/manualTopics").weekendTopics300
          )
        : require("../data/manualTopics").topics1000.concat(
            require("../data/manualTopics").weekendTopics1000
          )
      ).includes(topic.trim());

    // 가중치 적용된 점수 계산
    const weightedScore = calculateWeightedScore(
      validatedFeedback.criteria_scores,
      mode,
      isAssignedTopic
    );

    // 가중치 적용된 점수로 업데이트
    validatedFeedback.overall_score = weightedScore;

    // 점수 일관성 검증 (개인화된 평가에서만)
    const consistentFeedback = await validateScoreConsistency(
      userId,
      validatedFeedback,
      mode
    );

    return {
      score: consistentFeedback.overall_score,
      feedback: JSON.stringify(consistentFeedback),
    };
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

// 개선된 평가 시스템 적용
const ImprovedEvaluationSystem = require("../utils/evaluationSystem");

// 점수 일관성 검증 함수 (개선된 버전)
async function validateScoreConsistency(userId, feedback, mode) {
  try {
    const originalScore = feedback.overall_score;

    // 개선된 평가 시스템 적용
    const finalScore = await ImprovedEvaluationSystem.applyUserTypeEvaluation(
      userId,
      originalScore,
      mode
    );

    // 점수 업데이트
    feedback.overall_score = finalScore;

    // 점수 일관성 검증 완료 (디버그 로그 제거)

    return feedback;
  } catch (error) {
    logger.error("❌ 개선된 점수 일관성 검증 실패:", error);
    return feedback; // 에러 시 원본 피드백 반환
  }
}

async function handleSubmit(req, res) {
  const {
    title,
    text,
    topic,
    mode,
    duration,
    forceSubmit,
    isMinLengthMet,
    charCount,
    user,
    timezone,
    offset,
  } = req.body;

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // 🛡️ 중복 제출 방지 - 같은 내용의 글을 5분 이내에 제출하는 것 방지
    if (user && user.uid) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // 같은 사용자가 같은 내용의 글을 최근에 제출했는지 확인
      const recentDuplicate = await Submission.findOne({
        "user.uid": user.uid,
        title: title?.trim(),
        text: text?.trim(),
        createdAt: { $gte: fiveMinutesAgo },
      });

      if (recentDuplicate) {
        logger.warn(`🚫 중복 제출 시도 감지: ${user.email} (${user.uid})`);
        return res.status(400).json({
          message:
            "같은 내용의 글을 너무 빠르게 다시 제출할 수 없습니다. 잠시 후 다시 시도해주세요.",
          code: "DUPLICATE_SUBMISSION",
        });
      }
    }

    // 사용자 시간대 정보 파싱
    const userTimezone = timezone || "Asia/Seoul";
    const userOffset = parseInt(offset) || -540; // 기본값: 한국 시간 (getTimezoneOffset 값)

    // ✅ 디버깅: 요청 데이터 로그 (에러 발생 시에만 출력)
    const debugData = {
      text: text ? `${text.substring(0, 50)}...` : "undefined",
      textLength: text ? text.trim().length : 0,
      originalLength: text ? text.length : 0,
      title: title ? title.substring(0, 30) : "undefined",
      user: user ? { uid: user.uid, email: user.email } : "undefined",
      mode: mode,
      charCount: charCount,
    };

    if (!text || !title || !user || !user.uid || !user.email || !mode) {
      console.warn("❌ 유효하지 않은 요청:", {
        ...debugData,
        validationErrors: {
          text: !text,
          title: !title,
          user: !user,
          userUid: user ? !user.uid : "user undefined",
          userEmail: user ? !user.email : "user undefined",
          mode: !mode,
        },
      });

      // ✅ 더 구체적인 오류 메시지 제공 (Config 값 사용)
      if (
        !title ||
        title.trim() === "" ||
        title.trim().length < SUBMISSION.TITLE.MIN_LENGTH
      ) {
        return res.status(400).json({
          message: `제목을 ${SUBMISSION.TITLE.MIN_LENGTH}글자 이상 입력해주세요.`,
          details: {
            text: !text,
            title: true,
            user: !user,
            mode: !mode,
          },
        });
      }

      if (!text || text.trim() === "") {
        return res.status(400).json({
          message: "내용을 입력해주세요.",
          details: {
            text: true,
            title: !title,
            user: !user,
            mode: !mode,
          },
        });
      }

      // ✅ 제목 최대 길이 검증 추가
      if (title.length > SUBMISSION.TITLE.MAX_LENGTH) {
        return res.status(400).json({
          message: `제목은 ${SUBMISSION.TITLE.MAX_LENGTH}자 이하로 작성해주세요.`,
          details: {
            text: !text,
            title: true,
            user: !user,
            mode: !mode,
          },
        });
      }

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
      console.warn("❌ 유효하지 않은 mode:", {
        ...debugData,
        invalidMode: mode,
      });
      return res.status(400).json({ message: "유효하지 않은 mode입니다." });
    }

    if (title.length > SUBMISSION.TITLE.MAX_LENGTH) {
      console.warn("❌ 제목 길이 초과:", {
        ...debugData,
        titleLength: title.length,
        maxLength: SUBMISSION.TITLE.MAX_LENGTH,
      });
      return res.status(400).json({
        message: `제목은 ${SUBMISSION.TITLE.MAX_LENGTH}자 이하로 작성해주세요.`,
      });
    }

    const MIN_LENGTH = SUBMISSION[mode.toUpperCase()].MIN_LENGTH;
    const MAX_LENGTH = SUBMISSION[mode.toUpperCase()].MAX_LENGTH;

    // ✅ 서버 측에서도 글자 수 검증 강화 (trim된 텍스트로 검증)
    const trimmedTextLength = text.trim().length;
    if (trimmedTextLength < MIN_LENGTH || trimmedTextLength > MAX_LENGTH) {
      console.warn("❌ 글자 수 범위 초과:", {
        ...debugData,
        textLength: trimmedTextLength,
        originalLength: text.length,
        minLength: MIN_LENGTH,
        maxLength: MAX_LENGTH,
      });
      return res.status(400).json({
        message: `글자 수는 ${MIN_LENGTH}자 이상, ${MAX_LENGTH}자 이하로 작성해주세요.`,
      });
    }

    // 🚨 클라이언트와 서버의 글자 수 불일치 검증 (trim된 텍스트로 비교)
    if (charCount !== undefined && charCount !== trimmedTextLength) {
      console.warn(
        `[글자수 불일치] ${user.email}: 클라이언트 ${charCount}자, 서버 ${trimmedTextLength}자 (원본: ${text.length}자)`
      );
      return res.status(400).json({
        message: "글자 수가 일치하지 않습니다. 다시 시도해주세요.",
      });
    }

    // 🚨 중복 제출 방지 (동일 내용, 동일 사용자, 최근 1시간 내)
    // 업계 표준: 해시 기반 비교 + 단순 문자열 비교 (이중 안전장치)
    const trimmedText = text.trim();
    const crypto = require("crypto");
    const textHash = crypto
      .createHash("sha256")
      .update(trimmedText)
      .digest("hex");

    const recentSubmission = await Submission.findOne({
      "user.uid": user.uid,
      mode: mode,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // 1시간 내
      $or: [
        { text: trimmedText }, // 정확한 문자열 매칭
        { textHash: textHash }, // 해시 기반 빠른 비교 (백업)
      ],
    });

    if (recentSubmission) {
      console.warn(
        `[중복 제출 방지] ${user.email}: 동일 내용의 ${mode} 글을 최근 1시간 내에 이미 제출함`
      );
      return res.status(400).json({
        message:
          "동일한 내용의 글을 이미 제출했습니다. 잠시 후 다시 시도해주세요.",
      });
    }

    // 토큰 리셋 체크 - 사용자 시간대 기준으로 수정
    const currentTime = new Date();

    let dayOfWeek = 0; // 사용자 시간대 기준으로 아래에서 계산
    let streak = null;

    // 토큰 처리
    let userToken = await Token.findOne({ uid: user.uid });
    if (!userToken) {
      userToken = await Token.create({
        uid: user.uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.WEEKLY_LIMIT_1000,
        goldenKeys: 0,
        lastRefreshed: currentTime,
        lastWeeklyRefreshed: new Date(),
      });
    }

    // 새로운 시간대 유틸리티 사용
    const {
      getTodayDateKoreaFinal,
      getUserTodayDate,
      getUserMonday,
    } = require("../utils/timezoneUtils");

    // userOffset이 유효한지 확인하고 안전하게 처리
    const safeUserOffset =
      typeof userOffset === "number" && !isNaN(userOffset) ? userOffset : -540;

    let today, monday;
    try {
      // 사용자 시간대 기준으로 오늘 날짜 계산 (수정됨)
      if (timezone && offset !== undefined) {
        // 사용자 시간대 정보가 있으면 사용자 기준으로 계산
        const todayDate = getUserTodayDate(parseInt(offset));
        today = todayDate; // ✅ getUserTodayDate는 이미 String 반환
        console.log(
          `🌍 사용자 시간대 기준 날짜 계산: ${timezone} (offset: ${offset}) -> ${today}`
        );
      } else {
        // 기본값: 한국 시간 기준
        const todayDate = getTodayDateKoreaFinal();
        today = todayDate.toISOString().split("T")[0];
        console.log(`🇰🇷 한국 시간 기준 날짜 계산 (기본값): ${today}`);
      }
      monday = getUserMonday(safeUserOffset);

      // 디버깅: 시간대 정보 로깅
    } catch (error) {
      console.error(
        `Error getting date strings for userOffset: ${safeUserOffset}`,
        error
      );
      // 에러 발생 시 기본값 사용
      today = new Date().toISOString().slice(0, 10);
      monday = new Date();
    }

    // 사용자 시간대 기준 요일 계산 (0=일요일, 1=월요일, ...)
    try {
      const userNow = new Date(
        currentTime.getTime() - safeUserOffset * 60 * 1000
      );
      dayOfWeek = userNow.getUTCDay();
    } catch (e) {
      // 실패 시 서버 기준으로 fallback
      dayOfWeek = currentTime.getUTCDay();
    }

    const isWhitelisted = await checkEmailAccess(user.email);

    // 비화이트리스트 유저 활동 로깅
    await detectNonWhitelistedUserActivity(`글쓰기 제출 (${mode})`, {
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      uid: user.uid,
    });

    // 가입일 기반 분기 추가
    let daysSinceJoin = 9999;
    if (!isWhitelisted) {
      const userDoc = await User.findOne({ uid: user.uid });
      if (userDoc && userDoc.createdAt) {
        daysSinceJoin = Math.floor(
          (currentTime - userDoc.createdAt) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // 300자 토큰 지급
    if (isWhitelisted) {
      // 매일 리셋 - 사용자 시간대 기준으로 간단한 비교
      const lastRefreshedDate = new Date(userToken.lastRefreshed);

      // 사용자 시간대 기준으로 마지막 리프레시 날짜 계산
      const lastRefreshedUserDate = new Date(
        lastRefreshedDate.getTime() - safeUserOffset * 60 * 1000
      );
      const lastRefreshedUserDay = lastRefreshedUserDate
        .toISOString()
        .slice(0, 10);

      // 오늘 날짜 (이미 사용자 시간대 기준으로 계산됨)
      const todayStr = today;

      if (lastRefreshedUserDay < todayStr) {
        userToken.tokens_300 = TOKEN.DAILY_LIMIT_300;
        userToken.lastRefreshed = currentTime;

        await handleTokenChange(
          user.uid,
          {
            type: "DAILY_RESET",
            amount: TOKEN.DAILY_LIMIT_300,
            mode: "mode_300",
            timestamp: currentTime,
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
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 매일 지급
      const lastRefreshedDate = new Date(userToken.lastRefreshed);

      // 사용자 시간대 기준으로 마지막 리프레시 날짜 계산
      const lastRefreshedUserDate = new Date(
        lastRefreshedDate.getTime() - safeUserOffset * 60 * 1000
      );
      const lastRefreshedUserDay = lastRefreshedUserDate
        .toISOString()
        .slice(0, 10);

      // 오늘 날짜 (이미 사용자 시간대 기준으로 계산됨)
      const todayStr = today;

      if (lastRefreshedUserDay < todayStr) {
        userToken.tokens_300 = TOKEN.DAILY_LIMIT_300;
        userToken.lastRefreshed = currentTime;

        await handleTokenChange(
          user.uid,
          {
            type: "DAILY_RESET",
            amount: TOKEN.DAILY_LIMIT_300,
            mode: "mode_300",
            timestamp: currentTime,
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
    } else {
      // 비참여자, 가입 7일 이후: 주간 지급
      if (userToken.lastWeeklyRefreshed < monday) {
        userToken.tokens_300 = TOKEN.WEEKLY_LIMIT_300;
        userToken.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        userToken.lastWeeklyRefreshed = monday;
        // 300자 지급 기록
        await handleTokenChange(
          user.uid,
          {
            type: "WEEKLY_RESET",
            amount: TOKEN.WEEKLY_LIMIT_300,
            mode: "mode_300",
            timestamp: currentTime,
          },
          {
            session,
            user: {
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
            },
          }
        );
        // 1000자 지급 기록
        await handleTokenChange(
          user.uid,
          {
            type: "WEEKLY_RESET",
            amount: TOKEN.WEEKLY_LIMIT_1000,
            mode: "mode_1000",
            timestamp: currentTime,
          },
          {
            session,
            user: {
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
            },
          }
        );
      } else {
      }
    }

    // 1000자 토큰 지급 로직 (화이트리스트 유저와 신규 유저용)
    if (isWhitelisted) {
      // 화이트리스트 유저: 주간 지급 (사용자 시간대 기준으로 이미 계산된 monday 사용)
      if (userToken.lastWeeklyRefreshed < monday) {
        userToken.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        userToken.lastWeeklyRefreshed = monday;

        await handleTokenChange(
          user.uid,
          {
            type: "WEEKLY_RESET",
            amount: TOKEN.WEEKLY_LIMIT_1000,
            mode: "mode_1000",
            timestamp: currentTime,
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
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 주간 지급 (사용자 시간대 기준으로 이미 계산된 monday 사용)
      if (userToken.lastWeeklyRefreshed < monday) {
        userToken.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        userToken.lastWeeklyRefreshed = monday;

        await handleTokenChange(
          user.uid,
          {
            type: "WEEKLY_RESET",
            amount: TOKEN.WEEKLY_LIMIT_1000,
            mode: "mode_1000",
            timestamp: currentTime,
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
    }
    // 비참여자, 가입 7일 이후는 위에서 이미 처리됨

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

    // AI 평가 실행 (개인화 지원)
    let score, feedback;
    try {
      const evaluationResult = await evaluateSubmission(
        text,
        title,
        mode,
        topic,
        user.uid
      );
      score = evaluationResult.score;
      feedback = evaluationResult.feedback;
    } catch (evaluationError) {
      logger.error("❌ AI 평가 실행 실패:", {
        error: evaluationError.message,
        text: text.substring(0, 100) + "...",
        title,
        mode,
        topic,
        userId: user.uid,
      });

      // AI 평가 실패 시 기본값으로 처리
      score = 50;
      feedback = JSON.stringify({
        overall_score: 50,
        criteria_scores: {
          content: {
            score: 50,
            feedback: "AI 평가 시스템에 일시적인 문제가 발생했습니다.",
          },
          expression: {
            score: 50,
            feedback: "AI 평가 시스템에 일시적인 문제가 발생했습니다.",
          },
          structure: {
            score: 50,
            feedback: "AI 평가 시스템에 일시적인 문제가 발생했습니다.",
          },
          technical: {
            score: 50,
            feedback: "AI 평가 시스템에 일시적인 문제가 발생했습니다.",
          },
        },
        strengths: ["AI 평가 시스템 점검 중입니다."],
        improvements: ["잠시 후 다시 시도해주세요."],
        writing_tips:
          "AI 평가 시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        improved_version: { title: title, content: text },
      });
    }

    // 제출물 저장
    const submission = new Submission({
      text,
      title,
      topic,
      user,
      mode,
      sessionCount: 1, // 임시로 1로 설정
      duration,
      submissionDate: today, // 사용자 시간대 기준으로 수정
      score,
      aiFeedback: feedback, // JSON 문자열로 저장
      textHash: textHash, // 중복 제출 방지를 위한 해시
      userTimezone: timezone || "Asia/Seoul",
      userTimezoneOffset: parseInt(offset) || -540,
    });
    await submission.save({ session });

    // 토큰 차감 (공통 로직)
    userToken[tokenField] -= 1;
    await handleTokenChange(
      user.uid,
      {
        type: "WRITING_USE",
        amount: -1,
        mode,
        timestamp: currentTime,
      },
      {
        session,
        user: {
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
        },
      }
    );

    // 1000자 모드 글 작성 시 황금열쇠만 지급
    if (mode === "mode_1000") {
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
            timestamp: currentTime,
          },
          {
            session,
            user: {
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
            },
          }
        );

        // 사용자 시간대 기준으로 현재 시간 계산
        const userNow = new Date(
          currentTime.getTime() - safeUserOffset * 60 * 1000
        );
        // 황금열쇠 지급 성공 로그
        console.log(
          `[황금열쇠 지급] ${
            user.email
          }: 1000자 글 작성 보상 (+1) (userTime: ${userNow.toISOString()}, timezone: ${
            timezone || "Asia/Seoul"
          })`
        );
      } catch (error) {
        console.error("[황금열쇠 지급 실패]", {
          userId: user.uid,
          error: error.message,
          timestamp: currentTime,
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

        // ✅ 새로운 주 시작 체크 (사용자 시간대 기준)
        if (streak.shouldStartNewWeek(safeUserOffset)) {
          console.log(
            `[스트릭] ${user.email}: 새로운 주 시작 - 주간 리셋 실행`
          );
          // 수정된 WritingStreak 모델의 resetForNewWeek 메서드 사용
          streak.resetForNewWeek(safeUserOffset);
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
                timestamp: currentTime,
              },
              {
                session,
                user: {
                  email: user.email,
                  displayName: user.displayName || user.email.split("@")[0],
                },
              }
            );

            // 사용자 시간대 기준으로 현재 시간 계산
            const userNow = new Date(
              currentTime.getTime() - safeUserOffset * 60 * 1000
            );
            // 황금열쇠 지급 성공 로그
            console.log(
              `[황금열쇠 지급] ${
                user.email
              }: 주간 스트릭 완료 보상 (+1) (userTime: ${userNow.toISOString()}, timezone: ${
                timezone || "Asia/Seoul"
              })`
            );

            // 스트릭 완료 기록
            streak.celebrationShown = true;
            streak.lastStreakCompletion = currentTime;

            // 이번 주 완료를 히스토리에 추가
            streak.streakHistory.push({
              weekStartDate: streak.currentWeekStartDate,
              completed: true,
              completionDate: currentTime,
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

    // 사용자 프로필 업데이트 (세션 외부에서 실행)
    try {
      const aiFeedbackData = JSON.parse(feedback);
      await userProfileService.updateUserProfile(
        user.uid,
        submission,
        aiFeedbackData
      );
    } catch (profileError) {
      console.error("❌ 사용자 프로필 업데이트 실패:", profileError);
      // 프로필 업데이트 실패는 전체 제출을 실패시키지 않음
    }

    // 제출 완료 후 draft 삭제 (모드별 구분)
    try {
      const Draft = require("../models/Draft");

      if (mode === "mode_300") {
        // 300자 모드: Draft 삭제하지 않음 (1000자 Draft 보존)
      } else if (mode === "mode_1000") {
        // 1000자 모드: Draft 삭제
        await Draft.findOneAndDelete({ uid: user.uid });
      }
    } catch (draftError) {
      // draft 삭제 실패는 제출 성공에 영향을 주지 않음
    }

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
    // [오류 상황에서만] 상세 디버깅 로그
    console.error(
      `[제출 실패] 유저: ${user?.email} (${user?.uid}), mode: ${mode}`
    );
    console.error(`- title: ${title}`);
    console.error(`- text(앞 50자): ${text?.slice(0, 50)}...`);
    console.error(
      `- duration: ${duration}, forceSubmit: ${forceSubmit}, charCount: ${charCount}`
    );
    console.error(`- 요청 파라미터:`, req.body);
    console.error(`[에러 상세]`, error);

    return res
      .status(500)
      .json({ message: "서버 오류", error: error?.message || error });
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

const handleStreakCompletion = async (user, streak, userToken) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 황금열쇠 지급 및 기록
    userToken.goldenKeys += TOKEN.GOLDEN_KEY;
    await userToken.save({ session });

    // 황금열쇠 지급 성공 로그 (서버 시간 기준)
    console.log(
      `[황금열쇠 지급] ${
        user.email
      }: 스트릭 완료 보상 (+1) (서버 시간: ${new Date().toLocaleString(
        "ko-KR",
        { timeZone: "Asia/Seoul" }
      )})`
    );

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
  // UTC 기준으로 월요일 0시 계산
  const lastDayOfWeek = lastMonday.getUTCDay();
  lastMonday.setUTCDate(lastMonday.getUTCDate() - lastDayOfWeek + 1);
  lastMonday.setUTCHours(0, 0, 0, 0);

  const currentMonday = new Date(currentDate);
  // UTC 기준으로 월요일 0시 계산
  const currentDayOfWeek = currentMonday.getUTCDay();
  currentMonday.setUTCDate(currentMonday.getUTCDate() - currentDayOfWeek + 1);
  currentMonday.setUTCHours(0, 0, 0, 0);

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
