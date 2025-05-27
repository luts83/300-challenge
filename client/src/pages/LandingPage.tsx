import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isDarkMode } = useTheme();

  // 비디오가 끝나면 상태 업데이트
  const handleVideoEnded = () => {
    setIsVideoEnded(true);
  };

  return (
    <div className="min-h-screen">
      {/* 히어로 비디오 섹션 */}
      <div className="relative w-full h-screen">
        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 비디오는 항상 표시하되, 처음 방문했을 때만 재생 */}
        <div
          className={`absolute inset-0 transition-all duration-1000 ${
            isVideoEnded ? 'backdrop-blur-sm' : 'backdrop-blur-0'
          }`}
          style={{ zIndex: 0 }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onLoadedData={() => setIsVideoLoaded(true)}
            onEnded={handleVideoEnded}
            onError={e => {
              console.error('비디오 로드 에러:', e);
              setIsVideoLoaded(true);
            }}
          >
            <source src="/images/hero.mp4" type="video/mp4" />
            <p>비디오를 재생할 수 없습니다.</p>
          </video>
        </div>

        {/* 비디오 위에 오버레이 */}
        <div
          className={`absolute inset-0 flex items-end justify-center transition-all duration-1000 pb-36 ${
            isVideoEnded ? 'bg-black/20 dark:bg-black/30' : 'bg-transparent'
          }`}
          style={{ zIndex: 1 }}
        >
          {/* 텍스트 컨테이너 - 비디오가 끝나면 서서히 나타남 */}
          <div
            className={`text-center text-white px-4 transition-all duration-1000 ${
              isVideoEnded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">
              매일 글쓰기로 성장하세요
            </h1>
            <p className="text-sm sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 text-gray-100 dark:text-gray-200">
              300자, 1000자 글쓰기로 시작하는 당신의 글쓰기 여정
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm sm:text-sm md:text-base rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>

      {/* 기존 컨텐츠는 주석 처리 */}
      {/* 
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center dark:text-gray-300">
          환영합니다!
        </h1>
        <p className="mb-4 p-2 sm:p-3 bg-blue-100/80 text-blue-800 rounded-lg text-sm sm:text-base text-center font-medium leading-relaxed sm:leading-normal dark:bg-blue-900/80 dark:text-gray-300">
          ✍ 회원가입 후 글을 작성하고, 다른 사람의 글에 피드백을 남겨보세요!
          <br className="hidden sm:block" />
          매일 한 편씩 글을 쓰고, 피드백을 통해 성장할 수 있습니다.
          <br className="hidden sm:block" />
          <button
            onClick={() => navigate('/login')}
            className="mt-3 inline-block w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-xs sm:text-sm rounded-lg transition"
          >
            로그인하러 가기
          </button>
        </p>

        <div className="mt-8">
          <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">
            사용자 후기
          </h3>
          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-900/80 shadow-sm">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                "이 제품을 사용하고 나서 글쓰기 실력이 많이 향상되었어요!" - 사용자 A
              </p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-900/80 shadow-sm">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                "피드백을 통해 많은 것을 배울 수 있었습니다." - 사용자 B
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">
            주요 기능
          </h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>글쓰기 도구: 다양한 글쓰기 모드 지원</li>
            <li>피드백 시스템: 다른 사용자와의 상호작용</li>
            <li>통계 및 분석: 글쓰기 습관 분석</li>
          </ul>
        </div>
      </div>
      */}
    </div>
  );
};

export default LandingPage;
