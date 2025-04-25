// server/utils/logger.js
const isDevelopment = process.env.NODE_ENV === "development";

const logger = {
  debug: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args) => {
    console.error(...args);
    // 추후 에러 모니터링 서비스 연동 가능
  },
};

module.exports = logger;
