const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// 개발 환경에서만 사용 가능
if (process.env.NODE_ENV !== "development") {
  router.use((req, res) => {
    return res.status(404).json({ message: "Not Found" });
  });
}

// 사용자 가입일 시뮬레이션
router.post("/simulate-user-date", async (req, res) => {
  try {
    const { daysAgo } = req.body;

    if (typeof daysAgo !== "number" || daysAgo < 0) {
      return res.status(400).json({ message: "Invalid daysAgo value" });
    }

    // 지정된 일수 전 날짜 생성
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);

    console.log(
      `🔧 [개발자도구] 사용자 가입일을 ${daysAgo}일 전으로 변경:`,
      targetDate.toISOString()
    );

    // MongoDB 컬렉션에서 직접 업데이트
    const db = mongoose.connection.db;
    const result = await db
      .collection("users")
      .updateOne(
        { email: "luts83@hotmail.com" },
        { $set: { createdAt: targetDate } }
      );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 업데이트 후 확인
    const user = await db
      .collection("users")
      .findOne({ email: "luts83@hotmail.com" });

    res.json({
      success: true,
      message: `사용자 가입일을 ${daysAgo}일 전으로 변경했습니다`,
      user: {
        email: user.email,
        createdAt: user.createdAt,
        daysAgo: daysAgo,
      },
    });
  } catch (error) {
    console.error("사용자 가입일 시뮬레이션 실패:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
