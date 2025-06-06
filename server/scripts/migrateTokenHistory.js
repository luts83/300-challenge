// server/scripts/migrateTokenHistory.js
const mongoose = require("mongoose");
const TokenHistory = require("../models/TokenHistory");
const UserTokenHistory = require("../models/UserTokenHistory");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function migrateTokenHistory() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error("MONGO_URI가 설정되지 않았습니다.");
    }

    console.log("DB 연결 시도...");
    await mongoose.connect(MONGO_URI);
    console.log("DB 연결 성공");

    console.log("기존 데이터 조회 시작...");
    const oldHistories = await TokenHistory.find().lean();
    console.log(`조회된 데이터: ${oldHistories.length}개`);

    const userHistories = oldHistories.reduce((acc, history) => {
      if (!acc[history.uid]) {
        acc[history.uid] = [];
      }
      acc[history.uid].push(history);
      return acc;
    }, {});

    console.log("데이터 변환 시작...");
    for (const [uid, histories] of Object.entries(userHistories)) {
      const dailySummaries = {};
      const monthlySummaries = {};

      for (const history of histories) {
        const date = new Date(history.timestamp);
        const dayKey = date.toISOString().split("T")[0];
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!dailySummaries[dayKey]) {
          dailySummaries[dayKey] = {
            date: date,
            totalTokens: { mode_300: 0, mode_1000: 0 },
            goldenKeys: 0,
            changes: [],
          };
        }

        if (!monthlySummaries[monthKey]) {
          monthlySummaries[monthKey] = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            totalTokens: { mode_300: 0, mode_1000: 0 },
            goldenKeys: 0,
          };
        }

        // changes 배열에 객체 추가
        dailySummaries[dayKey].changes.push({
          type: history.type,
          amount: history.amount,
          mode: history.mode || "mode_300", // mode가 없는 경우 기본값 설정
          timestamp: history.timestamp,
        });

        if (history.mode === "mode_300") {
          dailySummaries[dayKey].totalTokens.mode_300 += history.amount;
          monthlySummaries[monthKey].totalTokens.mode_300 += history.amount;
        } else if (history.mode === "mode_1000") {
          dailySummaries[dayKey].totalTokens.mode_1000 += history.amount;
          monthlySummaries[monthKey].totalTokens.mode_1000 += history.amount;
        }

        if (history.type === "GOLDEN_KEY") {
          dailySummaries[dayKey].goldenKeys += history.amount;
          monthlySummaries[monthKey].goldenKeys += history.amount;
        }
      }

      console.log(`유저 ${uid} 데이터 저장 중...`);
      await UserTokenHistory.create({
        uid,
        dailySummary: Object.values(dailySummaries)[0],
        monthlySummary: Object.values(monthlySummaries)[0],
        lastUpdated: new Date(),
      });
    }

    console.log("마이그레이션 완료!");
  } catch (error) {
    console.error("마이그레이션 실패:", error);
  } finally {
    await mongoose.disconnect();
    console.log("DB 연결 종료");
  }
}

migrateTokenHistory();
