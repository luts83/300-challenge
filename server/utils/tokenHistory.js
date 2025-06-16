const UserTokenHistory = require("../models/UserTokenHistory");

async function handleTokenChange(uid, change, options = {}) {
  const now = new Date();
  const { type, amount, mode } = change;
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    // 1. 유저의 토큰 히스토리가 있는지 확인
    let userHistory = await UserTokenHistory.findOne({ uid });

    // 2. 없다면 새로 생성
    if (!userHistory) {
      userHistory = await UserTokenHistory.create({
        uid,
        user: {
          email: options.user?.email || "unknown@email.com", // 기본값 설정
          displayName: options.user?.displayName || "익명",
        },
        dailySummary: {
          date: new Date(today),
          totalTokens: { mode_300: 0, mode_1000: 0 },
          goldenKeys: 0,
          changes: [],
        },
        monthlySummary: {
          year,
          month,
          totalTokens: { mode_300: 0, mode_1000: 0 },
          goldenKeys: 0,
        },
      });
    }

    // 3. 토큰 변경 기록 추가
    userHistory.dailySummary.changes.push({
      type,
      amount,
      mode,
      timestamp: now,
    });

    // 4. 토큰 사용량 업데이트
    if (mode === "mode_300") {
      userHistory.dailySummary.totalTokens.mode_300 += amount;
      userHistory.monthlySummary.totalTokens.mode_300 += amount;
    } else if (mode === "mode_1000") {
      userHistory.dailySummary.totalTokens.mode_1000 += amount;
      userHistory.monthlySummary.totalTokens.mode_1000 += amount;
    }

    if (type === "GOLDEN_KEY") {
      userHistory.dailySummary.goldenKeys += amount;
      userHistory.monthlySummary.goldenKeys += amount;
    }

    userHistory.lastUpdated = now;
    await userHistory.save();
  } catch (error) {
    console.warn("토큰 히스토리 업데이트 실패:", error);
  }
}

module.exports = { handleTokenChange };
