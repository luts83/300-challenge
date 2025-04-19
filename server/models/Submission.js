const mongoose = require("mongoose");
const CONFIG = require("../config");

const submissionSchema = new mongoose.Schema({
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
  submittedAt: { type: Date, default: Date.now },
  score: { type: Number, default: null },
  feedback: { type: String, default: "" },
});

module.exports = mongoose.model("Submission", submissionSchema);
