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

    // 3. 일별 요약 업데이트
    const currentDate = userHistory.dailySummary?.date
      ? userHistory.dailySummary.date.toISOString().split("T")[0]
      : null;

    if (!currentDate || currentDate !== today) {
      // 새로운 날짜면 일별 요약 초기화
      userHistory.dailySummary = {
        date: new Date(today),
        totalTokens: { mode_300: 0, mode_1000: 0 },
        goldenKeys: 0,
        changes: [],
      };
    }

    // 4. 변경사항 추가 및 토큰 업데이트
    userHistory.dailySummary.changes.push(change);
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

    // 5. 월별 요약 업데이트
    if (
      !userHistory.monthlySummary ||
      userHistory.monthlySummary.year !== year ||
      userHistory.monthlySummary.month !== month
    ) {
      userHistory.monthlySummary = {
        year,
        month,
        totalTokens: { mode_300: 0, mode_1000: 0 },
        goldenKeys: 0,
      };
    }

    userHistory.lastUpdated = now;
    await userHistory.save();

    return userHistory;
  } catch (error) {
    console.error("토큰 히스토리 업데이트 실패:", error);
    throw error;
  }
}

module.exports = { handleTokenChange };
