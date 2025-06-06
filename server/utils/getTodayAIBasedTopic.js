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
              "당신은 글쓰기 주제 생성기입니다. 다음 규칙을 반드시 따르세요:\n" +
              "1. 주제는 한국어로만 작성합니다.\n" +
              "2. 주제는 단순하고 명확해야 합니다.\n" +
              "3. 주제는 20자를 넘지 않아야 합니다.\n" +
              "4. 이모지나 특수문자는 사용하지 않습니다.\n" +
              "5. 영어나 다른 언어를 섞지 않습니다.",
          },
          {
            role: "user",
            content: `오늘의 카테고리는 "${selectedCategory}"입니다. 
            이 카테고리에 맞는 간단한 글쓰기 주제를 생성해주세요.
            
            응답 형식:
            {
              "topic_300": "짧은 주제 (예: 어제 먹은 맛있는 음식)",
              "topic_1000": "긴 주제 (예: 내 인생에서 가장 행복했던 순간)",
              "category": "주제 카테고리",
              "writing_tips": ["글쓰기 팁1", "글쓰기 팁2"]
            }

            주제 예시:
            - "나의 아침 루틴"
            - "친구와의 특별한 추억"
            - "최근 나를 기쁘게 한 일"
            - "변화가 필요한 순간"
            `,
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
