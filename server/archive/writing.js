const express = require("express");
const router = express.Router();
const WritingSession = require("../models/WritingSession");

// ✅ 최신 미완료 세션 조회
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const session = await WritingSession.findOne({
      uid,
      mode: "1000",
      isCompleted: false,
    }).sort({ updatedAt: -1 });
    res.json(session || null);
  } catch (err) {
    res.status(500).json({ message: "세션 불러오기 실패", error: err });
  }
});

// ✅ 새로운 세션 생성
router.post("/", async (req, res) => {
  const { uid, text, duration } = req.body;
  try {
    const newSession = await WritingSession.create({
      uid,
      mode: "1000",
      text,
      totalDuration: duration || 0,
      sessionCount: 1,
    });
    res.status(201).json(newSession);
  } catch (err) {
    res.status(500).json({ message: "세션 생성 실패", error: err });
  }
});

// ✅ 세션 업데이트 (자동 저장 / 제출)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { text, duration, isCompleted } = req.body;
  try {
    const session = await WritingSession.findById(id);
    if (!session)
      return res.status(404).json({ message: "세션을 찾을 수 없습니다." });

    session.text = text ?? session.text;
    session.totalDuration += duration || 0;
    session.sessionCount += 1;
    if (isCompleted) session.isCompleted = true;

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "세션 저장 실패", error: err });
  }
});

module.exports = router;
