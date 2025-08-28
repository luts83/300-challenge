// routes/user.js

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");
const {
  validateNickname,
  checkDuplicateNickname,
  findUsersWithInappropriateNicknames,
  migrateInappropriateNicknames,
} = require("../utils/nicknameValidator");

// 모든 user 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

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
  const { uid, feedbackNotification } = req.body;
  let { displayName } = req.body;
  if (!uid) return res.status(400).json({ message: "uid가 필요합니다." });

  console.log("프로필 업데이트 요청:", {
    uid,
    displayName,
    feedbackNotification,
  });

  try {
    // 닉네임 변경이 있는 경우 검증
    if (displayName !== undefined) {
      const validation = validateNickname(displayName);
      if (!validation.isValid) {
        return res.status(400).json({
          message: "닉네임이 유효하지 않습니다.",
          errors: validation.errors,
        });
      }

      // 중복 닉네임 체크
      const isDuplicate = await checkDuplicateNickname(
        validation.trimmedNickname,
        uid
      );
      if (isDuplicate) {
        return res.status(400).json({
          message: "이미 사용 중인 닉네임입니다.",
        });
      }

      // 검증된 닉네임으로 업데이트
      displayName = validation.trimmedNickname;
    }

    const updateData = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (feedbackNotification !== undefined) {
      updateData.feedbackNotification = feedbackNotification;
    }

    console.log("업데이트할 데이터:", updateData);

    // 업데이트할 데이터가 없으면 현재 사용자 정보만 반환
    if (Object.keys(updateData).length === 0) {
      const user = await User.findOne({ uid });
      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json({
        message: "변경사항이 없습니다.",
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          feedbackNotification: user.feedbackNotification,
          updatedAt: user.updatedAt,
        },
      });
    }

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

// 중복 닉네임 체크 (GET /check-nickname?nickname=xxx)
router.get("/check-nickname", async (req, res) => {
  const { nickname } = req.query;
  if (!nickname)
    return res.status(400).json({ message: "nickname이 필요합니다." });

  try {
    const isDuplicate = await checkDuplicateNickname(nickname);
    res.json({ isDuplicate });
  } catch (error) {
    console.error("중복 닉네임 체크 오류:", error);
    res.status(500).json({ message: "중복 닉네임 체크에 실패했습니다." });
  }
});

// 부적절한 닉네임 사용자 조회 (관리자용)
router.get("/inappropriate-nicknames", async (req, res) => {
  try {
    const users = await findUsersWithInappropriateNicknames();
    res.json({
      count: users.length,
      users: users,
    });
  } catch (error) {
    console.error("부적절한 닉네임 사용자 조회 오류:", error);
    res.status(500).json({ message: "사용자 조회에 실패했습니다." });
  }
});

// 닉네임 마이그레이션 실행 (관리자용)
router.post("/migrate-nicknames", async (req, res) => {
  try {
    const result = await migrateInappropriateNicknames();
    res.json({
      message: "닉네임 마이그레이션이 완료되었습니다.",
      result: result,
    });
  } catch (error) {
    console.error("닉네임 마이그레이션 오류:", error);
    res.status(500).json({ message: "닉네임 마이그레이션에 실패했습니다." });
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
