// server/utils/timezoneUtils.js

/**
 * 서버 측 통합된 시간대 처리 유틸리티
 * 모든 시간 관련 계산을 일관되게 처리합니다.
 */

/**
 * 간단한 유저 시간대 정보 로깅
 * @param {string} userEmail - 사용자 이메일
 * @param {string} userTimezone - 사용자 시간대
 * @param {number} userOffset - 사용자 UTC 오프셋 (분)
 */
const logUserTime = (userEmail, userTimezone, userOffset) => {
  console.log("🌍 유저 시간:", {
    email: userEmail,
    timezone: userTimezone,
    offset: userOffset,
    time: new Date().toISOString(),
  });
};

/**
 * 사용자 시간대 기준으로 오늘 날짜를 계산하는 공통 함수
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {Date} UTC 기준 Date 객체
 */
const getUserTodayDate = (userOffset = 0) => {
  try {
    const now = new Date();

    // userOffset은 getTimezoneOffset() 값이므로 음수입니다
    // 한국시간(UTC+9)의 경우 userOffset = -540
    // 사용자 시간대의 현재 시간을 계산
    const userTime = new Date(now.getTime() + userOffset * 60 * 1000);

    // 사용자 시간대 기준으로 오늘 날짜의 시작(00:00:00)을 UTC로 계산
    const userDateStart = new Date(
      userTime.getFullYear(),
      userTime.getMonth(),
      userTime.getDate(),
      0,
      0,
      0,
      0
    );

    // UTC 기준으로 변환 (userOffset을 빼서 UTC 시간으로 변환)
    const utcDateStart = new Date(
      userDateStart.getTime() - userOffset * 60 * 1000
    );

    return utcDateStart;
  } catch (error) {
    console.error(
      `Error in getUserTodayDate with userOffset: ${userOffset}`,
      error
    );
    // 에러 발생 시 현재 날짜 반환
    return new Date();
  }
};

/**
 * 사용자 시간대 기준으로 특정 날짜의 날짜를 계산하는 함수
 * @param {Date} date - 기준 날짜
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {Date} UTC 기준 Date 객체
 */
const getUserDateString = (date, userOffset = 0) => {
  // ✅ 영국 시간(UTC+0)을 기본값으로 변경
  // userOffset은 getTimezoneOffset() 값이므로 음수입니다
  // 사용자 시간대의 해당 날짜를 계산 (수정: -를 +로 변경)
  const userTime = new Date(date.getTime() + userOffset * 60 * 1000);

  // 사용자 시간대 기준으로 해당 날짜의 시작(00:00:00)을 UTC로 변환
  const userDateStart = new Date(
    userTime.getFullYear(),
    userTime.getMonth(),
    userTime.getDate(),
    0,
    0,
    0,
    0
  );

  // 사용자 시간대 기준 날짜를 UTC로 변환
  return new Date(userDateStart.getTime() + userOffset * 60 * 1000);
};

/**
 * UTC 시간을 사용자 시간대로 변환합니다
 * @param {string} utcDateString - UTC 시간 문자열
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {Date} 사용자 시간대의 Date 객체
 */
const convertUTCToUserTime = (utcDateString, userOffset) => {
  const utcDate = new Date(utcDateString);

  // userOffset은 getTimezoneOffset() 값이므로 음수입니다
  // UTC 시간에서 사용자 시간대로 변환하려면 offset을 더해야 합니다
  const userTime = new Date(utcDate.getTime() + userOffset * 60 * 1000);

  return userTime;
};

/**
 * 사용자 시간을 UTC로 변환합니다
 * @param {Date} userDate - 사용자 시간대의 Date 객체
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {Date} UTC Date 객체
 */
const convertUserTimeToUTC = (userDate, userOffset) => {
  // 사용자 시간을 UTC로 변환하려면 offset을 빼야 합니다
  const utcDate = new Date(userDate.getTime() + userOffset * 60 * 1000);

  return utcDate;
};

/**
 * 사용자 시간대 기준으로 현재 주의 월요일을 계산합니다
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {Date} UTC 기준 월요일 Date 객체
 */
const getUserMonday = (userOffset = 0) => {
  try {
    const now = new Date();
    const userTime = new Date(now.getTime() + userOffset * 60 * 1000);

    // userTime이 유효한지 확인
    if (isNaN(userTime.getTime())) {
      console.warn(
        `Invalid userTime for userOffset: ${userOffset}, falling back to current date`
      );
      return new Date();
    }

    const dayOfWeek = userTime.getDay(); // 0=일요일, 1=월요일, ...

    let monday;
    if (dayOfWeek === 0) {
      // 일요일인 경우: 이전 주 월요일 (7일 전)
      monday = new Date(
        Date.UTC(
          userTime.getUTCFullYear(),
          userTime.getUTCMonth(),
          userTime.getUTCDate() - 6
        )
      );
    } else {
      // 월요일~토요일인 경우: 이번 주 월요일
      monday = new Date(
        Date.UTC(
          userTime.getUTCFullYear(),
          userTime.getUTCMonth(),
          userTime.getUTCDate() - dayOfWeek + 1
        )
      );
    }

    // 결과가 유효한 Date 객체인지 확인
    if (isNaN(monday.getTime())) {
      console.warn(
        `Invalid monday result for userOffset: ${userOffset}, falling back to current date`
      );
      return new Date();
    }

    return monday;
  } catch (error) {
    console.error(
      `Error in getUserMonday with userOffset: ${userOffset}`,
      error
    );
    // 에러 발생 시 현재 날짜 반환
    return new Date();
  }
};

