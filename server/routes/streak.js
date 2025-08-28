// server/routes/streak.js
const express = require("express");
const router = express.Router();
const WritingStreak = require("../models/WritingStreak");

router.get("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // ✅ 사용자 시간대 정보 파싱 (토큰 라우트와 동일한 방식)
    const timezone = req.query.timezone || "Asia/Seoul";
    const offset = parseInt(req.query.offset) || -540; // 기본값: 한국 시간

    const streak = await WritingStreak.findOne({ uid });

    if (!streak) {
      // ✅ 새로운 스트릭 생성 시 사용자 시간대 기준으로 월요일 계산
      const { getUserMonday } = require("../utils/timezoneUtils");
      const monday = getUserMonday(offset);

      return res.json({
        weeklyProgress: Array(5).fill(false),
        celebrationShown: false,
        lastStreakCompletion: null,
        currentWeekStartDate: monday,
      });
    }

    // ✅ 주간 리셋 처리 (조회 시에도 실행)
    if (streak.shouldStartNewWeek(offset)) {
      console.log(`[스트릭] ${uid}: 새로운 주 시작 - 주간 리셋 실행`);
      streak.resetForNewWeek(offset);
      await streak.save();
    }

    res.json({
      weeklyProgress: streak.weeklyProgress,
      celebrationShown: streak.celebrationShown || false,
      lastStreakCompletion: streak.lastStreakCompletion,
      currentWeekStartDate: streak.currentWeekStartDate,
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
