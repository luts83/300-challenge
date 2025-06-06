// utils/aiTopicCache.js
const cache = {}; // 예: { '2025-05-20_mode_300': { topic_300, ... } }

function getCachedTopic(dateKey) {
  return cache[dateKey] || null;
}

function setCachedTopic(dateKey, topicObj) {
  cache[dateKey] = topicObj;
}

module.exports = { getCachedTopic, setCachedTopic };
