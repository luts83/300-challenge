// server/models/Token.js
const mongoose = require("mongoose");
const CONFIG = require("../config");

const tokenSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    user: {
      email: { type: String, required: true },
      displayName: { type: String, default: "익명" },
    },
    tokens_300: { type: Number, default: CONFIG?.TOKEN?.DAILY_LIMIT_300 || 1 },
    tokens_1000: {
      type: Number,
      default: CONFIG?.TOKEN?.DAILY_LIMIT_1000 || 1,
    },
    goldenKeys: { type: Number, default: 0 },
    lastRefreshed: { type: Date, default: () => new Date() },
    lastWeeklyRefreshed: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

module.exports = mongoose.model("Token", tokenSchema);
