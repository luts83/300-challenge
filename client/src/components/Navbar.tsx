import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { toast } from 'react-hot-toast';

// 커스텀 훅: 메뉴 상태 관리
const useMenuState = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return { isMenuOpen, toggleMenu, closeMenu };
};

const Navbar = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMenuOpen, toggleMenu, closeMenu } = useMenuState();
  const [error, setError] = useState<string | null>(null);

  const navItems = useMemo(
    () => [
      { path: '/', label: '홈', icon: '🏠' },
      { path: '/feedback-camp', label: '피드백 미션', icon: '🏕️' },
      { path: '/my', label: '내가 쓴 글', icon: '📝' },
    ],
    []
  );

  const handleLogout = useCallback(async () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      try {
        await logout();
        navigate('/');
        toast.success('로그아웃 되었습니다');
      } catch (error) {
        console.error('로그아웃 실패:', error);
        setError('로그아웃 중 문제가 발생했습니다. 다시 시도해주세요.');
        toast.error('로그아웃에 실패했습니다');
      }
    }
  }, [logout, navigate]);

  return (
    <nav className="bg-white shadow-md" role="navigation" aria-label="메인 메뉴">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 로고 */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo.png"
                alt="글쓰기 연습 로고"
                className="h-12 w-auto transition-transform duration-300 hover:scale-110 hover:rotate-3 active:scale-90 active:rotate-0"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML =
                    '<span class="text-xl font-bold text-gray-800 transition-transform duration-300 hover:scale-110 hover:rotate-3 active:scale-95 active:rotate-0">글쓰기 연습</span>';
                }}
              />
            </Link>
          </div>

          {/* 데스크톱 메뉴 */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4 md:space-x-6">
            <ul className="flex space-x-4 md:space-x-6">
              {navItems.map(item => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      location.pathname === item.path
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* 사용자 메뉴 */}
            <div className="ml-4 flex items-center">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">{user.displayName}님</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="메뉴 열기"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">메뉴 열기</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div
        id="mobile-menu"
        className={`sm:hidden transition-all duration-300 ease-in-out
    ${isMenuOpen ? 'opacity-100 max-h-screen pointer-events-auto' : 'opacity-0 max-h-0 pointer-events-none'}
  `}
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                location.pathname === item.path
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-current={location.pathname === item.path ? 'page' : undefined}
            >
              <span className="flex items-center">
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </span>
            </Link>
          ))}

          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-3">
                <div className="text-base font-medium text-gray-800">{user.displayName}님</div>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu(); // 로그아웃 시도 시 메뉴도 닫음
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={closeMenu}
              className="block px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
