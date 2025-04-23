// client/src/components/FeedbackMissionPanel.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';

const FeedbackMissionPanel = () => {
  const { user } = useUser();
  const [todayFeedbackCount, setTodayFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const requiredCount = CONFIG.FEEDBACK.REQUIRED_COUNT; // 하루 필요한 피드백 수 (3개)

  useEffect(() => {
    const fetchTodayFeedbackCount = async () => {
      if (!user) return;
      try {
        // 오늘 작성한 피드백 수만 가져오기
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`
        );
        setTodayFeedbackCount(res.data.count);
      } catch (err) {
        console.error('오늘의 피드백 개수 불러오기 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayFeedbackCount();
  }, [user]);

  if (!user || loading) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      {/* 미션 진행 상황 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🎯 오늘의 피드백 미션</h2>
        <span className="text-sm font-medium text-blue-600">
          {todayFeedbackCount}/{requiredCount} 완료
        </span>
      </div>

      {/* 진행 상황 시각화 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">오늘의 진행률</span>
            <span className="text-xs text-gray-500">
              {Math.round((todayFeedbackCount / requiredCount) * 100)}%
            </span>
          </div>
          <span className="text-xs text-gray-500">목표: {requiredCount}개</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(todayFeedbackCount / requiredCount) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* 피드백 상태 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">✍️</span>
          <h3 className="text-base font-medium">오늘의 피드백 현황</h3>
        </div>
        <p className="text-2xl font-bold text-blue-600 mb-2">{todayFeedbackCount}</p>
        {todayFeedbackCount < requiredCount ? (
          <p className="text-sm text-blue-700">
            앞으로 {requiredCount - todayFeedbackCount}개의 피드백을 더 작성하면
            <br />
            오늘 작성한 모든 글의 피드백을 볼 수 있어요!
          </p>
        ) : (
          <p className="text-sm text-green-700">
            🎉 축하합니다! 오늘 작성한 모든 글의 피드백을 볼 수 있어요!
          </p>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-gray-50 rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm font-medium mb-1">피드백 규칙</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 피드백은 최소 {CONFIG.FEEDBACK.MIN_LENGTH}자 이상 작성해야 합니다</li>
              <li>
                • 하루에 {requiredCount}개의 피드백을 작성하면 그날 작성한 모든 글의 피드백을 볼 수
                있어요
              </li>
              <li>• 매일 자정에 피드백 카운트가 초기화됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackMissionPanel;
