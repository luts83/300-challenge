import React, { useState, useEffect } from 'react';

const FeedbackNotice = () => {
  const [showGuide, setShowGuide] = useState(false);

  // 스크롤 잠금 처리
  useEffect(() => {
    if (showGuide) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showGuide]);

  return (
    <>
      {/* 상단 알림 박스 */}
      <div className="mb-4 p-3 bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-gray-300 rounded-lg text-base text-center font-medium relative">
        <span>
          ✍ 글을 쓰고 다른 사용자에게 피드백을 3개 작성하면, 내가 쓴 글의 피드백을 볼 수 있어요!
        </span>
        <button
          onClick={() => setShowGuide(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xl min-w-[32px] min-h-[32px]"
          title="챌린지 이용 안내 열기"
          aria-label="챌린지 이용 안내 열기"
        >
          📢
        </button>
      </div>

      {/* 오른쪽에서 슬라이드 인되는 가이드 */}
      <div
        className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ease-in-out ${
          showGuide ? 'bg-black/30 visible' : 'invisible'
        }`}
        onClick={e => {
          // 바깥쪽 영역 클릭 시에만 닫기
          if (e.target === e.currentTarget) {
            setShowGuide(false);
          }
        }}
      >
        <div
          className={`w-full max-w-md h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-4 sm:p-6 overflow-y-auto shadow-lg transform transition-transform duration-300 ease-in-out ${
            showGuide ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={e => e.stopPropagation()} // 내부 클릭 이벤트 전파 방지
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">✍ 딜라이팅AI 글쓰기 챌린지 이용 가이드</h2>
            <button
              onClick={() => setShowGuide(false)}
              className="text-2xl font-bold hover:text-red-500"
              aria-label="챌린지 안내 닫기"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <strong>딜라이팅AI</strong>는 AI 피드백과 유저 피드백을 기반으로, 매일 짧게 쓰며
              실력을 키워나가는 글쓰기 훈련 플랫폼입니다.
            </p>

            <h3 className="font-semibold mt-4">✅ 기본 구조</h3>
            <ul className="list-disc list-inside">
              <li>
                <strong>300자 글쓰기:</strong> 매일 1개 토큰 리프레시, AI 피드백 제공, 다른 참여자
                글에 3개 피드백 후 내 글의 피드백 열람 가능
              </li>
              <li>
                <strong>1000자 글쓰기:</strong> 주 1개 토큰 리프레시, 세션 자동 저장/분할 작성 가능,
                1개 피드백 후 열람
              </li>
            </ul>

            <h3 className="font-semibold mt-4">💬 피드백 미션이 중요한 이유</h3>
            <p>
              제출만으로는 끝이 아닙니다. 다른 사용자에게 꼭 피드백을 남겨야 내가 받은 피드백을
              열람할 수 있어요.
            </p>

            <h3 className="font-semibold mt-4">🪙 황금열쇠란?</h3>
            <ul className="list-disc list-inside">
              <li>피드백 없이도 내 글의 피드백을 볼 수 있는 열람권</li>
              <li>지급 조건: 평일 5일 연속 글쓰기 or 1000자 글쓰기 1회</li>
              <li>사용처: 1개 → 특정 글 열람, 2개 → 전체 열람</li>
            </ul>

            <h3 className="font-semibold mt-4">🗓 참여 규칙 요약</h3>
            <ul className="list-disc list-inside">
              <li>매일 300자 글쓰기 1회 (AI 피드백 제공)</li>
              <li>300자 3개 또는 1000자 1개 → 피드백 열람 가능</li>
            </ul>

            <h3 className="font-semibold mt-4">📌 자주 묻는 질문</h3>
            <ul className="list-disc list-inside">
              <li>Q. 하루에 여러 개 쓰고 싶어요 → 현재는 1일 1편</li>
              <li>Q. 피드백 2개만 했어요 → 3개 완료해야 내 글의 피드백 열람 가능 해요</li>
              <li>Q. 글 수정은 안 되나요? → 300자는 불가, 1000자는 세이브 가능 해요</li>
            </ul>

            <p className="mt-6 font-semibold text-center text-blue-600 dark:text-blue-300">
              🚀 지금 바로 시작해보세요!
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedbackNotice;
