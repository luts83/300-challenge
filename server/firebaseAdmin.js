const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
