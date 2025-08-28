// client/src/utils/timezoneUtils.ts

/**
 * 통합된 시간대 처리 유틸리티
 * 모든 시간 관련 계산을 일관되게 처리합니다.
 */

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  currentTime: string;
  localTime: string;
}

/**
 * 현재 브라우저의 시간대 정보를 가져옵니다
 */
export const getCurrentTimezoneInfo = (): TimezoneInfo => {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = now.getTimezoneOffset();

  return {
    timezone,
    offset,
    currentTime: now.toISOString(),
    localTime: now.toString(),
  };
};

/**
 * UTC 시간을 사용자 시간대로 변환합니다
 * @param utcDateString - UTC 시간 문자열 (예: "2025-08-11T09:20:54.414Z")
 * @param userTimezone - 사용자 시간대 (예: "Asia/Seoul")
 * @param userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns 사용자 시간대의 Date 객체
 */
export const convertUTCToUserTime = (
  utcDateString: string,
  userTimezone: string,
  userOffset: number
): Date => {
  const utcDate = new Date(utcDateString);

  // userOffset은 getTimezoneOffset() 값이므로 음수입니다
  // UTC 시간에서 사용자 시간대로 변환하려면 offset을 더해야 합니다
  const userTime = new Date(utcDate.getTime() - userOffset * 60 * 1000);

  return userTime;
};

/**
 * 사용자 시간을 UTC로 변환합니다
 * @param userDate - 사용자 시간대의 Date 객체
 * @param userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns UTC Date 객체
 */
export const convertUserTimeToUTC = (userDate: Date, userOffset: number): Date => {
  // 사용자 시간을 UTC로 변환하려면 offset을 빼야 합니다
  const utcDate = new Date(userDate.getTime() + userOffset * 60 * 1000);

  return utcDate;
};

/**
 * 사용자 시간대 기준으로 오늘 날짜를 계산합니다
 * @param userOffset - 사용자 UTC 오프셋 (분 단위, getTimezoneOffset 값)
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export const getUserTodayDate = (userOffset: number): string => {
  const now = new Date();
  const userTime = new Date(now.getTime() - userOffset * 60 * 1000);

  return userTime.toISOString().slice(0, 10);
};

/**
 * 시간대 정보를 사람이 읽기 쉬운 형태로 변환합니다
 */
export const getTimezoneDescription = (timezone: string, offset: number): string => {
  const offsetHours = Math.abs(offset) / 60;
  const sign = offset <= 0 ? '+' : '-';

  const timezoneMap: { [key: string]: string } = {
    'Asia/Seoul': '🇰🇷 한국 (UTC+9)',
    'Europe/London': '🇬🇧 영국 (UTC+0/+1)',
    'America/New_York': '🇺🇸 뉴욕 (UTC-5/-4)',
    'America/Los_Angeles': '🇺🇸 로스앤젤레스 (UTC-8/-7)',
    'Europe/Paris': '🇫🇷 파리 (UTC+1/+2)',
    'Asia/Tokyo': '🇯🇵 일본 (UTC+9)',
    'Australia/Sydney': '🇦🇺 시드니 (UTC+10/+11)',
    'Asia/Shanghai': '🇨🇳 상하이 (UTC+8)',
    'Asia/Singapore': '🇸🇬 싱가포르 (UTC+8)',
    'Asia/Hong_Kong': '🇭🇰 홍콩 (UTC+8)',
    'Asia/Bangkok': '🇹🇭 태국 (UTC+7)',
    'Asia/Jakarta': '🇮🇩 인도네시아 (UTC+7)',
    'Asia/Kolkata': '🇮🇳 인도 (UTC+5:30)',
    'Asia/Dubai': '🇦🇪 두바이 (UTC+4)',
    'Europe/Moscow': '🇷🇺 모스크바 (UTC+3)',
    'Europe/Berlin': '🇩🇪 독일 (UTC+1/+2)',
    'Europe/Rome': '🇮🇹 이탈리아 (UTC+1/+2)',
    'Europe/Madrid': '🇪🇸 스페인 (UTC+1/+2)',
    'America/Toronto': '🇨🇦 토론토 (UTC-5/-4)',
    'America/Vancouver': '🇨🇦 밴쿠버 (UTC-8/-7)',
    'America/Sao_Paulo': '🇧🇷 상파울루 (UTC-3/-2)',
    'Africa/Cairo': '🇪🇬 이집트 (UTC+2)',
    'Africa/Johannesburg': '🇿🇦 남아프리카 (UTC+2)',
  };

  // Etc/GMT 형식 처리
  if (timezone.startsWith('Etc/GMT')) {
    const offset = timezone.replace('Etc/GMT', '');
    const offsetNum = parseInt(offset);

    if (offsetNum === -9) return '🇰🇷 한국 (UTC+9)';
    if (offsetNum === -8) return '🇺🇸 로스앤젤레스 (UTC+8)';
    if (offsetNum === -5) return '🇺🇸 뉴욕 (UTC+5)';
    if (offsetNum === 0) return '🇬🇧 영국 (UTC+0)';
    if (offsetNum === 1) return '🇫🇷 파리 (UTC+1)';
    if (offsetNum === 9) return '🇯🇵 일본 (UTC+9)';

    return `UTC${offsetNum >= 0 ? '+' : ''}${offsetNum}`;
  }

  return timezoneMap[timezone] || `${timezone} (UTC${sign}${offsetHours})`;
};

