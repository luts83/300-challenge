const express = require("express");
const router = express.Router();
const Token = require("../models/Token");
const { TOKEN } = require("../config"); // ✅ 설정값 불러오기

// UID로 해당 유저의 토큰 조회
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    let tokenEntry = await Token.findOne({ uid });

    // 없으면 새로 생성
    if (!tokenEntry) {
      tokenEntry = new Token({
        uid,
        tokens: TOKEN.DAILY_LIMIT, // ✅ 설정값으로 초기화
        lastRefreshed: new Date(),
      });
      await tokenEntry.save();
    }

    res.json({ tokens: tokenEntry.tokens });
  } catch (error) {
    console.error("❌ 토큰 조회 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
