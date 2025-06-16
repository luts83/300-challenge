import React from 'react';
import FeatureCard from './FeatureCard';

interface FeatureSectionProps {
  show: boolean;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({ show }) => {
  const features = [
    {
      title: '글쓰기 도구',
      description: '다양한 글쓰기 모드 지원',
    },
    {
      title: '피드백 시스템',
      description: '다른 사용자와의 상호작용',
    },
    {
      title: '통계 및 분석',
      description: '글쓰기 습관 분석',
    },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">주요 기능</h3>
      <div className="space-y-4">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            show={show}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureSection;
