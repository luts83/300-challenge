import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface AiFeedbackSectionProps {
  show: boolean;
}

interface AiFeedback {
  id: string;
  title: string;
  originalText: string;
  content?: string; // 추가
  feedback: string;
  score: number;
  user: {
    displayName: string;
  };
  mode: 'mode_300' | 'mode_1000';
  aiFeedback?: string;
  topic?: string;
}

interface ParsedFeedback {
  overall_score: number;
  criteria_scores: Record<string, { score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  writing_tips: string;
}

const AiFeedbackSection: React.FC<AiFeedbackSectionProps> = ({ show }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const [currentFeedback, setCurrentFeedback] = useState<AiFeedback | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [feedbacks, setFeedbacks] = useState<AiFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // JSON 피드백 파싱 함수
  const parseFeedback = (feedback: string): ParsedFeedback | null => {
    try {
      let parsed: any;

      // 1. 파싱 시도
      if (typeof feedback === 'string') {
        try {
          parsed = JSON.parse(feedback);
        } catch (parseError) {
          return null;
        }
      } else {
        parsed = feedback;
      }

      // 2. 데이터 검증 및 정규화
      const validated: ParsedFeedback = {
        overall_score: Number(parsed.overall_score) || 0,
        criteria_scores: {},
        strengths: [],
        improvements: [],
        writing_tips: '',
      };

      // criteria_scores 처리
      if (parsed.criteria_scores && typeof parsed.criteria_scores === 'object') {
        Object.entries(parsed.criteria_scores).forEach(([key, value]: [string, any]) => {
          validated.criteria_scores[key] = {
            score: Number(value.score) || 0,
            feedback: String(value.feedback || '평가 정보가 없습니다.'),
          };
        });
      }

      // strengths 처리
      if (Array.isArray(parsed.strengths)) {
        validated.strengths = parsed.strengths.map(String);
      }

      // improvements 처리
      if (Array.isArray(parsed.improvements)) {
        validated.improvements = parsed.improvements.map(String);
      }

      // writing_tips 처리
      if (parsed.writing_tips) {
        if (typeof parsed.writing_tips === 'string') {
          validated.writing_tips = parsed.writing_tips;
        } else if (typeof parsed.writing_tips === 'object') {
          validated.writing_tips = Object.entries(parsed.writing_tips)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        }
      }

      return validated;
    } catch (err) {
      console.error('AI 피드백 파싱 중 오류:', err);
      return null;
    }
  };

  // 실제 AI 피드백 데이터 (임시 데이터)
  const sampleFeedbacks: AiFeedback[] = [
    {
      id: '1',
      title: '힘든 하루의 끝에서',
      originalText:
        '오늘은 정말 힘든 하루였다. 회사에서 스트레스를 받고 집에 와서도 마음이 편하지 않았다. 하지만 이런 날일수록 내가 할 수 있는 작은 것들을 하나씩 해나가야겠다고 생각했다.',
      content:
        '오늘은 정말 힘든 하루였다. 회사에서 스트레스를 받고 집에 와서도 마음이 편하지 않았다. 하지만 이런 날일수록 내가 할 수 있는 작은 것들을 하나씩 해나가야겠다고 생각했다.',
      feedback: JSON.stringify({
        overall_score: 92,
        criteria_scores: {
          content: {
            score: 90,
            feedback:
              "감정의 흐름을 자연스럽게 표현하고 있습니다. '힘든 하루'에서 시작해 '작은 것들을 하나씩'이라는 희망적인 결말로 이어지는 구조가 인상적입니다.",
          },
          expression: {
            score: 88,
            feedback:
              "문체가 간결하면서도 감정을 잘 전달합니다. '하지만'이라는 접속사를 통해 대조를 효과적으로 보여주고 있어요.",
          },
          structure: {
            score: 95,
            feedback:
              '짧은 글에서도 명확한 구조를 가지고 있습니다. 시작, 전개, 결말이 자연스럽게 연결되어 있습니다.',
          },
        },
        strengths: [
          '감정의 전환이 자연스럽게 표현됨',
          '희망적인 메시지로 마무리하여 긍정적임',
          '간결하면서도 의미 있는 내용',
        ],
        improvements: [
          '구체적인 상황 묘사를 추가하면 더욱 생생해질 것',
          '감각적 표현을 활용하여 독자의 몰입도를 높일 수 있음',
        ],
        writing_tips:
          "다음 글을 쓸 때, 구체적인 상황이나 감각적 표현을 추가해보세요. 예를 들어 '회사에서 스트레스를 받고' 대신 '회의에서 계속 지적받던 하루였다'처럼 더 구체적으로 표현하면 좋겠습니다.",
      }),
      score: 92,
      user: { displayName: '김민수' },
      mode: 'mode_300',
      topic: '일상의 성찰',
    },
    {
      id: '2',
      title: 'AI 시대의 인간성',
      originalText:
        '요즘 AI 기술의 발전이 정말 놀랍다. 매일 새로운 소식이 들려오고, 우리의 일상이 어떻게 바뀔지 상상하기도 어려울 정도다. 하지만 이런 변화 속에서도 인간만이 가질 수 있는 창의성과 감성을 잃지 않았으면 좋겠다.',
      content:
        '요즘 AI 기술의 발전이 정말 놀랍다. 매일 새로운 소식이 들려오고, 우리의 일상이 어떻게 바뀔지 상상하기도 어려울 정도다. 하지만 이런 변화 속에서도 인간만이 가질 수 있는 창의성과 감성을 잃지 않았으면 좋겠다.',
      feedback: JSON.stringify({
        overall_score: 88,
        criteria_scores: {
          content: {
            score: 85,
            feedback:
              '현대적이고 사색적인 주제를 다루면서도 개인적인 관점을 명확히 제시하고 있습니다.',
          },
          expression: {
            score: 90,
            feedback:
              "'하지만'을 통한 대조 구조가 글의 깊이를 더해주고, 마지막 문장의 희망적 메시지가 인상적입니다.",
          },
          structure: {
            score: 88,
            feedback:
              '문장 구조도 자연스럽고 읽기 편합니다. 짧은 글에서도 깊이 있는 사고를 담아냈습니다.',
          },
        },
        strengths: [
          '현대적 주제에 대한 깊이 있는 사고',
          '대조 구조를 통한 효과적인 메시지 전달',
          '희망적인 관점으로 마무리',
        ],
        improvements: [
          '구체적인 AI 기술 사례를 추가하면 더욱 설득력 있을 것',
          '개인적 경험을 연결하여 더욱 공감할 수 있는 내용으로 발전 가능',
        ],
        writing_tips:
          "다음 글을 쓸 때, 구체적인 사례나 개인적 경험을 추가해보세요. 예를 들어 'AI 기술의 발전' 대신 'ChatGPT가 내 일상에 미치는 영향'처럼 구체적으로 접근하면 더욱 생생한 글이 될 것입니다.",
      }),
      score: 88,
      user: { displayName: '이지은' },
      mode: 'mode_300',
      topic: '기술과 인간',
    },
    {
      id: '3',
      title: '여행 전날의 설렘',
      originalText:
        '여행을 떠나기 전날 밤, 설렘과 긴장이 교차한다. 새로운 곳에서 만날 사람들, 맛볼 음식들, 경험할 순간들이 기대되면서도 동시에 낯선 환경에 대한 두려움도 느껴진다. 하지만 이런 감정들이 섞여있는 순간이야말로 여행의 진정한 매력이라고 생각한다.',
      content:
        '여행을 떠나기 전날 밤, 설렘과 긴장이 교차한다. 새로운 곳에서 만날 사람들, 맛볼 음식들, 경험할 순간들이 기대되면서도 동시에 낯선 환경에 대한 두려움도 느껴진다. 하지만 이런 감정들이 섞여있는 순간이야말로 여행의 진정한 매력이라고 생각한다.',
      feedback: JSON.stringify({
        overall_score: 95,
        criteria_scores: {
          content: {
            score: 95,
            feedback:
              "여행 전날의 복잡한 감정을 섬세하게 포착하고 있습니다. '설렘과 긴장이 교차한다'는 표현이 특히 인상적입니다.",
          },
          expression: {
            score: 92,
            feedback:
              '구체적인 기대사항들을 나열하면서도 마지막에 깊이 있는 통찰로 마무리하는 구조가 훌륭합니다.',
          },
          structure: {
            score: 90,
            feedback:
              '긴 글에서도 명확한 구조를 가지고 있으며, 감정의 흐름이 자연스럽게 전개됩니다.',
          },
        },
        strengths: [
          '복잡한 감정을 섬세하게 표현함',
          '구체적이고 생생한 묘사',
          '깊이 있는 통찰로 마무리',
        ],
        improvements: [
          '더 많은 감각적 요소를 활용하여 독자의 몰입도를 높일 수 있음',
          '개인적 경험을 더 구체적으로 연결하면 더욱 공감할 수 있을 것',
        ],
        writing_tips:
          "다음 글을 쓸 때, 감각적 요소를 더 활용해보세요. 예를 들어 '새로운 곳에서 만날 사람들' 대신 '낯선 언어로 대화할 현지인들의 따뜻한 미소'처럼 더 구체적이고 감각적으로 표현하면 독자의 상상력을 더욱 자극할 수 있습니다.",
      }),
      score: 95,
      user: { displayName: '박준호' },
      mode: 'mode_1000',
      topic: '여행과 감정',
    },
  ];

  useEffect(() => {
    const fetchAiFeedbacks = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/submit/ai-feedback`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const responseData = await response.json();

        if (
          responseData.success &&
          Array.isArray(responseData.data) &&
          responseData.data.length > 0
        ) {
          const apiFeedbacks = responseData.data.map((item: any) => ({
            id: item.id,
            title: item.title || '제목 없음',
            originalText: item.originalText || item.content || '원문을 불러올 수 없습니다.',
            content: item.content, // content 필드도 저장
            feedback: item.feedback,
            score: item.score,
            user: item.user,
            mode: item.mode,
            topic: item.topic,
          }));
          setFeedbacks(apiFeedbacks);
          setCurrentFeedback(apiFeedbacks[0]);
        } else {
          // API 데이터가 없으면 샘플 데이터 사용
          setFeedbacks(sampleFeedbacks);
          setCurrentFeedback(sampleFeedbacks[0]);
        }
      } catch (error) {
        console.error('AI 피드백 조회 오류:', error);
        // 에러 시 샘플 데이터 사용
        setFeedbacks(sampleFeedbacks);
        setCurrentFeedback(sampleFeedbacks[0]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAiFeedbacks();
  }, []);

  // 하루에 한 번만 피드백 변경 (24시간)
  useEffect(() => {
    if (inView && feedbacks.length > 0 && !intervalRef.current) {
      // 24시간(86400000ms)마다 새로운 피드백 표시
      intervalRef.current = setInterval(() => {
        setIsChanging(true);
        setTimeout(() => {
          const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
          setCurrentFeedback(randomFeedback);
          setIsChanging(false);
        }, 800);
      }, 86400000); // 24시간

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      };
    }
  }, [inView, feedbacks.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
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
      <h3 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        맞춤형 AI 피드백
      </h3>

      <p className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-8 bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 bg-clip-text text-transparent font-nanum-pen">
        수천 개의 글을 학습한 AI가 나만을 위한 맞춤형 피드백을 제공해 드려요.
      </p>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {currentFeedback && (
            <motion.div
              key={currentFeedback.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-black dark:text-white rounded-lg shadow-lg overflow-hidden"
            >
              {/* 헤더 섹션 */}
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-300 break-all line-clamp-2">
                        {currentFeedback.title}
                      </h3>
                      {/* 주제 표시 */}
                      {currentFeedback.topic && (
                        <span className="hidden sm:inline-block text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full dark:text-gray-300">
                          {currentFeedback.topic}
                        </span>
                      )}
                    </div>
                    {/* 모바일에서 주제 표시 */}
                    {currentFeedback.topic && (
                      <span className="inline-block sm:hidden w-auto text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full mb-2 dark:text-gray-300">
                        {currentFeedback.topic}
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {currentFeedback.user.displayName[0]}
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {currentFeedback.user.displayName}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          currentFeedback.mode === 'mode_300'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300'
                        }`}
                      >
                        {currentFeedback.mode === 'mode_300' ? '300자' : '1000자'}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {currentFeedback.score}점
                        </span>
                        <span className="text-xs text-gray-500">AI 평가</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 원문 섹션 */}
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  📝 원문
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-wrap break-all">
                    {currentFeedback.originalText ||
                      currentFeedback.content ||
                      '원문을 불러올 수 없습니다.'}
                  </p>
                </div>
              </div>

              {/* AI 피드백 섹션 - JSON 파싱 적용 */}
              <div className="p-4 sm:p-6 space-y-6">
                {(() => {
                  const parsedFeedback = parseFeedback(currentFeedback.feedback);

                  if (parsedFeedback) {
                    return (
                      <>
                        {/* 전체 점수 */}
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                            {parsedFeedback.overall_score}점
                          </div>
                          <div className="text-gray-500 dark:text-gray-300">전체 평가 점수</div>
                        </div>

                        {/* 평가 기준별 점수와 피드백 */}
                        {Object.keys(parsedFeedback.criteria_scores).length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(parsedFeedback.criteria_scores).map(
                              ([criterion, data]) => (
                                <div
                                  key={criterion}
                                  className="border border-gray-100 dark:border-gray-300 rounded-lg p-4"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                                      {criterion === 'content'
                                        ? '내용'
                                        : criterion === 'originality'
                                          ? '독창성'
                                          : criterion === 'consistency'
                                            ? '일관성'
                                            : criterion === 'insight'
                                              ? '통찰력'
                                              : criterion === 'development'
                                                ? '전개'
                                                : criterion === 'expression'
                                                  ? '표현'
                                                  : criterion === 'structure'
                                                    ? '구조'
                                                    : criterion === 'technical'
                                                      ? '기술'
                                                      : criterion}
                                    </h3>
                                    <span className="text-blue-600 dark:text-blue-300 font-bold">
                                      {data.score}점
                                    </span>
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    {data.feedback}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* 장점 */}
                        {parsedFeedback.strengths.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-semibold text-green-600 dark:text-green-300">
                              ✅ 장점
                            </h3>
                            <ul className="list-disc list-inside space-y-1">
                              {parsedFeedback.strengths.map((strength, index) => (
                                <li
                                  key={index}
                                  className="text-gray-600 dark:text-gray-300 text-sm"
                                >
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 개선점 */}
                        {parsedFeedback.improvements.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-semibold text-amber-600 dark:text-amber-300">
                              🔧 개선점
                            </h3>
                            <ul className="list-disc list-inside space-y-1">
                              {parsedFeedback.improvements.map((improvement, index) => (
                                <li
                                  key={index}
                                  className="text-gray-600 dark:text-gray-300 text-sm"
                                >
                                  {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 글쓰기 팁 */}
                        {parsedFeedback.writing_tips && (
                          <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
                            <h3 className="font-semibold text-blue-600 dark:text-blue-300 mb-2">
                              💡 글쓰기 팁
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              {parsedFeedback.writing_tips}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  } else {
                    // JSON 파싱 실패 시 기본 피드백 표시
                    return (
                      <>
                        {/* 전체 점수 */}
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                            {currentFeedback.score}점
                          </div>
                          <div className="text-gray-500 dark:text-gray-300">전체 평가 점수</div>
                        </div>

                        {/* 기본 AI 피드백 내용 */}
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                            🤖 AI 피드백
                          </h4>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base">
                            {currentFeedback.feedback}
                          </p>
                        </div>
                      </>
                    );
                  }
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 로딩 오버레이 */}
        {isChanging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                다음 피드백 로딩 중...
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AiFeedbackSection;
