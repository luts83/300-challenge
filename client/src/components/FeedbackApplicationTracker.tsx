import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

interface FeedbackApplicationData {
  hasData: boolean;
  data: {
    summary: {
      totalWritings: number;
      totalFeedbacks: number;
      appliedFeedbacks: number;
      applicationRate: number;
      averageApplicationScore: number;
    };
    feedbackPairs: Array<{
      writing: any;
      feedbacks: any[];
      applicationAnalysis: {
        isApplied: boolean;
        applicationScore: number;
        appliedFeedbacks: any[];
        missedFeedbacks: any[];
        improvementIndicators: any[];
      };
    }>;
    improvementAreas: Array<{
      area: string;
      count: number;
      averageScore: number;
    }>;
    repeatedIssues: Array<{
      issue: string;
      count: number;
      feedbacks: any[];
    }>;
    applicationTrend: Array<{
      index: number;
      applicationScore: number;
      isApplied: boolean;
      date: string;
    }>;
  } | null;
  period: string;
  mode: string;
}

const FeedbackApplicationTracker: React.FC = () => {
  const { user, getIdToken } = useUser();
  const [applicationData, setApplicationData] = useState<FeedbackApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'mode_300' | 'mode_1000'>('mode_300');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchApplicationData();
    }
  }, [user?.uid, selectedMode, selectedPeriod]);

  const fetchApplicationData = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const requestUrl = `/api/feedback-tracking/application/${user.uid}?mode=${selectedMode}&period=${selectedPeriod}`;

      console.log(
        `🔍 피드백 적용 데이터 조회 시작: userId=${user.uid}, mode=${selectedMode}, period=${selectedPeriod}`
      );
      console.log(`🔍 요청 URL: ${requestUrl}`);

      const response = await fetch(requestUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      console.log('📊 피드백 적용 데이터 응답:', result);
      console.log('🔍 응답 상태:', response.status);
      console.log('🔍 응답 URL:', response.url);
      console.log('🔍 hasData 필드:', result.hasData);
      console.log('🔍 data 필드:', result.data);

      if (result.debug) {
        console.log('🔍 디버그 정보:', result.debug);
      }

      setApplicationData(result);
    } catch (error) {
      console.error('피드백 적용 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDebugData = async () => {
    if (!user?.uid) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      console.log(`🔍 디버깅 데이터 조회 시작: userId=${user.uid}`);

      const response = await fetch(`/api/feedback-tracking/debug/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      console.log('🔍 디버깅 데이터 응답:', result);
      setDebugData(result.debug);
      setShowDebug(true);
    } catch (error) {
      console.error('디버깅 데이터 조회 실패:', error);
    }
  };

  const getAreaName = (area: string) => {
    const areaNames: Record<string, string> = {
      structure: '구조',
      expression: '표현',
      content: '내용',
      ending: '끝맺음',
    };
    return areaNames[area] || area;
  };

  const getIssueName = (issue: string) => {
    const issueNames: Record<string, string> = {
      '구조 및 전개': '구조 및 전개',
      표현력: '표현력',
      '내용 및 주제': '내용 및 주제',
      끝맺음: '끝맺음',
      기타: '기타',
    };
    return issueNames[issue] || issue;
  };

  const getCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      structure: '구조',
      expression: '표현',
      content: '내용',
      emotion: '감정',
      technical: '기술',
      general: '일반',
    };
    return categoryNames[category] || category;
  };

  // 텍스트 하이라이트 함수
  const highlightText = (text: string) => {
    if (!text) return text;

    // 1. 따옴표로 감싸진 부분을 볼드 처리
    let highlighted = text.replace(/'([^']+)'/g, '<strong class="font-bold">$1</strong>');

    // 2. "예를 들어", "구체적으로", "특히" 등의 강조 표현을 이탤릭 처리
    highlighted = highlighted.replace(
      /(예를 들어|구체적으로|특히|즉|다시 말해|요약하면)/g,
      '<em class="italic text-blue-600 dark:text-blue-400">$1</em>'
    );

    // 3. 점수나 숫자를 하이라이트
    highlighted = highlighted.replace(
      /(\d+점|\d+%|\d+번|\d+개)/g,
      '<span class="font-semibold text-purple-600 dark:text-purple-400">$1</span>'
    );

    // 4. 중요한 키워드들을 밑줄 처리
    const keywords = [
      '구조',
      '표현',
      '내용',
      '감정',
      '문법',
      '맞춤법',
      '어휘',
      '문장',
      '문단',
      '흐름',
      '주제',
      '이야기',
      '묘사',
      '생생',
      '현장감',
      '신뢰도',
      '완결성',
      '진솔한',
      '깊이',
      '성찰',
    ];
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="underline decoration-2 decoration-orange-400">$1</span>'
      );
    });

    // 5. 긍정적 표현을 초록색으로 강조
    const positiveWords = [
      '좋은',
      '훌륭한',
      '탁월한',
      '뛰어난',
      '완벽한',
      '성공적인',
      '효과적인',
      '인상적인',
      '매력적인',
      '생생한',
      '깊이 있는',
      '진솔한',
    ];
    positiveWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="font-medium text-green-600 dark:text-green-400">$1</span>'
      );
    });

    // 6. 개선이 필요한 표현을 주황색으로 강조
    const improvementWords = [
      '개선',
      '보완',
      '향상',
      '발전',
      '보강',
      '강화',
      '필요',
      '부족',
      '약한',
      '미흡한',
    ];
    improvementWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="font-medium text-orange-600 dark:text-orange-400">$1</span>'
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // 문자열 버전 하이라이트 함수 (HTML 반환)
  const applyTextHighlighting = (text: string) => {
    if (!text) return text;

    // 1. 따옴표로 감싸진 부분을 볼드 처리
    let highlighted = text.replace(/'([^']+)'/g, '<strong class="font-bold">$1</strong>');

    // 2. "예를 들어", "구체적으로", "특히" 등의 강조 표현을 이탤릭 처리
    highlighted = highlighted.replace(
      /(예를 들어|구체적으로|특히|즉|다시 말해|요약하면)/g,
      '<em class="italic text-blue-600 dark:text-blue-400">$1</em>'
    );

    // 3. 점수나 숫자를 하이라이트
    highlighted = highlighted.replace(
      /(\d+점|\d+%|\d+번|\d+개)/g,
      '<span class="font-semibold text-purple-600 dark:text-purple-400">$1</span>'
    );

    // 4. 중요한 키워드들을 밑줄 처리
    const keywords = [
      '구조',
      '표현',
      '내용',
      '감정',
      '문법',
      '맞춤법',
      '어휘',
      '문장',
      '문단',
      '흐름',
      '주제',
      '이야기',
      '묘사',
      '생생',
      '현장감',
      '신뢰도',
      '완결성',
      '진솔한',
      '깊이',
      '성찰',
    ];
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="underline decoration-2 decoration-orange-400">$1</span>'
      );
    });

    // 5. 긍정적 표현을 초록색으로 강조
    const positiveWords = [
      '좋은',
      '훌륭한',
      '탁월한',
      '뛰어난',
      '완벽한',
      '성공적인',
      '효과적인',
      '인상적인',
      '매력적인',
      '생생한',
      '깊이 있는',
      '진솔한',
    ];
    positiveWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="font-medium text-green-600 dark:text-green-400">$1</span>'
      );
    });

    // 6. 개선이 필요한 표현을 주황색으로 강조
    const improvementWords = [
      '개선',
      '보완',
      '향상',
      '발전',
      '보강',
      '강화',
      '필요',
      '부족',
      '약한',
      '미흡한',
    ];
    improvementWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="font-medium text-orange-600 dark:text-orange-400">$1</span>'
      );
    });

    return highlighted;
  };

  // 간단한 팁 포맷팅 함수
  const formatSimpleTip = (content: string) => {
    if (!content) return content;

    let formatted = content;

    // Before/After 구조를 간단하게 처리
    const beforeIndex = formatted.indexOf('**Before:**');
    const afterIndex = formatted.indexOf('**After:**');

    if (beforeIndex !== -1 && afterIndex !== -1 && afterIndex > beforeIndex) {
      const beforeContent = formatted.substring(beforeIndex + 11, afterIndex).trim();
      const afterContent = formatted.substring(afterIndex + 11).trim();

      // Before/After 부분을 한 줄로 표시
      const beforeAfterBlock = `
        <div class="space-y-2 my-3">
          <div class="text-gray-700 dark:text-gray-300">
            <span class="font-semibold text-gray-800 dark:text-gray-200">Before:</span> ${applyTextHighlighting(beforeContent)}
          </div>
          <div class="text-gray-700 dark:text-gray-300">
            <span class="font-semibold text-gray-800 dark:text-gray-200">After:</span> ${applyTextHighlighting(afterContent)}
          </div>
        </div>
      `;

      // Before/After 부분을 교체
      formatted = formatted.substring(0, beforeIndex) + beforeAfterBlock;
    }

    // 문장별 분리 제거 - 원래 텍스트 그대로 유지

    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          피드백 적용 데이터를 불러오는 중...
        </span>
      </div>
    );
  }

  if (!applicationData?.hasData || !applicationData.data) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🔄</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          {applicationData?.message || '아직 피드백 적용 데이터가 없어요'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {applicationData?.message?.includes('AI 피드백')
            ? 'AI 피드백이 있는 글을 작성하시면 적용 여부를 확인할 수 있습니다.'
            : '피드백을 받고 글을 작성하시면 적용 여부를 확인할 수 있습니다.'}
        </p>

        {/* 디버그 정보 표시 */}
        {applicationData?.debug && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🔍 디버그 정보
            </h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>• 사용자 ID: {applicationData.debug.userId}</div>
              <div>• 모드: {applicationData.debug.mode}</div>
              <div>• 기간: {applicationData.debug.period}</div>
              <div>• 전체 글 수: {applicationData.debug.originalHistoryLength || 0}</div>
              <div>• 필터링된 글 수: {applicationData.debug.filteredHistoryLength || 0}</div>
              <div>• 피드백 수: {applicationData.debug.feedbacksLength || 0}</div>
              {applicationData.debug.startDate && (
                <div>
                  • 시작 날짜:{' '}
                  {new Date(applicationData.debug.startDate).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 해결 방법 안내 */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            💡 해결 방법
          </h4>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            {applicationData?.message?.includes('AI 피드백') ? (
              <>
                <div>• 글을 작성하고 AI 피드백을 받아보세요</div>
                <div>• AI 피드백이 제대로 생성되었는지 확인해보세요</div>
                <div>• 다른 기간(주/월/분기)을 선택해보세요</div>
                <div>• 다른 모드(300자/1000자)를 선택해보세요</div>
              </>
            ) : applicationData?.message?.includes('기간') ? (
              <>
                <div>• 더 긴 기간(분기)을 선택해보세요</div>
                <div>• 다른 모드(300자/1000자)를 선택해보세요</div>
                <div>• 글을 더 작성해보세요</div>
              </>
            ) : (
              <>
                <div>• 글을 작성하고 AI 피드백을 받아보세요</div>
                <div>• 다른 기간(주/월/분기)을 선택해보세요</div>
                <div>• 다른 모드(300자/1000자)를 선택해보세요</div>
              </>
            )}
          </div>
        </div>

        {/* 디버깅 버튼 */}
        <div className="mt-4">
          <button
            onClick={fetchDebugData}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            🔍 데이터 상태 확인
          </button>
        </div>

        {/* 디버깅 정보 표시 */}
        {showDebug && debugData && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-left">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🔍 상세 디버깅 정보
            </h4>
            <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <div>• 사용자 ID: {debugData.userId}</div>
              <div>• 프로필 존재: {debugData.profileExists ? '✅' : '❌'}</div>
              {debugData.profileData && (
                <>
                  <div>• 300자 모드 글 수: {debugData.profileData.writingHistory.mode_300}</div>
                  <div>• 1000자 모드 글 수: {debugData.profileData.writingHistory.mode_1000}</div>
                  <div>
                    • 프로필 생성일:{' '}
                    {new Date(debugData.profileData.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                  <div>
                    • 프로필 수정일:{' '}
                    {new Date(debugData.profileData.updatedAt).toLocaleDateString('ko-KR')}
                  </div>
                </>
              )}
              <div>• 전체 제출물 수: {debugData.submissionsCount}</div>
              <div>
                • AI 피드백이 있는 글 수:{' '}
                {debugData.submissionsWithFeedback.filter((s: any) => s.hasAiFeedback).length}
              </div>
            </div>

            {/* 최근 제출물 목록 */}
            {debugData.submissionsWithFeedback.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  최근 제출물:
                </h5>
                <div className="space-y-1">
                  {debugData.submissionsWithFeedback.slice(0, 5).map((sub: any, index: number) => (
                    <div key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                      • {sub.title} ({sub.mode}) - {sub.hasAiFeedback ? '✅' : '❌'} 피드백
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const { data } = applicationData;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            🔄 피드백 적용 추적
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {selectedMode === 'mode_300' ? '300자' : '1000자'} 모드 피드백 적용 현황
          </p>
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <select
            value={selectedMode}
            onChange={e => setSelectedMode(e.target.value as 'mode_300' | 'mode_1000')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          >
            <option value="mode_300">300자 모드</option>
            <option value="mode_1000">1000자 모드</option>
          </select>

          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          >
            <option value="week">최근 1주</option>
            <option value="month">최근 1개월</option>
            <option value="quarter">최근 3개월</option>
          </select>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">총 피드백</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {data.summary.totalFeedbacks}개
              </p>
            </div>
            <div className="text-3xl">💬</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">적용된 피드백</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {data.summary.appliedFeedbacks}개
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">적용률</p>
              <p
                className={`text-2xl font-bold ${
                  (data.summary.applicationRate || 0) >= 70
                    ? 'text-green-600 dark:text-green-400'
                    : (data.summary.applicationRate || 0) >= 50
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {Math.round(data.summary.applicationRate || 0)}%
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">평균 적용 점수</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {Math.round((data.summary.averageApplicationScore || 0) * 100)}점
              </p>
            </div>
            <div className="relative group">
              <div className="text-3xl cursor-help">🎯</div>
              <div className="absolute bottom-full right-0 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className="font-semibold mb-2">📊 평균 적용 점수 계산 방식</div>
                <div className="space-y-1 text-xs">
                  <div>
                    • <span className="font-medium">구체적 매칭</span>: Before/After 패턴, 문장
                    패턴, 어휘/표현 개선
                  </div>
                  <div>
                    • <span className="font-medium">텍스트 유사도</span>: 제안된 패턴의 실제 사용
                    증가
                  </div>
                  <div>
                    • <span className="font-medium">구조적 개선</span>: 문장/문단 구조의 구체적 변화
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-600 dark:border-gray-400">
                    <span className="font-medium">점수 기반 판단 제거, 구체적 증거 기반 분석</span>
                  </div>
                </div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 피드백 적용 현황 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          📝 피드백 적용 현황
        </h3>
        <div className="space-y-4">
          {data.applicationAnalysis?.map((analysis, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                analysis.applicationScore > 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {analysis.writingTitle || '제목 없음'}
                </h4>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      analysis.applicationScore > 0
                        ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                    }`}
                  >
                    {analysis.applicationScore > 0 ? '적용됨' : '미적용'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(analysis.applicationScore)}점
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {new Date(analysis.writingDate).toLocaleDateString('ko-KR')}
              </div>

              {/* 피드백 요약 */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {analysis.applicationScore > 0
                  ? `피드백이 ${Math.round(analysis.applicationScore)}% 적용되었습니다.`
                  : '피드백이 적용되지 않았습니다.'}
              </div>

              {/* 적용된 피드백 상세 정보 */}
              {analysis.appliedSuggestions && analysis.appliedSuggestions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                    ✅ 적용된 피드백:
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {analysis.appliedSuggestions.slice(0, 2).map((suggestion, idx) => (
                      <div key={idx} className="mb-1">
                        •{' '}
                        {typeof suggestion === 'string'
                          ? highlightText(suggestion)
                          : highlightText(
                              suggestion.description || suggestion.type || '피드백 정보'
                            )}
                      </div>
                    ))}
                    {analysis.appliedSuggestions.length > 2 && (
                      <div className="text-gray-500">
                        + {analysis.appliedSuggestions.length - 2}개 더...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 미적용 피드백 상세 정보 */}
              {analysis.ignoredSuggestions && analysis.ignoredSuggestions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                    ❌ 미적용 피드백:
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {analysis.ignoredSuggestions.slice(0, 2).map((suggestion, idx) => (
                      <div key={idx} className="mb-1">
                        •{' '}
                        {typeof suggestion === 'string'
                          ? highlightText(suggestion)
                          : highlightText(
                              suggestion.description || suggestion.type || '피드백 정보'
                            )}
                      </div>
                    ))}
                    {analysis.ignoredSuggestions.length > 2 && (
                      <div className="text-gray-500">
                        + {analysis.ignoredSuggestions.length - 2}개 더...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 측정 방식 설명 */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="font-medium mb-1">📊 측정 방식:</div>
                <div className="space-y-1">
                  <div>• 구체적 매칭: 피드백 내용과 실제 적용 부분을 정확히 분석</div>
                  <div>• Before/After 패턴: 제안된 개선사항이 실제로 반영되었는지 확인</div>
                  <div>• 텍스트 유사도: 제안된 표현이나 패턴의 사용 증가 확인</div>
                  <div>• 구조적 개선: 문장/문단 구조의 구체적 변화 측정</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 개선 영역 분석 */}
      {data.improvementAreas?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🚀 개선된 영역
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.improvementAreas?.map((area, index) => (
              <div
                key={index}
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700"
              >
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  {getAreaName(area.area)}
                </h4>
                <p className="text-green-700 dark:text-green-300">{area.count}번 개선</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  평균 점수: {Math.round(area.averageScore * 100)}점
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 평가 기반 인사이트 */}
      {data.insights && (
        <div className="space-y-6">
          {/* 주요 강점 */}
          {data.insights.strengths && data.insights.strengths.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                💪 주요 강점
              </h3>
              <div className="space-y-4">
                {data.insights.strengths.slice(0, 3).map((strength, index) => (
                  <div
                    key={index}
                    className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                    onClick={() => {
                      // 해당 글의 submissionId로 내 글 목록 페이지 이동
                      if (strength.submissionId) {
                        window.open(`/my/${strength.submissionId}`, '_blank');
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800 dark:text-green-200">
                        {highlightText(getCategoryName(strength.category))}
                      </h4>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {highlightText(`${strength.frequency}번 언급`)}
                      </span>
                    </div>

                    {/* 강점 내용 전체 표시 */}
                    <div className="mb-3">
                      <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                        {highlightText(strength.content)}
                      </p>
                    </div>

                    {/* 해당 글 정보 */}
                    <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400">
                      <span>📝 {strength.writingTitle || '글 제목 없음'}</span>
                      <span>
                        {new Date(strength.writingDate).toLocaleDateString('ko-KR')} •{' '}
                        {strength.score}점
                      </span>
                    </div>

                    {/* 클릭 안내 */}
                    <div className="mt-2 text-xs text-green-500 dark:text-green-400 opacity-75">
                      클릭하여 해당 글 보기 →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 개선이 필요한 영역 */}
          {data.insights.improvementAreas && data.insights.improvementAreas.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                🔧 개선이 필요한 영역
              </h3>
              <div className="space-y-4">
                {data.insights.improvementAreas.slice(0, 3).map((area, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-4 border cursor-pointer hover:opacity-80 transition-opacity ${
                      area.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                        : area.priority === 'medium'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    }`}
                    onClick={() => {
                      // 해당 글의 submissionId로 내 글 목록 페이지 이동
                      if (area.submissionId) {
                        window.open(`/my/${area.submissionId}`, '_blank');
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className={`font-semibold ${
                          area.priority === 'high'
                            ? 'text-red-800 dark:text-red-200'
                            : area.priority === 'medium'
                              ? 'text-yellow-800 dark:text-yellow-200'
                              : 'text-blue-800 dark:text-blue-200'
                        }`}
                      >
                        {highlightText(getCategoryName(area.category))}
                        {area.priority === 'high' && ' (높은 우선순위)'}
                      </h4>
                      <span
                        className={`text-sm ${
                          area.priority === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : area.priority === 'medium'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {highlightText(`${area.count}번 지적`)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {area.examples.map((example, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            area.priority === 'high'
                              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700'
                              : area.priority === 'medium'
                                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-700'
                                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700'
                          }`}
                        >
                          <p
                            className={`text-sm leading-relaxed ${
                              area.priority === 'high'
                                ? 'text-red-700 dark:text-red-300'
                                : area.priority === 'medium'
                                  ? 'text-yellow-700 dark:text-yellow-300'
                                  : 'text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {highlightText(typeof example === 'string' ? example : example.content)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* 해당 글 정보 */}
                    <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-600 dark:text-gray-400">
                        📝 {area.writingTitle || '글 제목 없음'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(area.writingDate).toLocaleDateString('ko-KR')} • {area.score}점
                      </span>
                    </div>

                    {/* 클릭 안내 */}
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 opacity-75">
                      클릭하여 해당 글 보기 →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최근 글쓰기 팁 */}
          {data.insights.writingTips && data.insights.writingTips.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                💡 최근 글쓰기 팁
              </h3>
              <div className="space-y-3">
                {data.insights.writingTips.map((tip, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                    onClick={() => {
                      // 해당 글의 submissionId로 내 글 목록 페이지 이동
                      if (tip.submissionId) {
                        window.open(`/my/${tip.submissionId}`, '_blank');
                      }
                    }}
                  >
                    <div className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                      {formatSimpleTip(tip.content)}
                    </div>

                    {/* 해당 글 정보 */}
                    <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-blue-200 dark:border-blue-600">
                      <span className="text-blue-600 dark:text-blue-400">
                        📝 {tip.writingTitle || '글 제목 없음'}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {new Date(tip.writingDate).toLocaleDateString('ko-KR')} •{' '}
                        {highlightText(`${tip.score}점`)}
                      </span>
                    </div>

                    {/* 클릭 안내 */}
                    <div className="mt-2 text-xs text-blue-500 dark:text-blue-400 opacity-75">
                      클릭하여 해당 글 보기 →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 적용 트렌드 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            📈 피드백 적용 트렌드
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            최근 {data.applicationTrend?.length || 0}개 글 기준
          </div>
        </div>

        {data.applicationTrend && data.applicationTrend.length > 0 ? (
          <div className="space-y-3">
            {/* 트렌드 요약 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  📊 적용률:{' '}
                  {Math.round(
                    (data.applicationTrend.filter(t => t.isApplied).length /
                      data.applicationTrend.length) *
                      100
                  )}
                  %
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  평균:{' '}
                  {Math.round(
                    (data.applicationTrend.reduce((sum, t) => sum + t.applicationScore, 0) /
                      data.applicationTrend.length) *
                      100
                  )}
                  점
                </span>
              </div>
            </div>

            {/* 개별 글 트렌드 */}
            {data.applicationTrend.map((trend, index) => {
              const normalizedScore = Math.min(trend.applicationScore, 1); // 최대 100%로 제한
              const scorePercentage = Math.round(normalizedScore * 100);

              return (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {/* 글 기본 정보 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                          "{trend.writingTitle || '제목 없음'}"
                        </h4>
                        {trend.isApplied ? (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                            ✅ 적용됨
                          </span>
                        ) : trend.hasFeedback ? (
                          <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                            ❌ 미적용
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                            📝 피드백 없음
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{new Date(trend.date).toLocaleDateString('ko-KR')}</span>
                        <span>•</span>
                        <span>{trend.writingScore}점</span>
                        <span>•</span>
                        <span
                          className={`font-medium ${trend.isApplied ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          적용점수: {scorePercentage}점
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 구체적인 피드백 내용 */}
                  {trend.hasFeedback && (
                    <div className="space-y-2">
                      {/* 적용된 피드백 */}
                      {trend.appliedSuggestions && trend.appliedSuggestions.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                            ✅ 적용한 피드백 ({trend.appliedSuggestions.length}개)
                          </div>
                          <div className="space-y-1">
                            {trend.appliedSuggestions.slice(0, 2).map((suggestion, idx) => (
                              <div key={idx} className="text-xs text-green-600 dark:text-green-400">
                                • {suggestion.description}
                              </div>
                            ))}
                            {trend.appliedSuggestions.length > 2 && (
                              <div className="text-xs text-green-500 dark:text-green-400">
                                + {trend.appliedSuggestions.length - 2}개 더...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 미적용 피드백 */}
                      {trend.ignoredSuggestions && trend.ignoredSuggestions.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                          <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                            ❌ 적용하지 않은 피드백 ({trend.ignoredSuggestions.length}개)
                          </div>
                          <div className="space-y-1">
                            {trend.ignoredSuggestions.slice(0, 2).map((suggestion, idx) => (
                              <div key={idx} className="text-xs text-red-600 dark:text-red-400">
                                • {suggestion.description}
                              </div>
                            ))}
                            {trend.ignoredSuggestions.length > 2 && (
                              <div className="text-xs text-red-500 dark:text-red-400">
                                + {trend.ignoredSuggestions.length - 2}개 더...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 피드백이 없는 경우 */}
                  {!trend.hasFeedback && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        📝 이 글에는 아직 피드백이 없습니다.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 구체적인 인사이트 제공 */}
            <div className="mt-4 space-y-3">
              {/* 전체 트렌드 분석 */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <div className="font-medium mb-2">📊 전체 트렌드 분석</div>
                  {(() => {
                    const appliedCount = data.applicationTrend.filter(t => t.isApplied).length;
                    const totalCount = data.applicationTrend.length;
                    const appliedRate = appliedCount / totalCount;
                    const totalAppliedSuggestions = data.applicationTrend.reduce(
                      (sum, t) => sum + (t.appliedSuggestions?.length || 0),
                      0
                    );
                    const totalIgnoredSuggestions = data.applicationTrend.reduce(
                      (sum, t) => sum + (t.ignoredSuggestions?.length || 0),
                      0
                    );

                    return (
                      <div className="space-y-1 text-xs">
                        <div>
                          • <span className="font-medium">적용률</span>:{' '}
                          {Math.round(appliedRate * 100)}% ({appliedCount}/{totalCount}개 글)
                        </div>
                        <div>
                          • <span className="font-medium">적용한 피드백</span>:{' '}
                          {totalAppliedSuggestions}개
                        </div>
                        <div>
                          • <span className="font-medium">미적용 피드백</span>:{' '}
                          {totalIgnoredSuggestions}개
                        </div>
                        {appliedRate >= 0.7 && (
                          <div className="mt-2 text-green-600 dark:text-green-400 font-medium">
                            🎉 피드백을 매우 잘 적용하고 있습니다!
                          </div>
                        )}
                        {appliedRate >= 0.4 && appliedRate < 0.7 && (
                          <div className="mt-2 text-yellow-600 dark:text-yellow-400 font-medium">
                            📈 피드백 적용이 점진적으로 개선되고 있습니다.
                          </div>
                        )}
                        {appliedRate < 0.4 && (
                          <div className="mt-2 text-red-600 dark:text-red-400 font-medium">
                            🔍 피드백 적용률이 낮습니다. 더 자세히 읽어보세요.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 개선 제안 */}
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-sm text-purple-800 dark:text-purple-300">
                  <div className="font-medium mb-2">💡 개선 제안</div>
                  <div className="text-xs space-y-1">
                    {(() => {
                      const recentTrends = data.applicationTrend.slice(-3);
                      const recentAppliedCount = recentTrends.filter(t => t.isApplied).length;

                      if (recentAppliedCount === 0) {
                        return (
                          <div>
                            <div>• 최근 3개 글에서 피드백을 전혀 적용하지 않았습니다.</div>
                            <div>• 다음 글을 작성할 때 이전 피드백을 다시 읽어보세요.</div>
                          </div>
                        );
                      } else if (recentAppliedCount === 1) {
                        return (
                          <div>
                            <div>• 최근 3개 글 중 1개만 피드백을 적용했습니다.</div>
                            <div>• 피드백을 더 꾸준히 적용해보세요.</div>
                          </div>
                        );
                      } else if (recentAppliedCount === 2) {
                        return (
                          <div>
                            <div>• 최근 3개 글 중 2개에서 피드백을 적용했습니다.</div>
                            <div>• 좋은 패턴입니다! 계속 유지해보세요.</div>
                          </div>
                        );
                      } else {
                        return (
                          <div>
                            <div>• 최근 3개 글 모두에서 피드백을 적용했습니다!</div>
                            <div>• 훌륭합니다! 이 습관을 계속 유지해보세요.</div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">아직 충분한 데이터가 없어 트렌드를 분석할 수 없습니다.</p>
            <p className="text-xs mt-1">더 많은 글을 작성하면 트렌드 분석이 가능합니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackApplicationTracker;
