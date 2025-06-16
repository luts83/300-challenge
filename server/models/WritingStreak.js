const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const writingStreakSchema = new Schema({
  uid: { type: String, required: true },
  user: {
    email: { type: String, required: true },
    displayName: { type: String, default: "익명" },
  },
  weeklyProgress: [Boolean], // 월-금 진행 상황
  lastUpdated: { type: Date, default: Date.now },
  celebrationShown: { type: Boolean, default: false },
  lastStreakCompletion: { type: Date },
  currentWeekStartDate: { type: Date },
  streakHistory: [
    {
      weekStartDate: Date,
      completed: Boolean,
      completionDate: Date,
    },
  ],
});

// 새로운 주 시작 여부 확인 메서드
writingStreakSchema.methods.shouldStartNewWeek = function () {
  if (!this.currentWeekStartDate) return true;

  const now = new Date();
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - monday.getDay() + 1);

  return this.currentWeekStartDate < monday;
};

// 현재 주차의 진행률 계산 메서드 추가
writingStreakSchema.methods.getProgressRate = function () {
  if (!this.weeklyProgress) return 0;
  const completed = this.weeklyProgress.filter((day) => day).length;
  return (completed / 5) * 100;
};

// 이번 주 완료 여부 확인 메서드 추가
writingStreakSchema.methods.isWeekCompleted = function () {
  return (
    this.weeklyProgress &&
    this.weeklyProgress.length === 5 &&
    this.weeklyProgress.every((day) => day)
  );
};

module.exports = mongoose.model("WritingStreak", writingStreakSchema);
