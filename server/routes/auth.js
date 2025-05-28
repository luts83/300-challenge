// server/routes/auth.js
const express = require("express");
const router = express.Router();
const admin = require("../firebaseAdmin");
const { checkEmailAccess } = require("../controllers/userController");

router.post("/login", async (req, res) => {
  const { idToken } = req.body;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;

    // ✅ 이메일 허용 체크 먼저!
    if (!checkEmailAccess(email)) {
      console.warn("허용되지 않은 이메일 시도:", email);
      // ✅ 절대 쿠키 설정 없이 종료해야 함
      return res.status(403).json({
        message: "현재는 초대된 사용자만 접근할 수 있습니다.",
      });
    }

    // ✅ 허용된 이메일만 쿠키 설정
    res.cookie("token", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.status(200).json({ uid: decoded.uid, email });
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
