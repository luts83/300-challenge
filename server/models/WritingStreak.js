const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const writingStreakSchema = new Schema({
  uid: String,
  currentStreak: { type: Number, default: 0 },
  lastWrittenDate: { type: Date },
  goldenKeys: { type: Number, default: 0 }, // bonusTokens를 goldenKeys로 변경
  weeklyStreak: {
    // 이번 주의 연속 작성 현황
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
  },
  lastWeekReset: { type: Date }, // 마지막으로 주간 기록이 리셋된 시간
  weeklyProgress: [Boolean],
  lastUpdated: Date,
  celebrationShown: Boolean,
  lastStreakCompletion: Date, // 마지막으로 스트릭을 완료한 날짜
  currentWeekStartDate: Date,
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
  monday.setDate(monday.getDate() - monday.getDay() + 1); // 이번 주 월요일

  // 현재 주의 시작일이 이번 주 월요일보다 이전이면 새로운 주 시작
  return this.currentWeekStartDate < monday;
};

module.exports = mongoose.model("WritingStreak", writingStreakSchema);
