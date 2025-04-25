// server/controllers/evaluateController.js
const axios = require("axios");
const Submission = require("../models/Submission");
const { AI } = require("../config"); // AI 설정 import
const logger = require("../utils/logger");

const evaluateAI = async (req, res) => {
  const { text, topic, submissionId, mode } = req.body;

  if (!text || !topic || !mode) {
    return res
      .status(400)
      .json({ message: "텍스트, 주제, 모드가 필요합니다." });
  }

  try {
    // AI 평가 요청
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI.MODEL,
        messages: [
          { role: "system", content: AI.SYSTEM_MESSAGE },
          { role: "user", content: AI.PROMPT_TEMPLATE[mode](text, topic) },
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
    const parsed = JSON.parse(content);

    // 평가 결과 저장
    const submission = await Submission.findById(submissionId);
    if (submission) {
      submission.ai_feedback = parsed;
      submission.score = parsed.overall_score;
      await submission.save();
    }

    res.json(parsed);
  } catch (error) {
    logger.error("AI 평가 실패:", error);
    res.status(500).json({
      message: "AI 평가 중 오류가 발생했습니다",
      score: AI.DEFAULT_SCORE,
      feedback: "AI 평가에 실패했습니다. 나중에 다시 시도해주세요.",
    });
  }
};

module.exports = { evaluateAI };
