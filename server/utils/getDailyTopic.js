// server/utils/getDailyTopic.js
const config = require("../config");
const getManualTopicByDate = require("./getManualTopicByDate");
const getTodayAIBasedTopic = require("./getTodayAIBasedTopic"); // AI 주제 함수

module.exports = async function getDailyTopic() {
  const mode = config.TOPIC.MODE;
  const base = new Date(config.TOPIC.BASE_DATE);
  const today = new Date();
  const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));
  const shouldProvide = diffDays % config.TOPIC.INTERVAL_DAYS === 0;

  if (!shouldProvide) {
    return null; // 주제 제공 안 하는 날
  }

  if (mode === "manual") {
    const topic = getManualTopicByDate();
    if (topic) return topic;
    console.log("📡 수동 주제가 다 떨어졌습니다. AI로 전환합니다.");
  }

  // fallback: AI 주제
  const aiTopic = await getTodayAIBasedTopic(); // 별도 생성 필요
  return aiTopic;
};
