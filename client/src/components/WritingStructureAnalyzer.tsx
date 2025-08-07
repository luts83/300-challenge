import React, { useMemo } from 'react';

interface WritingStructureAnalyzerProps {
  text: string;
  maxLength: number;
  mode: 'mode_300' | 'mode_1000';
}

interface StructureAnalysis {
  hasIntroduction: boolean;
  hasDevelopment: boolean;
  hasConclusion: boolean;
  balanceScore: number;
  suggestions: string[];
  endingQuality: 'good' | 'needs_improvement' | 'missing';
}

const WritingStructureAnalyzer: React.FC<WritingStructureAnalyzerProps> = ({
  text,
  maxLength,
  mode,
}) => {
  const analysis = useMemo((): StructureAnalysis => {
    const charCount = text.length;
    const words = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);

    // 기본 구조 분석
    const hasIntroduction = charCount > maxLength * 0.1; // 10% 이상이면 도입부 있다고 판단
    const hasDevelopment = charCount > maxLength * 0.3; // 30% 이상이면 전개부 있다고 판단
    const hasConclusion = charCount > maxLength * 0.6; // 60% 이상이면 마무리 있다고 판단

    // 균형 점수 계산 (0-100)
    let balanceScore = 0;
    if (hasIntroduction) balanceScore += 25;
    if (hasDevelopment) balanceScore += 40;
    if (hasConclusion) balanceScore += 35;

    // 글자수별 균형 점수 추가
    if (charCount >= maxLength * 0.8) balanceScore += 10;
    if (charCount >= maxLength * 0.9) balanceScore += 5;

    // 끝맺음 품질 평가
    let endingQuality: 'good' | 'needs_improvement' | 'missing' = 'missing';
    if (charCount >= maxLength * 0.8) {
      const lastSentence = sentences[sentences.length - 1] || '';
      const endingPatterns = [
        /(앞으로|이제|앞으로는|앞으로도)/,
        /(배웠다|느꼈다|생각한다|바란다|희망한다)/,
        /(정리하면|요약하면|결론적으로)/,
        /(독자|여러분|우리|모두)/,
        /(감사|고맙|감사합니다|고맙습니다)/,
      ];

      const hasEndingPattern = endingPatterns.some(pattern => pattern.test(lastSentence));
      endingQuality = hasEndingPattern ? 'good' : 'needs_improvement';
    }

    // 개선 제안 생성
    const suggestions: string[] = [];

    if (!hasIntroduction && charCount > 0) {
      suggestions.push('도입부를 추가해보세요. 주제에 대한 첫 느낌이나 배경을 설명하면 좋겠어요.');
    }

    if (!hasDevelopment && charCount > maxLength * 0.2) {
      suggestions.push(
        '전개부를 더 풍성하게 만들어보세요. 구체적인 예시나 경험을 추가하면 좋겠어요.'
      );
    }

    if (!hasConclusion && charCount > maxLength * 0.5) {
      suggestions.push(
        '마무리를 준비해보세요. 앞서 말한 내용을 정리하거나 미래에 대한 생각을 담아보세요.'
      );
    }

    if (endingQuality === 'needs_improvement') {
      suggestions.push(
        '끝맺음을 더 자연스럽게 만들어보세요. "앞으로는", "배웠다", "감사합니다" 같은 표현을 활용해보세요.'
      );
    }

    if (charCount < maxLength * 0.7 && charCount > maxLength * 0.5) {
      suggestions.push(
        '글을 더 발전시켜보세요. 현재 내용을 바탕으로 추가적인 생각이나 경험을 담아보세요.'
      );
    }

    if (charCount >= maxLength * 0.9) {
      suggestions.push('거의 완성되었어요! 마지막 점검을 통해 전체적인 흐름을 확인해보세요.');
    }

    // 문장 길이 균형 체크
    if (sentences.length > 0) {
      const avgSentenceLength = words.length / sentences.length;
      if (avgSentenceLength > 25) {
        suggestions.push('긴 문장이 많아요. 짧고 명확한 문장으로 나누어보세요.');
      } else if (avgSentenceLength < 8) {
        suggestions.push('문장이 너무 짧아요. 연결어를 사용해서 문장을 연결해보세요.');
      }
    }

    return {
      hasIntroduction,
      hasDevelopment,
      hasConclusion,
      balanceScore,
      suggestions,
      endingQuality,
    };
  }, [text, maxLength]);

  if (text.length === 0) {
    return null;
  }

  const getBalanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBalanceEmoji = (score: number) => {
    if (score >= 80) return '🎯';
    if (score >= 60) return '📊';
    return '⚠️';
  };

  const getEndingEmoji = (quality: string) => {
    switch (quality) {
      case 'good':
        return '✨';
      case 'needs_improvement':
        return '🔧';
      default:
        return '❌';
    }
  };

  const getEndingColor = (quality: string) => {
    switch (quality) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'needs_improvement':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
        <span className="text-lg mr-2">🔍</span>
        글쓰기 구조 분석
      </h3>

      {/* 구조 균형 점수 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            구조 균형 점수
          </span>
          <span className={`text-lg font-bold ${getBalanceColor(analysis.balanceScore)}`}>
            {getBalanceEmoji(analysis.balanceScore)} {analysis.balanceScore}점
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              analysis.balanceScore >= 80
                ? 'bg-green-500'
                : analysis.balanceScore >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${analysis.balanceScore}%` }}
          />
        </div>
      </div>

      {/* 구조 요소 체크 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div
          className={`p-3 rounded-lg border ${
            analysis.hasIntroduction
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{analysis.hasIntroduction ? '✅' : '❌'}</span>
            <span
              className={`text-sm font-medium ${
                analysis.hasIntroduction
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              도입부
            </span>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border ${
            analysis.hasDevelopment
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{analysis.hasDevelopment ? '✅' : '❌'}</span>
            <span
              className={`text-sm font-medium ${
                analysis.hasDevelopment
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              전개부
            </span>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border ${
            analysis.hasConclusion
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{analysis.hasConclusion ? '✅' : '❌'}</span>
            <span
              className={`text-sm font-medium ${
                analysis.hasConclusion
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              마무리
            </span>
          </div>
        </div>
      </div>

      {/* 끝맺음 품질 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">끝맺음 품질</span>
          <span className={`text-sm font-medium ${getEndingColor(analysis.endingQuality)}`}>
            {getEndingEmoji(analysis.endingQuality)}{' '}
            {analysis.endingQuality === 'good'
              ? '좋음'
              : analysis.endingQuality === 'needs_improvement'
                ? '개선 필요'
                : '누락'}
          </span>
        </div>
      </div>

      {/* 개선 제안 */}
      {analysis.suggestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center">
            <span className="text-lg mr-2">💡</span>
            개선 제안
          </h4>
          <ul className="space-y-1">
            {analysis.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="text-sm text-blue-700 dark:text-blue-300 flex items-start space-x-2"
              >
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 글자수 통계 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{text.length}</div>
            <div className="text-xs text-gray-500">글자수</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {
                text
                  .trim()
                  .split(/\s+/)
                  .filter(word => word.length > 0).length
              }
            </div>
            <div className="text-xs text-gray-500">단어수</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length}
            </div>
            <div className="text-xs text-gray-500">문장수</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {Math.round((text.length / maxLength) * 100)}%
            </div>
            <div className="text-xs text-gray-500">진행률</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingStructureAnalyzer;
