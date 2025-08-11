require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const app = express();
const PORT = process.env.PORT || 8080;

// 프록시 환경에서 rate limiting이 제대로 작동하도록 설정
app.set("trust proxy", 1);
const submitRoute = require("./routes/submit");
const topicRoute = require("./routes/topic");
const mongoose = require("mongoose");
const tokenRoute = require("./routes/token");
// const evaluateRoute = require("./routes/evaluate");
const statsRoute = require("./routes/stats");
const feedbackRoute = require("./routes/feedback");
// const writingRoutes = require("./routes/writing"); //
const draftRoutes = require("./routes/drafts");
const recordsRoutes = require("./routes/records"); // 추가
const streakRoute = require("./routes/streak");
const logger = require("./utils/logger");
const dashboardRouter = require("./routes/dashboard");
const authRoutes = require("./routes/auth");
const landingRoutes = require("./routes/landing");
const { ACCESS_CONTROL } = require("./config");
const fetchAllowedEmailsFromSheet = require("./utils/fetchAllowedEmails");
const cookieParser = require("cookie-parser");
const Submission = require("./models/Submission");
const userRoutes = require("./routes/user");

app.use(cookieParser());

// Rate Limiting 설정
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 50, // 1분당 최대 50회 요청 (더 관대하게)
  standardHeaders: true,
  legacyHeaders: false,
  // 사용자 친화적인 설정 추가
  skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
  skipFailedRequests: false, // 실패한 요청은 카운트
  handler: (req, res) => {
    res.status(429).json({
      error: "잠시 후 다시 시도해주세요.",
      retryAfter: Math.ceil(60 / 1000), // 60초 후 재시도 가능
    });
  },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 200, // 1분당 최대 200회 요청 (2배 증가)
  standardHeaders: true,
  legacyHeaders: false,
  // 사용자 친화적인 설정 추가
  skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
  skipFailedRequests: false, // 실패한 요청은 카운트
  handler: (req, res) => {
    res.status(429).json({
      error: "잠시 후 다시 시도해주세요.",
      retryAfter: Math.ceil(60 / 1000), // 60초 후 재시도 가능
    });
  },
});

const allowedOrigins = [
  "https://dwriting.ai",
  "https://www.dwriting.ai",
  "https://edu-ocean.com",
  "https://www.edu-ocean.com",
  "https://dwriting.com",
  "https://www.dwriting.com",
  "http://localhost:5173",
  "http://192.168.45.65:5173",
  "http://192.168.0.172:5173",
  "http://192.168.0.181:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS 오류 발생:");
        console.log("- 시도한 도메인:", origin);
        console.log("- 허용된 도메인:", allowedOrigins);
        console.log("- 요청 시간:", new Date().toISOString());
        callback(new Error("CORS 오류: 허용되지 않은 도메인"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Cache-Control",
      "X-Requested-With",
      "Expires",
      "Pragma",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: [
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
    ],
    maxAge: 86400,
  })
);

app.use(express.json());

// Rate Limiting 적용 (Dashboard는 제외)
app.use("/api/tokens", tokenLimiter); // 토큰 API에 제한
app.use("/api/submit", generalLimiter); // 제출 API에 제한
app.use("/api/feedback", generalLimiter); // 피드백 API에 제한
// Dashboard API는 Rate Limiting 제외 (사용자 경험 우선)

app.use("/api/topic", topicRoute);
app.use("/api/tokens", tokenRoute);
// app.use("/api/evaluate", require("./routes/evaluate"));
app.use("/api/records", recordsRoutes); // 추가
app.use("/api/drafts", draftRoutes);
app.use("/api/submit", require("./routes/submit"));
// app.use("/api/writing", writingRoutes);

app.use("/api/feedback", feedbackRoute);
app.use("/api/stats", statsRoute);
app.use("/api/streak", streakRoute);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/landing", landingRoutes);

// MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB 연결 완료");

    // 인덱스 생성
    const createIndexes = require("./utils/createIndexes");
    await createIndexes();

    // 연결 후 데이터 확인
    const count = await Submission.countDocuments();
    console.log(`📚 총 ${count}개의 글이 있습니다.`);
  })
  .catch((err) => {
    logger.error("❌ MongoDB 연결 실패:", err);
  });

// 루트 라우트 (테스트용)
app.get("/", (req, res) => {
  res.send("👋 Hello World!");
});

(async () => {
  try {
    const emails = await fetchAllowedEmailsFromSheet();
    ACCESS_CONTROL.ALLOWED_EMAILS = emails;
    console.log("✅ 이메일 목록 로딩 성공:", emails);
  } catch (error) {
    console.log("❌ 이메일 목록 로딩 실패:", error);
  }
})();

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
