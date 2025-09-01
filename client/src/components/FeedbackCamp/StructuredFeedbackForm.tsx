import React, { useState } from 'react';
import { CONFIG } from '../../config';

interface StructuredFeedbackFormProps {
  submissionId: string;
  onSubmit: (submissionId: string, feedback: StructuredFeedback) => void;
  loading?: boolean;
}

interface StructuredFeedback {
  strengths?: string; // 선택사항으로 변경
  improvements?: string; // 선택사항으로 변경
  overall: string;
}

// 피드백 가이드 템플릿
const FEEDBACK_GUIDES: Array<{
  id: string;
  text: string;
  description: string;
  category: keyof StructuredFeedback;
  fieldLabel: string; // 필드 라벨 추가
}> = [
  {
    id: 'overall_positive',
    text: '전체적으로 읽기 편하고 이해하기 쉬웠어요',
    description: '긍정적인 전체 평가',
    category: 'overall',
    fieldLabel: '전체적인 느낌',
  },
  {
    id: 'encouragement',
    text: '이 부분이 정말 인상적이었어요!',
    description: '구체적인 칭찬으로 시작',
    category: 'strengths',
    fieldLabel: '마음에 드는 부분',
  },
  {
    id: 'gentle_suggestion',
    text: '혹시 이렇게 해보시는 건 어떨까요?',
    description: '부드러운 제안 방식',
    category: 'improvements',
    fieldLabel: '더 멋진 방향',
  },
  {
    id: 'examples',
    text: '(특정 부분을 언급)이 부분에 구체적인 예시가 더해지면 좋겠어요',
    description: '추상적인 내용을 구체적으로',
    category: 'improvements',
    fieldLabel: '더 멋진 방향',
  },
  {
    id: 'opening',
    text: '첫 문장이 더 흥미로우면 독자의 시선을 끌 것 같아요',
    description: '강력한 도입부로 시작',
    category: 'improvements',
    fieldLabel: '더 멋진 방향',
  },
  {
    id: 'structure',
    text: '글의 구조가 더 명확하면 이해하기 쉬울 것 같아요',
    description: '논리적인 흐름으로 정리',
    category: 'improvements',
    fieldLabel: '더 멋진 방향',
  },
  {
    id: 'emotion',
    text: '글쓴이님의 감정이 더 잘 드러나면 좋겠어요',
    description: '진정성 있는 감정 표현',
    category: 'improvements',
    fieldLabel: '더 멋진 방향',
  },
];

export const StructuredFeedbackForm: React.FC<StructuredFeedbackFormProps> = ({
  submissionId,
  onSubmit,
  loading = false,
}) => {
  const [feedback, setFeedback] = useState<StructuredFeedback>({
    overall: '', // 필수 필드
    strengths: '', // 선택사항
    improvements: '', // 선택사항
  });
  const [showGuide, setShowGuide] = useState(false);

  const handleSubmit = () => {
    if (isValid()) {
      // 빈 값들을 undefined로 처리하여 서버에서 완전히 무시할 수 있도록 함
      const cleanedFeedback = {
        overall: feedback.overall.trim(),
        strengths: feedback.strengths?.trim() || undefined,
        improvements: feedback.improvements?.trim() || undefined,
      };
      onSubmit(submissionId, cleanedFeedback);
    }
  };

  const isValid = () => {
    return feedback.overall.length >= CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL;
  };

  const handleGuideClick = (guideText: string, category: keyof StructuredFeedback) => {
    setFeedback(prev => ({
      ...prev,
      [category]: prev[category] ? `${prev[category]}\n\n${guideText}` : guideText,
    }));
    setShowGuide(false);
  };

  return (
    <div className="mt-4 space-y-4">
      {/* 전체적인 느낌 (필수) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          전체적인 느낌 *
        </label>
        <textarea
          value={feedback.overall}
          onChange={e => setFeedback(prev => ({ ...prev, overall: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.OVERALL}
          className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
          disabled={loading}
        />
        <div className="text-sm text-gray-500 mt-1">
          {feedback.overall.length}자 / 최소 {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL}자
        </div>
      </div>

      {/* 마음에 드는 부분 (선택사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          마음에 드는 부분 (선택사항)
        </label>
        <textarea
          value={feedback.strengths || ''}
          onChange={e => setFeedback(prev => ({ ...prev, strengths: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.STRENGTHS}
          className="w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
          disabled={loading}
        />
        {feedback.strengths && CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS > 0 && (
          <div className="text-sm text-gray-500 mt-1">
            {feedback.strengths.length}자 / 최소 {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS}자
          </div>
        )}
      </div>

      {/* 더 멋진 글이 될 수 있는 방향 (선택사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          더 멋진 글이 될 수 있는 방향 (선택사항)
        </label>
        <textarea
          value={feedback.improvements || ''}
          onChange={e => setFeedback(prev => ({ ...prev, improvements: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.IMPROVEMENTS}
          className="w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
          disabled={loading}
        />
        <div className="flex justify-between items-center mt-1">
          {feedback.improvements && CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS > 0 && (
            <div className="text-sm text-gray-500">
              {feedback.improvements.length}자 / 최소{' '}
              {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS}자
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            disabled={loading}
          >
            {showGuide ? '피드백 가이드 숨기기' : '+ 피드백 가이드 보기'}
          </button>
        </div>

        {/* 피드백 가이드 */}
        {showGuide && (
          <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3 font-medium">
              💡 피드백 작성을 도와주는 가이드입니다. 클릭하면 자동으로 입력되지만, 직접 작성하시는
              것이 더 진정성 있고 의미있는 피드백이 될 거예요.
            </p>

            {/* 필드별 가이드 그룹화 */}
            <div className="space-y-4">
              {/* 전체적인 느낌 가이드 */}
              <div>
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  전체적인 느낌 (필수)
                </h4>
                <div className="space-y-2">
                  {FEEDBACK_GUIDES.filter(guide => guide.category === 'overall').map(guide => (
                    <button
                      key={guide.id}
                      onClick={() => handleGuideClick(guide.text, guide.category)}
                      className="block w-full text-left p-2 text-sm bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      disabled={loading}
                    >
                      <div className="text-gray-700 dark:text-gray-300">{guide.text}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {guide.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 마음에 드는 부분 가이드 */}
              <div>
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  마음에 드는 부분 (선택사항)
                </h4>
                <div className="space-y-2">
                  {FEEDBACK_GUIDES.filter(guide => guide.category === 'strengths').map(guide => (
                    <button
                      key={guide.id}
                      onClick={() => handleGuideClick(guide.text, guide.category)}
                      className="block w-full text-left p-2 text-sm bg-white dark:bg-gray-800 border border-green-200 dark:border-green-600 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                      disabled={loading}
                    >
                      <div className="text-gray-700 dark:text-gray-300">{guide.text}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {guide.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 더 멋진 방향 가이드 */}
              <div>
                <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>더 멋진 방향
                  (선택사항)
                </h4>
                <div className="space-y-2">
                  {FEEDBACK_GUIDES.filter(guide => guide.category === 'improvements').map(guide => (
                    <button
                      key={guide.id}
                      onClick={() => handleGuideClick(guide.text, guide.category)}
                      className="block w-full text-left p-2 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-600 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                      disabled={loading}
                    >
                      <div className="text-gray-700 dark:text-gray-300">{guide.text}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {guide.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid() || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>제출 중...</span>
            </>
          ) : (
            '피드백 제출'
          )}
        </button>
      </div>
    </div>
  );
};
