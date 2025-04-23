// server/models/Submission.js
const mongoose = require("mongoose");
const CONFIG = require("../config");

const submissionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      minlength: CONFIG.SUBMISSION.MIN_LENGTH,
      maxlength: CONFIG.SUBMISSION.MAX_LENGTH,
    },
    user: {
      uid: { type: String, required: true },
      email: { type: String, required: true },
      displayName: { type: String, default: "익명" },
    },
    sessionCount: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    score: { type: Number, default: null },
    feedback: { type: String, default: "" },
    submissionDate: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["mode_300", "mode_1000"],
      required: true,
    },
    feedbackUnlocked: {
      type: Boolean,
      default: false,
    },
    feedbackGivenForUnlock: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Feedback" },
    ],
  },
  {
    timestamps: true, // ✨ createdAt, updatedAt 자동 생성!
  }
);

module.exports = mongoose.model("Submission", submissionSchema);
