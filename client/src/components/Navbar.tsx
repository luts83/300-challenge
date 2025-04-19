// src/components/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Navbar = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  };

  return (
    <nav className="w-full bg-blue-50/80 shadow px-4 py-3">
      <div className="max-w-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <Link to="/" className="text-lg font-bold text-indigo-700">
          디지오션 글쓰기 챌린지
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          {!user && (
            <Link
              to="/login"
              className="text-gray-800 hover:text-blue-600 hover:underline"
            >
              로그인
            </Link>
          )}
          {user && (
            <>
              <Link
                to="/my"
                className="text-gray-800 hover:text-blue-600 hover:underline"
              >
                마이페이지
              </Link>
              <Link
                to="/feedback-camp"
                className="text-gray-800 hover:text-blue-600 hover:underline"
              >
                피드백 캠프
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-600 bg-red-100 px-2 py-1 rounded-full hover:bg-red-200 transition-colors"
              >
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;