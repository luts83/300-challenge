// server/models/UserTokenHistory.js
const mongoose = require("mongoose");

const userTokenHistorySchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  user: {
    email: { type: String, required: true },
    displayName: { type: String, default: "익명" },
  },
  dailySummary: {
    date: { type: Date, required: true },
    totalTokens: {
      mode_300: { type: Number, default: 0 },
      mode_1000: { type: Number, default: 0 },
    },
    goldenKeys: { type: Number, default: 0 },
    changes: [
      {
        type: {
          type: String,
          enum: [
            "DAILY_RESET",
            "WEEKLY_RESET",
            "GOLDEN_KEY",
            "WRITING_USE",
            "FEEDBACK_UNLOCK",
          ],
        },
        amount: { type: Number },
        mode: { type: String },
        timestamp: { type: Date },
      },
    ],
  },
  monthlySummary: {
    year: Number,
    month: Number,
    totalTokens: {
      mode_300: { type: Number, default: 0 },
      mode_1000: { type: Number, default: 0 },
    },
    goldenKeys: { type: Number, default: 0 },
  },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserTokenHistory", userTokenHistorySchema);
