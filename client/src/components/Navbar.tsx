import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { toast } from 'react-hot-toast';

// 스타일 상수
const STYLES = {
  nav: {
    wrapper: 'bg-white shadow-md',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    content: 'flex justify-between h-16',
  },
  logo: {
    wrapper: 'flex-shrink-0 flex items-center',
    image:
      'h-12 w-auto transition-transform duration-300 hover:scale-110 hover:rotate-3 active:scale-90 active:rotate-0',
    fallback:
      'text-xl font-bold text-gray-800 transition-transform duration-300 hover:scale-110 hover:rotate-3 active:scale-95 active:rotate-0',
  },
  desktop: {
    menu: 'hidden sm:flex sm:items-center sm:space-x-4 md:space-x-6',
    list: 'flex space-x-4 md:space-x-6',
    link: (isActive: boolean) => `
      flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
      ${isActive ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}
    `,
  },
  mobile: {
    button:
      'sm:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
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
      ${isActive ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}
    `,
  },
  user: {
    wrapper: 'ml-4 flex items-center',
    name: 'text-gray-700',
    button: {
      login:
        'px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200',
      logout:
        'px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200',
    },
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
    <nav className={STYLES.nav.wrapper} role="navigation" aria-label="메인 메뉴">
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

            {/* 사용자 메뉴 */}
            <div className={STYLES.user.wrapper}>
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className={STYLES.user.name}>{user.displayName}님</span>
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

          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-3">
                <div className="text-base font-medium text-gray-800">{user.displayName}님</div>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
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
    </nav>
  );
};

export default Navbar;
