// routes/user.js

const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 임시 인증 미들웨어: 항상 DB의 첫 번째 유저로 인증
const authMiddleware = async (req, res, next) => {
  const testUser = await User.findOne();
  if (!testUser) {
    return res.status(401).json({ message: "테스트 유저가 없습니다." });
  }
  req.user = testUser; // 유저 전체를 req.user에 저장
  next();
};

// 알림 설정 조회 (GET /notification?uid=xxx)
router.get("/notification", async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ message: "uid가 필요합니다." });

  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ feedbackNotification: user.feedbackNotification });
});

// 알림 설정 변경 (PATCH /notification, body: { uid, feedbackNotification })
router.patch("/notification", async (req, res) => {
  const { uid, feedbackNotification } = req.body;
  if (!uid) return res.status(400).json({ message: "uid가 필요합니다." });

  const user = await User.findOneAndUpdate(
    { uid },
    { feedbackNotification },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ feedbackNotification: user.feedbackNotification });
});

module.exports = router;
