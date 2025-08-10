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
    resetCount,
    user, // user 정보 추가
  } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  try {
    const draft = (await Draft.findOne({ uid })) || new Draft({ uid });
    draft.title = title || "";
    draft.text = text || "";
    draft.sessionCount = sessionCount;
    draft.totalDuration = totalDuration;
    draft.resetCount = resetCount;
    draft.lastInputTime = lastInputTime;
    draft.lastSavedAt = lastSavedAt;
    draft.updatedAt = new Date();
    draft.status = "active";

    // user 정보 설정 (필수 필드)
    if (user) {
      draft.user = {
        uid: user.uid || uid,
        email: user.email || "",
        displayName: user.displayName || "익명",
      };
    } else {
      // user 정보가 없으면 기본값 설정
      draft.user = {
        uid: uid,
        email: "",
        displayName: "익명",
      };
    }

    await draft.save();

    res.json(draft);
  } catch (err) {
    console.error("Draft save error:", err);
    res.status(500).json({
      error: "저장 실패",
      details: err.message,
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
      return res.status(404).json({ error: "초안을 찾을 수 없습니다." });
    }

    res.json(draft);
  } catch (err) {
    res.status(500).json({
      error: "불러오기 실패",
      details: err.message,
    });
  }
});

// 초안 초기화 API
router.delete("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: "사용자 ID가 필요합니다." });
    }

    const updated = await Draft.findOneAndUpdate(
      { uid },
      {
        $set: {
          title: "",
          text: "",
          sessionCount: 0,
          totalDuration: 0,
          lastInputTime: 0,
          lastSavedAt: 0,
          updatedAt: new Date(),
          resetCount: 0,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "초안을 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      message: "초안이 초기화되었습니다.",
      draft: updated,
    });
  } catch (error) {
    res.status(500).json({ error: "초안 초기화 중 오류가 발생했습니다." });
  }
});

// POST /:uid/reset - resetCount 증가 + 초기화
router.post("/:uid/reset", async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: "사용자 ID가 필요합니다." });
    }

    const draft = await Draft.findOne({ uid });

    if (!draft) {
      return res.status(404).json({ error: "초안이 존재하지 않습니다." });
    }

    draft.title = "";
    draft.text = "";
    draft.sessionCount = 0;
    draft.totalDuration = 0;
    draft.lastInputTime = 0;
    draft.lastSavedAt = 0;
    draft.updatedAt = new Date();
    draft.resetCount = (draft.resetCount || 0) + 1;
    draft.status = "active";

    await draft.save();

    res.json({
      success: true,
      message: "초안이 초기화되었습니다.",
      draft,
    });
  } catch (error) {
    console.error("초안 초기화 오류:", error);
    res.status(500).json({ error: "초안 초기화 중 오류가 발생했습니다." });
  }
});

// 초안 제출 시 삭제 API
router.post("/:uid/complete", async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  try {
    const deleted = await Draft.findOneAndDelete({ uid });

    if (!deleted) {
      return res.status(404).json({ error: "초안을 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      draft: deleted, // 삭제된 draft 객체도 함께 반환
    });
  } catch (err) {
    console.error("초안 삭제 실패:", err);
    res.status(500).json({ error: "초안 삭제 중 오류가 발생했습니다." });
  }
});

module.exports = router;
