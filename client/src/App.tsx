// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import MySubmissions from './pages/MySubmissions';
import Navbar from './components/Navbar';
import FeedbackCamp from './pages/FeedbackCamp';
import { UserProvider } from './context/UserContext';
import './index.css';
import Write from './pages/Write';
import Write300 from './pages/Write300';
import Write1000 from './pages/Write1000';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <UserProvider>
      <Router>
        {/* 배경 전체를 감싸는 래퍼 */}
        <div className="fixed top-0 left-0 w-full h-full z-[-1]">
          {/* 배경 이미지 */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/images/background-image.png')`,
            }}
          />
          {/* 흰색 반투명 오버레이 */}
          <div className="absolute inset-0 bg-white bg-opacity-20" />
        </div>
        <div className="min-h-screen bg-black/10">
          <Navbar />
          <Routes>
            <Route path="/" element={<Write />} />
            <Route path="/write/300" element={<Write300 />} />
            <Route path="/write/1000" element={<Write1000 />} />
            <Route path="/login" element={<Login />} />
            <Route path="/my" element={<MySubmissions />} />
            <Route path="/feedback-camp" element={<FeedbackCamp />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;
