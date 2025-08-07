const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    email: { type: String, required: true },
    displayName: { type: String, default: "익명" },
  },
  writingHistory: {
    mode_300: [
      {
        submissionId: String,
        date: Date,
        score: Number,
        criteria: {
          content: Number,
          expression: Number,
          structure: Number,
          impact: Number,
        },
        aiFeedback: String,
        userText: String,
        title: String,
        topic: String,
        wordCount: Number,
      },
    ],
    mode_1000: [
      {
        submissionId: String,
        date: Date,
        score: Number,
        criteria: {
          content: Number,
          expression: Number,
          structure: Number,
          originality: Number,
          consistency: Number,
          insight: Number,
          development: Number,
          technical: Number,
        },
        aiFeedback: String,
        userText: String,
        title: String,
        topic: String,
        wordCount: Number,
      },
    ],
  },
  writingStats: {
    mode_300: {
      averageScore: Number,
      scoreTrend: String, // 'improving', 'declining', 'stable'
      strengthAreas: [String],
      weaknessAreas: [String],
      writingFrequency: Number,
      preferredTopics: [String],
      commonMistakes: [String],
      lastUpdated: Date,
    },
    mode_1000: {
      averageScore: Number,
      scoreTrend: String,
      strengthAreas: [String],
      weaknessAreas: [String],
      writingFrequency: Number,
      preferredTopics: [String],
      commonMistakes: [String],
      writingStyle: {
        sentenceLength: Number,
        paragraphStructure: String,
        vocabularyLevel: String,
        logicalFlow: String,
      },
      lastUpdated: Date,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 업데이트 시 updatedAt 자동 갱신
userProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
