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
      id: 1,
      title: '프로페셔널',
      topic: '회사 사람들이 나를 떠올릴 때 남기고 싶은 인상',
      originalText:
        "나는 '프로페셔널하다'라는 말을 좋아한다.\n\n우리말로 딱 들어맞는 말은 없지만, 책임감과 객관성 두가지 키워드 정도를 꼽아볼 수 있겠다.\n\n무엇보다 내가 하는 일에 있어서 끝까지 책임를 다하고, 사사로운 감정이 끼어들지 않도록 객관적인 판단을 하는 사람. 문제보다는 해결책에 집중하는 태도.\n\n팀원, 상사, 동료 그리고 내 스스로가 나를 그런 사람으로 기억해주었으면 한다.",
      score: 85,
      mode: 'mode_300',
      content:
        "나는 '프로페셔널하다'라는 말을 좋아한다.\n\n우리말로 딱 들어맞는 말은 없지만, 책임감과 객관성 두가지 키워드 정도를 꼽아볼 수 있겠다.\n\n무엇보다 내가 하는 일에 있어서 끝까지 책임를 다하고, 사사로운 감정이 끼어들지 않도록 객관적인 판단을 하는 사람. 문제보다는 해결책에 집중하는 태도.\n\n팀원, 상사, 동료 그리고 내 스스로가 나를 그런 사람으로 기억해주었으면 한다.",
      user: {
        displayName: 'Grace Shin',
      },
      feedback: JSON.stringify({
        overall_score: 85,
        criteria_scores: {
          content: {
            score: 90,
            feedback:
              "주제에 대한 명확한 이해와 일관성 있는 메시지를 전달하고 있습니다. '프로페셔널함'과 관련된 중요한 개념을 잘 선정했습니다.",
          },
          expression: {
            score: 75,
            feedback:
              '표현이 전반적으로 명료하나, 일부 문장에서 좀 더 구체적인 예시가 있었으면 더 좋았을 부분이 있습니다.',
          },
          structure: {
            score: 80,
            feedback:
              '텍스트의 흐름이 자연스럽고 논리적인 구성입니다. 그러나 일부 문장의 연결이 매끄럽지 않아 개선의 여지가 있습니다.',
          },
          technical: {
            score: 95,
            feedback:
              "문법과 맞춤법 오류는 거의 없습니다. '책임를' 대신 '책임을'이 사용되어야 합니다.",
          },
        },
        strengths: [
          '명확한 주제 선정과 집중: 프로페셔널함을 주제로 일관성 있게 글을 전개한 점',
          '구체적인 설명: 프로페셔널함의 요소로 책임감과 객관성을 제시한 점',
          '자신의 목표와 관련하여 일관된 메시지를 전달하는 점',
        ],
        improvements: [
          "책임을 강조하는 부분에서 추가적인 설명이 있으면 좋겠습니다. 예를 들어, '어떤 상황에서 책임감을 보여주었는지' 같은 구체적인 예시",
          '객관성에 대해 더 구체적인 상황을 언급하면, 읽는 사람들이 더 잘 이해할 수 있을 것입니다.',
          '문장 연결을 자연스럽게 하기 위해 접속어나 연결어 사용을 고려해보세요.',
        ],
        writing_tips:
          "다음 글쓰기를 위해서는 구체적인 사례나 예시를 통해 메시지를 강화하는 것을 추천합니다. 예를 들어, '책임감을 발휘했던 한 가지 사례는...'와 같은 방식으로 설명을 덧붙이면 독자의 이해를 돕고 설득력을 높일 수 있습니다.",
      }),
    },
    {
      id: 2,
      title: '힘든 하루의 끝에서',
      topic: '일상의 성찰',
      originalText:
        '오늘은 정말 힘든 하루였다. 회사에서 스트레스를 받고 집에 와서도 마음이 편하지 않았다. 하지만 이런 날일수록 내가 할 수 있는 작은 것들을 하나씩 해나가야겠다고 생각했다.',
      score: 92,
      mode: 'mode_300',
      content:
        '오늘은 정말 힘든 하루였다. 회사에서 스트레스를 받고 집에 와서도 마음이 편하지 않았다. 하지만 이런 날일수록 내가 할 수 있는 작은 것들을 하나씩 해나가야겠다고 생각했다.',
      user: {
        displayName: 'Grace Shin',
      },
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
          technical: {
            score: 95,
            feedback: '문법과 맞춤법이 정확합니다.',
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
    },
    {
      id: 3,
      title: '새로운 시작',
      topic: '변화와 성장',
      originalText:
        '매일 같은 일상을 반복하다 보니 어느새 변화에 대한 두려움이 생겼다. 하지만 변화는 성장의 시작이라는 것을 잊지 말아야겠다. 작은 변화부터 시작해보자.',
      score: 88,
      mode: 'mode_300',
      content:
        '매일 같은 일상을 반복하다 보니 어느새 변화에 대한 두려움이 생겼다. 하지만 변화는 성장의 시작이라는 것을 잊지 말아야겠다. 작은 변화부터 시작해보자.',
      user: {
        displayName: 'Grace Shin',
      },
      feedback: JSON.stringify({
        overall_score: 88,
        criteria_scores: {
          content: {
            score: 85,
            feedback: '변화에 대한 두려움과 성장에 대한 희망을 대조적으로 잘 표현했습니다.',
          },
          expression: {
            score: 90,
            feedback: '간결하면서도 의미 있는 문장들로 구성되어 있습니다.',
          },
          structure: {
            score: 85,
            feedback: '문제 제시, 인식, 결심의 구조가 명확합니다.',
          },
          technical: {
            score: 90,
            feedback: '문법적으로 정확합니다.',
          },
        },
        strengths: ['감정의 변화를 자연스럽게 표현', '희망적인 메시지 전달', '실용적인 결론 제시'],
        improvements: ['구체적인 변화 사례 추가', '더 생생한 표현 활용'],
        writing_tips:
          '변화에 대한 구체적인 경험이나 계획을 추가하면 더욱 설득력 있는 글이 될 것입니다.',
      }),
    },
  ];

  useEffect(() => {
    // 현재는 기본적으로 샘플 데이터 사용
    setFeedbacks(sampleFeedbacks);
    setCurrentFeedback(sampleFeedbacks[0]);
    setIsLoading(false);

    // 24시간마다 서버에서 데이터를 가져오는 기능은 유지하되, 현재는 비활성화
    /*
    const fetchAiFeedbacks = async () => {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || 'https://300-challenge-production.up.railway.app';

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
    */
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
