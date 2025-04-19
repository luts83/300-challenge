const topics = require("../data/manualTopics");
const config = require("../config");

module.exports = function getManualTopicByDate() {
  const base = new Date(config.TOPIC.BASE_DATE);
  const today = new Date();
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));

  const interval = config.TOPIC.INTERVAL_DAYS || 1;
  const index = Math.floor(diffDays / interval);

  return topics[index] || null;
};
