import React from 'react';
import { motion } from 'framer-motion';
// import TestimonialSection from './TestimonialSection';
import HeroSection from './HeroSection';
import ContentSection from './ContentSection';
import WelcomeMessage from './WelcomeMessage';
import Footer from './Footer';
import ScrollToTop from '../ScrollToTop';

interface LandingPageProps {
  isFirstVisit: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ isFirstVisit }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] dark:from-[#0a0a0a] dark:to-[#0f172a]">
      <ScrollToTop />

      {/* 히어로 섹션 또는 환영 메시지 */}
      {isFirstVisit ? <HeroSection onVideoEnd={() => {}} /> : <WelcomeMessage />}

      {/* 메인 콘텐츠 섹션 */}
      <ContentSection show={true} />

      {/* 사용자 후기 섹션 (임시 숨김) */}
      {/* <TestimonialSection /> */}

      {/* 풋터 */}
      <Footer />
    </div>
  );
};

export default LandingPage;
