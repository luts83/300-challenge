import React, { useState, useEffect } from 'react';
import LandingPageComponent from '../components/LandingPage';
import '../styles/globals.css';

const LandingPageContainer = () => {
  const [showContent, setShowContent] = useState(false);

  const handleVideoEnd = () => {
    setTimeout(() => {
      setShowContent(true);
    }, 1000);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (showContent) {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showContent]);

  return <LandingPageComponent showContent={showContent} onVideoEnd={handleVideoEnd} />;
};

export default LandingPageContainer;
