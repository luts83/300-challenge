const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenHistorySchema = new mongoose.Schema({
  uid: String,
  type: {
    type: String,
    enum: [
      "DAILY_RESET",
      "WEEKLY_RESET",
      "GOLDEN_KEY",
      "WRITING_USE",
      "FEEDBACK_UNLOCK",
    ], // 타입 수정
  },
  amount: Number,
  mode: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TokenHistory", tokenHistorySchema);
