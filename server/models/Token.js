// server/models/Token.js
const mongoose = require("mongoose"); // ✅ 이 줄 추가
const CONFIG = require("../config");

const tokenSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  tokens_300: { type: Number, default: CONFIG?.TOKEN?.DAILY_LIMIT_300 || 1 },
  tokens_1000: { type: Number, default: CONFIG?.TOKEN?.DAILY_LIMIT_1000 || 1 },
  goldenKeys: { type: Number, default: 0 }, // bonusTokens를 goldenKeys로 변경
  mode: {
    type: String,
    enum: ["mode_300", "mode_1000"],
    default: "mode_300",
  },
  lastRefreshed: { type: Date, default: () => new Date() },
  lastWeeklyRefreshed: { type: Date, default: () => new Date() }, // 주간 토큰 리셋을 위한 필드 추가
});

module.exports = mongoose.model("Token", tokenSchema);
