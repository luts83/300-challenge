const express = require("express");
const router = express.Router();
const { handleSubmit } = require("../controllers/submitController");
const Submission = require("../models/Submission");
const UserToken = require("../models/Token");

// ✍ 글 제출
router.post("/", handleSubmit);

// 🧑 유저 글 조회
router.get("/user/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const submissions = await Submission.find({ "user.uid": uid }).sort({
      submittedAt: -1,
    });
    res.json(submissions);
  } catch (err) {
    console.error("❌ 글 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 🪙 유저 토큰 조회
router.get("/tokens/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const tokenData = await UserToken.findOne({ uid });
    if (!tokenData) {
      return res.status(404).json({ message: "유저 토큰 없음" });
    }

    res.json({ tokens: tokenData.tokens });
  } catch (err) {
    console.error("❌ 토큰 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
