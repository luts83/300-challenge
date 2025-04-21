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

function App() {
  return (
    <UserProvider>
      <Router>
        <div
          className="fixed top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat z-[-1]"
          style={{
            backgroundImage: `url('/images/background-image.png')`,
          }}
        />
        <div className="min-h-screen bg-black/10">
          <Navbar />
          <Routes>
            <Route path="/" element={<Write />} />
            <Route path="/write/300" element={<Write300 />} />
            <Route path="/write/1000" element={<Write1000 />} />
            <Route path="/login" element={<Login />} />
            <Route path="/my" element={<MySubmissions />} />
            <Route path="/feedback-camp" element={<FeedbackCamp />} />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;
