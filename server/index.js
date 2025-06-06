require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 8080;
const submitRoute = require("./routes/submit");
const topicRoute = require("./routes/topic");
const mongoose = require("mongoose");
const tokenRoute = require("./routes/token");
// const evaluateRoute = require("./routes/evaluate");
const statsRoute = require("./routes/stats");
const feedbackRoute = require("./routes/feedback");
const writingRoutes = require("./routes/writing");
const draftRoutes = require("./routes/drafts");
const recordsRoutes = require("./routes/records"); // 추가
const streakRoute = require("./routes/streak");
const logger = require("./utils/logger");
const dashboardRouter = require("./routes/dashboard");
const authRoutes = require("./routes/auth");
const { ACCESS_CONTROL } = require("./config");
const fetchAllowedEmailsFromSheet = require("./utils/fetchAllowedEmails");
const cookieParser = require("cookie-parser");

app.use(cookieParser());

const allowedOrigins = [
  "http://dwriting.ai",
  "https://dwriting.ai",
  "http://www.dwriting.ai",
  "https://www.dwriting.ai",
  "https://dwriting.com",
  "https://www.dwriting.com",
  "http://dwriting.com",
  "http://www.dwriting.com",
  "https://edu-ocean.com",
  "https://www.edu-ocean.com",
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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
app.use("/api/topic", topicRoute);
app.use("/api/tokens", tokenRoute);
// app.use("/api/evaluate", require("./routes/evaluate"));
app.use("/api/records", recordsRoutes); // 추가
app.use("/api/drafts", draftRoutes);
app.use("/api/submit", require("./routes/submit"));
app.use("/api/writing", writingRoutes);

app.use("/api/feedback", feedbackRoute);
app.use("/api/stats", statsRoute);
app.use("/api/streak", streakRoute);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/auth", authRoutes);

// 도메인 리다이렉션 미들웨어
app.use((req, res, next) => {
  if (
    req.hostname === "edu-ocean.com" ||
    req.hostname === "www.edu-ocean.com"
  ) {
    return res.redirect(301, `https://dwriting.com${req.url}`);
  }
  next();
});

// MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB 연결 완료");
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
