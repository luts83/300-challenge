const Submission = require("../models/Submission");
const UserToken = require("../models/Token");
const FeedbackMission = require("../models/FeedbackMission");
const { TOKEN, SUBMISSION, FEEDBACK } = require("../config"); // ✅ config import

const handleSubmit = async (req, res) => {
  const { text, user } = req.body;

  if (!text || !user || !user.uid || !user.email) {
    return res.status(400).json({ message: "유효하지 않은 요청입니다." });
  }

  if (
    text.length < SUBMISSION.MIN_LENGTH ||
    text.length > SUBMISSION.MAX_LENGTH
  ) {
    return res.status(400).json({
      message: `글자 수는 ${SUBMISSION.MIN_LENGTH}자 이상, ${SUBMISSION.MAX_LENGTH}자 이하로 작성해주세요.`,
    });
  }

  try {
    let userToken = await UserToken.findOne({ uid: user.uid });
    const now = new Date();
    const today = now.toDateString();

    if (!userToken) {
      userToken = await UserToken.create({
        uid: user.uid,
        tokens: TOKEN.DAILY_LIMIT,
        lastRefreshed: now,
      });
    }

    if (userToken.lastRefreshed?.toDateString() !== today) {
      userToken.tokens = TOKEN.DAILY_LIMIT;
      userToken.lastRefreshed = now;
    }

    if (userToken.tokens <= 0) {
      return res
        .status(403)
        .json({ message: "오늘의 토큰이 모두 소진되었습니다." });
    }

    const submission = new Submission({ text, user });
    await submission.save();

    userToken.tokens -= 1;
    await userToken.save();

    // 피드백 미션 생성
    const candidates = await Submission.find({ "user.uid": { $ne: user.uid } });
    const shuffled = candidates
      .sort(() => 0.5 - Math.random())
      .slice(0, FEEDBACK.PER_SUBMISSION);

    const missions = shuffled.map((target) => ({
      fromUid: user.uid,
      toSubmissionId: target._id,
      userUid: user.uid, // ✅ 명시적으로 추가
    }));

    await FeedbackMission.insertMany(missions);

    return res.status(200).json({
      message: "제출 완료!",
      remainingTokens: userToken.tokens,
    });
  } catch (error) {
    console.error("❌ 서버 오류:", error);
    return res.status(500).json({ message: "서버 오류입니다." });
  }
};

module.exports = { handleSubmit };
