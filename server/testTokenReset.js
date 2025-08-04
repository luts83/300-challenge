const mongoose = require("mongoose");
const Token = require("./models/Token");

async function testTokenReset() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI_DATA || "mongodb://localhost:27017/300challenge"
    );
    console.log("MongoDB 연결 성공");

    // lastWeeklyRefreshed를 지난 주 월요일로 설정 (토큰 충전을 트리거)
    const result = await Token.updateOne(
      { uid: "JWecHBlqYdNovlgO4zzjWhqY42i1" },
      {
        $set: {
          lastWeeklyRefreshed: new Date("2025-07-28T00:00:00.000Z"), // 지난 주 월요일로 설정
        },
      }
    );

    console.log("업데이트 결과:", result);

    // 수정된 토큰 상태 확인
    const updatedToken = await Token.findOne({
      uid: "JWecHBlqYdNovlgO4zzjWhqY42i1",
    });
    console.log("수정된 토큰 상태:", {
      lastWeeklyRefreshed: updatedToken.lastWeeklyRefreshed,
      tokens_300: updatedToken.tokens_300,
      tokens_1000: updatedToken.tokens_1000,
    });

    await mongoose.disconnect();
    console.log("MongoDB 연결 해제");
  } catch (err) {
    console.error("오류:", err);
    await mongoose.disconnect();
  }
}

testTokenReset();
