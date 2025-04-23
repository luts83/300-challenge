// server/controllers/submitController.js
const Submission = require("../models/Submission");
const Token = require("../models/Token");
const FeedbackMission = require("../models/FeedbackMission");
const { TOKEN, SUBMISSION, FEEDBACK } = require("../config");

// feedbackUnlocked 필드 업데이트
const unlockFeedback = async (req, res) => {
  const { id } = req.params;
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ message: "사용자 정보가 필요합니다." });
  }

  try {
    const updated = await Submission.findOneAndUpdate(
      { _id: id, "user.uid": uid },
      { feedbackUnlocked: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "해당 글을 찾을 수 없습니다." });
    }

    return res.status(200).json({ message: "피드백 열람이 해제되었습니다." });
  } catch (error) {
    console.error("❌ feedbackUnlocked 업데이트 오류:", error);
    return res.status(500).json({ message: "서버 오류입니다." });
  }
};

const handleSubmit = async (req, res) => {
  const { text, user, mode, sessionCount, duration } = req.body;

  if (!text || !user || !user.uid || !user.email || !mode) {
    return res.status(400).json({ message: "유효하지 않은 요청입니다." });
  }

  if (!["mode_300", "mode_1000"].includes(mode)) {
    return res.status(400).json({ message: "유효하지 않은 mode입니다." });
  }

  const MIN_LENGTH = SUBMISSION[mode.toUpperCase()].MIN_LENGTH;
  const MAX_LENGTH = SUBMISSION[mode.toUpperCase()].MAX_LENGTH;

  if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
    return res.status(400).json({
      message: `글자 수는 ${MIN_LENGTH}자 이상, ${MAX_LENGTH}자 이하로 작성해주세요.`,
    });
  }

  try {
    const now = new Date();
    const today = now.toDateString();
    const tokenField = mode === "mode_1000" ? "tokens_1000" : "tokens_300";
    const tokenLimit =
      mode === "mode_1000" ? TOKEN.DAILY_LIMIT_1000 : TOKEN.DAILY_LIMIT_300;

    let userToken = await Token.findOne({ uid: user.uid });

    if (!userToken) {
      userToken = await Token.create({
        uid: user.uid,
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.DAILY_LIMIT_1000,
        lastRefreshed: now,
      });
    }

    if (userToken.lastRefreshed?.toDateString() !== today) {
      userToken.tokens_300 = TOKEN.DAILY_LIMIT_300;
      userToken.tokens_1000 = TOKEN.DAILY_LIMIT_1000;
      userToken.lastRefreshed = now;
    }

    if (userToken[tokenField] <= 0) {
      return res
        .status(403)
        .json({ message: "오늘의 토큰이 모두 소진되었습니다." });
    }

    const submission = new Submission({
      text,
      user,
      mode,
      sessionCount,
      duration,
      submissionDate: new Date().toISOString().slice(0, 10),
    });
    await submission.save();

    // ✅ 모든 모드에서 피드백 미션 생성
    const candidates = await Submission.find({
      "user.uid": { $ne: user.uid },
      mode, // 같은 모드의 글만 타겟팅
    });

    const shuffled = candidates
      .sort(() => 0.5 - Math.random())
      .slice(0, FEEDBACK.PER_SUBMISSION);

    const missions = shuffled.map((target) => ({
      fromUid: user.uid,
      toSubmissionId: target._id,
      userUid: user.uid,
    }));

    await FeedbackMission.insertMany(missions);

    userToken[tokenField] -= 1;
    await userToken.save();

    return res.status(200).json({
      message: "제출 완료!",
      submissionId: submission._id,
      tokens: userToken[tokenField],
    });
  } catch (error) {
    console.error("❌ 서버 오류:", error);
    return res.status(500).json({ message: "서버 오류입니다." });
  }
};

module.exports = {
  handleSubmit,
  unlockFeedback, // 이 줄 추가!
};
