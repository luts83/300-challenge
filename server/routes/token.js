// server/routes/token.js
const express = require("express");
const router = express.Router();
const Token = require("../models/Token");
const { TOKEN } = require("../config");

// ✍ UID로 해당 유저의 토큰 조회 (mode별)
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;
  const mode = req.query.mode || "mode_300";

  try {
    let tokenEntry = await Token.findOne({ uid });
    const now = new Date();
    const today = now.toDateString();

    const defaultLimit =
      mode === "mode_1000" ? TOKEN.DAILY_LIMIT_1000 : TOKEN.DAILY_LIMIT_300;

    if (!tokenEntry) {
      tokenEntry = new Token({
        uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.DAILY_LIMIT_1000,
        lastRefreshed: now,
      });
    }

    if (tokenEntry.lastRefreshed?.toDateString() !== today) {
      tokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
      tokenEntry.tokens_1000 = TOKEN.DAILY_LIMIT_1000;
      tokenEntry.lastRefreshed = now;
    }

    await tokenEntry.save();

    const tokens =
      mode === "mode_1000" ? tokenEntry.tokens_1000 : tokenEntry.tokens_300;

    res.json({ tokens });
  } catch (error) {
    console.error("❌ 토큰 조회 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
