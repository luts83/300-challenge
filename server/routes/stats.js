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

    // 300자 모드 통계
    const submissions300 = submissions.filter((s) => s.mode === "mode_300");
    const scores300 = submissions300.map((s) => s.score || 0);
    const dates300 = submissions300.map((s) => new Date(s.createdAt));
    const durations300 = submissions300.map((s) => s.duration || 0);

    const stats300 = {
      count: submissions300.length,
      averageScore:
        submissions300.length > 0
          ? Math.round(scores300.reduce((a, b) => a + b, 0) / scores300.length)
          : 0,
      maxScore: submissions300.length > 0 ? Math.max(...scores300) : 0,
      recentDate:
        dates300.length > 0
          ? new Date(Math.max(...dates300.map((d) => d.getTime())))
          : null,
      averageDuration:
        submissions300.length > 0
          ? Math.round(
              durations300.reduce((a, b) => a + b, 0) / durations300.length
            )
          : 0,
    };

    // 1000자 모드 통계
    const submissions1000 = submissions.filter((s) => s.mode === "mode_1000");
    const scores1000 = submissions1000.map((s) => s.score || 0);
    const dates1000 = submissions1000.map((s) => new Date(s.createdAt));
    const durations1000 = submissions1000.map((s) => s.duration || 0);
    const sessionCounts1000 = submissions1000.map((s) => s.sessionCount || 1);

    const stats1000 = {
      count: submissions1000.length,
      averageScore:
        submissions1000.length > 0
          ? Math.round(
              scores1000.reduce((a, b) => a + b, 0) / scores1000.length
            )
          : 0,
      maxScore: submissions1000.length > 0 ? Math.max(...scores1000) : 0,
      recentDate:
        dates1000.length > 0
          ? new Date(Math.max(...dates1000.map((d) => d.getTime())))
          : null,
      averageDuration:
        submissions1000.length > 0
          ? Math.round(
              durations1000.reduce((a, b) => a + b, 0) / durations1000.length
            )
          : 0,
      averageSessionCount:
        submissions1000.length > 0
          ? Math.round(
              sessionCounts1000.reduce((a, b) => a + b, 0) /
                sessionCounts1000.length
            )
          : 0,
    };

    res.json({
      mode_300: stats300,
      mode_1000: stats1000,
    });
  } catch (err) {
    console.error("❌ 통계 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
