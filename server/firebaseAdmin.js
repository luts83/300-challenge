// server/firebaseAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json"); // 🔑 서비스 계정 키 경로

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
