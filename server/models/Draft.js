//Draft.js
const mongoose = require("mongoose");

const draftSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  title: { type: String, default: "" },
  text: { type: String, default: "" },
  topic: {
    type: String,
    required: false, // 자유주제일 수 있으므로
    default: null,
  },
  user: {
    uid: { type: String, required: true },
    email: { type: String, required: true },
    displayName: { type: String, default: "익명" },
  },
  sessionCount: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // 초 단위
  resetCount: { type: Number, default: 0 }, // 초기화 횟수
  lastInputTime: { type: Number },
  lastSavedAt: { type: Number },
  status: {
    type: String,
    enum: ["active", "submitted", "reset"],
    default: "active",
  },
  submittedAt: Date,
  resetHistory: [
    {
      resetAt: Date,
      sessionCount: Number,
      duration: Number,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
  // ✅ 자동 초기화 방지를 위한 보존 기간 설정
  createdAt: { type: Date, default: Date.now },
  // 사용자가 직접 초기화하지 않는 한 영구 보존
  autoResetDisabled: { type: Boolean, default: true },
});

module.exports = mongoose.model("Draft", draftSchema);
