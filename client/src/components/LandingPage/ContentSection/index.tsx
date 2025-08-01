import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedSection from './AnimatedSection';
import WelcomeCard from './WelcomeCard';
import FeatureCard from './FeatureCard';
import UserPostSection from './UserPostSection';
import UserPostCard from './UserPostCard';
import AiFeedbackSection from './AiFeedbackSection';
import MonthlyEssaySection from './MonthlyEssaySection';
import TargetAudienceSection from './TargetAudienceSection';
import BenefitsSection from './BenefitsSection';
import HowToSection from './HowToSection';
import UseCaseSection from './UseCaseSection';
import { useNavigate } from 'react-router-dom';

interface ContentSectionProps {
  show: boolean;
}

const ContentSection: React.FC<ContentSectionProps> = ({ show }) => {
  const navigate = useNavigate();
  const [formLink, setFormLink] = useState(
    'https://docs.google.com/forms/d/e/1FAIpQLSc09fvgAKZsYmA8o2V9LT2ZBdjSzYII6uEdASZF8WN0YerdiA/viewform'
  );

  // 현재 기수 폼 링크 가져오기
  useEffect(() => {
    const fetchFormLink = async () => {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || 'https://300-challenge-production.up.railway.app';

        const response = await fetch(`${apiUrl}/api/landing/current-form-link`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const responseData = await response.json();

        if (responseData.success && responseData.data.formLink) {
          setFormLink(responseData.data.formLink);
        }
      } catch (error) {
        console.error('랜딩페이지 폼 링크 가져오기 실패:', error);
      }
    };

    fetchFormLink();
  }, []);

  return (
    <motion.div className="max-w-4xl mx-auto px-4 py-16 space-y-16">
      {/* 환영 섹션 */}
      <AnimatedSection show={show}>
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
      <AnimatedSection show={show}>
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

      {/* 누구를 위한 플랫폼인가? */}
      <TargetAudienceSection show={show} />

      {/* 무엇을 얻어갈 수 있나? */}
      <BenefitsSection show={show} />

      {/* 어떻게 얻어가나? */}
      <HowToSection show={show} />

      {/* 전후 비교 용례 */}
      <UseCaseSection show={show} />

      {/* 실시간 사용자 글 섹션 */}
      <AnimatedSection show={show}>
        <UserPostSection show={show} />
      </AnimatedSection>

      {/* AI 피드백 섹션 */}
      <AiFeedbackSection show={show} />

      {/* 매월 글쓰기 챌린지 섹션 */}
      <MonthlyEssaySection show={show} />

      {/* 유튜브 영상 임베드 */}
      <AnimatedSection show={show}>
        <h3 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          딜라이팅 AI 소개 영상
        </h3>

        <p className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-8 bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 bg-clip-text text-transparent font-nanum-pen">
          딜라이팅 AI가 어떻게 글쓰기를 도와주는지 확인해보세요
        </p>

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
      <AnimatedSection show={show}>
        <div className="text-center">
          <h3 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            지금, 시작하세요!
          </h3>
          <p className="text-lg text-gray-300 dark:text-gray-300 mb-8">
            매일 5분, 딜라이팅 AI로 생각이 콘텐츠가 되는 글쓰기를 경험해보세요. 매월 기수제 챌린지가
            진행됩니다. 기수원들과 함께 한 달 글쓰기 미션으로 실력을 쌓아보세요!
          </p>
          <a
            href={formLink}
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
