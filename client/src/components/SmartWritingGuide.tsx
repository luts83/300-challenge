import React, { useState, useEffect, useMemo } from 'react';
import WritingStructureAnalyzer from './WritingStructureAnalyzer';
import RealTimeWritingFeedback from './RealTimeWritingFeedback';

interface SmartWritingGuideProps {
  text: string;
  maxLength: number;
  mode: 'mode_300' | 'mode_1000';
}

interface WritingStage {
  name: string;
  description: string;
  targetLength: number;
  tips: string[];
  icon: string;
  color: string;
}

const SmartWritingGuide: React.FC<SmartWritingGuideProps> = ({ text, maxLength, mode }) => {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);

  const charCount = text.length;
  const progress = (charCount / maxLength) * 100;

  // 글쓰기 단계별 가이드 (300자 모드 기준)
  const writingStages: WritingStage[] = useMemo(() => {
    if (mode === 'mode_300') {
      return [
        {
          name: '도입부',
          description: '주제에 대한 첫인상이나 배경 설명',
          targetLength: Math.floor(maxLength * 0.2), // 20%
          tips: [
            '주제에 대한 첫 느낌을 표현해보세요',
            '왜 이 주제가 중요한지 간단히 설명해보세요',
            '개인적인 경험이나 생각을 언급해보세요',
          ],
          icon: '🚀',
          color: 'blue',
        },
        {
          name: '전개부',
          description: '구체적인 사례나 논리적 설명',
          targetLength: Math.floor(maxLength * 0.6), // 60%
          tips: [
            '구체적인 예시나 경험을 들어보세요',
            '감정과 생각을 자세히 표현해보세요',
            '독자가 공감할 수 있는 내용을 담아보세요',
          ],
          icon: '📝',
          color: 'green',
        },
        {
          name: '마무리',
          description: '결론과 마무리 인사',
          targetLength: maxLength, // 100%
          tips: [
            '앞서 말한 내용을 간단히 정리해보세요',
            '미래에 대한 희망이나 다짐을 표현해보세요',
            '독자에게 전하고 싶은 메시지를 담아보세요',
          ],
          icon: '✨',
          color: 'purple',
        },
      ];
    } else {
      // 1000자 모드용 단계
      return [
        {
          name: '도입부',
          description: '주제 소개와 배경 설명',
          targetLength: Math.floor(maxLength * 0.15),
          tips: [
            '주제의 중요성과 현재 상황을 설명해보세요',
            '왜 이 주제에 관심을 가지게 되었는지 설명해보세요',
          ],
          icon: '🚀',
          color: 'blue',
        },
        {
          name: '전개부 1',
          description: '첫 번째 핵심 내용',
          targetLength: Math.floor(maxLength * 0.4),
          tips: [
            '구체적인 사례나 경험을 자세히 설명해보세요',
            '감정과 생각을 풍부하게 표현해보세요',
          ],
          icon: '📝',
          color: 'green',
        },
        {
          name: '전개부 2',
          description: '두 번째 핵심 내용',
          targetLength: Math.floor(maxLength * 0.7),
          tips: [
            '다른 관점이나 추가적인 생각을 담아보세요',
            '앞서 말한 내용과의 연결점을 찾아보세요',
          ],
          icon: '💭',
          color: 'orange',
        },
        {
          name: '마무리',
          description: '결론과 마무리',
          targetLength: maxLength,
          tips: [
            '전체 내용을 간결하게 정리해보세요',
            '미래에 대한 희망이나 다짐을 표현해보세요',
            '독자에게 전하고 싶은 메시지를 담아보세요',
          ],
          icon: '✨',
          color: 'purple',
        },
      ];
    }
  }, [maxLength, mode]);

  // 현재 단계 계산
  useEffect(() => {
    const stage = writingStages.findIndex(stage => charCount <= stage.targetLength);
    setCurrentStage(stage === -1 ? writingStages.length - 1 : stage);
  }, [charCount, writingStages]);

  // 현재 단계 정보
  const currentStageInfo = writingStages[currentStage];
  const nextStage = writingStages[currentStage + 1];
  const isLastStage = currentStage === writingStages.length - 1;

  // 글자수별 상태 메시지
  const getStatusMessage = () => {
    if (charCount === 0) {
      return { message: '글쓰기를 시작해보세요!', type: 'info' };
    }

    if (charCount < currentStageInfo.targetLength * 0.5) {
      return {
        message: `${currentStageInfo.name} 단계를 더 발전시켜보세요`,
        type: 'warning',
      };
    }

    if (charCount < currentStageInfo.targetLength) {
      return {
        message: `${currentStageInfo.name} 단계가 거의 완성되었어요!`,
        type: 'success',
      };
    }

    if (isLastStage && charCount < maxLength * 0.8) {
      return {
        message: '마무리 단계를 더 풍성하게 만들어보세요',
        type: 'info',
      };
    }

    if (charCount >= maxLength * 0.9) {
      return {
        message: '거의 완성되었어요! 마무리 점검을 해보세요',
        type: 'success',
      };
    }

    return {
      message: `${currentStageInfo.name} 단계가 완성되었어요!`,
      type: 'success',
    };
  };

  const statusMessage = getStatusMessage();

  // 끝맺음 패턴 추천
  const getEndingSuggestions = () => {
    if (charCount < maxLength * 0.7) return null;

    const suggestions = [
      '앞서 말한 내용을 정리하면...',
      '이런 경험을 통해 배운 점은...',
      '앞으로는 이렇게 하려고 해요...',
      '독자분들도 이런 경험을 해보시길 바라요...',
      '이 주제에 대해 더 생각해보게 되었어요...',
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const endingSuggestion = getEndingSuggestions();

  return (
    <div className="mb-4">
      {/* 가이드 토글 버튼 */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-left transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎯</span>
            <span className="font-medium text-blue-800 dark:text-blue-200">
              스마트 글쓰기 가이드
            </span>
          </div>
          <span
            className={`text-lg transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>
      </button>

      {/* 가이드 내용 */}
      {showGuide && (
        <div className="mt-3 space-y-4">
          {/* 진행률 표시 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                전체 진행률
              </span>
              <span className="text-sm text-gray-500">
                {charCount}/{maxLength}자 ({Math.round(progress)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* 현재 단계 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{currentStageInfo.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {currentStageInfo.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentStageInfo.description}
                </p>
              </div>
            </div>

            {/* 단계별 진행률 */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>현재: {charCount}자</span>
                <span>목표: {currentStageInfo.targetLength}자</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`bg-${currentStageInfo.color}-500 h-1.5 rounded-full transition-all duration-300`}
                  style={{
                    width: `${Math.min((charCount / currentStageInfo.targetLength) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* 상태 메시지 */}
            <div
              className={`p-3 rounded-lg text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
                  : statusMessage.type === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
              }`}
            >
              <span className="font-medium">💡 {statusMessage.message}</span>
            </div>
          </div>

          {/* 글쓰기 팁 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
              <span className="text-lg mr-2">💡</span>
              {currentStageInfo.name} 단계 팁
            </h4>
            <ul className="space-y-2">
              {currentStageInfo.tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 다음 단계 미리보기 */}
          {nextStage && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                <span className="text-lg mr-2">🔮</span>
                다음 단계: {nextStage.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{nextStage.description}</p>
            </div>
          )}

          {/* 끝맺음 제안 */}
          {endingSuggestion && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center">
                <span className="text-lg mr-2">✨</span>
                끝맺음 아이디어
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 italic">
                "{endingSuggestion}"
              </p>
            </div>
          )}

          {/* 글자수별 단계별 가이드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
              <span className="text-lg mr-2">📊</span>
              단계별 목표
            </h4>
            <div className="space-y-2">
              {writingStages.map((stage, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    index === currentStage
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : index < currentStage
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{stage.icon}</span>
                    <span
                      className={`font-medium ${
                        index === currentStage
                          ? 'text-blue-800 dark:text-blue-200'
                          : index < currentStage
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      index === currentStage
                        ? 'text-blue-600 dark:text-blue-300'
                        : index < currentStage
                          ? 'text-green-600 dark:text-green-300'
                          : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {stage.targetLength}자
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 실시간 글쓰기 피드백 */}
          <RealTimeWritingFeedback text={text} maxLength={maxLength} mode={mode} />

          {/* 글쓰기 구조 분석 */}
          <WritingStructureAnalyzer text={text} maxLength={maxLength} mode={mode} />
        </div>
      )}
    </div>
  );
};

export default SmartWritingGuide;
