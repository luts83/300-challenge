// server/routes/records.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");

// 최고 기록 조회
router.get("/best", async (req, res) => {
  const { mode } = req.query;

  try {
    let query = {};
    if (mode === "mode_1000") {
      query = { mode: "mode_1000" };
    } else if (mode === "mode_300") {
      query = { mode: "mode_300" };
    }

    const bestRecord = await Submission.findOne(query)
      .sort({ sessionCount: -1, duration: -1 })
      .select("sessionCount duration");

    if (!bestRecord) {
      return res.json({ sessionCount: 0, duration: 0 });
    }

    res.json({
      sessionCount: bestRecord.sessionCount,
      duration: bestRecord.duration,
    });
  } catch (err) {
    res.status(500).json({
      error: "최고 기록 조회 실패",
      details: err.message,
    });
  }
});

module.exports = router;
