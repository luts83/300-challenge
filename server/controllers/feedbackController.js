const CONFIG = require("../config");
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const logger = require("../utils/logger");

// 피드백 가능 여부 확인 함수
const canGiveFeedback = async (userUid, targetSubmission) => {
  // 오늘 작성한 사용자의 글 모드 확인
  const today = new Date().toISOString().slice(0, 10);
  const userSubmission = await Submission.findOne({
    "user.uid": userUid,
    submissionDate: today,
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

  try {
    // 오늘 작성한 사용자의 글 확인
    const today = new Date().toISOString().slice(0, 10);
    const userSubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: today,
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
  const { toSubmissionId, fromUid, content } = req.body;

  if (
    !toSubmissionId ||
    !fromUid ||
    !content ||
    content.trim().length < CONFIG.FEEDBACK.MIN_LENGTH
  ) {
    return res
      .status(400)
      .json({ message: "유효한 피드백 데이터를 입력해주세요." });
  }

  try {
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

    // 3. 피드백 작성 가능 여부 확인
    try {
      const canGive = await canGiveFeedback(fromUid, targetSubmission);
      if (!canGive) {
        return res
          .status(403)
          .json({ message: "피드백을 작성할 수 없습니다." });
      }
    } catch (err) {
      return res.status(403).json({ message: err.message });
    }

    // 4. 새로운 피드백 데이터 생성
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

      // 피드백 내용
      content,
      writtenDate: new Date().toISOString().slice(0, 10),

      // 피드백 상태
      isRead: false,
      isHelpful: null,
    });

    // 5. 피드백 저장
    const savedFeedback = await newFeedback.save();

    // Submission 모델의 hasGivenFeedback 필드 업데이트
    await Submission.findByIdAndUpdate(toSubmissionId, {
      $inc: { feedbackCount: 1 },
    });

    // 6. 오늘 작성한 피드백 수 확인
    const today = new Date().toISOString().slice(0, 10);
    const feedbackCount = await Feedback.countDocuments({
      fromUid,
      writtenDate: today,
    });

    // 7. 피드백이 3개 이상이거나 1000자 글에 피드백 1개 이상이면 피드백 열람 가능
    if (
      feedbackCount >= CONFIG.FEEDBACK.REQUIRED_COUNT ||
      (targetSubmission.mode === "mode_1000" && feedbackCount >= 1)
    ) {
      await Submission.updateMany(
        {
          "user.uid": fromUid,
          submissionDate: today,
        },
        {
          feedbackUnlocked: true,
        }
      );
    }

    res.status(200).json({
      message: "피드백이 성공적으로 저장되었습니다!",
      feedback: savedFeedback,
      todayFeedbackCount: feedbackCount,
    });
  } catch (err) {
    logger.error("피드백 저장 실패:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 피드백 미션 할당 API도 수정
exports.assignFeedbackMissions = async (req, res) => {
  const { uid } = req.params;

  try {
    const userSubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: new Date().toISOString().slice(0, 10),
    });

    if (!userSubmission) {
      return res.status(403).json({ message: "오늘 작성한 글이 없습니다." });
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
