import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

interface WeeklyReportData {
  success: boolean;
  data: {
    weekInfo: {
      startDate: string;
      endDate: string;
      weekOffset: number;
      weekLabel: string;
    };
    summary: {
      totalWritings: number;
      mode300Writings: number;
      mode1000Writings: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      improvementRate: number;
    };
    dailyProgress: Array<{
      date: string;
      dayOfWeek: string;
      writings: number;
      averageScore: number;
      mode300Count: number;
      mode1000Count: number;
    }>;
    achievements: Array<{
      type: string;
      title: string;
      description: string;
      icon: string;
      level: 'gold' | 'silver' | 'bronze';
    }>;
    insights: {
      strengths: Array<{
        area: string;
        score: number;
        description: string;
      }>;
      improvements: Array<{
        area: string;
        score: number;
        description: string;
      }>;
      trends: {
        direction: 'improving' | 'declining' | 'stable';
        description: string;
      };
    };
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    nextWeekGoals: Array<{
      type: string;
      title: string;
      target: number;
      current: number;
      description: string;
    }>;
  };
}

const WeeklyGrowthReport: React.FC = () => {
  const { user, getIdToken } = useUser();
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0: 이번 주, 1: 지난 주, 2: 2주 전

  useEffect(() => {
    if (user?.uid) {
      fetchWeeklyReport();
    }
  }, [user?.uid, selectedWeek]);

  const fetchWeeklyReport = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const response = await fetch(
        `/api/weekly-report/generate/${user.uid}?weekOffset=${selectedWeek}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      setReportData(result);
    } catch (error) {
      console.error('주간 성장 리포트 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'gold':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'silver':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
      case 'bronze':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving':
        return 'text-green-600 dark:text-green-400';
      case 'declining':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          주간 성장 리포트를 생성하는 중...
        </span>
      </div>
    );
  }

  if (!reportData?.success || !reportData.data) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          주간 성장 리포트를 생성할 수 없어요
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          글을 더 작성하시면 주간 리포트를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const { data } = reportData;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            📊 주간 성장 리포트
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {data.weekInfo.weekLabel} ({data.weekInfo.startDate} ~ {data.weekInfo.endDate})
          </p>
        </div>

        {/* 주 선택 */}
        <div className="flex gap-2">
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          >
            <option value={0}>이번 주</option>
            <option value={1}>지난 주</option>
            <option value={2}>2주 전</option>
            <option value={3}>3주 전</option>
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
                {data.summary.totalWritings}개
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
                {data.summary.averageScore}점
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">개선률</p>
              <p
                className={`text-2xl font-bold ${
                  data.summary.improvementRate >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {data.summary.improvementRate >= 0 ? '+' : ''}
                {data.summary.improvementRate}%
              </p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">최고 점수</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {data.summary.highestScore}점
              </p>
            </div>
            <div className="text-3xl">⭐</div>
          </div>
        </div>
      </div>

      {/* 일별 진행률 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          📅 일별 진행률
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {data.dailyProgress?.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{day.dayOfWeek}</div>
              <div
                className={`rounded-lg p-2 ${
                  day.writings > 0
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {day.writings}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {day.averageScore > 0 ? `${day.averageScore}점` : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {day.mode300Count > 0 && `300:${day.mode300Count}`}
                  {day.mode300Count > 0 && day.mode1000Count > 0 && ' '}
                  {day.mode1000Count > 0 && `1000:${day.mode1000Count}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 성취도 */}
      {data.achievements?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🏆 이번 주 성취
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.achievements?.map((achievement, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 border ${getLevelColor(achievement.level)}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{achievement.icon}</span>
                  <h4 className="font-semibold">{achievement.title}</h4>
                </div>
                <p className="text-sm">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 인사이트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 강점 */}
        {data.insights.strengths?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">💪 강점</h3>
            <div className="space-y-3">
              {data.insights.strengths?.map((strength, index) => (
                <div
                  key={index}
                  className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {strength.area}
                    </span>
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {strength.score}점
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {strength.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 개선점 */}
        {data.insights.improvements?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              🔧 개선점
            </h3>
            <div className="space-y-3">
              {data.insights.improvements?.map((improvement, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      {improvement.area}
                    </span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      {improvement.score}점
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {improvement.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 트렌드 */}
      {data.insights.trends.direction && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            📈 성장 트렌드
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getTrendIcon(data.insights.trends.direction)}</span>
            <div>
              <p className={`font-medium ${getTrendColor(data.insights.trends.direction)}`}>
                {data.insights.trends.direction === 'improving'
                  ? '상승 중'
                  : data.insights.trends.direction === 'declining'
                    ? '하락 중'
                    : '안정적'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.insights.trends.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 추천사항 */}
      {data.recommendations?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            💡 추천사항
          </h3>
          <div className="space-y-3">
            {data.recommendations?.map((recommendation, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 border ${getPriorityColor(recommendation.priority)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{recommendation.title}</h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recommendation.priority === 'high'
                        ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                        : recommendation.priority === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                    }`}
                  >
                    {recommendation.priority === 'high'
                      ? '높음'
                      : recommendation.priority === 'medium'
                        ? '보통'
                        : '낮음'}
                  </span>
                </div>
                <p className="text-sm">{recommendation.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 다음 주 목표 */}
      {data.nextWeekGoals?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🎯 다음 주 목표
          </h3>
          <div className="space-y-4">
            {data.nextWeekGoals?.map((goal, index) => (
              <div
                key={index}
                className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">{goal.title}</h4>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {goal.current} → {goal.target}
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">{goal.description}</p>
                <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyGrowthReport;
