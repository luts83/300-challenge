// server/models/FeedbackMission.js

const mongoose = require("mongoose");

const FeedbackMissionSchema = new mongoose.Schema({
  fromUid: { type: String, required: true }, // ✅ 올바른 이름
  toSubmissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Submission",
    required: true,
  },
  isDone: { type: Boolean, default: false },
});

module.exports = mongoose.model("FeedbackMission", FeedbackMissionSchema);
