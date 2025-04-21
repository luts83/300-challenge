// src/pages/Write.tsx

import { useNavigate } from 'react-router-dom';

const Write = () => {
  const navigate = useNavigate();

  return (
    <div className="wrapper-full-height text-center">
      <h1 className="text-2xl font-bold mb-6">✍ 글쓰기 모드 선택</h1>
      <p className="text-muted mb-6">원하는 글쓰기 방식을 선택하세요.</p>

      <div className="flex flex-col gap-4">
        <button onClick={() => navigate('/write/300')} className="btn-primary">
          🕒 300자 타임어택
        </button>
        <button onClick={() => navigate('/write/1000')} className="btn-primary">
          ⏱ 1000자 타이머 글쓰기
        </button>
      </div>
    </div>
  );
};

export default Write;
