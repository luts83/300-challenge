// server/routes/topic.js
const express = require("express");
const router = express.Router();
const getManualTopicByDate = require("../utils/getManualTopicByDate");
const getTodayAIBasedTopic = require("../utils/getTodayAIBasedTopic");
const config = require("../config");
const axios = require("axios");
const logger = require("../utils/logger");

// GET /api/topic/today?mode=mode_300&timezone=Asia/Seoul&offset=-540
router.get("/today", async (req, res) => {
  try {
    const mode = req.query.mode === "mode_1000" ? "1000" : "300";

    // 사용자 시간대 정보 파싱
    const timezone = req.query.timezone || "Asia/Seoul";
    const offset = parseInt(req.query.offset) || -540; // 기본값: 한국 시간 (getTimezoneOffset 값)

    // 사용자 시간대 기준으로 현재 날짜 계산
    const now = new Date();
    const userTime = new Date(now.getTime() - offset * 60 * 1000);
    const today = userTime;
    const dayOfWeek = today.getDay();

    // 주말인 경우 주말 주제 제공
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const { topic, isManualTopic } = getManualTopicByDate(
        mode,
        timezone,
        offset
      );

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
    const { topic, isManualTopic } = getManualTopicByDate(
      mode,
      timezone,
      offset
    );

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
      topic: aiTopic[`topic_${mode}`],
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
