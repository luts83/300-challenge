import React from 'react';
import { useNavigate } from 'react-router-dom';

const HeroContent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 flex items-end justify-center pb-36">
      <div className="text-center text-white px-4">
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
  );
};

export default HeroContent;
