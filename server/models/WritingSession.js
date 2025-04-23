const mongoose = require("mongoose");

const WritingSessionSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    mode: { type: String, enum: ["1000"], required: true },
    text: { type: String, default: "" },
    sessionCount: { type: Number, default: 1 },
    totalDuration: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WritingSession", WritingSessionSchema);
