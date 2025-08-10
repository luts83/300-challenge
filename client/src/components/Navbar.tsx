import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { toast } from 'react-hot-toast';
import { isAdmin } from '../utils/admin';
import { useTheme } from '../context/ThemeContext';

// 스타일 상수
const STYLES = {
  nav: {
    wrapper: 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-md dark:shadow-gray-700',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    content: 'flex justify-between h-16',
  },
  logo: {
    wrapper: 'flex-shrink-0 flex items-center',
    image:
      'h-16 w-auto transition-transform duration-300 hover:scale-110 hover:rotate-3 active:scale-90 active:rotate-0 dark:hover:text-gray-100 dark:active:text-gray-100',
    fallback:
      'text-xl font-bold text-gray-800 dark:text-gray-100 transition-transform duration-300 hover:scale-110 hover:rotate-3 active:scale-95 active:rotate-0 dark:hover:text-gray-100 dark:active:text-gray-100',
  },
  desktop: {
    menu: 'hidden sm:flex sm:items-center sm:space-x-4 md:space-x-6',
    list: 'flex space-x-4 md:space-x-6',
    link: (isActive: boolean) => `
      flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
      ${isActive ? 'bg-blue-500 text-white shadow-sm dark:bg-blue-900 dark:text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700'}
    `,
  },
  mobile: {
    button:
      'sm:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500',
    menu: (isOpen: boolean, isClosing: boolean) => `
      sm:hidden transition-all duration-300 ease-in-out
      ${
        isOpen
          ? 'opacity-100 max-h-screen pointer-events-auto'
          : 'opacity-0 max-h-0 pointer-events-none'
      }
      ${isClosing ? 'transition-opacity duration-300 opacity-0' : ''}
    `,
    link: (isActive: boolean) => `
      block px-3 py-2 rounded-lg text-base font-medium
      ${isActive ? 'bg-blue-500 text-white dark:bg-blue-900 dark:text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700'}
    `,
  },
  user: {
    wrapper: 'ml-4 flex items-center',
    name: 'text-gray-700 dark:text-gray-100',
    button: {
      login:
        'px-4 py-2 text-sm font-medium text-white bg-blue-500 dark:bg-blue-900 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 dark:focus:ring-blue-500 dark:hover:text-gray-100 dark:active:text-gray-100',
      logout:
        'px-4 py-2 text-sm font-medium text-white bg-red-500 dark:bg-red-900 rounded-lg hover:bg-red-600 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 dark:focus:ring-red-500 dark:hover:text-gray-100 dark:active:text-gray-100',
    },
  },
  theme: {
    button:
      'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 transition-all duration-200 dark:hover:text-gray-100 dark:active:text-gray-100',
    icon: 'w-5 h-5 text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 dark:active:text-gray-100',
  },
} as const;

// 커스텀 훅: 메뉴 상태 관리
const useMenuState = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsMenuOpen(false);
        setIsClosing(false);
      }, 300);
    } else {
      setIsMenuOpen(true);
    }
  }, [isMenuOpen]);

  const closeMenu = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsClosing(false);
    }, 300);
  }, []);

  return { isMenuOpen, isClosing, toggleMenu, closeMenu };
};

const Navbar = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMenuOpen, isClosing, toggleMenu, closeMenu } = useMenuState();
  const [scrolled, setScrolled] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // 스크롤 이벤트 핸들러 추가
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 0;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = useMemo(() => {
    const items = [{ path: user ? '/' : '/', label: '홈', icon: '🏠' }];

    if (user) {
      items.push(
        { path: '/feedback-camp', label: '피드백 미션', icon: '🏕️' },
        { path: '/my', label: '내가 쓴 글', icon: '📝' }
      );

      if (isAdmin(user.uid)) {
        items.push({ path: '/dashboard', label: '관리자', icon: '🛠️' });
      }
    }

    return items;
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      try {
        await logout();
        navigate('/');
        toast.success('로그아웃 되었습니다');
      } catch (error) {
        toast.error('로그아웃에 실패했습니다');
      }
    }
  }, [logout, navigate]);

  const NavLink = ({
    item,
    isMobile = false,
  }: {
    item: (typeof navItems)[0];
    isMobile?: boolean;
  }) => {
    const isActive = location.pathname === item.path;
    const className = isMobile ? STYLES.mobile.link(isActive) : STYLES.desktop.link(isActive);

    return (
      <Link
        to={item.path}
        onClick={isMobile ? closeMenu : undefined}
        className={className}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="flex items-center">
          <span className={isMobile ? 'mr-2' : ''}>{item.icon}</span>
          <span>{item.label}</span>
        </span>
      </Link>
    );
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white dark:bg-gray-800 text-black dark:text-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-md'
          : 'bg-white dark:bg-gray-800 text-black dark:text-white dark:bg-gray-900 shadow-md'
      }`}
      role="navigation"
      aria-label="메인 메뉴"
    >
      <div className={STYLES.nav.container}>
        <div className={STYLES.nav.content}>
          {/* 로고 */}
          <div className={STYLES.logo.wrapper}>
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo.png"
                alt="글쓰기 연습 로고"
                className={STYLES.logo.image}
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<span class="${STYLES.logo.fallback}">글쓰기 연습</span>`;
                }}
              />
            </Link>
          </div>

          {/* 데스크톱 메뉴 */}
          <div className={STYLES.desktop.menu}>
            <ul className={STYLES.desktop.list}>
              {navItems.map(item => (
                <li key={item.path}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>

            {/* 다크모드 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className={STYLES.theme.button}
              aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDarkMode ? (
                <svg
                  className={STYLES.theme.icon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className={STYLES.theme.icon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* 사용자 메뉴 */}
            <div className={STYLES.user.wrapper}>
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/profile"
                    className="text-gray-700 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {user.displayName}님
                  </Link>
                  <button onClick={handleLogout} className={STYLES.user.button.logout}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link to="/login" className={STYLES.user.button.login}>
                  로그인
                </Link>
              )}
            </div>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={toggleMenu}
            className={STYLES.mobile.button}
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

      {/* 모바일 메뉴 */}
      <div id="mobile-menu" className={STYLES.mobile.menu(isMenuOpen, isClosing)}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.path} item={item} isMobile />
          ))}

          {/* 다크모드 토글 버튼 */}
          <button
            onClick={() => {
              toggleTheme();
              closeMenu();
            }}
            className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <span className="mr-2">{isDarkMode ? '🌞' : '🌙'}</span>
            {isDarkMode ? '라이트 모드' : '다크 모드'}
          </button>

          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3">
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="text-base font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {user.displayName}님
                </Link>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg dark:text-red-400 dark:hover:text-red-300"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={closeMenu}
              className="block px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-500 dark:hover:bg-blue-900/20 rounded-lg dark:text-blue-700 dark:hover:text-blue-900"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
