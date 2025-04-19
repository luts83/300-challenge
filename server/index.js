require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.0.22:5173"],
    credentials: true,
  })
);

app.use(cors());
app.use(express.json());

const submitRoute = require("./routes/submit");
const topicRoute = require("./routes/topic");
app.use("/api/topic", topicRoute);
const mongoose = require("mongoose");
const tokenRoute = require("./routes/token");

app.use("/api/tokens", tokenRoute);

const evaluateRoute = require("./routes/evaluate");
app.use("/api/evaluate", require("./routes/evaluate"));
const statsRoute = require("./routes/stats");
app.use("/api/stats", statsRoute);
const feedbackRoute = require("./routes/feedback");
app.use("/api/feedback", feedbackRoute);
const feedbackMissionRoute = require("./routes/feedbackMission");
app.use("/api/feedback-missions", feedbackMissionRoute);

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
    console.error("❌ MongoDB 연결 실패:", err);
  });

app.use("/api/submit", require("./routes/submit"));

// 루트 라우트 (테스트용)
app.get("/", (req, res) => {
  res.send("👋 Hello World!");
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
