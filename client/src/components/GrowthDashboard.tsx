import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import ScoreTrendChart from './ScoreTrendChart';

interface GrowthData {
  hasData: boolean;
  data: {
    summary: {
      totalWritings: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      growthRate: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    scoreTrend: Array<{
      date: string;
      score: number;
      title: string;
    }>;
    weeklyData: Array<{
      weekStart: string;
      averageScore: number;
      totalWritings: number;
    }>;
    monthlyData: Array<{
      month: string;
      averageScore: number;
      totalWritings: number;
    }>;
  } | null;
  period: string;
  mode: string;
}

interface AreaGrowthData {
  hasData: boolean;
  data: {
    areas: {
      trends: Record<string, Array<{ date: string; score: number; title: string }>>;
      averages: Record<string, number>;
      growthRates: Record<string, number>;
    };
    insights: {
      mostImprovedArea: string;
      needsImprovementArea: string;
      strongestArea: string;
    };
  } | null;
  period: string;
  mode: string;
}

const GrowthDashboard: React.FC = () => {
  const { user, getIdToken } = useUser();
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [areaGrowthData, setAreaGrowthData] = useState<AreaGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'mode_300' | 'mode_1000'>('mode_300');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (user?.uid) {
      fetchGrowthData();
    }
  }, [user?.uid, selectedMode, selectedPeriod]);

  const fetchGrowthData = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      // 성장 대시보드 데이터
      const growthResponse = await fetch(
        `/api/growth/dashboard/${user.uid}?mode=${selectedMode}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const growthResult = await growthResponse.json();
      setGrowthData(growthResult);

      // 영역별 성장 데이터
      const areaResponse = await fetch(
        `/api/growth/areas/${user.uid}?mode=${selectedMode}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const areaResult = await areaResponse.json();
      setAreaGrowthData(areaResult);
    } catch (error) {
      console.error('성장 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 dark:text-green-400';
      case 'declining':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '상승 중';
      case 'declining':
        return '하락 중';
      default:
        return '안정적';
    }
  };

  const getAreaName = (area: string) => {
    const areaNames: Record<string, string> = {
      content: '내용',
      expression: '표현',
      structure: '구조',
      impact: '임팩트',
      originality: '독창성',
      consistency: '일관성',
      insight: '통찰력',
      development: '전개',
      technical: '기술',
    };
    return areaNames[area] || area;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">성장 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (!growthData?.hasData || !areaGrowthData?.hasData) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          아직 성장 데이터가 없어요
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          글을 더 작성하시면 성장 추이를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">📈 성장 대시보드</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {selectedMode === 'mode_300' ? '300자' : '1000자'} 모드 성장 추이
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
              <p className="text-sm text-gray-600 dark:text-gray-400">총 작성 글</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {growthData.data?.summary.totalWritings}개
              </p>
            </div>
            <div className="text-3xl">📝</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">평균 점수</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {growthData.data?.summary.averageScore}점
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">성장률</p>
              <p
                className={`text-2xl font-bold ${growthData.data?.summary.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {growthData.data?.summary.growthRate >= 0 ? '+' : ''}
                {growthData.data?.summary.growthRate}%
              </p>
            </div>
            <div className="text-3xl">
              {getTrendIcon(growthData.data?.summary.trend || 'stable')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">성장 추세</p>
              <p
                className={`text-lg font-semibold ${getTrendColor(growthData.data?.summary.trend || 'stable')}`}
              >
                {getTrendText(growthData.data?.summary.trend || 'stable')}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
      </div>

      {/* 점수 추이 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            📈 점수 변화 추이
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            총 {growthData.data?.scoreTrend?.length || 0}개 글
          </div>
        </div>

        {growthData.data?.scoreTrend && growthData.data.scoreTrend.length > 0 ? (
          <ScoreTrendChart
            data={growthData.data.scoreTrend}
            height={300}
            selectedPeriod={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm">아직 작성한 글이 없습니다.</p>
              <p className="text-xs mt-1">글을 작성하면 점수 변화 추이를 확인할 수 있습니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* 영역별 성장 분석 */}
      {areaGrowthData.data && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🎯 영역별 성장 분석
          </h3>

          {/* 인사이트 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                🚀 가장 많이 개선된 영역
              </h4>
              <p className="text-green-700 dark:text-green-300">
                {getAreaName(areaGrowthData.data.insights.mostImprovedArea)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                +
                {Math.round(
                  areaGrowthData.data.areas.growthRates[
                    areaGrowthData.data.insights.mostImprovedArea
                  ] * 10
                ) / 10}
                %
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                💪 가장 강한 영역
              </h4>
              <p className="text-blue-700 dark:text-blue-300">
                {getAreaName(areaGrowthData.data.insights.strongestArea)}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {Math.round(
                  areaGrowthData.data.areas.averages[areaGrowthData.data.insights.strongestArea] *
                    10
                ) / 10}
                점
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                🔧 개선이 필요한 영역
              </h4>
              <p className="text-yellow-700 dark:text-yellow-300">
                {getAreaName(areaGrowthData.data.insights.needsImprovementArea)}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                {Math.round(
                  areaGrowthData.data.areas.averages[
                    areaGrowthData.data.insights.needsImprovementArea
                  ] * 10
                ) / 10}
                점
              </p>
            </div>
          </div>

          {/* 영역별 점수 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(areaGrowthData.data?.areas?.averages || {}).map(([area, average]) => (
              <div key={area} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    {getAreaName(area)}
                  </h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(average * 10) / 10}점
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${average}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  성장률: {areaGrowthData.data.areas.growthRates[area] >= 0 ? '+' : ''}
                  {Math.round(areaGrowthData.data.areas.growthRates[area] * 10) / 10}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthDashboard;
