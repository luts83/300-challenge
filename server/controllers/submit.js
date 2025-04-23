const Submission = require("../models/Submission");
const Token = require("../models/Token");
const axios = require("axios");
const { TOKEN, AI } = require("../config");

const handleSubmit = async (req, res) => {
  const { text, user, mode = "mode_300" } = req.body;

  if (!text || !user || !user.uid || !user.email) {
    return res.status(400).json({ message: "유효하지 않은 요청입니다." });
  }

  try {
    // ✅ 유저 토큰 가져오기 or 생성
    let userToken = await Token.findOne({ uid: user.uid });
    const now = new Date();
    const today = now.toDateString();

    if (!userToken) {
      userToken = await Token.create({ uid: user.uid });
    }

    // ✅ 자정 기준 리셋
    if (userToken.lastRefreshed?.toDateString() !== today) {
      const dailyLimit =
        mode === "mode_1000" ? TOKEN.DAILY_LIMIT_1000 : TOKEN.DAILY_LIMIT_300;
      userToken.tokens = dailyLimit;
      userToken.lastRefreshed = now;
    }

    if (userToken.tokens <= 0) {
      return res
        .status(403)
        .json({ message: "오늘의 토큰이 모두 소진되었습니다." });
    }

    // ✅ 주제 불러오기
    const topicRes = await axios.get(
      `${process.env.TOPIC_API_URL}/api/topic/today?mode=${mode}`
    );
    const topic = topicRes.data.topic || "";

    // ✅ AI 평가 사용 여부
    const isEnabled = mode === "mode_1000" ? AI.ENABLE_1000 : AI.ENABLE_300;

    let score = null;
    let feedback = null;

    if (!isEnabled) {
      // ❌ AI 평가 비활성화
      score = AI.DEFAULT_SCORE;
      feedback = "AI 평가가 비활성화되어 기본 점수가 부여되었습니다.";
    } else {
      // ✅ AI 평가 수행
      const promptFn = AI.PROMPT_TEMPLATE?.[mode];
      if (!promptFn) {
        return res.status(500).json({ message: "AI 평가 템플릿 오류" });
      }

      const prompt = promptFn(text, topic);

      const aiRes = await axios.post(
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

      const content = aiRes.data.choices[0].message.content;
      const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());

      score = parsed.score;
      feedback = parsed.feedback;
    }

    // ✅ 제출 저장
    const submission = new Submission({
      text,
      user,
      mode,
      score,
      feedback,
    });
    await submission.save();

    // ✅ 토큰 차감
    userToken.tokens -= 1;
    await userToken.save();

    res.status(200).json({
      message: "제출 완료!",
      remainingTokens: userToken.tokens,
      score,
      feedback,
      submissionId: submission._id,
    });
  } catch (error) {
    console.error("❌ 제출 오류:", error.response?.data || error.message);
    res.status(500).json({ message: "서버 오류입니다." });
  }
};

module.exports = { handleSubmit };
