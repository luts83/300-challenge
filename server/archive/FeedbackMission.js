// server/models/FeedbackMission.js

const mongoose = require("mongoose");

const feedbackMissionSchema = new mongoose.Schema(
  {
    fromUid: {
      type: String,
      required: true,
    },
    toSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeedbackMission", feedbackMissionSchema);
