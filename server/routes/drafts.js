// server/routes/drafts.js
const express = require("express");
const router = express.Router();
const Draft = require("../models/Draft");

// 초안 저장 API
router.post("/save", async (req, res) => {
  const {
    uid,
    title,
    text,
    sessionCount,
    totalDuration,
    lastInputTime,
    lastSavedAt,
  } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  try {
    const updateData = {
      uid,
      title: title || "",
      text: text || "",
      sessionCount,
      totalDuration,
      lastInputTime,
      lastSavedAt,
      updatedAt: new Date(),
    };

    const updated = await Draft.findOneAndUpdate(
      { uid },
      { $set: updateData },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({
      error: "저장 실패",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// 초안 불러오기 API
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  try {
    const draft = await Draft.findOne({ uid });

    if (!draft) {
      return res.status(404).json({ message: "초안 없음" });
    }

    res.json(draft);
  } catch (err) {
    res.status(500).json({
      error: "불러오기 실패",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// 초안 삭제 API
router.delete("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // 초안 완전 삭제
    const deletedDraft = await Draft.findOneAndDelete({ uid });

    if (!deletedDraft) {
      return res
        .status(404)
        .json({ message: "삭제할 초안을 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      message: "초안이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    res.status(500).json({ error: "초안 삭제 중 오류가 발생했습니다." });
  }
});

module.exports = router;
