const axios = require("axios");
const Submission = require("../models/Submission");
const { AI } = require("../config"); // 👈 AI 설정 import

const evaluateAI = async (req, res) => {
  const { text, topic } = req.body;

  if (!text || !topic) {
    return res.status(400).json({ message: "텍스트와 주제가 필요합니다." });
  }

  const prompt = `
너는 사용자의 글을 평가하는 AI야.

다음 기준으로 글을 평가하고 점수와 피드백을 JSON 형태로 응답해.

[평가 기준]
1. 글이 주제("${topic}")와 관련 있는가?
2. 감정을 잘 표현했는가?
3. 문장이 자연스럽고 잘 읽히는가?
4. 맞춤법이나 문법 오류는 없는가? 

[응답 형식]
{
  "score": 0~100 사이 숫자,
  "feedback": "진심 어린 구체적인 피드백"
}

[사용자의 글]
${text}
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI.MODEL,
        messages: [
          {
            role: "system",
            content: AI.SYSTEM_MESSAGE,
          },
          { role: "user", content: prompt },
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
    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());

    const latestSubmission = await Submission.findOne().sort({
      submittedAt: -1,
    });

    if (latestSubmission) {
      latestSubmission.score = parsed.score;
      latestSubmission.feedback = parsed.feedback;
      await latestSubmission.save();
    }

    res.json(parsed);
  } catch (err) {
    console.error("❌ AI 평가 실패:", err.response?.data || err.message);
    res.status(500).json({ message: "AI 응답 파싱 실패" });
  }
};

module.exports = { evaluateAI };
