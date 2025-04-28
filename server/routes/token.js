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

    let finalTokenEntry = tokenEntry;
    if (!finalTokenEntry) {
      finalTokenEntry = new Token({
        uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.DAILY_LIMIT_1000,
        bonusTokens: 0, // 보너스 토큰도 초기화
        lastRefreshed: now,
      });
    }

    if (finalTokenEntry.lastRefreshed?.toDateString() !== today) {
      finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
      finalTokenEntry.tokens_1000 = TOKEN.DAILY_LIMIT_1000;
      finalTokenEntry.lastRefreshed = now;
      await finalTokenEntry.save();
    }

    res.json({
      tokens_300: finalTokenEntry.tokens_300,
      tokens_1000: finalTokenEntry.tokens_1000,
      bonusTokens: finalTokenEntry.bonusTokens, // Token 모델의 bonusTokens 사용
      lastRefreshed: finalTokenEntry.lastRefreshed,
    });
  } catch (error) {
    console.error("❌ 토큰 조회 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