/**
 * 사용자 시간대 기준으로 오늘 날짜를 문자열로 반환하는 함수
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
const getUserTodayDateString = (userOffset = 0) => {
  try {
    // 사용자 시간대 기준으로 현재 시간 계산
    const now = new Date();
    const userTime = new Date(now.getTime() + userOffset * 60 * 1000);

    // 사용자 시간대 기준으로 날짜 구성 (toISOString() 사용하지 않음)
    const year = userTime.getFullYear();
    const month = String(userTime.getMonth() + 1).padStart(2, "0");
    const day = String(userTime.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(
      `Error in getUserTodayDateString with userOffset: ${userOffset}`,
      error
    );
    // 에러 발생 시 현재 날짜 문자열 반환
    return new Date().toISOString().slice(0, 10);
  }
};

/**
 * 사용자 시간대 기준으로 특정 날짜를 문자열로 반환하는 함수
 * @param {Date} date - 기준 날짜
 * @param {number} userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
const getUserDateStringFormatted = (date, userOffset = 0) => {
  const userDate = getUserDateString(date, userOffset);
  return userDate.toISOString().slice(0, 10);
};

/**
 * UTC 오프셋을 기반으로 대략적인 위치 정보를 반환합니다
 * @param {number} offsetHours - UTC 기준 시간 차이 (시간 단위)
 * @returns {string} 위치 정보
 */
const getLocationByOffset = (offsetHours) => {
  const locationMap = {
    "-12": "🇺🇸 하와이",
    "-11": "🇺🇸 알래스카",
    "-10": "🇺🇸 하와이",
    "-9": "🇺🇸 알래스카",
    "-8": "🇺🇸 로스앤젤레스",
    "-7": "🇺🇸 덴버",
    "-6": "🇺🇸 시카고",
    "-5": "🇺🇸 뉴욕",
    "-4": "🇺🇸 뉴욕 (서머타임)",
    "-3": "🇧🇷 상파울루",
    "-2": "🇧🇷 상파울루 (서머타임)",
    "-1": "🇵🇹 아조레스",
    0: "🇬🇧 런던",
    1: "🇬🇧 런던 (서머타임) / 🇫🇷 파리 / 🇩🇪 베를린",
    2: "🇺🇦 키예프 / 🇹🇷 이스탄불",
    3: "🇷🇺 모스크바",
    4: "🇷🇺 모스크바 (서머타임)",
    5: "🇮🇳 뭄바이",
    5.5: "🇮🇳 뭄바이",
    6: "🇰🇿 알마티",
    7: "🇹🇭 방콕",
    8: "🇨🇳 베이징 / 🇭🇰 홍콩",
    9: "🇰🇷 서울 / 🇯🇵 도쿄",
    10: "🇦🇺 시드니",
    11: "🇦🇺 시드니 (서머타임)",
    12: "🇳🇿 오클랜드",
    13: "🇳🇿 오클랜드 (서머타임)",
  };

  // 가장 가까운 오프셋 찾기
  const closestOffset = Object.keys(locationMap).reduce((prev, curr) => {
    return Math.abs(curr - offsetHours) < Math.abs(prev - offsetHours)
      ? curr
      : prev;
  });

  return locationMap[closestOffset] || `알 수 없는 지역`;
};

/**
 * 시간대 정보를 사람이 읽기 쉬운 형태로 변환합니다
 * @param {string} timezone - 시간대 문자열
 * @param {number} offset - UTC 오프셋 (분 단위)
 * @returns {string} 읽기 쉬운 시간대 설명
 */
const getTimezoneDescription = (timezone, offset) => {
  const offsetHours = Math.abs(offset) / 60;
  const sign = offset <= 0 ? "+" : "-";

  const timezoneMap = {
    "Asia/Seoul": "🇰🇷 한국 (UTC+9)",
    "Europe/London": "🇬🇧 영국 (UTC+0/+1)",
    "America/New_York": "🇺🇸 뉴욕 (UTC-5/-4)",
    "America/Los_Angeles": "🇺🇸 로스앤젤레스 (UTC-8/-7)",
    "Europe/Paris": "🇫🇷 파리 (UTC+1/+2)",
    "Asia/Tokyo": "🇯🇵 일본 (UTC+9)",
    "Australia/Sydney": "🇦🇺 시드니 (UTC+10/+11)",
  };

  return timezoneMap[timezone] || `${timezone} (UTC${sign}${offsetHours})`;
};

/**
 * 시간대 디버깅 정보를 출력합니다
 * @param {string} userEmail - 사용자 이메일
 * @param {string} timezone - 사용자 시간대
 * @param {number} offset - 사용자 UTC 오프셋
 */
const logTimezoneInfo = (userEmail, timezone, offset) => {
  const offsetHours = -offset / 60;
  const locationInfo = getLocationByOffset(offsetHours);

  console.log(
    `[시간대] ${userEmail}: UTC${
      offsetHours >= 0 ? "+" : ""
    }${offsetHours} (${locationInfo})`
  );
};

module.exports = {
  getUserTodayDate,
  getUserDateString,
  getUserTodayDateString,
  getUserDateStringFormatted,
  convertUTCToUserTime,
  convertUserTimeToUTC,
  getUserMonday,
  getLocationByOffset,
  getTimezoneDescription,
  logTimezoneInfo,
  logUserTime,
};
