// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import MySubmissions from './pages/MySubmissions';
import Navbar from './components/Navbar';
import FeedbackCamp from './pages/FeedbackCamp';
import { UserProvider } from './context/UserContext';
import './index.css';

function App() {
  return (
    <UserProvider>
      <Router>
        <div
          className="min-h-screen bg-cover bg-center bg-no-repeat overflow-hidden"
          style={{
            backgroundImage: `url('/images/background-image.png')`,
          }}
        >
          <div className="bg-black/10 min-h-screen">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/my" element={<MySubmissions />} />
              <Route path="/feedback-camp" element={<FeedbackCamp />} />
            </Routes>
          </div>
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;