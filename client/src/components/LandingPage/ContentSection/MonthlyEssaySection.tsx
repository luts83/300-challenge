import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import ThemeModal from './ThemeModal';

interface MonthlyEssaySectionProps {
  show: boolean;
}

const MonthlyEssaySection: React.FC<MonthlyEssaySectionProps> = ({ show }) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!show) return null;

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
        }}
        className="mt-16"
      >
        <h3 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          나만의 월간 에세이 완성
        </h3>
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-8 bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 bg-clip-text text-transparent font-nanum-pen">
          매일의 글쓰기가 한 편의 완성된 에세이로 탄생해요
        </p>

        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-black dark:text-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6">
              {/* 메인 콘텐츠 */}
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* 왼쪽: 설명 */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                          매월 새로운 테마로 시작
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          "나를 찾아가는 여정", "관계맺기", "일과 삶 사이에서" 등 매월 다른 테마로
                          한 달간의 글쓰기 여정을 시작해요.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                          체계적인 일일 주제
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          테마에 맞춰 설계된 20여 개의 일일 주제로 기승전결이 있는 완성도 높은
                          에세이를 만들어가요.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                          AI가 완성하는 나만의 에세이
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          한 달간 쌓인 글들을 AI가 분석하여 통일성 있는 한 편의 에세이로
                          완성해드려요.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA 버튼 */}
                  <div className="pt-4">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      이번 달 테마 보기
                    </button>
                  </div>
                </div>

                {/* 오른쪽: 시각적 요소 */}
                <div className="relative">
                  {/* 에세이 미리보기 카드 */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-300 border border-gray-200 dark:border-gray-600">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>

                      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        나를 찾아가는 여정
                      </h5>

                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <p className="leading-relaxed">
                          어릴 적 꿈꾸던 나의 모습을 돌아보며, 지금의 나를 마주하고, 미래의 나에게
                          전하고 싶은 이야기들을 담아보았습니다...
                        </p>

                        <div className="flex items-center space-x-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-xs">1. 과거의 나를 돌아보며</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                            <span className="text-xs">2. 지금의 나를 마주하다</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 장식 요소들 */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
                </div>
              </div>

              {/* 하단 특징 설명 */}
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
                      완성도 높은 구조
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      기승전결이 있는 체계적인 에세이 구조로 설계
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
                      개인 맞춤형
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      나의 문체와 표현을 최대한 유지한 개인화된 에세이
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
                      소장 가치
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      예쁜 PDF로 다운로드하여 개인적으로 소장 가능
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 테마 모달 */}
      <ThemeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default MonthlyEssaySection;
