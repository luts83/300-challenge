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

    // 중복 제출 방지를 위한 textHash 인덱스 (업계 표준)
    try {
      await Submission.collection.createIndex(
        { textHash: 1 },
        { name: "text_hash_index" }
      );
      console.log("✅ text_hash_index 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ text_hash_index 인덱스 이미 존재:", error.message);
    }

    // 사용자별 중복 제출 방지를 위한 복합 인덱스
    try {
      await Submission.collection.createIndex(
        { "user.uid": 1, textHash: 1, createdAt: -1 },
        { name: "user_text_hash_created" }
      );
      console.log("✅ user_text_hash_created 인덱스 생성 완료");
    } catch (error) {
      console.log("⚠️ user_text_hash_created 인덱스 이미 존재:", error.message);
    }

    // 텍스트 검색을 위한 text 인덱스 (제목, 내용, 작성자명, 이메일 포함)
    try {
      await Submission.collection.createIndex(
        {
          title: "text",
          text: "text",
          "user.displayName": "text",
          "user.email": "text",
        },
        {
          name: "comprehensive_search_index",
          weights: {
            title: 10, // 제목에 더 높은 가중치
            text: 5, // 내용에 중간 가중치
            "user.displayName": 3, // 작성자명에 낮은 가중치
            "user.email": 1, // 이메일에 가장 낮은 가중치
          },
        }
      );
      console.log("✅ comprehensive_search_index 인덱스 생성 완료");
    } catch (error) {
      console.log(
        "⚠️ comprehensive_search_index 인덱스 이미 존재:",
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
