// server/models/Feedback.js

const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    // 피드백 대상 글 정보
    toSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    submissionTitle: { type: String }, // 글 제목
    submissionText: { type: String }, // 글 내용
    submissionMode: {
      // 글 모드
      type: String,
      enum: ["mode_300", "mode_1000"],
    },

    // 원글 작성자 정보
    toUser: {
      uid: { type: String, required: true },
      displayName: { type: String },
      email: { type: String },
    },

    // 피드백 작성자 정보
    fromUid: { type: String, required: true },
    fromUser: {
      displayName: { type: String },
      email: { type: String },
    },

    // 피드백 내용
    content: { type: String, required: true },
    writtenDate: { type: String }, // YYYY-MM-DD 형식

    // 피드백 상태
    isRead: { type: Boolean, default: false }, // 읽음 여부
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
