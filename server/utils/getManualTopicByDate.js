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
 * 수동 주제를 날짜 기준으로 계산해서 반환하는 함수
 * @param {string} mode - '300' 또는 '1000'
 * @returns {Object} { topic: string | null, isManualTopic: boolean }
 */
function getManualTopicByDate(mode = "300") {
  const base = new Date(config.TOPIC.BASE_DATE);
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0: 일요일, 6: 토요일
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  // 모드별로 다른 interval 적용
  const interval =
    mode === "1000"
      ? config.TOPIC.INTERVAL_DAYS.MODE_1000
      : config.TOPIC.INTERVAL_DAYS.MODE_300;

  const index = Math.floor(diffDays / interval);

  // 주말인 경우 주말 주제 사용
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const weekendTopics =
      mode === "1000" ? weekendTopics1000 : weekendTopics300;
    const topic = weekendTopics[index % weekendTopics.length];

    if (!topic) {
      logger.info(`📜 ${mode}자 모드 주말 주제 소진! AI 주제로 전환됩니다.`);
      return { topic: null, isManualTopic: false };
    }

    return { topic, isManualTopic: true };
  }

  // 평일인 경우 일반 주제 사용
  const topics = mode === "1000" ? topics1000 : topics300;
  const topic = topics[index % topics.length];

  if (!topic) {
    logger.info(`📜 ${mode}자 모드 평일 주제 소진! AI 주제로 전환됩니다.`);
    return { topic: null, isManualTopic: false };
  }

  return { topic, isManualTopic: true };
}

module.exports = getManualTopicByDate;
