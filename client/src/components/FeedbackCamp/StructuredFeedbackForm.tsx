import React, { useState } from 'react';
import { CONFIG } from '../../config';

interface StructuredFeedbackFormProps {
  submissionId: string;
  onSubmit: (submissionId: string, feedback: StructuredFeedback) => void;
  loading?: boolean;
}

interface StructuredFeedback {
  strengths: string;
  improvements: string;
  overall: string;
}

// 피드백 가이드 템플릿
const FEEDBACK_GUIDES = [
  {
    id: 'conciseness',
    text: '문장을 더 간결하게 다듬으면 좋겠어요',
    description: '긴 문장을 짧고 명확하게',
  },
  {
    id: 'examples',
    text: '이 부분에 구체적인 예시가 더해지면 좋겠어요',
    description: '추상적인 내용을 구체적으로',
  },
  {
    id: 'opening',
    text: '첫 문장이 더 흥미로우면 독자의 시선을 끌 것 같아요',
    description: '강력한 도입부로 시작',
  },
  {
    id: 'structure',
    text: '글의 구조가 더 명확하면 이해하기 쉬울 것 같아요',
    description: '논리적인 흐름으로 정리',
  },
  {
    id: 'emotion',
    text: '글쓴이님의 감정이 더 잘 드러나면 좋겠어요',
    description: '진정성 있는 감정 표현',
  },
];

export const StructuredFeedbackForm: React.FC<StructuredFeedbackFormProps> = ({
  submissionId,
  onSubmit,
  loading = false,
}) => {
  const [feedback, setFeedback] = useState<StructuredFeedback>({
    strengths: '',
    improvements: '',
    overall: '',
  });
  const [showGuide, setShowGuide] = useState(false);

  const handleSubmit = () => {
    if (isValid()) {
      onSubmit(submissionId, feedback);
    }
  };

  const isValid = () => {
    return (
      feedback.strengths.length >= CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS &&
      feedback.improvements.length >= CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS
    );
  };

  const handleGuideClick = (guideText: string) => {
    setFeedback(prev => ({
      ...prev,
      improvements: prev.improvements ? `${prev.improvements}\n\n${guideText}` : guideText,
    }));
    setShowGuide(false);
  };

  return (
    <div className="mt-4 space-y-4">
      {/* 좋았던 점 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          좋았던 점 *
        </label>
        <textarea
          value={feedback.strengths}
          onChange={e => setFeedback(prev => ({ ...prev, strengths: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.STRENGTHS}
          className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
          disabled={loading}
        />
        <div className="text-sm text-gray-500 mt-1">
          {feedback.strengths.length}자 / 최소 {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS}자
        </div>
      </div>

      {/* 더 좋은 글을 위한 제안 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          더 좋은 글을 위한 제안 *
        </label>
        <textarea
          value={feedback.improvements}
          onChange={e => setFeedback(prev => ({ ...prev, improvements: e.target.value }))}
          placeholder="이 글이 더 좋아질 수 있는 아이디어나 가능성을 자유롭게 제안해주세요."
          className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
          disabled={loading}
        />
        <div className="flex justify-between items-center mt-1">
          <div className="text-sm text-gray-500">
            {feedback.improvements.length}자 / 최소{' '}
            {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS}자
          </div>
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
              💡 건설적인 제안을 위한 가이드입니다. 클릭하면 자동으로 입력됩니다.
            </p>
            <div className="space-y-2">
              {FEEDBACK_GUIDES.map(guide => (
                <button
                  key={guide.id}
                  onClick={() => handleGuideClick(guide.text)}
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
        )}
      </div>

      {/* 전체적인 느낌 (선택사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          전체적인 느낌 (선택사항)
        </label>
        <textarea
          value={feedback.overall}
          onChange={e => setFeedback(prev => ({ ...prev, overall: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.OVERALL}
          className="w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
          disabled={loading}
        />
        {feedback.overall && (
          <div className="text-sm text-gray-500 mt-1">
            {feedback.overall.length}자 / 최소 {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL}자
          </div>
        )}
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid() || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '제출 중...' : '피드백 제출'}
        </button>
      </div>
    </div>
  );
};
