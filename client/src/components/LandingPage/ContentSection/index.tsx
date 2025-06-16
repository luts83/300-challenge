import React from 'react';
import { motion } from 'framer-motion';
import AnimatedSection from './AnimatedSection';
import WelcomeCard from './WelcomeCard';
import FeatureCard from './FeatureCard';
import UserPostSection from './UserPostSection';
import UserPostCard from './UserPostCard';
import { useNavigate } from 'react-router-dom';

interface ContentSectionProps {
  show: boolean;
}

const ContentSection: React.FC<ContentSectionProps> = ({ show }) => {
  const navigate = useNavigate();

  return (
    <motion.div className="max-w-4xl mx-auto px-4 py-16 space-y-16">
      {/* 환영 섹션 */}
      <AnimatedSection>
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            당신만의 글쓰기 여정을 시작하세요
          </h2>
          <div className="text-lg text-white leading-relaxed space-y-3 text-center">
            <p>
              <span className="font-bold bg-gradient-to-r from-blue-200 via-white to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(180,200,255,0.7)] animate-pulse">
                매일 조금씩
              </span>{' '}
              글을 쓰는 습관,
              <br />
              <span className="font-semibold bg-gradient-to-r from-yellow-200 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,220,180,0.7)] animate-pulse">
                꾸준함
              </span>
              이 만드는 성장의 경험.
            </p>
            <p>
              <span className="font-bold bg-gradient-to-r from-blue-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(200,200,255,0.7)] animate-pulse">
                AI
              </span>
              와{' '}
              <span className="font-bold bg-gradient-to-r from-pink-200 via-white to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,220,220,0.7)] animate-pulse">
                사람들
              </span>
              의 피드백이
              <br />
              당신의 글을 더 깊고 넓게 만들어줍니다.
            </p>
            <p>
              <span className="font-bold bg-gradient-to-r from-purple-200 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(200,180,255,0.7)] animate-pulse">
                글
              </span>
              을 통해{' '}
              <span className="font-bold bg-gradient-to-r from-purple-200 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(200,180,255,0.7)] animate-pulse">
                나
              </span>
              와{' '}
              <span className="font-bold bg-gradient-to-r from-purple-200 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(200,180,255,0.7)] animate-pulse">
                타인
              </span>
              이라는{' '}
              <span className="font-bold bg-gradient-to-r from-purple-200 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(200,180,255,0.7)] animate-pulse">
                작은 우주
              </span>
              를 이해하게 되고,
            </p>
            <p>
              그 우주는{' '}
              <span className="font-extrabold bg-gradient-to-r from-indigo-200 via-white to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(180,200,255,0.9)] animate-pulse text-xl">
                더 큰 우주
              </span>
              로 확장됩니다.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* 주요 기능 섹션 */}
      <AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="✍️"
            title="300자 글쓰기"
            description="매일 조금씩, 짧지만 의미 있는 글쓰기로 시작하세요"
          />
          <FeatureCard
            icon="📝"
            title="1000자 글쓰기"
            description="일주일에 한번, 더 깊이 있는 생각을 담아보세요"
          />
          <FeatureCard
            icon="💡"
            title="피드백 시스템"
            description="AI와 다른 사람의 피드백으로 성장하세요"
          />
        </div>
      </AnimatedSection>

      {/* 실시간 사용자 글 섹션 */}
      <AnimatedSection>
        <UserPostSection show={show} />
      </AnimatedSection>

      {/* 유튜브 영상 임베드 */}
      <AnimatedSection>
        <div className="w-full flex justify-center mb-8">
          <div className="w-full max-w-4xl">
            <iframe
              src="https://www.youtube.com/embed/ms3eKsGeOVw"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full aspect-video rounded-xl shadow-lg"
            ></iframe>
          </div>
        </div>
      </AnimatedSection>

      {/* CTA 섹션 */}
      <AnimatedSection>
        <div className="text-center">
          <h3 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            바로 지금, 시작하세요!
          </h3>
          <p className="text-lg text-gray-300 dark:text-gray-300 mb-8">
            알림을 신청하면 다음기수 모집 시작 전 이메일로 미리안내해드려요!
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSc09fvgAKZsYmA8o2V9LT2ZBdjSzYII6uEdASZF8WN0YerdiA/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm sm:text-sm md:text-base rounded-lg transition-colors shadow-lg hover:shadow-xl inline-block"
          >
            신청하러 가기
          </a>
        </div>
      </AnimatedSection>
    </motion.div>
  );
};

export default ContentSection;
