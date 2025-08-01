// server/utils/testTimeUtils.js
let testTime = null;

// 테스트용 시간 설정
const setTestTime = (dateString) => {
  testTime = new Date(dateString);
  console.log(`🕐 테스트 시간 설정: ${testTime.toISOString()}`);
};

// 테스트용 시간 해제
const clearTestTime = () => {
  testTime = null;
  console.log("�� 테스트 시간 해제됨");
};

// 현재 시간 가져오기 (테스트 시간이 있으면 테스트 시간 반환)
const getCurrentTime = () => {
  return testTime || new Date();
};

module.exports = {
  setTestTime,
  clearTestTime,
  getCurrentTime,
};
