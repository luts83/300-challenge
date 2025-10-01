#!/usr/bin/env node

// 9월 22일-28일 글쓰기 데이터 분석 스크립트
const mongoose = require("mongoose");
require("dotenv").config();

// Models import
const Submission = require("./server/models/Submission");
const UserProfile = require("./server/models/UserProfile");
const Feedback = require("./server/models/Feedback");

// MongoDB 연결
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/writing-app",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ MongoDB 연결 성공");
  } catch (error) {
    console.error("❌ MongoDB 연결 실패:", error);
    process.exit(1);
  }
}

// 특정 기간 데이터 분석
async function analyzeWritingData() {
  try {
    // 9월 22일-28일 기간 설정 (YYYY-MM-DD 형식)
    const startDate = "2024-09-22";
    const endDate = "2024-09-28";

    console.log(`\n📅 분석 기간: ${startDate} ~ ${endDate}`);
    console.log("=".repeat(50));

    // 1. 해당 기간의 모든 제출물 조회
    const submissionsInPeriod = await Submission.find({
      submissionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ createdAt: 1 });

    console.log(`\n📊 전체 통계:`);
    console.log(`- 총 제출물 개수: ${submissionsInPeriod.length}개`);

    // 그룹별 분석
    const mode300 = submissionsInPeriod.filter((s) => s.mode === "mode_300");
    const mode1000 = submissionsInPeriod.filter((s) => s.mode === "mode_1000");

    console.log(`- 300자 모드: ${mode300.length}개`);
    console.log(`- 1000자 모드: ${mode1000.length}개`);

    // 2. 점수 분석
    const scores = submissionsInPeriod
      .map((s) => s.score)
      .filter((s) => s !== undefined && s !== null);
    if (scores.length > 0) {
      const avgScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      console.log(`\n📈 점수 분석:`);
      console.log(`- 평균 점수: ${avgScore.toFixed(1)}점`);
      console.log(`- 최고 점수: ${maxScore}점`);
      console.log(`- 최저 점수: ${minScore}점`);

      // 점수 분포
      const scoreRanges = {
        "90-100": scores.filter((s) => s >= 90).length,
        "80-89": scores.filter((s) => s >= 80 && s < 90).length,
        "70-79": scores.filter((s) => s >= 70 && s < 80).length,
        "60-69": scores.filter((s) => s >= 60 && s < 70).length,
        "60미만": scores.filter((s) => s < 60).length,
      };

      console.log(`\n📊 점수 분포:`);
      Object.entries(scoreRanges).forEach(([range, count]) => {
        const percentage =
          scores.length > 0 ? ((count / scores.length) * 100).toFixed(1) : 0;
        console.log(`- ${range}점: ${count}개 (${percentage}%)`);
      });
    }

    // 3. 일별 분석
    console.log(`\n📅 일별 통계:`);
    const dailyStats = {};

    submissionsInPeriod.forEach((submission) => {
      const date = submission.submissionDate;
      if (!dailyStats[date]) {
        dailyStats[date] = {
          total: 0,
          mode300: 0,
          mode1000: 0,
          avgScore: 0,
          scores: [],
        };
      }

      dailyStats[date].total++;
      if (submission.mode === "mode_300") {
        dailyStats[date].mode300++;
      } else {
        dailyStats[date].mode1000++;
      }

      if (submission.score !== undefined && submission.score !== null) {
        dailyStats[date].scores.push(submission.score);
      }
    });

    Object.entries(dailyStats).forEach(([date, stats]) => {
      const avgScore =
        stats.scores.length > 0
          ? (
              stats.scores.reduce((sum, score) => sum + score, 0) /
              stats.scores.length
            ).toFixed(1)
          : 0;

      console.log(
        `- ${date}: 총 ${stats.total}개 (300자: ${stats.mode300}개, 1000자: ${stats.mode1000}개) 평균 ${avgScore}점`
      );
    });

    // 4. 사용자별 통계
    console.log(`\n👥 사용자별 통계:`);
    const userStats = {};

    submissionsInPeriod.forEach((submission) => {
      const uid = submission.user.uid;
      if (!userStats[uid]) {
        userStats[uid] = {
          displayName: submission.user.displayName,
          email: submission.user.email,
          total: 0,
          mode300: 0,
          mode1000: 0,
          scores: [],
          engagement: 0, // 피드백 활동
        };
      }

      userStats[uid].total++;
      if (submission.mode === "mode_300") {
        userStats[uid].mode300++;
      } else {
        userStats[uid].mode1000++;
      }

      if (submission.score !== undefined && submission.score !== null) {
        userStats[uid].scores.push(submission.score);
      }
    });

    // 날짜별로 최다 작성자 찾기
    const topWriters = Object.entries(userStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    console.log(`\n🏆 최다 작성자 TOP 5:`);
    topWriters.forEach(([uid, stats], index) => {
      const avgScore =
        stats.scores.length > 0
          ? (
              stats.scores.reduce((sum, score) => sum + score, 0) /
              stats.scores.length
            ).toFixed(1)
          : 0;

      console.log(
        `${index + 1}. ${stats.displayName} (${stats.email}) - ${
          stats.total
        }개 작성 (평균 ${avgScore}점)`
      );
    });

    // 5. 주제별 분석
    console.log(`\n📝 주제별 분석:`);
    const topicStats = {};

    submissionsInPeriod.forEach((submission) => {
      const topic = submission.topic || "자유주제";
      if (!topicStats[topic]) {
        topicStats[topic] = {
          count: 0,
          scores: [],
        };
      }

      topicStats[topic].count++;
      if (submission.score !== undefined && submission.score !== null) {
        topicStats[topic].scores.push(submission.score);
      }
    });

    const topTopics = Object.entries(topicStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    topTopics.forEach(([topic, stats], index) => {
      const avgScore =
        stats.scores.length > 0
          ? (
              stats.scores.reduce((sum, score) => sum + score, 0) /
              stats.scores.length
            ).toFixed(1)
          : 0;

      console.log(
        `${index + 1}. ${topic}: ${stats.count}개 (평균 ${avgScore}점)`
      );
    });

    // 6. 피드백 활동 분석
    console.log(`\n💬 피드백 활동 분석:`);
    const feedbacksInPeriod = await Feedback.find({
      createdAt: {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    });

    console.log(`- 총 피드백 개수: ${feedbacksInPeriod.length}개`);

    // 피드백 작성자별 통계
    const feedbackWriterStats = {};
    feedbacksInPeriod.forEach((feedback) => {
      const uid = feedback.fromUid;
      if (!feedbackWriterStats[uid]) {
        feedbackWriterStats[uid] = 0;
      }
      feedbackWriterStats[uid]++;
    });

    const topFeedbackWriters = Object.entries(feedbackWriterStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log(`\n🏆 최다 피드백 작성자 TOP 5:`);
    topFeedbackWriters.forEach(([uid, count], index) => {
      console.log(`${index + 1}. UID ${uid}: ${count}개 피드백 작성`);
    });

    // 7. 글쓰기 참여율 분석 (계정 대비)
    const uniqueWriters = new Set(submissionsInPeriod.map((s) => s.user.uid));
    console.log(`\n📊 참여율 분석:`);
    console.log(`- 글쓰기 참여자 수: ${uniqueWriters.size}명`);

    // 전체 사용자 수 조회
    const User = require("./server/models/User");
    const totalUsers = await User.countDocuments();
    console.log(`- 전체 사용자 수: ${totalUsers}명`);
    console.log(
      `- 참여율: ${((uniqueWriters.size / totalUsers) * 100).toFixed(2)}%`
    );

    // 8. 주요 트렌드 및 인사이트
    console.log(`\n🔍 주요 인사이트:`);

    // 가장 활발한 날
    const mostActiveDay = Object.entries(dailyStats).reduce((max, current) =>
      current[1].total > max[1].total ? current : max
    );
    console.log(
      `- 가장 활발한 날: ${mostActiveDay[0]} (${mostActiveDay[1].total}개 작성)`
    );

    // 평균 글 길이 (근사치)
    const avgTextLength =
      submissionsInPeriod.reduce((sum, sub) => sum + sub.text.length, 0) /
      submissionsInPeriod.length;
    console.log(`- 평균 글 길이: ${Math.round(avgTextLength)}자`);

    // 가장 인기 있는 모드
    const preferredMode =
      mode300.length > mode1000.length ? "300자 모드" : "1000자 모드";
    console.log(
      `- 인기 모드: ${preferredMode} (전체의 ${
        preferredMode === "300자 모드"
          ? ((mode300.length / submissionsInPeriod.length) * 100).toFixed(1)
          : ((mode1000.length / submissionsInPeriod.length) * 100).toFixed(1)
      }%)`
    );

    console.log(`\n✅ 분석 완료!`);
  } catch (error) {
    console.error("❌ 분석 중 오류 발생:", error);
  }
}

// 메인 실행
async function main() {
  await connectDB();
  await analyzeWritingData();

  console.log("\n📄 분석 보고서가 완료되었습니다.");
  mongoose.connection.close();
}

main().catch(console.error);
