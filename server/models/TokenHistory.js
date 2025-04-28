const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenHistorySchema = new mongoose.Schema({
  uid: String,
  type: {
    type: String,
    enum: ["DAILY_RESET", "STREAK_BONUS", "WRITING_USE", "FEEDBACK_UNLOCK"],
  },
  amount: Number,
  mode: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TokenHistory", tokenHistorySchema);
