import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import HeroContent from './HeroContent';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  onVideoEnd: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onVideoEnd }) => {
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [showArrow, setShowArrow] = useState(true);

  const handleVideoEnd = () => {
    setIsVideoEnded(true);
    onVideoEnd();
  };

  // 스크롤 감지해서 화살표 show/hide
  useEffect(() => {
    if (!isVideoEnded) return; // 비디오 끝나기 전엔 화살표 안보임
    const handleScroll = () => {
      if (window.scrollY < 30) {
        setShowArrow(true);
      } else {
        setShowArrow(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    // 초기 상태도 체크
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVideoEnded]);

  return (
    <div className="relative w-full h-screen">
      <VideoPlayer onVideoEnd={handleVideoEnd} />

      {/* 비디오 오버레이 - 비디오가 끝나면 어두워짐 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVideoEnded ? 0.2 : 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-black"
      />

      {/* 히어로 컨텐츠 */}
      <AnimatePresence>
        {isVideoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1,
              delay: 0.5,
              type: 'spring',
              stiffness: 100,
            }}
            className="absolute inset-0 flex items-end justify-center pb-36"
          >
            <HeroContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 아래로 스크롤하라는 화살표 */}
      {isVideoEnded && showArrow && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
          <svg
            className="w-8 h-8 text-blue-800 dark:text-blue-600 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      )}

      {/* 로딩 애니메이션 */}
      {/* <AnimatePresence>
        {!isVideoEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence> */}
    </div>
  );
};

export default HeroSection;
