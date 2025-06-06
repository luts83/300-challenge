// server/routes/token.js
const express = require("express");
const router = express.Router();
const Token = require("../models/Token");
const WritingStreak = require("../models/WritingStreak");
const { TOKEN } = require("../config");

// ✍ UID로 해당 유저의 토큰 조회 (mode별)
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    // Token 모델에서 토큰 정보 조회
    const tokenEntry = await Token.findOne({ uid });

    const now = new Date();
    const today = now.toDateString();
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - monday.getDay() + 1); // 이번 주 월요일

    let finalTokenEntry = tokenEntry;
    if (!finalTokenEntry) {
      finalTokenEntry = new Token({
        uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.WEEKLY_LIMIT_1000,
        goldenKeys: 0,
        lastRefreshed: now,
        lastWeeklyRefreshed: monday,
      });
    }

    // 일일 토큰 리셋 (300자 모드)
    if (finalTokenEntry.lastRefreshed?.toDateString() !== today) {
      finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
      finalTokenEntry.lastRefreshed = now;
    }

    // 주간 토큰 리셋 (1000자 모드)
    if (finalTokenEntry.lastWeeklyRefreshed < monday) {
      finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
      finalTokenEntry.lastWeeklyRefreshed = monday;
    }

    await finalTokenEntry.save();

    res.json({
      tokens_300: finalTokenEntry.tokens_300,
      tokens_1000: finalTokenEntry.tokens_1000,
      goldenKeys: finalTokenEntry.goldenKeys,
      lastRefreshed: finalTokenEntry.lastRefreshed,
      lastWeeklyRefreshed: finalTokenEntry.lastWeeklyRefreshed,
    });
  } catch (error) {
    console.error("❌ 토큰 조회 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
});

// ✍ UID로 해당 유저의 토큰 히스토리 조회
router.get("/history/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const history = await UserTokenHistory.findOne({ uid });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "토큰 히스토리 조회 실패" });
  }
});

module.exports = router;
