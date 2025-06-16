import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface WelcomeCardProps {
  show: boolean;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ show }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: show ? 1 : 0,
        y: show ? 0 : 20,
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center dark:text-gray-300">
        환영합니다!
      </h1>
      <p className="mb-4 p-2 sm:p-3 bg-blue-100/80 text-blue-800 rounded-lg text-sm sm:text-base text-center font-medium leading-relaxed sm:leading-normal dark:bg-blue-900/80 dark:text-gray-300">
        ✍ 회원가입 후 글을 작성하고, 다른 사람의 글에 피드백을 남겨보세요!
        <br className="hidden sm:block" />
        매일 한 편씩 글을 쓰고, 피드백을 통해 성장할 수 있습니다.
        <br className="hidden sm:block" />
        <button
          onClick={() => navigate('/login')}
          className="mt-3 inline-block w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-xs sm:text-sm rounded-lg transition"
        >
          로그인하러 가기
        </button>
      </p>
    </motion.div>
  );
};

export default WelcomeCard;
