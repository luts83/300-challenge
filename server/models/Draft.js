//Draft.js
const mongoose = require("mongoose");

const draftSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  title: { type: String, default: "" },
  text: { type: String, default: "" },
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
});

module.exports = mongoose.model("Draft", draftSchema);
