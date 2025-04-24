// server/routes/drafts.js
const express = require("express");
const router = express.Router();
const Draft = require("../models/Draft");

// 초안 저장 API
router.post("/save", async (req, res) => {
  console.log("Received save request with data:", req.body);
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
    console.error("Missing uid in save request");
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

    console.log("Updating draft with data:", updateData);

    const updated = await Draft.findOneAndUpdate(
      { uid },
      { $set: updateData },
      { upsert: true, new: true }
    );

    console.log("Draft updated successfully:", updated);
    res.json(updated);
  } catch (err) {
    console.error("초안 저장 오류:", err);
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
  console.log("Fetching draft for uid:", uid);

  if (!uid) {
    console.error("Missing uid in fetch request");
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  try {
    const draft = await Draft.findOne({ uid });
    console.log("Found draft:", draft);

    if (!draft) {
      console.log("No draft found for uid:", uid);
      return res.status(404).json({ message: "초안 없음" });
    }

    res.json(draft);
  } catch (err) {
    console.error("초안 불러오기 오류:", err);
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
    const { resetCount } = req.body || {};

    // 기존 초안 삭제
    await Draft.findOneAndDelete({ uid });

    // resetCount가 제공된 경우에만 새로운 초안 생성
    if (resetCount !== undefined) {
      const newDraft = new Draft({
        uid,
        text: "",
        sessionCount: 0,
        totalDuration: 0,
        lastInputTime: 0,
        resetCount: resetCount || 0,
      });
      await newDraft.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("초안 삭제 중 오류:", error);
    res.status(500).json({ error: "초안 삭제 중 오류가 발생했습니다." });
  }
});

module.exports = router;
