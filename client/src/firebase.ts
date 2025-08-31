// client/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase 구성 객체 (환경 변수에서 가져옴)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDnpAr7xv2dmeRpLAS7m1mQ0wyeo81xQAQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'writing-challenge-d4892.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'writing-challenge-d4892',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'writing-challenge-d4892.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '323909574022',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:323909574022:web:d473ff4645efdf14b62007',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-8715JL3XGX',
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Auth 인스턴스 가져오기
export const auth = getAuth(app);

// Firebase Analytics 초기화 (브라우저에서만 지원)
let analytics: ReturnType<typeof getAnalytics> | undefined = undefined;

isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log('📊 Firebase Analytics 초기화 완료');
  }
});

export { app, analytics };
