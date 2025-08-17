// server/utils/getManualTopicByDate.js
const {
  topics300,
  topics1000,
  weekendTopics300,
  weekendTopics1000,
} = require("../data/manualTopics");
const config = require("../config");
const logger = require("./logger");

/**
 * 사용자 시간대 기준으로 주제를 계산하는 함수
 * @param {string} mode - '300' 또는 '1000'
 * @param {string} timezone - 사용자 시간대 (예: 'Asia/Seoul', 'Europe/London')
 * @param {number} offset - 사용자 시간대 오프셋 (분 단위)
 * @param {Date|string|null} targetDate - 특정 날짜(옵션). 제공되면 해당 날짜 기준으로 계산
 * @returns {Object} { topic: string | null, isManualTopic: boolean }
 */
function getManualTopicByDate(
  mode = "300",
  timezone = "Asia/Seoul",
  offset = 540,
  targetDate = null
) {
  // 기준이 될 날짜 선택 (제공되면 그 날짜, 아니면 현재)
  const baseDate = targetDate ? new Date(targetDate) : new Date();

  // 사용자 로컬 날짜(YYYY-MM-DD)를 timezone 기반으로 안전하게 계산
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(baseDate);

  // 사용자 로컬 00:00을 UTC로 표현한 Date
  const todayLocalStartUtc = new Date(`${todayStr}T00:00:00.000Z`);

  // 요일 계산: 사용자의 현지 요일을 얻기 위해 같은 포맷으로 다시 날짜 생성
  const userNow = new Date(
    baseDate.toLocaleString("en-US", { timeZone: timezone })
  );
  const dayOfWeek = userNow.getDay();

  // 기준 날짜 (UTC 표시된 한국 기준일 고정)
  const base = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");

  // [수정] 정확한 주차 계산 로직으로 변경
  // 기준 날짜부터 오늘까지의 실제 평일과 주말 개수를 정확하게 계산
  let weekdayIndex = 0;
  let cursor = new Date(base);
  while (cursor < todayLocalStartUtc) {
    const d = cursor.getUTCDay();
    if (d >= 1 && d <= 5) {
      // 월~금
      weekdayIndex++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // 주말 인덱스 계산: 기준 날짜부터 오늘까지의 실제 주말 날짜 개수
  let weekendCount = 0;
  cursor = new Date(base);
  while (cursor < todayLocalStartUtc) {
    const d = cursor.getUTCDay();
    if (d === 0 || d === 6) {
      // 일~토
      weekendCount++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (mode === "300") {
    if (isWeekend) {
      const topic = weekendTopics300[weekendCount % weekendTopics300.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    } else {
      const topic = topics300[weekdayIndex % topics300.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    }
  }

  if (mode === "1000") {
    if (isWeekend) {
      const topic = weekendTopics1000[weekendCount % weekendTopics1000.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    } else {
      // 1000자: 주 단위 주제 - 정확한 주차 계산
      const todayMonday = new Date(todayLocalStartUtc);
      todayMonday.setUTCDate(
        todayLocalStartUtc.getUTCDate() - todayLocalStartUtc.getUTCDay() + 1
      );
      const baseMonday = new Date(base);
      baseMonday.setUTCDate(base.getUTCDate() - base.getUTCDay() + 1);

      const weekDiff = Math.floor(
        (todayMonday - baseMonday) / (1000 * 60 * 60 * 24 * 7)
      );

      const topic = topics1000[weekDiff % topics1000.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    }
  }

  return { topic: null, isManualTopic: false };
}

module.exports = getManualTopicByDate;
