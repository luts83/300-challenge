const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true }, // Firebase UID
    email: { type: String, required: true, unique: true },
    displayName: { type: String },
    feedbackNotification: { type: Boolean, default: true }, // true: 알림 ON(이메일 안감), false: 알림 OFF(이메일 감)
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
