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

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5173/",
      "http://192.168.0.22:5173",
      "http://192.168.0.163:5173", // 현재 클라이언트 IP 추가
      "https://write-challenge.pages.dev",
      "https://edu-ocean.com",
      "https://www.dwriting.com",
      "https://dwriting.com",
    ],
    credentials: true,
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

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
