const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    let serviceAccount;

    if (process.env.NODE_ENV === "production") {
      // 프로덕션 환경에서는 환경 변수에서 가져옴
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // 개발 환경에서는 파일에서 직접 읽음
      serviceAccount = require("./firebase-service-account.json");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    throw error;
  }
}

module.exports = admin;
