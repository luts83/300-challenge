// server/routes/auth.js
const express = require("express");
const router = express.Router();
const admin = require("../firebaseAdmin");
const {
  checkEmailAccess,
  detectNonWhitelistedUserActivity,
} = require("../controllers/userController");
const User = require("../models/User");
const { sendWelcomeEmail } = require("../utils/welcomeEmailService");

router.post("/login", async (req, res) => {
  const { idToken } = req.body;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    const uid = decoded.uid;
    const displayName = decoded.name || email.split("@")[0];

    // ✅ User document가 없으면 자동 생성 (중복 키 에러 처리)
    console.log("🔍 [서버 디버깅] 사용자 찾기 시작:", { uid, email });
    let user = await User.findOne({ uid });
    console.log("🔍 [서버 디버깅] UID로 찾은 사용자:", user ? "존재" : "없음");

    // 이메일로도 중복 체크 (Firebase UID 변경 대응)
    let userByEmail = null;
    if (!user) {
      userByEmail = await User.findOne({ email });
      console.log(
        "🔍 [서버 디버깅] 이메일로 찾은 사용자:",
        userByEmail ? "존재" : "없음"
      );
    }

    let isNewUser = false;

    if (!user && !userByEmail) {
      try {
        user = await User.create({
          uid,
          email,
          displayName,
          feedbackNotification: true, // 기본값
        });
        isNewUser = true;
        console.log("🔍 [서버 디버깅] 신규 사용자 생성 완료:", {
          uid,
          email,
          isNewUser,
        });

        // 웰컴 이메일은 클라이언트에서 회원가입 시 전송
      } catch (createError) {
        console.error("사용자 생성 실패:", createError);
        throw createError;
      }
    } else if (userByEmail) {
      // 이메일로 찾은 기존 사용자 - UID 업데이트
      console.log(
        "🔍 [서버 디버깅] 이메일로 기존 사용자 발견, UID 업데이트:",
        userByEmail.email
      );
      user = userByEmail;
      user.uid = uid;
      await user.save();

      // 7일 이내인지 확인
      const joinDate = new Date(user.createdAt);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isWithinSevenDays = daysDiff < 7;

      console.log("🔍 [서버 디버깅] 기존 사용자 7일 체크:", {
        joinDate: joinDate.toISOString(),
        now: now.toISOString(),
        daysDiff,
        isWithinSevenDays,
      });

      // 7일 이내면 신규 사용자로 분류
      if (isWithinSevenDays) {
        isNewUser = true;
        console.log(
          "🔍 [서버 디버깅] 7일 이내 기존 사용자를 신규 사용자로 분류"
        );
      } else {
        console.log("🔍 [서버 디버깅] 7일 경과한 기존 사용자");
      }
    } else {
      // UID로 찾은 기존 사용자
      // 7일 이내인지 확인
      const joinDate = new Date(user.createdAt);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isWithinSevenDays = daysDiff < 7;

      console.log("🔍 [서버 디버깅] 기존 사용자 7일 체크:", {
        joinDate: joinDate.toISOString(),
        now: now.toISOString(),
        daysDiff,
        isWithinSevenDays,
      });

      // 7일 이내면 신규 사용자로 분류
      if (isWithinSevenDays) {
        isNewUser = true;
        console.log(
          "🔍 [서버 디버깅] 7일 이내 기존 사용자를 신규 사용자로 분류"
        );
      } else {
        console.log("🔍 [서버 디버깅] 7일 경과한 기존 사용자");
      }
    }

    // 비화이트리스트 유저 활동 로깅
    await detectNonWhitelistedUserActivity("로그인", {
      email: email,
      displayName: displayName,
      uid: uid,
    });

    // ✅ 이메일 허용 체크 먼저!
    // if (!checkEmailAccess(email)) {
    //   console.warn("허용되지 않은 이메일 시도:", email);
    //   // ✅ 절대 쿠키 설정 없이 종료해야 함
    //   return res.status(403).json({
    //     message: "현재는 초대된 사용자만 접근할 수 있습니다.",
    //   });
    // }

    // ✅ 허용된 이메일만 쿠키 설정
    res.cookie("token", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 1000 * 60 * 60 * 24,
    });

    console.log("🔍 [서버 디버깅] 최종 응답:", { uid, email, isNewUser });
    return res.status(200).json({ uid, email, isNewUser });
  } catch (error) {
    console.error("Login error:", error);
    // ✅ 실패 시 쿠키도 남기지 않도록 종료
    return res.status(401).json({ message: "인증 실패" });
  }
});

const fetchAllowedEmails = require("../utils/fetchAllowedEmails");

router.get("/allowed-emails", async (req, res) => {
  try {
    const emails = await fetchAllowedEmails();
    res.json({ emails });
  } catch (error) {
    console.error("✅ 이메일 목록 로딩 실패:", error);
    res.status(500).json({ message: "이메일 목록 불러오기 실패" });
  }
});

module.exports = router;
