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
    throw new Error("오늘 작성한 글이 없습니다.");
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

  try {
    const targetSubmission = await Submission.findById(toSubmissionId);
    if (!targetSubmission) {
      return res.status(404).json({ message: "대상 글을 찾을 수 없습니다." });
    }

    // 피드백 가능 여부 확인
    const canGive = await canGiveFeedback(fromUid, targetSubmission);
    if (!canGive) {
      return res.status(403).json({
        message: CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED
          ? "해당 모드의 글에는 피드백을 줄 수 없습니다."
          : "같은 모드의 글에만 피드백을 줄 수 있습니다.",
      });
    }

    // 기존 피드백 검증 로직...

    // 피드백 저장
    const feedback = new Feedback({
      fromUid,
      toSubmissionId,
      content,
      writtenDate: new Date().toISOString().slice(0, 10),
    });

    await feedback.save();
    res.status(200).json({ message: "피드백이 저장되었습니다!" });
  } catch (err) {
    logger.error("피드백 저장 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
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
