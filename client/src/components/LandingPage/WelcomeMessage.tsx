import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const WelcomeMessage: React.FC = () => {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // particles.js 동적 import
    const initParticles = async () => {
      try {
        const particlesJS = (window as any).particlesJS;
        if (particlesJS && particlesRef.current) {
          particlesJS('particles-js', {
            particles: {
              number: {
                value: 80,
                density: {
                  enable: true,
                  value_area: 800,
                },
              },
              color: {
                value: ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981'],
              },
              shape: {
                type: 'circle',
                stroke: {
                  width: 0,
                  color: '#000000',
                },
              },
              opacity: {
                value: 0.5,
                random: false,
                anim: {
                  enable: false,
                  speed: 1,
                  opacity_min: 0.1,
                  sync: false,
                },
              },
              size: {
                value: 3,
                random: true,
                anim: {
                  enable: false,
                  speed: 40,
                  size_min: 0.1,
                  sync: false,
                },
              },
              line_linked: {
                enable: true,
                distance: 150,
                color: '#3B82F6',
                opacity: 0.4,
                width: 1,
              },
              move: {
                enable: true,
                speed: 6,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false,
                attract: {
                  enable: false,
                  rotateX: 600,
                  rotateY: 1200,
                },
              },
            },
            interactivity: {
              detect_on: 'canvas',
              events: {
                onhover: {
                  enable: true,
                  mode: 'repulse',
                },
                onclick: {
                  enable: true,
                  mode: 'push',
                },
                resize: true,
              },
              modes: {
                grab: {
                  distance: 400,
                  line_linked: {
                    opacity: 1,
                  },
                },
                bubble: {
                  distance: 400,
                  size: 40,
                  duration: 2,
                  opacity: 8,
                  speed: 3,
                },
                repulse: {
                  distance: 200,
                  duration: 0.4,
                },
                push: {
                  particles_nb: 4,
                },
                remove: {
                  particles_nb: 2,
                },
              },
            },
            retina_detect: true,
          });
        } else {
          console.error('particles.js 또는 particlesRef를 찾을 수 없음');
        }
      } catch (error) {
        console.error('particles.js 로딩 실패:', error);
      }
    };

    // particles.js 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
    script.onload = initParticles;
    document.head.appendChild(script);

    return () => {
      // 클린업
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: 'easeOut',
      }}
      className="relative w-full h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e] dark:from-[#0a0a0a] dark:to-[#0f172a] pt-16 overflow-hidden"
    >
      {/* Particles.js 컨테이너 */}
      <div
        id="particles-js"
        ref={particlesRef}
        className="absolute inset-0"
        style={{ zIndex: 5, pointerEvents: 'auto' }}
      />

      {/* 배경 효과 */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"
        style={{ zIndex: 2, pointerEvents: 'none' }}
      />

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 text-center px-6" style={{ pointerEvents: 'none' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          style={{ pointerEvents: 'none' }}
        >
          <span className="block sm:inline">딜라이팅 AI에 오신 것을 </span>
          <span className="block sm:inline">환영합니다! 👋</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg sm:text-xl text-gray-300 dark:text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed"
          style={{ pointerEvents: 'none' }}
        >
          오늘도 딜라이팅 AI와 함께 글쓰기 여정을 이어가보세요
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center space-x-2 text-blue-400 dark:text-blue-300">
            <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">아래로 스크롤하여 시작하세요</span>
          </div>
        </motion.div>
      </div>

      {/* 장식 요소 */}
      <div
        className="absolute top-4 right-4 text-blue-400/30 dark:text-blue-300/30"
        style={{ zIndex: 3, pointerEvents: 'none' }}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div
        className="absolute bottom-4 left-4 text-purple-400/30 dark:text-purple-300/30"
        style={{ zIndex: 3, pointerEvents: 'none' }}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </motion.div>
  );
};

export default WelcomeMessage;
