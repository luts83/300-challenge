// server/config.js
const { topics300, topics1000 } = require("./data/manualTopics");

module.exports = {
  TOKEN: {
    DAILY_LIMIT_300: 1, // 300자 모드 하루 토큰 수
    DAILY_LIMIT_1000: 1, // 1000자 모드 하루 토큰 수
    STREAK_BONUS: 1, // 1개의 보너스 토큰 지급으로 수정
  },
  SUBMISSION: {
    MODE_300: { MIN_LENGTH: 100, MAX_LENGTH: 300 }, // 300자 모드 글자 제한
    MODE_1000: { MIN_LENGTH: 600, MAX_LENGTH: 1000 }, // 1000자 모드 글자 제한
    TITLE: {
      // 제목 관련 설정 추가
      MIN_LENGTH: 1,
      MAX_LENGTH: 80,
      REQUIRED: true,
    },
  },
  FEEDBACK: {
    MIN_LENGTH: 10,
    REQUIRED_COUNT: 3, // 하루에 필요한 피드백 수
    PER_SUBMISSION: 3, // 글 1개당 할당되는 피드백 미션 수
    CROSS_MODE_FEEDBACK: {
      ENABLED: true,
      RESTRICTIONS: {
        mode_300: ["mode_300", "mode_1000"],
        mode_1000: ["mode_300", "mode_1000"],
      },
    },
  },
  AI: {
    ENABLE_300: true,
    ENABLE_1000: true,
    MODEL: "anthropic/claude-3-haiku",
    SYSTEM_MESSAGE:
      "당신은 전문적인 글쓰기 코치입니다. 건설적이고 구체적인 피드백을 제공합니다.",

    // 평가 기준 세분화
    EVALUATION_CRITERIA: {
      // 지정 주제일 경우
      ASSIGNED: {
        CONTENT: { weight: 0.3 },
        EXPRESSION: { weight: 0.3 },
        STRUCTURE: { weight: 0.2 },
        TECHNICAL: { weight: 0.2 }
      },
      // 자유 주제일 경우
      FREE: {
        ORIGINALITY: { weight: 0.25 },
        CONSISTENCY: { weight: 0.25 },
        EXPRESSION: { weight: 0.2 },
        STRUCTURE: { weight: 0.2 },
        TECHNICAL: { weight: 0.1 }
      }
    },

    PROMPT_TEMPLATE: {
      mode_300: (text, topic) => `
        [평가 대상 글]
        주제: ${topic || '자유주제'}
        내용: ${text}

        [평가 지침]
        ${topic ? `
          // 기존 지정 주제 평가 지침
          1. 각 평가 기준별로 구체적인 점수와 피드백을 제시해주세요.
          2. 글의 장점을 먼저 언급한 후, 개선점을 제안해주세요.
          3. 300자 분량에 맞는 간단명료한 피드백을 제공해주세요.
        ` : `
          // 자유 주제 평가 지침
          1. 글의 독창성과 메시지 전달력을 중점적으로 평가해주세요.
          2. 주제 선정의 참신성과 주제 전개의 일관성을 평가해주세요.
          3. 글쓴이의 개성과 창의적 표현을 중요하게 고려해주세요.
          4. 300자 분량에 맞는 간단명료한 피드백을 제공해주세요.
        `}

        [응답 형식]
        {
          "overall_score": 0-100 사이 점수,
          "criteria_scores": {
            ${topic ? `
              // 지정 주제 평가 기준
              "content": {
                "score": 0-100,
                "feedback": "주제 관련성과 내용의 충실도에 대한 피드백"
              },
            ` : `
              // 자유 주제 평가 기준
              "originality": {
                "score": 0-100,
                "feedback": "주제 선정의 참신성과 독창적 시각"
              },
              "consistency": {
                "score": 0-100,
                "feedback": "주제 전개의 일관성과 메시지 전달력"
              },
            `}
            "expression": {
              "score": 0-100,
              "feedback": "감정 표현과 문체의 개성"
            },
            "structure": {
              "score": 0-100,
              "feedback": "글의 구성과 흐름"
            },
            "technical": {
              "score": 0-100,
              "feedback": "문법과 맞춤법"
            }
          },
          "strengths": ["장점1", "장점2"],
          "improvements": ["개선점1", "개선점2"],
          "writing_tips": "다음 글쓰기를 위한 구체적인 조언"
        }
          응답은 반드시 유효한 JSON 형식만 출력해주세요. 마크다운 코드 블럭(예: \`\`\`json)이나 설명 문구는 절대 포함하지 마세요. 
  모든 줄바꿈(엔터)은 \\n 으로 escape 처리하고, 문자열 안 따옴표는 \\"로 escape 처리하세요.
      `,
      mode_1000: (text, topic) => `
        [평가 대상 글]
        주제: ${topic || '자유주제'}
        내용: ${text}

        [평가 지침]
        ${topic ? `
          // 기존 지정 주제 평가 지침
          1. 각 평가 기준별로 상세한 점수와 피드백을 제시해주세요.
          2. 글의 장점을 먼저 언급한 후, 개선점을 제안해주세요.
          3. 1000자 분량에 맞는 심층적인 분석을 제공해주세요.
          4. 문단 구성과 논리적 전개에 대해 자세히 평가해주세요.
        ` : `
          // 자유 주제 평가 지침
          1. 주제 선정의 독창성과 심층성을 평가해주세요.
          2. 글쓴이만의 관점과 통찰력을 중점적으로 평가해주세요.
          3. 주제 전개의 논리성과 설득력을 평가해주세요.
          4. 1000자 분량에 맞는 깊이 있는 분석을 제공해주세요.
          5. 문단 간 유기적 연결과 전체적인 글의 완성도를 평가해주세요.
        `}

        [응답 형식]
        {
          "overall_score": 0-100 사이 점수,
          "criteria_scores": {
            ${topic ? `
              // 지정 주제 평가 기준
              "content": {
                "score": 0-100,
                "feedback": "주제 이해도, 내용의 깊이, 논리적 전개"
              },
            ` : `
              // 자유 주제 평가 기준
              "originality": {
                "score": 0-100,
                "feedback": "주제 선정의 독창성과 심층성"
              },
              "insight": {
                "score": 0-100,
                "feedback": "글쓴이의 관점과 통찰력"
              },
              "development": {
                "score": 0-100,
                "feedback": "주제 전개의 논리성과 설득력"
              },
            `}
            "expression": {
              "score": 0-100,
              "feedback": "문체의 개성과 표현력"
            },
            "structure": {
              "score": 0-100,
              "feedback": "문단 구성과 글의 완성도"
            },
            "technical": {
              "score": 0-100,
              "feedback": "문법, 맞춤법, 문장 구조"
            }
          },
          "strengths": ["장점1", "장점2", "장점3"],
          "improvements": ["개선점1", "개선점2", "개선점3"],
          "writing_tips": "다음 글쓰기를 위한 구체적인 조언"
        }
          응답은 반드시 유효한 JSON 형식만 출력해주세요. 마크다운 코드 블럭(예: \`\`\`json)이나 설명 문구는 절대 포함하지 마세요. 
  모든 줄바꿈(엔터)은 \\n 으로 escape 처리하고, 문자열 안 따옴표는 \\"로 escape 처리하세요.
      `,
    },

    // 피드백 품질 관리
    QUALITY_CHECK: {
      MIN_FEEDBACK_LENGTH: 100,
      REQUIRED_ELEMENTS: ["장점", "개선점", "구체적 조언"],
      TONE_GUIDELINES: [
        "긍정적이고 건설적인 톤 유지",
        "구체적인 예시 포함",
        "실천 가능한 조언 제시",
      ],
    },
  },

  TOPIC: {
    MODE: "manual", // "manual" | "ai"
    BASE_DATE: "2025-04-28", // 수동 주제 시작 기준일
    INTERVAL_DAYS: 1, // 몇 일 간격으로 주제를 바꿀지
    SHOW_ON_HOME_300: true, // 추가
    SHOW_ON_HOME_1000: false, // 추가
    TOPICS_300: topics300, // 300자 모드용 수동 주제
    TOPICS_1000: topics1000, // 1000자 모드용 수동 주제
  },
};
