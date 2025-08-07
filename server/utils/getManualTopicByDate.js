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
 * @returns {Object} { topic: string | null, isManualTopic: boolean }
 */
function getManualTopicByDate(
  mode = "300",
  timezone = "Asia/Seoul",
  offset = 540
) {
  // offset 부호 보정
  offset = -offset;

  // 1. 서버의 현재 시간을 기준으로 사용자의 시간을 계산합니다.
  const now = new Date();
  const userTime = new Date(now.getTime() + offset * 60 * 1000);

  // 2. [핵심 수정] 사용자의 '오늘' 날짜를 서버 시간대가 아닌 UTC 기준으로 생성합니다.
  // 이렇게 하면 어느 국가의 서버에서 실행되어도 항상 동일한 UTC 날짜 객체가 생성됩니다.
  const today = new Date(
    Date.UTC(
      userTime.getUTCFullYear(),
      userTime.getUTCMonth(),
      userTime.getUTCDate()
    )
  );

  // 3. 기준 날짜도 UTC로 명확하게 설정합니다.
  const base = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");

  const dayOfWeek = today.getUTCDay(); // UTC 기준 요일 (0: 일요일, 1: 월요일)
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  // [버그 수정] 평일 인덱스 계산 로직을 단순하고 정확하게 수정합니다.
  let weekdayIndex = 0;
  let cursor = new Date(base);
  while (cursor < today) {
    // 오늘 날짜 직전까지만 반복
    const d = cursor.getUTCDay(); // UTC 요일로 비교
    if (d >= 1 && d <= 5) {
      // 월(1)~금(5)
      weekdayIndex++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1); // UTC 날짜로 하루 증가
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 주말 인덱스 계산: 기준 날짜부터 오늘까지의 주말 날짜 개수 계산
  let weekendCount = 0;
  cursor = new Date(base); // let 제거, 기존 cursor 변수 재사용
  while (cursor < today) {
    const d = cursor.getUTCDay();
    if (d === 0 || d === 6) {
      // 일요일(0) 또는 토요일(6)
      weekendCount++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  let selectedTopic;
  if (mode === "300") {
    if (isWeekend) {
      selectedTopic = weekendTopics300[weekendCount % weekendTopics300.length];
    } else {
      selectedTopic = topics300[weekdayIndex % topics300.length];
    }
  } else if (mode === "1000") {
    // 평일/주말 구분
    if (isWeekend) {
      selectedTopic =
        weekendTopics1000[weekendCount % weekendTopics1000.length];
    } else {
      const todayMonday = new Date(today);
      todayMonday.setUTCDate(today.getUTCDate() - today.getUTCDay() + 1);
      const baseMonday = new Date(base);
      baseMonday.setUTCDate(base.getUTCDate() - base.getUTCDay() + 1);
      const weekDiff = Math.floor(
        (todayMonday - baseMonday) / (1000 * 60 * 60 * 24 * 7)
      );
      selectedTopic = topics1000[weekDiff % topics1000.length];
    }
  }

  if (mode === "300") {
    if (isWeekend) {
      const topic = weekendTopics300[weekendCount % weekendTopics300.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    } else {
      // weekdayIndex가 오늘 주제에 대한 0-based 인덱스가 됩니다.
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
      const todayMonday = new Date(today);
      todayMonday.setUTCDate(today.getUTCDate() - today.getUTCDay() + 1);
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
