import React, { useState, useEffect, useRef } from 'react';
import LandingPageComponent from '../components/LandingPage';
import '../styles/globals.css';
import '../styles/ui.css';

const LandingPageContainer = () => {
  const [showContent, setShowContent] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // 이미 초기화되었는지 확인
    if (initialized.current) return;
    initialized.current = true;

    // 세션 스토리지에서 방문 여부 확인
    const hasVisited = sessionStorage.getItem('hasVisitedLandingPage');

    if (hasVisited) {
      // 이미 방문한 경우 바로 콘텐츠 표시
      setIsFirstVisit(false);
      setShowContent(true);
    } else {
      // 처음 방문한 경우 방문 기록 저장
      sessionStorage.setItem('hasVisitedLandingPage', 'true');
      setIsFirstVisit(true);
    }
  }, []); // 빈 의존성 배열로 한 번만 실행

  const handleVideoEnd = () => {
    setTimeout(() => {
      setShowContent(true);
    }, 1000);
  };

  useEffect(() => {
    if (isFirstVisit) {
      // 처음 방문한 경우에만 스크롤 숨김
      document.body.style.overflow = 'hidden';
      if (showContent) {
        // 콘텐츠가 표시되면 스크롤 활성화
        setTimeout(() => {
          document.body.style.overflow = 'auto';
        }, 500); // 애니메이션 완료 후 스크롤 활성화
      }
    } else {
      // 재방문한 경우 스크롤 활성화
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showContent, isFirstVisit]);

  return (
    <LandingPageComponent
      showContent={showContent}
      onVideoEnd={handleVideoEnd}
      isFirstVisit={isFirstVisit}
    />
  );
};

export default LandingPageContainer;
