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
  offset = 540 // ← 수정됨! (한국 시간 UTC+9)
) {
  // 사용자 시간대 기준으로 현재 날짜 계산
  const now = new Date();
  const userTime = new Date(now.getTime() + offset * 60 * 1000);

  // 기준일을 사용자 시간대 기준으로 설정
  const baseDate = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");
  const base = new Date(baseDate.getTime() + offset * 60 * 1000);

  const today = userTime;
  const dayOfWeek = today.getDay(); // 0: 일요일, 6: 토요일
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  // 모드별로 다른 interval 적용
  const interval =
    mode === "1000"
      ? config.TOPIC.INTERVAL_DAYS.MODE_1000
      : config.TOPIC.INTERVAL_DAYS.MODE_300;

  const index = Math.floor(diffDays / interval);

  // 1000자 모드는 평일/주말 구분하여 주제 사용
  if (mode === "1000") {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 주말: 주말 주제 사용
      const weekendCount = Math.floor(diffDays / 7);
      const weekendIndex = weekendCount;
      const topic = weekendTopics1000[weekendIndex % weekendTopics1000.length];
      if (!topic) {
        logger.info(`📜 1000자 모드 주말 주제 소진! AI 주제로 전환됩니다.`);
        return { topic: null, isManualTopic: false };
      }
      return { topic, isManualTopic: true };
    } else {
      // 평일: 평일 주제 사용
      const weekCount = Math.floor(diffDays / 7);
      const weekdayIndex = weekCount;
      const topic = topics1000[weekdayIndex % topics1000.length];
      if (!topic) {
        logger.info(`📜 1000자 모드 평일 주제 소진! AI 주제로 전환됩니다.`);
        return { topic: null, isManualTopic: false };
      }
      return { topic, isManualTopic: true };
    }
  }

  // 300자 모드는 기존 로직 유지 (주말에는 주말 주제 사용)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const weekendCount = Math.floor(diffDays / 7);
    const weekendIndex = weekendCount * 2 + (dayOfWeek === 0 ? 1 : 0); // 토요일=0, 일요일=1
    const topic = weekendTopics300[weekendIndex % weekendTopics300.length];
    if (!topic) {
      logger.info(`📜 300자 모드 주말 주제 소진! AI 주제로 전환됩니다.`);
      return { topic: null, isManualTopic: false };
    }
    return { topic, isManualTopic: true };
  }

  // 300자 모드 평일 주제
  const topic = topics300[index % topics300.length];

  if (!topic) {
    logger.info(`📜 300자 모드 평일 주제 소진! AI 주제로 전환됩니다.`);
    return { topic: null, isManualTopic: false };
  }

  return { topic, isManualTopic: true };
}

module.exports = getManualTopicByDate;
