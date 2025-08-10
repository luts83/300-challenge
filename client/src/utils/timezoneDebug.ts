// client/src/utils/timezoneDebug.ts

interface TimezoneInfo {
  timezone: string;
  offset: number;
  currentTime: string;
  localTime: string;
}

/**
 * 현재 브라우저의 시간대 정보를 디버깅하기 위한 함수
 */
export const debugTimezone = (): TimezoneInfo => {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = now.getTimezoneOffset();

  console.log('=== 시간대 디버깅 정보 ===');
  console.log('현재 시간:', now.toISOString());
  console.log('로컬 시간:', now.toString());
  console.log('시간대:', timezone);
  console.log('getTimezoneOffset():', offset, '분');
  console.log('시간대 설명:', getTimezoneDescription(timezone, offset));
  console.log('========================');

  return {
    timezone,
    offset,
    currentTime: now.toISOString(),
    localTime: now.toString(),
  };
};

/**
 * 시간대 정보를 사람이 읽기 쉬운 형태로 변환
 */
const getTimezoneDescription = (timezone: string, offset: number): string => {
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
  };

  const description = timezoneMap[timezone] || `${timezone} (UTC${sign}${offsetHours})`;
  return description;
};

/**
 * 특정 시간대의 offset을 계산하는 함수
 */
export const getOffsetForTimezone = (timezone: string): number => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + 0 * 60000); // 임시로 UTC+0으로 계산
  const targetOffset = targetTime.getTimezoneOffset();

  return targetOffset;
};

/**
 * 사용자가 올바른 시간대를 사용하고 있는지 확인
 */
export const validateUserTimezone = (): boolean => {
  const { timezone, offset } = debugTimezone();

  // 영국 사용자라면 예상되는 값들
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
    console.warn('브라우저 설정을 확인하거나 시스템 시간대를 영국으로 변경해주세요.');
    return false;
  }

  return true;
};
