// server/utils/getTodayAIBasedTopic.js
const axios = require("axios");
const { AI } = require("../config");
const logger = require("./logger");

const TOPIC_CATEGORIES = [
  "일상",
  "관계",
  "성장",
  "도전",
  "감정",
  "회고",
  "미래",
  "취미",
  "문화",
  "사회",
];

const getTodayAIBasedTopic = async () => {
  try {
    const selectedCategory =
      TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI.MODEL,
        messages: [
          {
            role: "system",
            content:
              "당신은 창의적인 글쓰기 주제 생성기입니다. 주제는 개인의 경험과 감정을 끌어낼 수 있으며, 윤리적으로 적절해야 합니다.",
          },
          {
            role: "user",
            content: `오늘의 카테고리는 "${selectedCategory}"입니다. 
            이 카테고리에 맞는 300자용 주제 1개와 1000자용 주제 1개를 생성해주세요.
            
            응답 형식:
            {
              "topic_300": "300자용 주제",
              "topic_1000": "1000자용 주제",
              "category": "주제 카테고리",
              "writing_tips": ["글쓰기 팁1", "글쓰기 팁2"]
            }`,
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

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    logger.error("AI 주제 생성 실패:", error);
    // 폴백(fallback) 주제 반환
    return {
      topic_300: "오늘 하루 중 가장 기억에 남는 순간",
      topic_1000: "내 인생의 터닝포인트가 된 경험",
      category: "회고",
      writing_tips: [
        "구체적인 상황을 묘사해보세요",
        "감정의 변화를 표현해보세요",
      ],
    };
  }
};

module.exports = getTodayAIBasedTopic;
