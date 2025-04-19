import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase 구성 객체 (네 프로젝트에서 복사한 내용)
const firebaseConfig = {
  apiKey: "AIzaSyDnpAr7xv2dmeRpLAS7m1mQ0wyeo81xQAQ",
  authDomain: "writing-challenge-d4892.firebaseapp.com",
  projectId: "writing-challenge-d4892",
  storageBucket: "writing-challenge-d4892.firebasestorage.app",
  messagingSenderId: "323909574022",
  appId: "1:323909574022:web:d473ff4645efdf14b62007",
  measurementId: "G-8715JL3XGX"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Auth 인스턴스 가져오기
export const auth = getAuth(app);

// Firebase Analytics 초기화 (브라우저에서만 지원)
let analytics: ReturnType<typeof getAnalytics> | undefined = undefined;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("📊 Firebase Analytics 초기화 완료");
  }
});

export { app, analytics };
