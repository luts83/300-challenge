const mongoose = require("mongoose");

const draftSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  isSubmitted: { type: Boolean, default: false },
  title: { type: String, default: "" },
  text: { type: String, default: "" },
  sessionCount: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // 초 단위
  lastInputTime: { type: Number, default: 0 }, // 초 단위
  resetCount: { type: Number, default: 0 }, // 초기화 횟수
  lastSavedAt: { type: Number, default: 0 }, // 마지막 저장 시간
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Draft", draftSchema);
