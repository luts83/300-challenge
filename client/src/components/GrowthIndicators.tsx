import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

interface GrowthIndicatorsData {
  hasData: boolean;
  data: {
    summary: {
      totalWritings: number;
      averageIndicators: {
        sentenceStructure: Record<string, number>;
        vocabularyDiversity: Record<string, number>;
        paragraphStructure: Record<string, number>;
        expressiveness: Record<string, number>;
        endingQuality: Record<string, number>;
      };
      improvementTrends: Record<string, Record<string, number>>;
    };
    detailedIndicators: Array<{
      index: number;
      date: string;
      title: string;
      score: number;
      indicators: {
        sentenceStructure: Record<string, number>;
        vocabularyDiversity: Record<string, number>;
        paragraphStructure: Record<string, number>;
        expressiveness: Record<string, number>;
        endingQuality: Record<string, number>;
      };
    }>;
    improvementAreas: Array<{
      area: string;
      score: number;
      needsImprovement: boolean;
      indicators: Record<string, number>;
    }>;
    writingQuality: {
      overall: number;
      consistency: number;
      improvement: number;
      strengths: Array<{ area: string; score: number }>;
      weaknesses: Array<{ area: string; score: number }>;
    };
  } | null;
  period: string;
  mode: string;
}

const GrowthIndicators: React.FC = () => {
  const { user, getIdToken } = useUser();
  const [indicatorsData, setIndicatorsData] = useState<GrowthIndicatorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'mode_300' | 'mode_1000'>('mode_300');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    if (user?.uid) {
      fetchIndicatorsData();
    }
  }, [user?.uid, selectedMode, selectedPeriod]);

  const fetchIndicatorsData = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const response = await fetch(
        `/api/growth-indicators/indicators/${user.uid}?mode=${selectedMode}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      setIndicatorsData(result);
    } catch (error) {
      console.error('구체적 개선 지표 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAreaName = (area: string) => {
    const areaNames: Record<string, string> = {
      sentenceStructure: '문장 구조',
      vocabularyDiversity: '어휘 다양성',
      paragraphStructure: '문단 구조',
      expressiveness: '표현력',
      endingQuality: '끝맺음 품질',
    };
    return areaNames[area] || area;
  };

  const getIndicatorName = (indicator: string) => {
    const indicatorNames: Record<string, string> = {
      averageSentenceLength: '평균 문장 길이',
      sentenceLengthVariation: '문장 길이 다양성',
      totalSentences: '총 문장 수',
      longSentences: '긴 문장 수',
      shortSentences: '짧은 문장 수',
      totalWords: '총 단어 수',
      uniqueWords: '고유 단어 수',
      diversityRatio: '어휘 다양성 비율',
      repeatedWords: '반복 단어 수',
      advancedWords: '고급 단어 수',
      totalParagraphs: '총 문단 수',
      averageParagraphLength: '평균 문단 길이',
      paragraphLengthVariation: '문단 길이 다양성',
      singleSentenceParagraphs: '단문 문단 수',
      descriptiveWords: '형용사 수',
      emotionalWords: '감정 단어 수',
      actionWords: '동작 단어 수',
      sensoryWords: '감각 단어 수',
      metaphorCount: '은유 수',
      endingLength: '끝맺음 길이',
      endingType: '끝맺음 유형',
      hasConclusion: '결론 포함',
      hasReflection: '반성 포함',
      hasFutureVision: '미래 비전 포함',
    };
    return indicatorNames[indicator] || indicator;
  };

  const getEndingTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      reflection: '반성형',
      future: '미래형',
      conclusion: '결론형',
      none: '일반형',
    };
    return typeNames[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          구체적 개선 지표를 불러오는 중...
        </span>
      </div>
    );
  }

  if (!indicatorsData?.hasData || !indicatorsData.data) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          아직 구체적 개선 지표 데이터가 없어요
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          글을 더 작성하시면 구체적인 개선 지표를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const { data } = indicatorsData;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            📊 구체적 개선 지표
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {selectedMode === 'mode_300' ? '300자' : '1000자'} 모드 상세 분석
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

      {/* 글쓰기 품질 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">전체 품질</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {Math.round(data.writingQuality.overall)}점
              </p>
            </div>
            <div className="text-3xl">⭐</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">일관성</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {Math.round(data.writingQuality.consistency)}점
              </p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">개선도</p>
              <p
                className={`text-2xl font-bold ${
                  data.writingQuality.improvement >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {data.writingQuality.improvement >= 0 ? '+' : ''}
                {Math.round(data.writingQuality.improvement)}%
              </p>
            </div>
            <div className="text-3xl">🚀</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">총 작성 글</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {data.summary.totalWritings}개
              </p>
            </div>
            <div className="text-3xl">📝</div>
          </div>
        </div>
      </div>

      {/* 강점 및 약점 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 강점 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            💪 강점 영역
          </h3>
          <div className="space-y-3">
            {data.writingQuality.strengths?.map((strength, index) => (
              <div
                key={index}
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-800 dark:text-green-200">
                    {getAreaName(strength.area)}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {Math.round(strength.score)}점
                  </span>
                </div>
                <div className="w-full bg-green-200 dark:bg-green-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.min(strength.score, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 약점 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🔧 개선이 필요한 영역
          </h3>
          <div className="space-y-3">
            {data.writingQuality.weaknesses?.map((weakness, index) => (
              <div
                key={index}
                className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">
                    {getAreaName(weakness.area)}
                  </span>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    {Math.round(weakness.score)}점
                  </span>
                </div>
                <div className="w-full bg-yellow-200 dark:bg-yellow-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${Math.min(weakness.score, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 평균 지표 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          📊 평균 지표
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(data.averageIndicators || {}).map(([category, indicators]) => (
            <div key={category} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {getAreaName(category)}
              </h4>
              <div className="space-y-2">
                {Object.entries(indicators || {}).map(([indicator, value]) => (
                  <div key={indicator} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {getIndicatorName(indicator)}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {typeof value === 'number' ? Math.round(value * 10) / 10 : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 개선 영역 상세 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          🎯 개선 영역 상세 분석
        </h3>
        <div className="space-y-4">
          {data.improvementAreas?.map((area, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 border ${
                area.needsImprovement
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4
                  className={`font-semibold ${
                    area.needsImprovement
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-green-800 dark:text-green-200'
                  }`}
                >
                  {area.area}
                </h4>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      area.needsImprovement
                        ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                        : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                    }`}
                  >
                    {area.needsImprovement ? '개선 필요' : '양호'}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      area.needsImprovement
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {Math.round(area.score)}점
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(area.indicators || {}).map(([indicator, value]) => (
                  <div key={indicator} className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {getIndicatorName(indicator)}
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {typeof value === 'number' ? Math.round(value * 10) / 10 : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 지표 히스토리 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          📈 상세 지표 히스토리
        </h3>
        <div className="space-y-4">
          {data.detailedIndicators?.map((item, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">{item.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(item.date).toLocaleDateString('ko-KR')} • {item.score}점
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(item.indicators || {}).map(([category, indicators]) => (
                  <div key={category} className="bg-white dark:bg-gray-600 rounded-lg p-3">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {getAreaName(category)}
                    </h5>
                    <div className="space-y-1">
                      {Object.entries(indicators || {}).map(([indicator, value]) => (
                        <div key={indicator} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {getIndicatorName(indicator)}
                          </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {typeof value === 'number' ? Math.round(value * 10) / 10 : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GrowthIndicators;
