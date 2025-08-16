import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTokens } from '../hooks/useTokens';

interface CriteriaScore {
  score: number;
  feedback: string;
}

interface AIFeedbackProps {
  feedback: string;
  mode?: 'mode_300' | 'mode_1000';
  submissionId?: string;
  dilatingVersionUnlocked?: boolean;
}

interface ParsedFeedback {
  overall_score: number;
  criteria_scores: Record<string, { score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  writing_tips: string;
  improved_version?: {
    title: string;
    content: string;
  };
}

// 1000자 모드용 상세 평가 기준
const CRITERIA_LABELS_1000: Record<string, string> = {
  content: '내용',
  originality: '독창성',
  consistency: '일관성',
  insight: '통찰력',
  development: '전개',
  expression: '표현',
  structure: '구조',
  technical: '기술',
};

// 300자 모드용 간소화된 평가 기준
const CRITERIA_LABELS_300: Record<string, string> = {
  content: '내용',
  expression: '표현',
  structure: '구조',
  impact: '임팩트',
};

const AIFeedback: React.FC<AIFeedbackProps> = ({
  feedback,
  mode = 'mode_1000',
  submissionId,
  dilatingVersionUnlocked = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [parsedFeedback, setParsedFeedback] = useState<ParsedFeedback | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unlockedVersion, setUnlockedVersion] = useState<ParsedFeedback['improved_version'] | null>(
    null
  );

  const { user } = useUser();
  const { tokens, refetchTokens } = useTokens();

  // 모드에 따른 평가 기준 선택
  const criteriaLabels = mode === 'mode_300' ? CRITERIA_LABELS_300 : CRITERIA_LABELS_1000;

  // 딜라이팅AI 버전 구매 함수
  const unlockDilatingVersion = async () => {
    if (!user || !submissionId) return;

    setIsUnlocking(true);
    try {
      // 인증 토큰 가져오기
      const token = await user.getIdToken();
      if (!token) {
        alert('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        setIsUnlocking(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback/unlock-dilating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          submissionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUnlockedVersion(parsedFeedback?.improved_version || null);
        await refetchTokens(); // 토큰 정보 새로고침
        setShowConfirmModal(false); // 모달 닫기
      } else {
        const errorData = await response.json();
        alert(errorData.message || '딜라이팅AI 버전 구매에 실패했습니다.');
      }
    } catch (error) {
      console.error('딜라이팅AI 버전 구매 오류:', error);
      alert('딜라이팅AI 버전 구매 중 오류가 발생했습니다.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // 확인 모달 표시
  const handleUnlockClick = () => {
    setShowConfirmModal(true);
  };

  useEffect(() => {
    try {
      let parsed: any;

      // 1. 파싱 시도
      if (typeof feedback === 'string') {
        try {
          parsed = JSON.parse(feedback);
        } catch (parseError) {
          throw new Error('피드백 파싱에 실패했습니다.');
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
        improved_version: undefined,
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

      // improved_version 처리
      if (parsed.improved_version && typeof parsed.improved_version === 'object') {
        validated.improved_version = {
          title: String(parsed.improved_version.title || ''),
          content: String(parsed.improved_version.content || ''),
        };
      }

      setParsedFeedback(validated);
      setError(null);
    } catch (err) {
      console.error('AI 피드백 처리 중 오류:', err);
      setError('피드백을 표시할 수 없습니다.');
      setParsedFeedback(null);
    }
  }, [feedback]);

  if (error || !parsedFeedback) {
    return (
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p className="mb-2">{error || '피드백을 불러오는 중...'}</p>
          {error && (
            <p className="text-sm text-gray-500 dark:text-gray-300 break-all">
              {typeof feedback === 'string' ? feedback : JSON.stringify(feedback)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 딜라이팅AI 버전 표시 여부 결정
  const shouldShowDilatingVersion =
    mode === 'mode_1000' || unlockedVersion || dilatingVersionUnlocked;
  const hasImprovedVersion =
    parsedFeedback.improved_version && parsedFeedback.improved_version.content;

  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-6 space-y-6">
      {/* 전체 점수 */}
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">
          {parsedFeedback.overall_score}점
        </div>
        <div className="text-gray-500 dark:text-gray-300">전체 평가 점수</div>
      </div>

      {/* 평가 기준별 점수와 피드백 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(parsedFeedback.criteria_scores).map(([criterion, data]) => (
          <div
            key={criterion}
            className="border border-gray-100 dark:border-gray-300 rounded-lg p-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{criteriaLabels[criterion] || criterion}</h3>
              <span className="text-blue-600 dark:text-blue-300 font-bold">{data.score}점</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{data.feedback}</p>
          </div>
        ))}
      </div>

      {/* 장점 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-green-600 dark:text-green-300">장점</h3>
        <ul className="list-disc list-inside space-y-1">
          {parsedFeedback.strengths.map((strength, index) => (
            <li key={index} className="text-gray-600 dark:text-gray-300">
              {strength}
            </li>
          ))}
        </ul>
      </div>

      {/* 개선점 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-amber-600 dark:text-amber-300">개선점</h3>
        <ul className="list-disc list-inside space-y-1">
          {parsedFeedback.improvements.map((improvement, index) => (
            <li key={index} className="text-gray-600 dark:text-gray-300">
              {improvement}
            </li>
          ))}
        </ul>
      </div>

      {/* 글쓰기 팁 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-purple-600 dark:text-purple-300">글쓰기 팁</h3>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {parsedFeedback.writing_tips}
          </p>
        </div>
      </div>

      {/* 딜라이팅AI 버전 */}
      {hasImprovedVersion && (
        <div className="space-y-2">
          {shouldShowDilatingVersion ? (
            // 이미 표시 가능한 상태 (1000자 모드이거나 구매 완료)
            <div>
              <h3 className="font-semibold text-indigo-600 dark:text-indigo-300">
                ✨ 딜라이팅AI 버전
              </h3>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mt-2">
                {parsedFeedback.improved_version!.title && (
                  <div className="mb-3">
                    <h4 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                      개선된 제목:
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      {parsedFeedback.improved_version!.title}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                    개선된 내용:
                  </h4>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-indigo-200 dark:border-indigo-600">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                      {parsedFeedback.improved_version!.content}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400">
                  💡 위 버전은 AI가 지적한 개선점을 반영하여 재작성한 예시입니다. 원본의 핵심 내용과
                  경험은 그대로 유지하되, 표현력과 구조만 개선하고 독자들이 공감할 수 있는 킥이 되는
                  문장을 추가했습니다.
                </div>
              </div>
            </div>
          ) : (
            // 300자 모드에서 구매 필요
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-indigo-600 dark:text-indigo-300">
                    ✨ 딜라이팅AI 버전
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    황금열쇠 1개로 AI가 개선한 버전을 확인하세요
                  </p>
                </div>
                <button
                  onClick={handleUnlockClick}
                  disabled={isUnlocking || !tokens || tokens.goldenKeys < 1}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isUnlocking || !tokens || tokens.goldenKeys < 1
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isUnlocking ? '구매 중...' : `황금열쇠 ${tokens?.goldenKeys || 0}개`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              딜라이팅AI 버전 구매
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              황금열쇠 1개로 ✨ 딜라이팅AI 버전을 구매하시겠습니까?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={unlockDilatingVersion}
                disabled={isUnlocking}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isUnlocking
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isUnlocking ? '구매 중...' : '구매하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFeedback;
