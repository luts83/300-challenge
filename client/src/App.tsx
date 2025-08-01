// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import MySubmissions from './pages/MySubmissions';
import Navbar from './components/Navbar';
import FeedbackCamp from './pages/FeedbackCamp';
import { UserProvider, useUser } from './context/UserContext';
import './styles/globals.css';
import Write from './pages/Write';
import Write300 from './pages/Write300';
import Write1000 from './pages/Write1000';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import FAQ from './pages/FAQ';
import { initTheme, toggleDarkMode } from './utils/theme';
import { ThemeProvider } from './context/ThemeContext';

// 배경 이미지 래퍼 컴포넌트
const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useUser();
  const isAuthPage = location.pathname === '/login';
  const isLandingPage = location.pathname === '/' && !user;

  return (
    <div className="min-h-screen">
      {/* 배경 이미지는 로그인과 랜딩 페이지가 아닐 때만 표시 */}
      {!isAuthPage && !isLandingPage && (
        <div className="fixed top-0 left-0 w-full h-full z-[-1]">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/images/background-image.png')`,
            }}
          />
        </div>
      )}

      <div className="min-h-screen bg-black/10 dark:bg-black/30">
        <Navbar />
        {children}
      </div>
    </div>
  );
};

function App() {
  const { user } = useUser();

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <UserProvider>
      <ThemeProvider>
        <Router>
          <BackgroundWrapper>
            <Routes>
              <Route path="/" element={user ? <Write /> : <LandingPage />} />
              <Route path="/write/300" element={<Write300 />} />
              <Route path="/write/1000" element={<Write1000 />} />
              <Route path="/login" element={<Login />} />
              <Route path="/my" element={<MySubmissions />} />
              <Route path="/feedback-camp" element={<FeedbackCamp />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/faq" element={<FAQ />} />
            </Routes>
          </BackgroundWrapper>
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;
