// server/routes/topic.js
const express = require("express");
const router = express.Router();
const getManualTopicByDate = require("../utils/getManualTopicByDate");
const config = require("../config");
const axios = require("axios");
const logger = require("../utils/logger");

// GET /api/topic/today?mode=mode_300 또는 mode_1000
router.get("/today", async (req, res) => {
  try {
    const mode = req.query.mode === "mode_1000" ? "1000" : "300";
    const today = new Date();
    const dayOfWeek = today.getDay();

    // 주말인 경우 주말 주제 제공
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const { topic, isManualTopic } = getManualTopicByDate(mode);

      if (isManualTopic) {
        return res.json({
          topic,
          isWeekend: true,
          isManualTopic: true,
        });
      }

      // 수동 주제가 없는 경우 AI 주제 생성
      const aiTopic = await getTodayAIBasedTopic();
      return res.json({
        topic: aiTopic[`topic_${mode}`],
        isWeekend: true,
        isManualTopic: false,
        writing_tips: aiTopic.writing_tips,
      });
    }

    // 평일인 경우
    const { topic, isManualTopic } = getManualTopicByDate(mode);

    if (isManualTopic) {
      return res.json({
        topic,
        isWeekend: false,
        isManualTopic: true,
      });
    }

    // 수동 주제가 없는 경우 AI 주제 생성
    const aiTopic = await getTodayAIBasedTopic();
    return res.json({
      topic: aiTopic["topic_${mode}"],
      isWeekend: false,
      isManualTopic: false,
      writing_tips: aiTopic.writing_tips,
    });
  } catch (err) {
    logger.error("❌ 주제 생성 실패:", err.message);
    res.status(500).json({ message: "오늘의 주제를 불러올 수 없습니다." });
  }
});

module.exports = router;
