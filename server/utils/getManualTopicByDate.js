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
  // 사용자의 실제 시간대 사용 (하드코딩 제거)
  const now = new Date();
  const userTime = new Date(now.getTime() + offset * 60 * 1000);
  const baseDate = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");
  const base = new Date(baseDate.getTime() + offset * 60 * 1000);

  const today = new Date(
    userTime.getFullYear(),
    userTime.getMonth(),
    userTime.getDate()
  );
  const dayOfWeek = today.getDay();
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  // 평일 인덱스(월~금만 카운트, 주말은 건너뜀)
  let weekdayIndex = 0;
  let cursor = new Date(base);
  while (cursor <= today) {
    // <= 로 변경 (오늘 포함)
    const d = cursor.getDay();
    if (d >= 1 && d <= 5) {
      if (
        cursor.getFullYear() === today.getFullYear() &&
        cursor.getMonth() === today.getMonth() &&
        cursor.getDate() === today.getDate()
      ) {
        // 오늘이면 break (오늘 포함)
        break;
      }
      weekdayIndex++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // 주차 계산 (월요일 기준)
  const todayMonday = new Date(today);
  todayMonday.setDate(today.getDate() - today.getDay() + 1);
  const baseMonday = new Date(base);
  baseMonday.setDate(base.getDate() - base.getDay() + 1);
  const weekDiff = Math.floor(
    (todayMonday - baseMonday) / (1000 * 60 * 60 * 24 * 7)
  );

  // 주말 처리
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekendCount = Math.floor(diffDays / 7);

  if (mode === "300") {
    if (isWeekend) {
      const weekendIndex = weekendCount;
      const topic = weekendTopics300[weekendIndex % weekendTopics300.length];
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
      // 날짜만 남기기
      function toDateOnly(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
      const todayDate = toDateOnly(today);
      const baseDateOnly = toDateOnly(base);

      const todayMonday = new Date(todayDate);
      todayMonday.setDate(todayDate.getDate() - todayDate.getDay() + 1);

      const baseMonday = new Date(baseDateOnly);
      baseMonday.setDate(baseDateOnly.getDate() - baseDateOnly.getDay() + 1);

      const weekDiff = Math.floor(
        (todayMonday - baseMonday) / (1000 * 60 * 60 * 24 * 7)
      );
      const topic = topics1000[weekDiff % topics1000.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    }
  }

  return { topic: null, isManualTopic: false }; // fallback
}

module.exports = getManualTopicByDate;
