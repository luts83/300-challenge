// server/routes/topic.js
const express = require("express");
const router = express.Router();
const getManualTopicByDate = require("../utils/getManualTopicByDate");
const getTodayAIBasedTopic = require("../utils/getTodayAIBasedTopic");
const config = require("../config");

// GET /api/topic/today?mode=300 또는 1000
router.get("/today", async (req, res) => {
  try {
    const mode = req.query.mode === "1000" ? "1000" : "300"; // 기본은 300자 모드

    // 1000자 모드는 항상 자유주제 반환
    if (mode === "1000") {
      return res.json({
        topic: "자유 주제입니다. 마음 가는 대로 글을 써보세요.",
      });
    }

    // 300자 모드는 기존 로직 유지
    // 📆 주기적으로 제공하는 날인지 확인
    const base = new Date(config.TOPIC.BASE_DATE);
    const today = new Date();
    const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));
    const shouldProvide = diffDays % config.TOPIC.INTERVAL_DAYS === 0;

    if (!shouldProvide) {
      return res.json({ topic: null });
    }

    // 📜 수동 모드인 경우
    if (config.TOPIC.MODE === "manual") {
      const manualTopic = getManualTopicByDate("300"); // 300자 모드만 수동 주제 사용
      if (manualTopic) {
        return res.json({ topic: manualTopic });
      }
      console.log("📜 수동 주제 소진! 자동 주제로 전환됩니다.");
    }

    // 🤖 AI 기반 주제 생성 (300자 모드만)
    const aiTopic = await getTodayAIBasedTopic();
    return res.json({
      topic: mode === "300" ? aiTopic.topic_300 : aiTopic.topic_1000,
      category: aiTopic.category,
      writing_tips: aiTopic.writing_tips,
    });
  } catch (err) {
    console.error("❌ 주제 생성 실패:", err.message);
    res.status(500).json({ message: "오늘의 주제를 불러올 수 없습니다." });
  }
});

module.exports = router;
