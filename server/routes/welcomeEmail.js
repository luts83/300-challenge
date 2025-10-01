const express = require("express");
const router = express.Router();
const { sendWelcomeEmail } = require("../utils/welcomeEmailService");
const User = require("../models/User");

// 웰컴 이메일 전송 API
router.post("/send", async (req, res) => {
  try {
    const { email, displayName, emailType = "welcome" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "이메일이 필요합니다." });
    }

    // 사용자 정보 조회 또는 생성
    let user = await User.findOne({ email });
    if (!user) {
      // 사용자가 없으면 임시 사용자 객체 생성
      user = {
        email,
        displayName: displayName || email.split("@")[0],
        uid: "temp-" + Date.now(),
      };
    }

    // 이메일 전송
    const success = await sendWelcomeEmail(user, emailType);

    if (success) {
      res.json({ message: `${emailType} 이메일이 성공적으로 전송되었습니다.` });
    } else {
      res.status(500).json({ error: "이메일 전송에 실패했습니다." });
    }
  } catch (error) {
    console.error("웰컴 이메일 전송 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 테스트용 이메일 전송 API (개발 환경에서만)
router.post("/test", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "개발 환경에서만 사용 가능합니다." });
  }

  try {
    const { email, emailType = "welcome" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "이메일이 필요합니다." });
    }

    // 테스트용 사용자 객체 생성
    const testUser = {
      email: email,
      displayName: email.split("@")[0],
    };

    // 이메일 전송
    const success = await sendWelcomeEmail(testUser, emailType);

    if (success) {
      res.json({
        message: `테스트 ${emailType} 이메일이 성공적으로 전송되었습니다.`,
      });
    } else {
      res.status(500).json({ error: "이메일 전송에 실패했습니다." });
    }
  } catch (error) {
    console.error("테스트 이메일 전송 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;
