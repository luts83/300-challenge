const CONFIG = require("../config");
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const logger = require("../utils/logger");
const { sendFeedbackEmail } = require("../utils/emailService");
const User = require("../models/User");
const {
  checkEmailAccess,
  detectNonWhitelistedUserActivity,
} = require("./userController");
const { getUserTodayDate } = require("../utils/timezoneUtils");
const { getTodayDateKoreaFinal } = require("../utils/timezoneUtils");

// 피드백 가능 여부 확인 함수
const canGiveFeedback = async (
  userUid,
  targetSubmission,
  userTimezone = "Asia/Seoul",
  userOffset = -540
) => {
  // 사용자 시간대 기준으로 오늘 날짜 계산
  const today = getTodayDateKoreaFinal();
  const todayString = today.toISOString().slice(0, 10); // YYYY-MM-DD 형식으로 변환

  const userSubmission = await Submission.findOne({
    "user.uid": userUid,
    submissionDate: todayString,
  });

  if (!userSubmission) {
    throw new Error(
      "오늘은 아직 글을 작성하지 않으셨네요. 먼저 글을 작성한 후 피드백을 남길 수 있어요!"
    );
  }

  // 교차 피드백이 비활성화된 경우
  if (!CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
    return userSubmission.mode === targetSubmission.mode;
  }

  // 교차 피드백이 활성화된 경우 - 제한 설정 확인
  return CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[
    userSubmission.mode
  ].includes(targetSubmission.mode);
};

