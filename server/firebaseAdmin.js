// server/firebaseAdmin.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    // 환경 변수에서 서비스 계정 정보를 가져옴
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    throw error;
  }
}

module.exports = admin;
