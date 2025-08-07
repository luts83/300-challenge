import React, { useMemo } from 'react';

interface RealTimeWritingFeedbackProps {
  text: string;
  maxLength: number;
  mode: 'mode_300' | 'mode_1000';
}

interface WritingFeedback {
  quality: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  score: number;
  suggestions: string[];
  strengths: string[];
  warnings: string[];
}

const RealTimeWritingFeedback: React.FC<RealTimeWritingFeedbackProps> = ({
  text,
  maxLength,
  mode,
}) => {
  const feedback = useMemo((): WritingFeedback => {
    const charCount = text.length;
    const words = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);

    let score = 0;
    const suggestions: string[] = [];
    const strengths: string[] = [];
    const warnings: string[] = [];

    // 기본 점수 계산
    if (charCount > 0) score += 10; // 글쓰기 시작
    if (charCount >= maxLength * 0.3) score += 20; // 30% 이상
    if (charCount >= maxLength * 0.6) score += 25; // 60% 이상
    if (charCount >= maxLength * 0.8) score += 25; // 80% 이상
    if (charCount >= maxLength * 0.9) score += 20; // 90% 이상

    // 문장 구조 분석
    if (sentences.length > 0) {
      const avgSentenceLength = words.length / sentences.length;

      if (avgSentenceLength >= 8 && avgSentenceLength <= 25) {
        score += 15;
        strengths.push('문장 길이가 적절합니다');
      } else if (avgSentenceLength < 8) {
        score += 5;
        warnings.push('문장이 너무 짧습니다');
        suggestions.push('연결어를 사용해서 문장을 연결해보세요');
      } else {
        score += 10;
        warnings.push('긴 문장이 많습니다');
        suggestions.push('긴 문장을 짧고 명확하게 나누어보세요');
      }
    }

    // 단어 다양성 분석
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    const wordDiversity = uniqueWords.size / words.length;

    if (wordDiversity >= 0.7) {
      score += 10;
      strengths.push('다양한 단어를 사용하고 있습니다');
    } else if (wordDiversity < 0.5) {
      score -= 5;
      warnings.push('반복되는 단어가 많습니다');
      suggestions.push('동의어나 다른 표현을 사용해보세요');
    }

    // 문단 구조 분석
    if (paragraphs.length >= 2) {
      score += 10;
      strengths.push('문단을 구분해서 작성하고 있습니다');
    } else if (charCount > maxLength * 0.5) {
      suggestions.push('긴 글은 문단을 나누어 작성하면 읽기 쉬워집니다');
    }

    // 특정 표현 패턴 분석
    const positivePatterns = [
      /(그런데|하지만|그러나|그런가 하면)/, // 전환어
      /(예를 들어|구체적으로|특히|특별히)/, // 구체화
      /(따라서|그래서|그러므로|결과적으로)/, // 결론
      /(감사|고맙|희망|바람|다짐)/, // 감정 표현
    ];

    const foundPatterns = positivePatterns.filter(pattern => pattern.test(text));
    if (foundPatterns.length >= 2) {
      score += 10;
      strengths.push('논리적인 글쓰기 구조를 가지고 있습니다');
    }

    // 글자수별 특별 피드백
    if (charCount < maxLength * 0.2) {
      suggestions.push('글을 더 발전시켜보세요. 구체적인 예시나 경험을 추가하면 좋겠어요');
    } else if (charCount >= maxLength * 0.7 && charCount < maxLength * 0.9) {
      strengths.push('글의 전개가 좋습니다');
      suggestions.push(
        '마무리를 준비해보세요. 앞서 말한 내용을 정리하거나 미래에 대한 생각을 담아보세요'
      );
    } else if (charCount >= maxLength * 0.9) {
      strengths.push('거의 완성되었습니다!');
      suggestions.push('마지막 점검을 통해 전체적인 흐름을 확인해보세요');
    }

    // 끝맺음 품질 체크
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
      if (hasEndingPattern) {
        score += 10;
        strengths.push('자연스러운 끝맺음을 하고 있습니다');
      } else {
        suggestions.push(
          '끝맺음을 더 자연스럽게 만들어보세요. "앞으로는", "배웠다", "감사합니다" 같은 표현을 활용해보세요'
        );
      }
    }

    // 품질 등급 결정
    let quality: 'excellent' | 'good' | 'fair' | 'needs_improvement';
    if (score >= 90) quality = 'excellent';
    else if (score >= 70) quality = 'good';
    else if (score >= 50) quality = 'fair';
    else quality = 'needs_improvement';

    return {
      quality,
      score: Math.min(score, 100),
      suggestions,
      strengths,
      warnings,
    };
  }, [text, maxLength]);

  if (text.length === 0) {
    return null;
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400';
      case 'good':
        return 'text-blue-600 dark:text-blue-400';
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'needs_improvement':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getQualityEmoji = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '🌟';
      case 'good':
        return '👍';
      case 'fair':
        return '📊';
      case 'needs_improvement':
        return '⚠️';
      default:
        return '📝';
    }
  };

  const getQualityText = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '훌륭함';
      case 'good':
        return '좋음';
      case 'fair':
        return '보통';
      case 'needs_improvement':
        return '개선 필요';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
        <span className="text-lg mr-2">📊</span>
        실시간 글쓰기 피드백
      </h3>

      {/* 품질 점수 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">글쓰기 품질</span>
          <span className={`text-lg font-bold ${getQualityColor(feedback.quality)}`}>
            {getQualityEmoji(feedback.quality)} {feedback.score}점
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              feedback.quality === 'excellent'
                ? 'bg-green-500'
                : feedback.quality === 'good'
                  ? 'bg-blue-500'
                  : feedback.quality === 'fair'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${feedback.score}%` }}
          />
        </div>
        <div className="text-center mt-1">
          <span className={`text-sm font-medium ${getQualityColor(feedback.quality)}`}>
            {getQualityText(feedback.quality)}
          </span>
        </div>
      </div>

      {/* 강점 표시 */}
      {feedback.strengths.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center">
            <span className="text-lg mr-2">✅</span>
            글쓰기 강점
          </h4>
          <ul className="space-y-1">
            {feedback.strengths.map((strength, index) => (
              <li
                key={index}
                className="text-sm text-green-700 dark:text-green-300 flex items-start space-x-2"
              >
                <span className="text-green-500 mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 주의사항 */}
      {feedback.warnings.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            주의사항
          </h4>
          <ul className="space-y-1">
            {feedback.warnings.map((warning, index) => (
              <li
                key={index}
                className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start space-x-2"
              >
                <span className="text-yellow-500 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 개선 제안 */}
      {feedback.suggestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center">
            <span className="text-lg mr-2">💡</span>
            개선 제안
          </h4>
          <ul className="space-y-1">
            {feedback.suggestions.map((suggestion, index) => (
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

      {/* 글쓰기 통계 */}
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

export default RealTimeWritingFeedback;
