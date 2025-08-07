import React, { useState } from 'react';

interface EndingTemplateGuideProps {
  text: string;
  maxLength: number;
  onInsertTemplate: (template: string) => void;
}

interface EndingTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: 'reflection' | 'future' | 'gratitude' | 'hope' | 'summary';
  length: 'short' | 'medium' | 'long';
}

const EndingTemplateGuide: React.FC<EndingTemplateGuideProps> = ({
  text,
  maxLength,
  onInsertTemplate,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const charCount = text.length;
  const remainingChars = maxLength - charCount;

  // 끝맺음 템플릿들
  const endingTemplates: EndingTemplate[] = [
    // 반성/배움 카테고리
    {
      id: 'reflection-1',
      name: '배움의 정리',
      description: '이번 경험을 통해 배운 점을 정리',
      template:
        '이런 경험을 통해 배운 점은 정말 많다. 앞으로도 이런 기회가 있다면 더 적극적으로 참여하고 싶다.',
      category: 'reflection',
      length: 'medium',
    },
    {
      id: 'reflection-2',
      name: '깨달음 표현',
      description: '새로운 깨달음을 얻었다는 표현',
      template: '이번 기회를 통해 새로운 것을 배웠다. 이런 경험이 나를 성장시켜주는 것 같다.',
      category: 'reflection',
      length: 'medium',
    },

    // 미래/다짐 카테고리
    {
      id: 'future-1',
      name: '미래 다짐',
      description: '앞으로의 계획이나 다짐',
      template: '앞으로는 이런 상황에서 더 나은 선택을 하려고 한다. 꾸준히 노력하겠다.',
      category: 'future',
      length: 'medium',
    },
    {
      id: 'future-2',
      name: '개선 의지',
      description: '자신을 개선하려는 의지 표현',
      template: '이제부터는 더 나은 사람이 되기 위해 노력하겠다. 작은 변화부터 시작해보자.',
      category: 'future',
      length: 'medium',
    },

    // 감사 카테고리
    {
      id: 'gratitude-1',
      name: '감사 표현',
      description: '경험에 대한 감사 표현',
      template: '이런 기회를 만들어주신 분들께 감사드린다. 정말 소중한 경험이었다.',
      category: 'gratitude',
      length: 'medium',
    },
    {
      id: 'gratitude-2',
      name: '소중함 강조',
      description: '경험의 소중함을 강조',
      template: '이런 경험은 정말 소중하다. 앞으로도 이런 기회를 놓치지 않겠다.',
      category: 'gratitude',
      length: 'short',
    },

    // 희망/바람 카테고리
    {
      id: 'hope-1',
      name: '희망 표현',
      description: '미래에 대한 희망 표현',
      template: '앞으로 더 좋은 일들이 있을 것 같다. 희망을 가지고 나아가겠다.',
      category: 'hope',
      length: 'medium',
    },
    {
      id: 'hope-2',
      name: '독자 응원',
      description: '독자들에게 응원 메시지',
      template: '독자분들도 이런 경험을 해보시길 바란다. 정말 좋은 경험이 될 것이다.',
      category: 'hope',
      length: 'medium',
    },

    // 요약/정리 카테고리
    {
      id: 'summary-1',
      name: '간단 정리',
      description: '앞서 말한 내용을 간단히 정리',
      template:
        '정리하면, 이번 경험은 나에게 큰 의미가 있었다. 앞으로도 이런 기회를 놓치지 않겠다.',
      category: 'summary',
      length: 'long',
    },
    {
      id: 'summary-2',
      name: '핵심 강조',
      description: '핵심 메시지를 다시 강조',
      template: '결론적으로, 이런 경험은 정말 중요하다. 모두가 이런 기회를 가져보시길 바란다.',
      category: 'summary',
      length: 'medium',
    },
  ];

  // 카테고리별 필터링
  const filteredTemplates =
    selectedCategory === 'all'
      ? endingTemplates
      : endingTemplates.filter(template => template.category === selectedCategory);

  // 글자수별 필터링 (남은 글자수에 맞는 템플릿만 표시)
  const availableTemplates = filteredTemplates.filter(template => {
    const templateLength = template.template.length;
    return templateLength <= remainingChars + 20; // 20자 여유분
  });

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'reflection':
        return '반성/배움';
      case 'future':
        return '미래/다짐';
      case 'gratitude':
        return '감사';
      case 'hope':
        return '희망/바람';
      case 'summary':
        return '요약/정리';
      default:
        return '전체';
    }
  };

  const getLengthColor = (length: string) => {
    switch (length) {
      case 'short':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'long':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getLengthText = (length: string) => {
    switch (length) {
      case 'short':
        return '짧음';
      case 'medium':
        return '보통';
      case 'long':
        return '김';
      default:
        return '';
    }
  };

  // 끝맺음이 필요한 시점인지 확인
  const needsEnding = charCount >= maxLength * 0.7;
  const isNearLimit = charCount >= maxLength * 0.9;

  if (!needsEnding) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* 가이드 토글 버튼 */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 hover:shadow-md ${
          isNearLimit
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
            : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">✨</span>
            <span className="font-medium">
              {isNearLimit ? '끝맺음 완성하기' : '끝맺음 아이디어'}
            </span>
          </div>
          <span
            className={`text-lg transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>
        <div className="text-sm mt-1 opacity-80">남은 글자수: {remainingChars}자</div>
      </button>

      {/* 가이드 내용 */}
      {showGuide && (
        <div className="mt-3 space-y-4">
          {/* 카테고리 필터 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
              <span className="text-lg mr-2">🏷️</span>
              끝맺음 유형 선택
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
              >
                전체
              </button>
              {['reflection', 'future', 'gratitude', 'hope', 'summary'].map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {getCategoryName(category)}
                </button>
              ))}
            </div>
          </div>

          {/* 템플릿 목록 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
              <span className="text-lg mr-2">📝</span>
              끝맺음 템플릿
            </h4>

            {availableTemplates.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <span className="text-2xl mb-2 block">😅</span>
                <p>남은 글자수가 부족해서 템플릿을 사용할 수 없어요.</p>
                <p className="text-sm mt-1">직접 간단한 마무리를 작성해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableTemplates.map(template => (
                  <div
                    key={template.id}
                    className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-gray-800 dark:text-gray-200">
                          {template.name}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.description}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${getLengthColor(template.length)}`}
                      >
                        {getLengthText(template.length)}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                        "{template.template}"
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{template.template.length}자</p>
                    </div>

                    <button
                      onClick={() => onInsertTemplate(template.template)}
                      className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      이 템플릿 사용하기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 끝맺음 팁 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center">
              <span className="text-lg mr-2">💡</span>
              끝맺음 작성 팁
            </h4>
            <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>앞서 말한 내용과 자연스럽게 연결되도록 하세요</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>감정이나 생각을 담아서 진정성 있게 마무리하세요</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>독자에게 전하고 싶은 메시지를 담아보세요</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>너무 긴 문장보다는 간결하고 명확하게 마무리하세요</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndingTemplateGuide;
