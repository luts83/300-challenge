import React, { useState, useEffect } from 'react';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // 스크롤 위치에 따라 버튼 표시 여부 결정
  useEffect(() => {
    const toggleVisibility = () => {
      // 200px 이상 스크롤되면 버튼 표시
      if (window.pageYOffset > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // 클릭 시 페이지 최상단으로 스크롤
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // 부드러운 스크롤 효과
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg transition-all duration-500 ease-in-out transform z-50 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
      } hover:shadow-xl hover:scale-110`}
      aria-label="페이지 최상단으로 이동"
      style={{
        cursor: 'pointer',
        border: '2px solid #e5e7eb',
        minWidth: '48px',
        minHeight: '48px',
      }}
    >
      <img
        src="/images/ScrollToTop.png"
        alt="위로 가기"
        className="w-full h-full object-contain p-2"
        onError={e => {
          console.error('ScrollToTop 이미지 로드 실패');
          // 이미지 로드 실패 시 텍스트로 대체
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling?.classList.remove('hidden');
        }}
      />
      <span className="hidden text-gray-600 dark:text-gray-300 text-lg font-bold">↑</span>
    </button>
  );
};

export default ScrollToTop;
