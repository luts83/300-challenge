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
    // 피드백 작성자 시간대 정보 추가
    fromUserTimezone: { type: String },
    fromUserOffset: { type: Number },

    // 구조화된 피드백 내용
    strengths: { type: String, required: false }, // 마음에 드는 부분 (선택사항)
    improvements: { type: String, required: false }, // 더 멋진 방향 (선택사항)
    overall: { type: String, required: true }, // 전체적인 느낌 (필수)

    // 기존 content 필드는 하위 호환성을 위해 유지하되 deprecated 처리
    content: { type: String, required: false }, // deprecated

    // 피드백 내용
    writtenDate: { type: String }, // YYYY-MM-DD 형식

    // 원글 작성 날짜 (피드백 대상 글의 원래 작성 날짜)
    submissionCreatedAt: { type: Date },

    // 피드백 상태
    isRead: { type: Boolean, default: false }, // 읽음 여부
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 🔍 중복 피드백 방지를 위한 복합 인덱스 추가
feedbackSchema.index({ fromUid: 1, toSubmissionId: 1 }, { unique: true });
feedbackSchema.index({ fromUid: 1, writtenDate: 1, toSubmissionId: 1 });
feedbackSchema.index({ toSubmissionId: 1, fromUid: 1 });

// 🚨 중복 피드백 방지를 위한 스키마 레벨 검증 추가
feedbackSchema.pre("save", async function (next) {
  try {
    // 같은 사용자가 같은 글에 피드백을 작성하려는지 확인
    const existingFeedback = await this.constructor.findOne({
      fromUid: this.fromUid,
      toSubmissionId: this.toSubmissionId,
      _id: { $ne: this._id }, // 현재 문서 제외
    });

    if (existingFeedback) {
      const error = new Error("이미 이 글에 피드백을 작성하셨습니다.");
      error.name = "DuplicateFeedbackError";
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
