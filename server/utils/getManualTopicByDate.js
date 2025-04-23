// server/utils/getManualTopicByDate.js
const { topics300, topics1000 } = require("../data/manualTopics");
const config = require("../config");

/**
 * 수동 주제를 날짜 기준으로 계산해서 반환하는 함수
 * @param {string} mode - '300' 또는 '1000'
 * @returns {string | null}
 */
function getManualTopicByDate(mode = "300") {
  const base = new Date(config.TOPIC.BASE_DATE);
  const today = new Date();
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));
  const interval = config.TOPIC.INTERVAL_DAYS || 1;
  const index = Math.floor(diffDays / interval);

  const topics = mode === "1000" ? topics1000 : topics300;

  return topics[index % topics.length] || null;
}

module.exports = getManualTopicByDate;
