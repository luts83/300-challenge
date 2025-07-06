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
  offset = -540
) {
  // 사용자 시간대 기준으로 현재 날짜 계산
  const now = new Date();
  const userTime = new Date(now.getTime() - offset * 60 * 1000);

  // 기준일을 사용자 시간대 기준으로 설정
  const baseDate = new Date(config.TOPIC.BASE_DATE + "T00:00:00.000Z");
  const base = new Date(baseDate.getTime() - offset * 60 * 1000);

  const today = userTime;
  const dayOfWeek = today.getDay(); // 0: 일요일, 6: 토요일
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  // 모드별로 다른 interval 적용
  const interval =
    mode === "1000"
      ? config.TOPIC.INTERVAL_DAYS.MODE_1000
      : config.TOPIC.INTERVAL_DAYS.MODE_300;

  const index = Math.floor(diffDays / interval);

  // 1000자 모드는 주중/주말 구분 없이 일주일 동안 하나의 주제 사용
  if (mode === "1000") {
    const topic = topics1000[index % topics1000.length];
    if (!topic) {
      logger.info(`📜 1000자 모드 주제 소진! AI 주제로 전환됩니다.`);
      return { topic: null, isManualTopic: false };
    }
    return { topic, isManualTopic: true };
  }

  // 300자 모드는 기존 로직 유지 (주말에는 주말 주제 사용)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const topic = weekendTopics300[index % weekendTopics300.length];
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
