const express = require("express");
const router = express.Router();
const getManualTopicByDate = require("../utils/getManualTopicByDate");
const config = require("../config");
const axios = require("axios");

router.get("/today", async (req, res) => {
  try {
    // 📆 주기 확인 로직 추가
    const base = new Date(config.TOPIC.BASE_DATE);
    const today = new Date();
    const diffDays = Math.floor((today - base) / (1000 * 60 * 60 * 24));
    const shouldProvide = diffDays % config.TOPIC.INTERVAL_DAYS === 0;

    if (!shouldProvide) {
      return res.json({ topic: null });
    }

    // 📜 수동 모드일 경우
    if (config.TOPIC.MODE === "manual") {
      const manualTopic = getManualTopicByDate();
      if (manualTopic) {
        return res.json({ topic: manualTopic });
      }
      console.log("📜 수동 주제 끝! 자동 주제로 전환됩니다.");
    }

    // 🤖 AI 주제 생성
    const aiRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mixtral-8x7b-instruct", // or claude-3-haiku 등
        messages: [
          {
            role: "system",
            content:
              "너는 창의적이고 따뜻한 한국어 글쓰기 주제를 만들어주는 AI야. 오늘의 트렌드를 반영하는 비즈니스나 마케팅에 관련된 글쓰기 주제 생성해줘. 응답은 한글로! 20단어 미만으로!",
          },
          {
            role: "user",
            content: "오늘의 글쓰기 주제를 하나만 제시해줘.",
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const topic = aiRes.data.choices[0].message.content
      .trim()
      .replace(/^"|"$/g, "");
    return res.json({ topic });
  } catch (err) {
    console.error("❌ 주제 생성 실패:", err.message);
    res.status(500).json({ message: "오늘의 주제를 불러올 수 없습니다." });
  }
});

module.exports = router;
