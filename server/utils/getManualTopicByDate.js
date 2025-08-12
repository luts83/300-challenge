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

  // 2. 사용자 시간대 기준으로 요일 계산 (UTC가 아닌 사용자 시간대 기준)
  const dayOfWeek = userTime.getDay(); // 사용자 시간대 기준 요일 (0: 일요일, 1: 월요일)

  // 3. 기준 날짜도 UTC로 명확하게 설정합니다.
  const base = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");

  // 4. 사용자 시간대 기준으로 오늘 날짜 계산
  const today = new Date(
    userTime.getFullYear(),
    userTime.getMonth(),
    userTime.getDate()
  );

  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  // [수정] 주차별 주제 계산 로직으로 변경
  // 기준 날짜부터 오늘까지의 주차를 계산
  const baseDate = new Date(base);
  const todayDate = new Date(today);

  // 주차 계산: 기준 날짜부터 오늘까지의 주차 수
  const weekDiff = Math.floor(
    (todayDate - baseDate) / (1000 * 60 * 60 * 24 * 7)
  );

  // 평일 인덱스: 주차별로 5개씩 주제가 있으므로
  const weekdayIndex =
    weekDiff * 5 + (dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : 0);

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 주말 인덱스 계산: 주차별로 계산
  const weekendCount = weekDiff * 2; // 주차별로 주차별로 주말은 2일씩

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
