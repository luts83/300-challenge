const express = require("express");
const router = express.Router();
const FeedbackMission = require("../models/FeedbackMission");
const Feedback = require("../models/Feedback");

// ✅ 유저의 피드백 미션 조회
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const missions = await FeedbackMission.find({ fromUid: uid });
    res.json(missions);
  } catch (err) {
    console.error("❌ 피드백 미션 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// ✅ 피드백 제출 + 미션 완료 처리
router.post("/submit", async (req, res) => {
  const { fromUid, toSubmissionId, content } = req.body;

  if (!fromUid || !toSubmissionId || !content || content.trim().length < 10) {
    return res
      .status(400)
      .json({ message: "유효한 피드백 데이터를 입력해주세요." });
  }

  try {
    await Feedback.create({ fromUid, toSubmissionId, content });

    const mission = await FeedbackMission.findOneAndUpdate(
      { fromUid, toSubmissionId },
      { isDone: true }
    );

    if (!mission) {
      return res
        .status(404)
        .json({ message: "해당 피드백 미션을 찾을 수 없습니다." });
    }

    const doneMissions = await FeedbackMission.countDocuments({
      fromUid,
      isDone: true,
    });

    res
      .status(200)
      .json({ message: "피드백 완료", totalCompleted: doneMissions });
  } catch (err) {
    console.error("❌ 피드백 저장 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
