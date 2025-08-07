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

          <div className="space-y-6 text-sm leading-relaxed">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-l-4 border-blue-500">
              <p className="text-blue-800 dark:text-blue-200">
                <span className="text-2xl mr-2">🚀</span>
                <strong>딜라이팅AI</strong>는 AI 피드백과 유저 피드백을 기반으로, 매일 짧게 쓰며
                실력을 키워나가는 글쓰기 훈련 플랫폼입니다.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-200">
                <span className="text-2xl mr-3">✅</span>
                기본 구조
              </h3>
              <div className="grid gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">📝</span>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                        300자 글쓰기
                      </h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        매일 1개 토큰 리프레시, AI 피드백 제공, 다른 참여자 글에 3개 피드백 후 내
                        글의 피드백 열람 가능
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">📚</span>
                    <div>
                      <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                        1000자 글쓰기
                      </h4>
                      <p className="text-purple-700 dark:text-purple-300 text-sm">
                        주 1개 토큰 리프레시, 세션 자동 저장/분할 작성 가능, 1개 피드백 후 열람
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-200">
                <span className="text-2xl mr-3">💬</span>
                피드백 미션이 중요한 이유
              </h3>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                <p className="text-orange-800 dark:text-orange-200">
                  제출만으로는 끝이 아닙니다. 다른 사용자에게 꼭 피드백을 남겨야 내가 받은 피드백을
                  열람할 수 있어요.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-200">
                <span className="text-2xl mr-3">✨</span>
                딜라이팅AI 버전이란?
              </h3>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700">
                <p className="text-indigo-800 dark:text-indigo-200 mb-3">
                  AI가 당신의 글을 분석하여 개선점을 반영한 더 나은 버전을 제시하는 기능입니다.
                </p>
                <div className="grid gap-2">
                  <div className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">🎯</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>1000자 모드:</strong> 기본적으로 무료로 제공됩니다
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-amber-500 mr-2">🔑</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>300자 모드:</strong> 황금열쇠 1개로 구매하여 확인할 수 있습니다
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-blue-500 mr-2">💡</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>개선 내용:</strong> 표현력 향상, 구조 개선, 독자 공감 문장 추가
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-purple-500 mr-2">💎</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>원본 보존:</strong> 핵심 메시지와 경험은 그대로 유지됩니다
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-200">
                <span className="text-2xl mr-3">🪙</span>
                황금열쇠란?
              </h3>
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
                <div className="grid gap-2">
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-600 mr-2">🔓</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      피드백 없이도 내 글의 피드백을 볼 수 있는 열람권
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-600 mr-2">🎁</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      지급 조건: 평일 5일 연속 글쓰기 or 1000자 글쓰기 1회
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-600 mr-2">💳</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      사용처: 1개 → 특정 글 열람, 2개 → 전체 열람
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-600 mr-2">✨</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <strong>딜라이팅AI 버전 구매:</strong> 황금열쇠 1개로 AI가 개선한 버전 확인
                      가능 (300자 모드에서만)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-200">
                <span className="text-2xl mr-3">🗓</span>
                참여 규칙 요약
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <div className="grid gap-2">
                  <div className="flex items-center text-sm">
                    <span className="text-blue-600 mr-2">📅</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      매일 300자 글쓰기 1회 (AI 피드백 제공)
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-blue-600 mr-2">👀</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      300자 3개 또는 1000자 1개 → 피드백 열람 가능
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-blue-600 mr-2">🎯</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      1000자 모드 → ✨ 딜라이팅AI 버전 무료 제공
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-blue-600 mr-2">🔑</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      300자 모드 → ✨ 딜라이팅AI 버전 황금열쇠 1개로 구매
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center text-gray-800 dark:text-gray-200">
                <span className="text-2xl mr-3">📌</span>
                자주 묻는 질문
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-0.5">❓</span>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        하루에 여러 개 쓰고 싶어요
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">→ 현재는 1일 1편</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-0.5">❓</span>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        피드백 2개만 했어요
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        → 3개 완료해야 내 글의 피드백 열람 가능 해요
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-0.5">❓</span>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        글 수정은 안 되나요?
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        → 300자는 불가, 1000자는 세이브 가능 해요
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-0.5">❓</span>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        딜라이팅AI 버전은 언제 볼 수 있나요?
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        → 1000자는 무료, 300자는 황금열쇠 1개 필요
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-0.5">❓</span>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        딜라이팅AI 버전을 한 번 구매하면?
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        → 영구적으로 언락되어 새로고침해도 유지됩니다
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center border border-green-200 dark:border-green-700">
              <p className="font-bold text-lg text-green-800 dark:text-green-200 mb-2">
                🚀 지금 바로 시작해보세요!
              </p>
              <p className="text-green-700 dark:text-green-300 text-sm">
                매일 조금씩, 꾸준히 써보세요. 당신의 글쓰기 실력이 놀랍게 향상될 거예요!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedbackNotice;