// 피드백 대상 글 조회 API
exports.getAvailableSubmissions = async (req, res) => {
  const { uid } = req.params;
  const { userTimezone, userOffset } = req.query;

  try {
    // 사용자 시간대 기준으로 오늘 날짜 계산
    const today = getTodayDateKoreaFinal();
    const todayString = today.toISOString().slice(0, 10); // YYYY-MM-DD 형식으로 변환

    const userSubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: todayString,
    });

    if (!userSubmission) {
      return res.status(403).json({
        message: "오늘 작성한 글이 없습니다.",
      });
    }

    // 이미 피드백한 글 ID 목록
    const givenFeedbacks = await Feedback.find({ fromUid: uid });
    const givenIds = givenFeedbacks.map((fb) => fb.toSubmissionId.toString());

    // 피드백 가능한 글 필터링
    let query = {
      "user.uid": { $ne: uid },
      _id: { $nin: givenIds },
    };

    // 교차 피드백 설정에 따른 필터링
    if (!CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
      query.mode = userSubmission.mode;
    } else {
      query.mode = {
        $in: CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[
          userSubmission.mode
        ],
      };
    }

    const submissions = await Submission.find(query)
      .select("text user mode createdAt")
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (err) {
    logger.error("피드백 대상 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

// 피드백 제출 API
exports.submitFeedback = async (req, res) => {
  const {
    toSubmissionId,
    fromUid,
    strengths,
    improvements,
    overall,
    userTimezone,
    userOffset,
  } = req.body;

  // 🔍 간단한 유저 시간 로깅 (제거 - 불필요한 반복 로그 방지)
  // const { logUserTime } = require("../utils/timezoneUtils");
  // logUserTime(
  //   req.user?.email || "Unknown",
  //   userTimezone || "Unknown",
  //   userOffset || 0
  // );

  // 구조화된 피드백 검증
  if (
    !overall ||
    overall.trim().length < CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL
  ) {
    return res.status(400).json({
      message: "전체적인 느낌을 15자 이상 작성해주세요.",
    });
  }

  // strengths와 improvements는 선택사항이므로 검증 로직 완전 제거
  // 현재 설정에서 최소 길이가 0이므로 검증이 의미가 없음

  try {
    // 사용자 시간대 기준으로 오늘 날짜 계산 (함수 시작 부분에서 미리 계산)
    // getTodayDateKoreaFinal을 사용하여 일관된 시간대 처리
    const today = getTodayDateKoreaFinal();
    const todayString = today.toISOString().slice(0, 10);

    // 중복 피드백 체크 추가
    const existingFeedback = await Feedback.findOne({
      toSubmissionId,
      fromUid,
    });

    if (existingFeedback) {
      return res.status(400).json({
        message: "이미 이 글에 피드백을 작성하셨습니다.",
      });
    }

    // 1. 피드백 대상 글 정보 가져오기
    const targetSubmission = await Submission.findById(toSubmissionId);
    if (!targetSubmission) {
      return res
        .status(404)
        .json({ message: "피드백 대상 글을 찾을 수 없습니다." });
    }

    // 2. 피드백 작성자 정보 가져오기
    const fromUser = await Submission.findOne({ "user.uid": fromUid })
      .select("user")
      .sort({ createdAt: -1 });

    if (!fromUser) {
      return res
        .status(404)
        .json({ message: "피드백 작성자 정보를 찾을 수 없습니다." });
    }

    // 비화이트리스트 유저 활동 로깅
    await detectNonWhitelistedUserActivity("피드백 제출", {
      email: fromUser.user.email,
      displayName:
        fromUser.user.displayName || fromUser.user.email.split("@")[0],
      uid: fromUid,
    });

    // 3. 피드백 작성 가능 여부 확인
    try {
      const canGive = await canGiveFeedback(
        fromUid,
        targetSubmission,
        userTimezone,
        userOffset
      );
      if (!canGive) {
        return res
          .status(403)
          .json({ message: "피드백을 작성할 수 없습니다." });
      }
    } catch (err) {
      return res.status(403).json({ message: err.message });
    }

    // 5. 피드백 저장
    const savedFeedback = await (async () => {
      const newFeedback = new Feedback({
        // 피드백 대상 글 정보
        toSubmissionId: targetSubmission._id,
        submissionTitle: targetSubmission.title,
        submissionText: targetSubmission.text,
        submissionMode: targetSubmission.mode,

        // 원글 작성자 정보
        toUser: {
          uid: targetSubmission.user.uid,
          displayName: targetSubmission.user.displayName,
          email: targetSubmission.user.email,
        },

        // 피드백 작성자 정보
        fromUid,
        fromUser: {
          displayName: fromUser.user.displayName,
          email: fromUser.user.email,
        },

        // 피드백 작성자 시간대 정보
        fromUserTimezone: userTimezone || "Asia/Seoul",
        fromUserOffset: typeof userOffset === "number" ? userOffset : -540,

        // 구조화된 피드백 내용
        strengths:
          strengths && strengths.trim().length > 0 ? strengths.trim() : null,
        improvements:
          improvements && improvements.trim().length > 0
            ? improvements.trim()
            : null,
        overall: overall || null,
        content: `전체적인 느낌:\n${overall}${
          strengths && strengths.trim().length > 0
            ? `\n\n마음에 드는 부분:\n${strengths.trim()}`
            : ""
        }${
          improvements && improvements.trim().length > 0
            ? `\n\n더 멋진 방향:\n${improvements.trim()}`
            : ""
        }`, // 하위 호환성

        // 피드백 작성 날짜 - 사용자 시간대 기준
        writtenDate: todayString, // canGiveFeedback에서 계산된 날짜 사용

        // 피드백 상태
        isRead: false,
        isHelpful: null,
      });

      return await newFeedback.save();
    })();

    // 이메일 알림 설정에 따라 전송
    try {
      // 피드백 대상 글의 유저(=알림 받을 유저) 정보 조회
      const targetUser = await User.findOne({
        email: targetSubmission.user.email,
      });
      // 알림이 켜져있을 때만 이메일 전송 (feedbackNotification === true)
      if (targetUser && targetUser.feedbackNotification === true) {
        await sendFeedbackEmail(savedFeedback, targetSubmission);
      }
    } catch (emailError) {
      logger.error("피드백 알림 이메일 전송 실패:", emailError);
      // 이메일 전송 실패는 전체 프로세스를 중단시키지 않음
    }

    // Submission 모델의 hasGivenFeedback 필드 업데이트
    await Submission.findByIdAndUpdate(toSubmissionId, {
      $inc: { feedbackCount: 1 },
    });

    // 6. 오늘 작성한 피드백 수 확인 (모드별로 구분) - 사용자 시간대 기준

    // 먼저 오늘 작성한 피드백들을 가져옴
    const todayFeedbacks = await Feedback.find({
      fromUid,
      writtenDate: todayString,
    }).populate("toSubmissionId", "mode");

    // 모드별로 피드백 수 계산
    const mode300FeedbackCount = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId.mode === "mode_300"
    ).length;

    const mode1000FeedbackCount = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId.mode === "mode_1000"
    ).length;

    // 300자 모드를 위한 총 피드백 수 (300자 + 1000자 모두 포함)
    const totalFeedbackCount = mode300FeedbackCount + mode1000FeedbackCount;

    // 7. 사용자가 작성한 글의 모드 확인
    const userSubmissions = await Submission.find({
      "user.uid": fromUid,
      submissionDate: todayString,
    });

    // 8. 모드별로 피드백 언락 조건 체크 및 업데이트
    for (const submission of userSubmissions) {
      let shouldUnlock = false;

      if (submission.mode === "mode_300") {
        // 300자 모드: 300자 또는 1000자 피드백을 포함한 총 3개 이상의 피드백 작성
        shouldUnlock = totalFeedbackCount >= CONFIG.FEEDBACK.REQUIRED_COUNT;
      } else if (submission.mode === "mode_1000") {
        // 1000자 모드: 1000자 피드백 1개 이상 작성
        shouldUnlock = mode1000FeedbackCount >= 1;
      }

      if (shouldUnlock) {
        await Submission.findByIdAndUpdate(submission._id, {
          feedbackUnlocked: true,
        });
      }
    }

    res.status(200).json({
      message: "피드백이 성공적으로 저장되었습니다!",
      feedback: savedFeedback,
      todayFeedbackCount: {
        mode_300: mode300FeedbackCount,
        mode_1000: mode1000FeedbackCount,
        total: totalFeedbackCount, // 총 피드백 수도 응답에 포함
      },
    });
  } catch (error) {
    console.error("피드백 저장 중 오류 발생:", error);
    res.status(500).json({ message: "피드백 저장 중 오류가 발생했습니다." });
  }
};

// 피드백 미션 할당 API도 수정
exports.assignFeedbackMissions = async (req, res) => {
  const { uid } = req.params;
  const { userOffset } = req.body; // 사용자 시간대 오프셋 받기

  try {
    // 사용자 시간대 기준으로 오늘 날짜 계산 (기본값: 한국 시간)
    const today = getTodayDateKoreaFinal();

    const userSubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: today.toISOString().split("T")[0],
    });

    if (!userSubmission) {
      return res.status(403).json({
        message: "오늘 작성한 글이 없습니다.",
      });
    }

    // 교차 피드백 설정에 따른 미션 대상 필터링
    let modeFilter = {};
    if (!CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
      modeFilter.mode = userSubmission.mode;
    } else {
      modeFilter.mode = {
        $in: CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[
          userSubmission.mode
        ],
      };
    }

    // 미션 할당 로직...

    res.json(missions);
  } catch (err) {
    logger.error("미션 할당 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};
