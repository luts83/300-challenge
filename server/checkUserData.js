require("dotenv").config();
const mongoose = require("mongoose");
const Feedback = require("./models/Feedback");
const Submission = require("./models/Submission");
const User = require("./models/User");

async function checkUserData() {
  try {
    // MongoDB 연결
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/writing300";

    console.log("🔍 환경 변수 확인:");
    console.log(
      "  MONGO_URI:",
      process.env.MONGO_URI ? "설정됨" : "설정되지 않음"
    );
    console.log("  실제 연결 문자열:", mongoUri);

    await mongoose.connect(mongoUri);
    console.log("MongoDB 연결 성공");

    // 데이터베이스 정보 확인
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`\n🗄️ 연결된 데이터베이스: ${dbName}`);

    // 컬렉션 목록 확인
    const collections = await db.listCollections().toArray();
    console.log(`\n📚 컬렉션 목록 (${collections.length}개):`);
    collections.forEach((collection, i) => {
      console.log(`  ${i + 1}. ${collection.name} (${collection.type})`);
    });

    const uid = "rP7f6ffEELgIzctnryq43JqXFNW2";
    const email = "lee.sanggean@gmail.com";

    // 1. 전체 사용자 수 확인
    const totalUsers = await User.countDocuments();
    console.log(`\n👥 전체 사용자 수: ${totalUsers}명`);

    // 2. 최근 가입한 사용자 10명 확인
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("uid email displayName createdAt");
    console.log("\n👤 최근 가입한 사용자 10명:");
    recentUsers.forEach((user, i) => {
      console.log(
        `  ${i + 1}. ${user.email} | ${user.displayName || "N/A"} | ${
          user.uid
        } | ${user.createdAt?.toISOString().slice(0, 10) || "N/A"}`
      );
    });

    // 3. 이메일로 사용자 찾기
    const userByEmail = await User.findOne({ email });
    console.log(
      "\n👤 이메일로 찾은 사용자:",
      userByEmail
        ? {
            uid: userByEmail.uid,
            email: userByEmail.email,
            displayName: userByEmail.displayName,
            createdAt: userByEmail.createdAt?.toISOString().slice(0, 10),
          }
        : "사용자를 찾을 수 없음"
    );

    // 4. UID로 사용자 찾기
    const userByUid = await User.findOne({ uid });
    console.log(
      "\n👤 UID로 찾은 사용자:",
      userByUid
        ? {
            uid: userByUid.uid,
            email: userByUid.email,
            displayName: userByUid.displayName,
            createdAt: userByUid.createdAt?.toISOString().slice(0, 10),
          }
        : "사용자를 찾을 수 없음"
    );

    // 5. 이메일 부분 일치로 사용자 찾기
    const partialEmailUsers = await User.find({
      email: { $regex: "lee.sanggean", $options: "i" },
    }).select("uid email displayName createdAt");
    console.log("\n🔍 이메일 부분 일치 사용자:");
    partialEmailUsers.forEach((user, i) => {
      console.log(
        `  ${i + 1}. ${user.email} | ${user.displayName || "N/A"} | ${
          user.uid
        } | ${user.createdAt?.toISOString().slice(0, 10) || "N/A"}`
      );
    });

    // 6. 오늘 날짜 (한국 시간 기준)
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);
    console.log("\n📅 오늘 날짜 (한국 시간):", todayString);

    // 7. 실제 사용자 UID로 피드백 확인 (이메일로 찾은 사용자가 있다면)
    if (userByEmail) {
      const actualUid = userByEmail.uid;
      console.log(`\n🔍 실제 사용자 UID (${actualUid})로 피드백 확인:`);

      // writtenDate 기준 오늘 피드백
      const todayFeedbacks = await Feedback.countDocuments({
        fromUid: actualUid,
        writtenDate: todayString,
      });
      console.log(`  📝 writtenDate 기준 오늘 피드백: ${todayFeedbacks}개`);

      // createdAt 기준 오늘 피드백
      const todayFeedbacksByCreatedAt = await Feedback.countDocuments({
        fromUid: actualUid,
        createdAt: {
          $gte: new Date(todayString),
          $lt: new Date(new Date(todayString).getTime() + 24 * 60 * 60 * 1000),
        },
      });
      console.log(
        `  📝 createdAt 기준 오늘 피드백: ${todayFeedbacksByCreatedAt}개`
      );

      // 최근 피드백 5개
      const recentFeedbacks = await Feedback.find({ fromUid: actualUid })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("toSubmissionId", "mode title");
      console.log("\n  📝 최근 피드백 5개:");
      recentFeedbacks.forEach((fb, i) => {
        console.log(
          `    ${i + 1}. ${
            fb.writtenDate || "writtenDate 없음"
          } | ${fb.createdAt.toISOString().slice(0, 10)} | ${
            fb.toSubmissionId?.mode || "N/A"
          } | ${fb.toSubmissionId?.title || "N/A"}`
        );
      });

      // 오늘 제출물
      const todaySubmissions = await Submission.countDocuments({
        "user.uid": actualUid,
        submissionDate: todayString,
      });
      console.log(`  📄 오늘 제출물: ${todaySubmissions}개`);

      // 최근 제출물 5개
      const recentSubmissions = await Submission.find({ "user.uid": actualUid })
        .sort({ createdAt: -1 })
        .limit(5);
      console.log("\n  📄 최근 제출물 5개:");
      recentSubmissions.forEach((sub, i) => {
        console.log(
          `    ${i + 1}. ${
            sub.submissionDate || "submissionDate 없음"
          } | ${sub.createdAt.toISOString().slice(0, 10)} | ${
            sub.mode || "N/A"
          } | ${sub.title || "N/A"}`
        );
      });
    }

    // 8. 전체 컬렉션의 문서 수 확인
    console.log("\n📊 전체 컬렉션 문서 수:");
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`  ${collection.name}: ${count}개`);
      } catch (error) {
        console.log(`  ${collection.name}: 오류 발생 (${error.message})`);
      }
    }

    await mongoose.disconnect();
    console.log("\n✅ MongoDB 연결 해제");
  } catch (error) {
    console.error("❌ 오류:", error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

checkUserData();
