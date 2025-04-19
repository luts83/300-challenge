// server/models/Feedback.js

const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    toSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    fromUid: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
); // ✅ createdAt 자동 생성됨

module.exports = mongoose.model("Feedback", feedbackSchema);
