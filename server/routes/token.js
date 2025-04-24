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
    // 두 모델에서 동시에 데이터 조회
    const [tokenEntry, streakEntry] = await Promise.all([
      Token.findOne({ uid }),
      WritingStreak.findOne({ uid }),
    ]);

    const now = new Date();
    const today = now.toDateString();

    let finalTokenEntry = tokenEntry;
    if (!finalTokenEntry) {
      finalTokenEntry = new Token({
        uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.DAILY_LIMIT_1000,
        lastRefreshed: now,
      });
    }

    if (finalTokenEntry.lastRefreshed?.toDateString() !== today) {
      finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
      finalTokenEntry.tokens_1000 = TOKEN.DAILY_LIMIT_1000;
      finalTokenEntry.lastRefreshed = now;
      await finalTokenEntry.save();
    }

    // WritingStreak의 bonusTokens와 함께 응답
    res.json({
      tokens_300: finalTokenEntry.tokens_300,
      tokens_1000: finalTokenEntry.tokens_1000,
      bonusTokens: streakEntry?.bonusTokens || 0,
      lastRefreshed: finalTokenEntry.lastRefreshed,
    });
  } catch (error) {
    console.error("❌ 토큰 조회 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
