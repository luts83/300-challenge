const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");

router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const submissions = await Submission.find({ "user.uid": uid });
    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ message: "작성한 글이 없습니다." });
    }

    const scores = submissions.map((s) => s.score || 0);
    const dates = submissions.map((s) => new Date(s.submittedAt));

    const stats = {
      count: submissions.length,
      averageScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      ),
      maxScore: Math.max(...scores),
      recentDate: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };

    res.json(stats);
  } catch (err) {
    console.error("❌ 통계 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
