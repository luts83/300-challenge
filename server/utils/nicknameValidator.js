// server/utils/nicknameValidator.js

// 부적절한 닉네임 패턴들
const INAPPROPRIATE_PATTERNS = [
  // 익명 관련
  /^익명$/,
  /^anonymous$/i,
  /^anon$/i,
  /^unknown$/i,
  /^guest$/i,
  /^user$/i,
  /^사용자$/,
  /^닉네임$/,
  /^nickname$/i,

  // 숫자만 있는 경우
  /^\d+$/,

  // 특수문자만 있는 경우
  /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/,

  // 너무 짧은 경우 (2글자 미만)
  /^.{0,1}$/,

  // 너무 긴 경우 (20글자 초과)
  /^.{21,}$/,

  // 공백만 있는 경우
  /^\s+$/,

  // 관리자 관련
  /^admin$/i,
  /^administrator$/i,
  /^관리자$/,
  /^운영자$/,

  // 부적절한 단어들
  /^fuck/i,
  /^shit/i,
  /^bitch/i,
  /^ass/i,
  /^dick/i,
  /^pussy/i,
  /^cock/i,
  /^penis/i,
  /^vagina/i,
  /^sex/i,
  /^porn/i,
  /^nude/i,
  /^naked/i,
  /^boob/i,
  /^tits/i,
  /^dick/i,
  /^cock/i,
  /^penis/i,
  /^vagina/i,
  /^sex/i,
  /^porn/i,
  /^nude/i,
  /^naked/i,
  /^boob/i,
  /^tits/i,
];

// 부적절한 닉네임인지 확인
function isInappropriateNickname(nickname) {
  if (!nickname || typeof nickname !== "string") {
    return true;
  }

  const trimmedNickname = nickname.trim();

  // 빈 문자열 체크
  if (trimmedNickname.length === 0) {
    return true;
  }

  // 부적절한 패턴 체크
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(trimmedNickname)) {
      return true;
    }
  }

  return false;
}

// 닉네임 유효성 검사
function validateNickname(nickname) {
  const errors = [];

  if (!nickname || typeof nickname !== "string") {
    errors.push("닉네임을 입력해주세요.");
    return { isValid: false, errors };
  }

  const trimmedNickname = nickname.trim();

  if (trimmedNickname.length === 0) {
    errors.push("닉네임을 입력해주세요.");
    return { isValid: false, errors };
  }

  if (trimmedNickname.length < 2) {
    errors.push("닉네임은 2글자 이상이어야 합니다.");
  }

  if (trimmedNickname.length > 20) {
    errors.push("닉네임은 20글자 이하여야 합니다.");
  }

  if (isInappropriateNickname(trimmedNickname)) {
    errors.push("부적절한 닉네임입니다. 다른 닉네임을 사용해주세요.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    trimmedNickname: trimmedNickname,
  };
}

// 중복 닉네임 체크 (User 모델 사용)
async function checkDuplicateNickname(nickname, excludeUid = null) {
  try {
    const User = require("../models/User");

    // 대소문자 구분 없이 검색 (정규식 사용)
    const query = {
      displayName: {
        $regex: new RegExp(`^${nickname}$`, "i"),
      },
    };

    if (excludeUid) {
      query.uid = { $ne: excludeUid };
    }

    const existingUser = await User.findOne(query);
    return existingUser !== null;
  } catch (error) {
    console.error("중복 닉네임 체크 실패:", error);
    return false;
  }
}

// 기존 부적절한 닉네임 사용자 찾기
async function findUsersWithInappropriateNicknames() {
  try {
    const User = require("../models/User");

    const users = await User.find({});
    const inappropriateUsers = [];

    for (const user of users) {
      if (isInappropriateNickname(user.displayName)) {
        inappropriateUsers.push({
          uid: user.uid,
          email: user.email,
          currentNickname: user.displayName,
          createdAt: user.createdAt,
        });
      }
    }

    return inappropriateUsers;
  } catch (error) {
    console.error("부적절한 닉네임 사용자 조회 실패:", error);
    return [];
  }
}

// 자동 닉네임 생성 (이메일 기반)
function generateAutoNickname(email) {
  if (!email) return null;

  // 이메일에서 @ 앞부분 추출
  const emailPrefix = email.split("@")[0];

  // 특수문자 제거하고 숫자만 있는 경우 처리
  let cleanPrefix = emailPrefix.replace(/[^a-zA-Z가-힣]/g, "");

  // 숫자만 있는 경우 "사용자" + 랜덤 숫자
  if (/^\d+$/.test(cleanPrefix) || cleanPrefix.length === 0) {
    cleanPrefix = "사용자";
  }

  // 길이 조정 (2-20자)
  if (cleanPrefix.length < 2) {
    cleanPrefix = cleanPrefix + "님";
  } else if (cleanPrefix.length > 20) {
    cleanPrefix = cleanPrefix.substring(0, 20);
  }

  // 중복 방지를 위해 랜덤 숫자 추가
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${cleanPrefix}${randomSuffix}`;
}

// 부적절한 닉네임 사용자 일괄 처리
async function migrateInappropriateNicknames() {
  try {
    const User = require("../models/User");

    const inappropriateUsers = await findUsersWithInappropriateNicknames();
    const migrationResults = [];

    for (const user of inappropriateUsers) {
      try {
        // 자동 닉네임 생성
        let newNickname = generateAutoNickname(user.email);

        // 중복 체크 및 재생성
        let attempts = 0;
        while ((await checkDuplicateNickname(newNickname)) && attempts < 10) {
          newNickname = generateAutoNickname(user.email);
          attempts++;
        }

        if (attempts >= 10) {
          // 최후 수단: 타임스탬프 기반 닉네임
          newNickname = `사용자${Date.now()}`;
        }

        // 닉네임 업데이트
        await User.findOneAndUpdate(
          { uid: user.uid },
          {
            displayName: newNickname,
            nicknameMigrated: true,
            nicknameMigratedAt: new Date(),
            originalNickname: user.currentNickname,
          }
        );

        migrationResults.push({
          uid: user.uid,
          email: user.email,
          oldNickname: user.currentNickname,
          newNickname: newNickname,
          success: true,
        });
      } catch (error) {
        console.error(`사용자 ${user.uid} 닉네임 마이그레이션 실패:`, error);
        migrationResults.push({
          uid: user.uid,
          email: user.email,
          oldNickname: user.currentNickname,
          newNickname: null,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      totalUsers: inappropriateUsers.length,
      migratedUsers: migrationResults.filter((r) => r.success).length,
      failedUsers: migrationResults.filter((r) => !r.success).length,
      results: migrationResults,
    };
  } catch (error) {
    console.error("닉네임 마이그레이션 실패:", error);
    throw error;
  }
}

module.exports = {
  isInappropriateNickname,
  validateNickname,
  checkDuplicateNickname,
  findUsersWithInappropriateNicknames,
  generateAutoNickname,
  migrateInappropriateNicknames,
};
