// server/models/Submission.js
const mongoose = require("mongoose");
const CONFIG = require("../config");

const submissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: CONFIG.SUBMISSION.TITLE.REQUIRED,
      minlength: CONFIG.SUBMISSION.TITLE.MIN_LENGTH,
      maxlength: CONFIG.SUBMISSION.TITLE.MAX_LENGTH,
    },
    topic: {
      type: String,
      required: false, // 자유주제일 수 있으므로
      default: null,
    },
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
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiFeedback: {
      type: String,
    },
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
    likeCount: {
      type: Number,
      default: 0,
    },
    likedUsers: [
      {
        uid: String,
        displayName: String,
        email: String,
        likedAt: { type: Date, default: Date.now },
      },
    ],
    feedbackCount: { type: Number, default: 0 },
  },

  {
    timestamps: true, // ✨ createdAt, updatedAt 자동 생성!
  }
);

module.exports = mongoose.model("Submission", submissionSchema);
