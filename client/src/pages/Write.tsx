// src/pages/Write.tsx

import { useNavigate } from 'react-router-dom';

const Write = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl sm:text-xl font-bold mb-4 dark:text-gray-300">
          ✍ 글쓰기 모드 선택
        </h1>
        <p className="text-base text-gray-600 mb-8 dark:text-gray-400">
          원하는 글쓰기 방식을 선택하세요.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/write/300')}
            className="px-6 py-3 bg-blue-500 dark:bg-blue-900 hover:bg-blue-600 dark:hover:bg-blue-800 text-white rounded-lg font-medium transition-all duration-200 text-base min-h-[44px] shadow-sm"
          >
            🕒 300자 타임어택
          </button>
          <button
            onClick={() => navigate('/write/1000')}
            className="px-6 py-3 bg-purple-500 dark:bg-purple-900 hover:bg-purple-600 dark:hover:bg-purple-800 text-white rounded-lg font-medium transition-all duration-200 text-base min-h-[44px] shadow-sm"
          >
            ⏱ 1000자 타이머 글쓰기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Write;
