// server/routes/streak.js
const express = require("express");
const router = express.Router();
const WritingStreak = require("../models/WritingStreak");

router.get("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const streak = await WritingStreak.findOne({ uid });

    if (!streak) {
      return res.json({
        weeklyProgress: Array(5).fill(false),
        celebrationShown: false,
        lastStreakCompletion: null,
      });
    }

    res.json({
      weeklyProgress: streak.weeklyProgress,
      celebrationShown: streak.celebrationShown || false,
      lastStreakCompletion: streak.lastStreakCompletion,
    });
  } catch (error) {
    console.error("연속 작성 현황 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

router.post("/celebration/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const streak = await WritingStreak.findOne({ uid });

    if (!streak) {
      return res.status(404).json({ message: "Streak not found" });
    }

    // 이미 celebration이 shown 상태라면 업데이트하지 않음
    if (streak.celebrationShown) {
      return res.status(200).json({ message: "Celebration already shown" });
    }

    streak.celebrationShown = true;
    streak.lastStreakCompletion = new Date();
    await streak.save();

    res.status(200).json({ message: "Celebration status updated" });
  } catch (error) {
    console.error("Error updating celebration status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
