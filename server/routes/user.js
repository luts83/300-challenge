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

// 프로필 정보 조회 (GET /profile?uid=xxx)
router.get("/profile", async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ message: "uid가 필요합니다." });

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      feedbackNotification: user.feedbackNotification,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    res.status(500).json({ message: "프로필 조회에 실패했습니다." });
  }
});

// 프로필 정보 업데이트 (PATCH /profile)
router.patch("/profile", async (req, res) => {
  const { uid, displayName, feedbackNotification } = req.body;
  if (!uid) return res.status(400).json({ message: "uid가 필요합니다." });

  console.log("프로필 업데이트 요청:", {
    uid,
    displayName,
    feedbackNotification,
  });

  try {
    const updateData = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (feedbackNotification !== undefined) {
      updateData.feedbackNotification = feedbackNotification;
    }

    console.log("업데이트할 데이터:", updateData);

    const user = await User.findOneAndUpdate({ uid }, updateData, {
      new: true,
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // displayName이 변경된 경우 기존 글들과 초안들의 displayName도 일괄 업데이트
    if (updateData.displayName) {
      try {
        const Submission = require("../models/Submission");
        const Draft = require("../models/Draft");

        // 기존 글들 업데이트
        const submissionResult = await Submission.updateMany(
          { "user.uid": uid },
          { "user.displayName": updateData.displayName }
        );
        console.log(
          `기존 글 ${submissionResult.modifiedCount}개 업데이트 완료`
        );

        // 초안들 업데이트
        const draftResult = await Draft.updateMany(
          { "user.uid": uid },
          { "user.displayName": updateData.displayName }
        );
        console.log(`초안 ${draftResult.modifiedCount}개 업데이트 완료`);
      } catch (error) {
        console.error("기존 글/초안 업데이트 실패:", error);
        // 기존 글 업데이트 실패해도 사용자 프로필 업데이트는 성공으로 처리
      }
    }

    console.log("업데이트된 사용자:", {
      uid: user.uid,
      displayName: user.displayName,
      feedbackNotification: user.feedbackNotification,
      updatedAt: user.updatedAt,
    });

    res.json({
      message: "프로필이 업데이트되었습니다.",
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        feedbackNotification: user.feedbackNotification,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("프로필 업데이트 오류:", error);
    res.status(500).json({ message: "프로필 업데이트에 실패했습니다." });
  }
});

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