/**
 * 시간대별 위치 정보를 반환합니다
 */
export const getLocationByTimezone = (timezone: string): string => {
  const timezoneMap: { [key: string]: string } = {
    'Asia/Seoul': '🇰🇷 한국',
    'Asia/Tokyo': '🇯🇵 일본',
    'America/New_York': '🇺🇸 뉴욕',
    'America/Los_Angeles': '🇺🇸 로스앤젤레스',
    'Europe/London': '🇬🇧 영국',
    'Europe/Paris': '🇫🇷 파리',
    'Australia/Sydney': '🇦🇺 시드니',
    'Asia/Shanghai': '🇨🇳 상하이',
    'Asia/Singapore': '🇸🇬 싱가포르',
  };

  // Etc/GMT 형식 처리 (예: Etc/GMT-9 → 한국, Etc/GMT+0 → 영국)
  if (timezone.startsWith('Etc/GMT')) {
    const offset = timezone.replace('Etc/GMT', '');
    const offsetNum = parseInt(offset);

    if (offsetNum === -9) return '🇰🇷 한국';
    if (offsetNum === -8) return '🇺🇸 로스앤젤레스';
    if (offsetNum === -5) return '🇺🇸 뉴욕';
    if (offsetNum === 0) return '🇬🇧 영국';
    if (offsetNum === 1) return '🇫🇷 파리';
    if (offsetNum === 9) return '🇯🇵 일본';

    return `UTC${offsetNum >= 0 ? '+' : ''}${offsetNum}`;
  }

  return timezoneMap[timezone] || timezone;
};

/**
 * 영국 시간대 사용자 검증
 */
export const validateUKTimezone = (): boolean => {
  const { timezone, offset } = getCurrentTimezoneInfo();

  const expectedUKValues = [
    'Europe/London',
    'Europe/Belfast',
    'Europe/Guernsey',
    'Europe/Isle_of_Man',
    'Europe/Jersey',
  ];

  const isUKTimezone = expectedUKValues.includes(timezone);
  const isUKOffset = offset === 0 || offset === -60; // UTC+0 또는 UTC+1 (서머타임)

  if (!isUKTimezone || !isUKOffset) {
    console.warn('⚠️ 시간대 설정이 영국과 다릅니다!');
    console.warn('현재 시간대:', timezone);
    console.warn('현재 offset:', offset);
    return false;
  }

  return true;
};
