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
  // 사용자 로컬 날짜(YYYY-MM-DD)를 timezone 기반으로 안전하게 계산
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 사용자 로컬 00:00을 UTC로 표현한 Date
  const todayLocalStartUtc = new Date(`${todayStr}T00:00:00.000Z`);

  // 요일 계산: 사용자의 현지 요일을 얻기 위해 같은 포맷으로 다시 날짜 생성
  const userNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone })
  );
  const dayOfWeek = userNow.getDay();

  // 기준 날짜 (UTC 표시된 한국 기준일 고정)
  const base = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");

  // 주차 계산을 위해 로컬 시작 시각 기준으로 날짜 차이를 계산
  const diffDays = Math.floor(
    (todayLocalStartUtc - base) / (1000 * 60 * 60 * 24)
  );
  const weekDiff = Math.floor(diffDays / 7);

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 평일 인덱스: 주차별 5개 (월~금)
  const weekdayIndex =
    weekDiff * 5 + (dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : 0);

  if (mode === "300") {
    if (isWeekend) {
      const weekendCount = weekDiff * 2;
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
      const weekendCount = weekDiff * 2;
      const topic = weekendTopics1000[weekendCount % weekendTopics1000.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    } else {
      // 1000자: 주 단위 주제
      const topic = topics1000[weekDiff % topics1000.length];
      return topic
        ? { topic, isManualTopic: true }
        : { topic: null, isManualTopic: false };
    }
  }

  return { topic: null, isManualTopic: false };
}

module.exports = getManualTopicByDate;
