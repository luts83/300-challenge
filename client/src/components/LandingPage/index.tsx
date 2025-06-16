import React from 'react';
import HeroSection from './HeroSection';
import ContentSection from './ContentSection';
// import TestimonialSection from './TestimonialSection';
import SpaceBackground from './SpaceBackground';
// import FeatureSection from './FeatureSection';

interface LandingPageProps {
  showContent: boolean;
  onVideoEnd: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ showContent, onVideoEnd }) => {
  return (
    <div className="min-h-screen relative bg-[#1a1a2e] dark:bg-[#0a0a0a]">
      <SpaceBackground />
      <div className="relative z-10">
        <HeroSection onVideoEnd={onVideoEnd} />
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <ContentSection show={showContent} />
          {/* <TestimonialSection show={showContent} /> */}
          {/* <FeatureSection show={showContent} /> */}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
