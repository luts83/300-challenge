const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    let serviceAccount;

    if (process.env.NODE_ENV === "production") {
      // 프로덕션 환경에서는 환경 변수에서 가져옴
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // 개발 환경에서는 파일에서 직접 읽음
      try {
        serviceAccount = require("./firebase-service-account.json");
      } catch (fileError) {
        console.warn("Firebase 설정 파일을 찾을 수 없습니다. 환경 변수에서 설정을 가져옵니다.");
        // 환경 변수에서 Firebase 설정 가져오기
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "dev-key",
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID || "123456789",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
          };
        } else {
          console.warn("Firebase 환경 변수가 설정되지 않았습니다. Firebase 기능이 비활성화됩니다.");
          // 개발 환경에서는 Firebase 없이도 실행되도록 빈 객체로 초기화
          serviceAccount = {
            type: "service_account",
            project_id: "dev-project",
            private_key_id: "dev-key",
            private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
            client_email: "dev@example.com",
            client_id: "123456789",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/dev%40example.com"
          };
        }
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    // 개발 환경에서는 에러를 던지지 않고 계속 진행
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}

module.exports = admin;
