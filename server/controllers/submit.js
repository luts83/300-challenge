const Submission = require("../models/Submission");
const Token = require("../models/Token");
const axios = require("axios");
const { TOKEN } = require("../config");

const handleSubmit = async (req, res) => {
  const { text, user } = req.body;

  if (!text || !user || !user.uid || !user.email) {
    return res.status(400).json({ message: "유효하지 않은 요청입니다." });
  }

  try {
    // 유저 토큰 가져오기 or 생성
    let userToken = await Token.findOne({ uid: user.uid });
    const now = new Date();
    const today = now.toDateString();

    if (!userToken) {
      userToken = await Token.create({ uid: user.uid });
    }

    // 자정 리셋
    if (userToken.lastRefreshed?.toDateString() !== today) {
      userToken.tokens = TOKEN.DAILY_LIMIT; // ✅ config에서 불러오기
      userToken.lastRefreshed = now;
    }

    if (userToken.tokens <= 0) {
      return res
        .status(403)
        .json({ message: "오늘의 토큰이 모두 소진되었습니다." });
    }

    // 주제 불러오기
    const topicRes = await axios.get(
      `${process.env.TOPIC_API_URL}/api/topic/today`
    );
    const topic = topicRes.data.topic || "";

    // AI 평가 요청
    const evalRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistral/mistral-7b-instruct",
        messages: [
          { role: "system", content: "당신은 글쓰기 평가 전문가입니다." },
          {
            role: "user",
            content: `
다음의 기준으로 글을 평가해주세요:

1. 글이 주제 "${topic}"에 얼마나 적합한지
2. 감정 표현과 공감 능력
3. 문장 구조와 가독성
4. 맞춤법과 문법 오류

반드시 아래 형식으로 JSON으로만 응답해주세요:
{
  "score": 0~100 사이 숫자,
  "feedback": "구체적이고 진심 어린 피드백"
}

사용자 글:
${text}
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

    const content = evalRes.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    // 제출 저장 + AI 결과 포함
    const submission = new Submission({
      text,
      user,
      score: parsed.score,
      feedback: parsed.feedback,
    });
    await submission.save();

    // 토큰 차감
    userToken.tokens -= 1;
    await userToken.save();

    res.status(200).json({
      message: "제출 완료!",
      remainingTokens: userToken.tokens,
      score: parsed.score,
      feedback: parsed.feedback,
    });
  } catch (error) {
    console.error("❌ 제출 오류:", error.response?.data || error.message);
    res.status(500).json({ message: "서버 오류입니다." });
  }
};

module.exports = { handleSubmit };
