// server/models/Token.js
const mongoose = require("mongoose"); // ✅ 이 줄 추가
const CONFIG = require("../config");

const tokenSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  tokens_300: { type: Number, default: CONFIG?.TOKEN?.DAILY_LIMIT_300 || 1 },
  tokens_1000: { type: Number, default: CONFIG?.TOKEN?.DAILY_LIMIT_1000 || 1 },
  bonusTokens: { type: Number, default: 0 }, // 리셋되지 않는 보너스 토큰 추가
  mode: {
    type: String,
    enum: ["mode_300", "mode_1000"],
    default: "mode_300",
  },
  lastRefreshed: { type: Date, default: () => new Date() },
});

module.exports = mongoose.model("Token", tokenSchema);
