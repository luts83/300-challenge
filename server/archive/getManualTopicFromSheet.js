const { fetchTopicsFromSheet } = require("./fetchWritingTopics");

function getSheetNameByModeAndDay(mode, dayOfWeek) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) {
    return mode === "1000" ? "Weekend_1000" : "Weekend_300";
  } else {
    return mode === "1000" ? "Weekday_1000" : "Weekday_300";
  }
}

async function getManualTopicFromSheet(mode) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayIndex = today.getDate() % 30; // 예: 0~29 인덱스

  const sheetName = getSheetNameByModeAndDay(mode, dayOfWeek);

  const topics = await fetchTopicsFromSheet(sheetName);

  if (topics.length === 0) {
    return { topic: "", isManualTopic: false };
  }

  const topic = topics[dayIndex % topics.length]; // 해당 인덱스의 주제
  return { topic, isManualTopic: true };
}

module.exports = getManualTopicFromSheet;
