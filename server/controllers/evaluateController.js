// server/controllers/evaluateController.js
const axios = require("axios");
const Submission = require("../models/Submission");
const { AI } = require("../config"); // AI 설정 import

const evaluateAI = async (req, res) => {
  const { text, topic, submissionId, mode } = req.body;

  if (!text || !topic || !mode) {
    return res
      .status(400)
      .json({ message: "텍스트, 주제, 모드가 필요합니다." });
  }

  // DB에서 제출물 확인
  let submission;
  try {
    submission = await Submission.findById(submissionId);
    if (!submission) {
      console.error(`❌ 제출물을 찾을 수 없음: ID ${submissionId}`);
      return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
    }
  } catch (err) {
    console.error("❌ 제출물 조회 중 오류:", err);
    return res.status(500).json({ message: "데이터베이스 조회 오류" });
  }

  // 🧠 AI 평가 사용 여부 확인
  const isAIEnabled =
    mode === "mode_300"
      ? AI.ENABLE_300
      : mode === "mode_1000"
      ? AI.ENABLE_1000
      : false;

  // ❌ AI 평가 비활성화일 경우 기본값 반환
  if (!isAIEnabled) {
    try {
      submission.score = AI.DEFAULT_SCORE;
      submission.feedback =
        "AI 평가가 비활성화되어 기본 점수가 부여되었습니다.";
      await submission.save();
      console.log(`✅ 기본 점수 저장 완료: ${submission._id}`);
    } catch (err) {
      console.error("❌ 기본 점수 저장 중 오류:", err);
      return res.status(500).json({ message: "데이터베이스 저장 오류" });
    }

    return res.json({
      score: AI.DEFAULT_SCORE,
      feedback: "AI 평가가 비활성화되어 기본 점수가 부여되었습니다.",
    });
  }

  // ✅ AI 평가 수행
  const promptFn = AI.PROMPT_TEMPLATE[mode];

  if (!promptFn) {
    return res.status(400).json({ message: "지원하지 않는 모드입니다." });
  }

  const prompt = promptFn(text, topic);
  try {
    console.log(`🤖 AI 평가 요청: ${submissionId}`);
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: AI.MODEL,
        messages: [
          { role: "system", content: AI.SYSTEM_MESSAGE },
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
    console.log(`🤖 AI 응답 받음: ${content.slice(0, 100)}...`);

    let parsed;
    try {
      // JSON 포맷 정리 (코드 블록, 공백 제거)
      const cleanedContent = content
        .replace(/```json\s+|```\s+|```/g, "")
        .trim();
      parsed = JSON.parse(cleanedContent);
    } catch (parseErr) {
      console.error("❌ JSON 파싱 실패:", parseErr, "원본:", content);
      // 응급 복구: 정규식으로 score와 feedback 추출 시도
      const scoreMatch = content.match(/"score"\s*:\s*(\d+)/);
      const feedbackMatch = content.match(/"feedback"\s*:\s*"([^"]+)"/);

      if (scoreMatch && feedbackMatch) {
        parsed = {
          score: parseInt(scoreMatch[1]),
          feedback: feedbackMatch[1],
        };
        console.log("⚠️ 정규식으로 복구:", parsed);
      } else {
        throw new Error("AI 응답에서 score와 feedback을 추출할 수 없습니다.");
      }
    }

    try {
      // 값 검증
      if (
        typeof parsed.score !== "number" ||
        parsed.score < 0 ||
        parsed.score > 100
      ) {
        console.warn("⚠️ 유효하지 않은 점수:", parsed.score);
        parsed.score = AI.DEFAULT_SCORE;
      }

      if (!parsed.feedback || typeof parsed.feedback !== "string") {
        console.warn("⚠️ 유효하지 않은 피드백:", parsed.feedback);
        parsed.feedback = "AI 피드백을 불러오지 못했습니다.";
      }

      // 저장 시도
      submission.score = parsed.score;
      submission.feedback = parsed.feedback;
      await submission.save();
      console.log(
        `✅ AI 평가 저장 성공: ${submissionId}, 점수: ${parsed.score}`
      );
    } catch (saveErr) {
      console.error("❌ 데이터베이스 저장 중 오류:", saveErr);
      return res.status(500).json({ message: "데이터베이스 저장 오류" });
    }

    res.json(parsed);
  } catch (err) {
    console.error("❌ AI 평가 실패:", err.response?.data || err.message || err);

    // 기본값 저장 시도
    try {
      submission.score = AI.DEFAULT_SCORE;
      submission.feedback =
        "AI 평가에 문제가 발생해 기본 점수가 부여되었습니다.";
      await submission.save();
      console.log(`⚠️ 오류 발생으로 기본 점수 저장: ${submissionId}`);
    } catch (saveErr) {
      console.error("❌ 기본값 저장 중 오류:", saveErr);
    }

    res.status(500).json({
      message: "AI 평가 실패",
      score: AI.DEFAULT_SCORE,
      feedback: "AI 평가에 문제가 발생해 기본 점수가 부여되었습니다.",
    });
  }
};

module.exports = { evaluateAI };
