const UserTokenHistory = require("../models/UserTokenHistory");
const User = require("../models/User");

async function handleTokenChange(uid, change, options = {}) {
  const now = new Date();
  const { type, amount, mode } = change;
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    // 1. 최신 사용자 정보 가져오기
    let currentUserInfo = options.user;
    if (
      !currentUserInfo ||
      !currentUserInfo.email ||
      currentUserInfo.email === "unknown@email.com"
    ) {
      try {
        const userDoc = await User.findOne({ uid });
        if (userDoc) {
          currentUserInfo = {
            email: userDoc.email,
            displayName: userDoc.displayName || userDoc.email.split("@")[0],
          };
        }
      } catch (userError) {
        console.warn(`사용자 정보 조회 실패 (uid: ${uid}):`, userError.message);
      }
    }

    // 2. 유저의 토큰 히스토리가 있는지 확인
    let userHistory = await UserTokenHistory.findOne({ uid });

    // 3. 없다면 새로 생성, 있다면 사용자 정보 업데이트
    if (!userHistory) {
      userHistory = await UserTokenHistory.create({
        uid,
        user: {
          email: currentUserInfo?.email || "사용자 정보 없음",
          displayName: currentUserInfo?.displayName || "사용자",
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
    } else {
      // 기존 히스토리가 있으면 사용자 정보 업데이트
      if (currentUserInfo && currentUserInfo.email !== "사용자 정보 없음") {
        userHistory.user.email = currentUserInfo.email;
        userHistory.user.displayName = currentUserInfo.displayName;
      }
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
