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

// ✅ 새로운 주 시작 여부 확인 메서드 (사용자 시간대 기준으로 수정)
writingStreakSchema.methods.shouldStartNewWeek = function (userOffset = -540) {
  if (!this.currentWeekStartDate) return true;

  // timezoneUtils.js의 getUserMonday 함수 사용
  const { getUserMonday } = require("../utils/timezoneUtils");
  const monday = getUserMonday(userOffset);

  return this.currentWeekStartDate < monday;
};

// ✅ 사용자 시간대 기준으로 주간 리셋을 처리하는 메서드 추가
writingStreakSchema.methods.resetForNewWeek = function (userOffset = -540) {
  const { getUserMonday } = require("../utils/timezoneUtils");
  const monday = getUserMonday(userOffset);

  // 이전 주 기록을 히스토리에 저장
  if (this.weeklyProgress?.some((day) => day)) {
    const wasCompleted = this.weeklyProgress.every((day) => day);
    this.streakHistory.push({
      weekStartDate: this.currentWeekStartDate,
      completed: wasCompleted,
      completionDate: wasCompleted ? this.lastStreakCompletion : null,
    });
  }

  // 새로운 주 시작
  this.weeklyProgress = Array(5).fill(false);
  this.celebrationShown = false;
  this.currentWeekStartDate = monday;
  this.lastUpdated = new Date();
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
