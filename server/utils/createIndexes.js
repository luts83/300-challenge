// server/utils/createIndexes.js
const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const Token = require("../models/Token");

/**
 * MongoDB 성능 향상을 위한 인덱스 생성
 * 서버 시작 시 자동으로 실행됩니다.
 */
const createIndexes = async () => {
  try {
    console.log("🔍 MongoDB 인덱스 생성 시작...");

    // Submission 모델 인덱스
    try {
      await Submission.collection.createIndex(
        { "user.uid": 1, submissionDate: 1 },
        { name: "user_submission_date" }
      );
      console.log("✅ user_submission_date 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ user_submission_date 인덱스 이미 존재:", error.message);
    }

    try {
      await Submission.collection.createIndex(
        { submissionDate: 1, createdAt: -1 },
        { name: "submission_date_created_desc" }
      );
      console.log("✅ submission_date_created_desc 인덱스 생성 완료");
    } catch (error) {
      console.log(
        "⚠️ submission_date_created_desc 인덱스 이미 존재:",
        error.message
      );
    }

    // 사용자별 생성일 기준 정렬 (가장 기본적인 인덱스)
    try {
      await Submission.collection.createIndex(
        { "user.uid": 1, createdAt: -1 },
        { name: "user_created_desc" }
      );
      console.log("✅ user_created_desc 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ user_created_desc 인덱스 이미 존재:", error.message);
    }

    try {
      await Submission.collection.createIndex(
        { mode: 1, createdAt: -1 },
        { name: "mode_created_desc" }
      );
      console.log("✅ mode_created_desc 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ mode_created_desc 인덱스 이미 존재:", error.message);
    }

    try {
      await Submission.collection.createIndex(
        { score: -1, createdAt: -1 },
        { name: "score_created_desc" }
      );
      console.log("✅ score_created_desc 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ score_created_desc 인덱스 이미 존재:", error.message);
    }

    // 복합 인덱스로 통합 (중복 제거)
    try {
      await Submission.collection.createIndex(
        { "user.uid": 1, mode: 1, createdAt: -1, score: -1 },
        { name: "user_mode_created_score_desc" }
      );
      console.log("✅ user_mode_created_score_desc 인덱스 생성 완료");
    } catch (error) {
      console.log(
        "⚠️ user_mode_created_score_desc 인덱스 이미 존재:",
        error.message
      );
    }

    // Feedback 모델 인덱스
    try {
      await Feedback.collection.createIndex(
        { fromUid: 1, writtenDate: 1 },
        { name: "feedback_from_date" }
      );
      console.log("✅ feedback_from_date 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ feedback_from_date 인덱스 이미 존재:", error.message);
    }

    try {
      await Feedback.collection.createIndex(
        { toSubmissionId: 1 },
        { name: "feedback_to_submission" }
      );
      console.log("✅ feedback_to_submission 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ feedback_to_submission 인덱스 이미 존재:", error.message);
    }

    try {
      await Feedback.collection.createIndex(
        { writtenDate: 1, createdAt: -1 },
        { name: "feedback_date_created_desc" }
      );
      console.log("✅ feedback_date_created_desc 인덱스 생성 완료");
    } catch (error) {
      console.log(
        "⚠️ feedback_date_created_desc 인덱스 이미 존재:",
        error.message
      );
    }

    // 사용자별 피드백 생성일 기준 (중복 제거)
    try {
      await Feedback.collection.createIndex(
        { fromUid: 1, createdAt: -1 },
        { name: "feedback_from_created_desc" }
      );
      console.log("✅ feedback_from_created_desc 인덱스 생성 완료");
    } catch (error) {
      console.log(
        "⚠️ feedback_from_created_desc 인덱스 이미 존재:",
        error.message
      );
    }

    // User 모델 인덱스
    try {
      await User.collection.createIndex({ uid: 1 }, { name: "user_uid" });
      console.log("✅ user_uid 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ user_uid 인덱스 이미 존재:", error.message);
    }

    try {
      await User.collection.createIndex({ email: 1 }, { name: "user_email" });
      console.log("✅ user_email 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ user_email 인덱스 이미 존재:", error.message);
    }

    // Token 모델 인덱스
    try {
      await Token.collection.createIndex({ uid: 1 }, { name: "token_uid" });
      console.log("✅ token_uid 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ token_uid 인덱스 이미 존재:", error.message);
    }

    console.log("✅ MongoDB 인덱스 생성 완료!");
  } catch (error) {
    console.error("❌ 인덱스 생성 실패:", error);
  }
};

module.exports = createIndexes;
