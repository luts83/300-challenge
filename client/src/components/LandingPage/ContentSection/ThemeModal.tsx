import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WeeklyTopic {
  week: number;
  title: string;
  topics: string[];
}

interface ThemeData {
  themeTitle: string;
  themeDescription: string;
  weeklyTopics: WeeklyTopic[];
}

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [formLink, setFormLink] = useState(
    'https://docs.google.com/forms/d/e/1FAIpQLSc09fvgAKZsYmA8o2V9LT2ZBdjSzYII6uEdASZF8WN0YerdiA/viewform'
  );

  useEffect(() => {
    if (isOpen) {
      fetchThemeData();
      fetchFormLink();
    }
  }, [isOpen]);

  const fetchFormLink = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${apiUrl}/api/landing/current-form-link`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (responseData.success && responseData.data.formLink) {
        setFormLink(responseData.data.formLink);
      }
    } catch (error) {
      console.error('❌ 폼 링크 가져오기 실패:', error);
    }
  };

  const fetchThemeData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/landing/current-theme`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setThemeData(result.data);
      } else {
        console.error('테마 데이터 가져오기 실패:', result.message);
        // 기본 데이터 설정
        setThemeData({
          themeTitle: '나를 찾아가는 여정',
          themeDescription: '한 달간 나의 이야기를 담아보는 특별한 여정',
          weeklyTopics: [
            {
              week: 1,
              title: '과거의 나',
              topics: ['어릴 적 나의 꿈', '가장 후회되는 선택', '나에게 큰 영향을 준 사람'],
            },
            {
              week: 2,
              title: '현재의 나',
              topics: [
                '나를 나답게 만드는 성격',
                '요즘 나를 가장 힘들게 하는 것',
                '내가 가진 두려움',
              ],
            },
            {
              week: 3,
              title: '나의 가치관',
              topics: [
                '절대 타협할 수 없는 가치',
                "'행복'이란 무엇일까?",
                "내가 생각하는 '성공'이란",
              ],
            },
            {
              week: 4,
              title: '미래의 나',
              topics: [
                '10년 후 나의 모습',
                '세상에 남기고 싶은 나의 흔적',
                '나에게 해주고 싶은 응원의 말',
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error('테마 데이터 가져오기 오류:', error);
      // 기본 데이터 설정
      setThemeData({
        themeTitle: '나를 찾아가는 여정',
        themeDescription: '한 달간 나의 이야기를 담아보는 특별한 여정',
        weeklyTopics: [
          {
            week: 1,
            title: '과거의 나',
            topics: ['어릴 적 나의 꿈', '가장 후회되는 선택', '나에게 큰 영향을 준 사람'],
          },
          {
            week: 2,
            title: '현재의 나',
            topics: [
              '나를 나답게 만드는 성격',
              '요즘 나를 가장 힘들게 하는 것',
              '내가 가진 두려움',
            ],
          },
          {
            week: 3,
            title: '나의 가치관',
            topics: [
              '절대 타협할 수 없는 가치',
              "'행복'이란 무엇일까?",
              "내가 생각하는 '성공'이란",
            ],
          },
          {
            week: 4,
            title: '미래의 나',
            topics: [
              '10년 후 나의 모습',
              '세상에 남기고 싶은 나의 흔적',
              '나에게 해주고 싶은 응원의 말',
            ],
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWeek = (week: number) => {
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    이번 달 테마
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    한 달간 함께 써나갈 글쓰기 주제를 확인해보세요
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 콘텐츠 */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : themeData ? (
                <div className="space-y-6">
                  {/* 테마 정보 */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {themeData.themeTitle}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {themeData.themeDescription}
                    </p>
                  </div>

                  {/* 주차별 주제 */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      주차별 주제
                    </h4>
                    {themeData.weeklyTopics && themeData.weeklyTopics.length > 0 ? (
                      themeData.weeklyTopics.map(weekData => (
                        <div
                          key={weekData.week}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleWeek(weekData.week)}
                            className="w-full p-4 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {weekData.week}주차: {weekData.title}
                              </span>
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${
                                expandedWeek === weekData.week ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {expandedWeek === weekData.week && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-white dark:bg-gray-800">
                                  <ul className="space-y-2">
                                    {weekData.topics.map((topic, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start space-x-3 text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-300 text-sm font-medium">
                                          {index + 1}
                                        </span>
                                        <span className="leading-relaxed">{topic}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                          챌린지 참여하시고 매일 주어지는 주제를 확인해 보세요.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 참여 방법 */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                      참여 방법
                    </h4>
                    <ul className="space-y-2 text-blue-800 dark:text-blue-200">
                      <li className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                        <span>매일 하나의 주제로 글을 작성해주세요</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                        <span>한 달간 쌓인 글들이 하나의 완성된 에세이가 됩니다</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                        <span>AI가 나의 문체를 분석하여 통일성 있는 에세이로 완성해드려요</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  테마 정보를 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    window.open(formLink, '_blank');
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  챌린지 신청하기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThemeModal;
