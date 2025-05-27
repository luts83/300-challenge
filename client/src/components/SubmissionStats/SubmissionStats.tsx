import React, { useState } from 'react';
import type { StatsData } from './types';

type SubmissionStatsProps = {
  stats: StatsData;
};

export const SubmissionStats: React.FC<SubmissionStatsProps> = ({ stats }) => {
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 text-black  rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-100 dark:border-gray-700">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsStatsExpanded(!isStatsExpanded)}
      >
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2 dark:text-gray-300">
          <span>📊</span> 작성한 글 통계
        </h2>
        <button className="p-1.5 sm:p-2 hover:bg-gray-50 rounded-full transition-colors dark:text-gray-300 dark:hover:bg-gray-700">
          {isStatsExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* 접혀있을 때 보여줄 간단한 요약 */}
      {!isStatsExpanded && (
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 dark:bg-gray-700">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-gray-600 dark:text-gray-300">300자 평균</p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-gray-500 dark:text-gray-300">
                {stats.mode_300?.count || 0}개
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-600">
              {(stats.mode_300?.averageScore || 0).toFixed(1)}
              <span className="text-sm ml-1">점</span>
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 dark:bg-gray-700">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-gray-600 dark:text-gray-300">1000자 평균</p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full dark:bg-gray-500 dark:text-gray-300">
                {stats.mode_1000?.count || 0}개
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-purple-600">
              {(stats.mode_1000?.averageScore || 0).toFixed(1)}
              <span className="text-sm ml-1">점</span>
            </p>
          </div>
        </div>
      )}

      {/* 펼쳐져 있을 때 보여줄 상세 내용 */}
      {isStatsExpanded && (
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {/* 300자 통계 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 dark:text-gray-300">
                300자 글쓰기
              </h3>
              <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full dark:bg-gray-800 dark:text-gray-300">
                {stats.mode_300?.count || 0}개
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
              {/* 점수 섹션 */}
              <div className="text-center p-2.5 sm:p-3 bg-white dark:bg-gray-700 text-black rounded-lg shadow-sm dark:text-gray-300 border border-blue-200 dark:border-gray-700">
                <div className="mb-1.5 sm:mb-2">
                  <div className="inline-block p-1.5 sm:p-2 bg-blue-50 rounded-full dark:bg-gray-500 dark:text-gray-300">
                    <span className="text-lg sm:text-xl text-blue-600 dark:text-gray-300">
                      {(stats.mode_300?.averageScore || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">평균 점수</p>
              </div>

              {/* 최고 점수 섹션 */}
              <div className="text-center p-2.5 sm:p-3 bg-white dark:bg-gray-700 text-black rounded-lg shadow-sm dark:text-gray-300 border border-blue-200 dark:border-gray-700">
                <div className="mb-1.5 sm:mb-2">
                  <div className="inline-block p-1.5 sm:p-2 bg-green-200/50 rounded-full dark:bg-gray-500 dark:text-gray-300">
                    <span className="text-lg sm:text-xl text-green-600 dark:text-gray-300">
                      {stats.mode_300?.maxScore || 0}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">최고 점수</p>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-2 bg-blue-200/50 rounded-lg p-2.5 sm:p-3 dark:bg-blue-800/50">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300">평균 작성 시간</span>
                <span className="font-medium dark:text-gray-300">
                  {Math.floor((stats.mode_300?.averageDuration || 0) / 60)}분{' '}
                  {Math.floor((stats.mode_300?.averageDuration || 0) % 60)}초
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300">최근 작성일</span>
                <span className="font-medium dark:text-gray-300">
                  {stats.mode_300?.recentDate
                    ? new Date(stats.mode_300.recentDate).toLocaleDateString('ko-KR')
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 1000자 통계 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-bold text-purple-900 dark:text-gray-300">
                1000자 글쓰기
              </h3>
              <span className="text-xs sm:text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full dark:bg-gray-800 dark:text-gray-300">
                {stats.mode_1000?.count || 0}개
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
              {/* 점수 섹션 */}
              <div className="text-center p-2.5 sm:p-3 bg-white dark:bg-gray-700 text-black rounded-lg shadow-sm">
                <div className="mb-1.5 sm:mb-2">
                  <div className="inline-block p-1.5 sm:p-2 bg-purple-50 rounded-full dark:bg-gray-500 dark:text-gray-300">
                    <span className="text-lg sm:text-xl text-purple-600 dark:text-gray-300">
                      {(stats.mode_1000?.averageScore || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">평균 점수</p>
              </div>

              {/* 최고 점수 섹션 */}
              <div className="text-center p-2.5 sm:p-3 bg-white dark:bg-gray-700 text-black rounded-lg shadow-sm">
                <div className="mb-1.5 sm:mb-2">
                  <div className="inline-block p-1.5 sm:p-2 bg-green-200/50 rounded-full dark:bg-gray-500 dark:text-gray-300">
                    <span className="text-lg sm:text-xl text-green-600 dark:text-gray-300">
                      {stats.mode_1000?.maxScore || 0}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">최고 점수</p>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-2 bg-purple-200/50 rounded-lg p-2.5 sm:p-3 dark:bg-purple-900/50">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300">평균 작성 시간</span>
                <span className="font-medium dark:text-gray-300">
                  {Math.floor((stats.mode_1000?.averageDuration || 0) / 60)}분{' '}
                  {Math.floor((stats.mode_1000?.averageDuration || 0) % 60)}초
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300">평균 완성 횟수</span>
                <span className="font-medium dark:text-gray-300">
                  {stats.mode_1000?.averageSessionCount || 0}회
                </span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300">최근 작성일</span>
                <span className="font-medium dark:text-gray-300">
                  {stats.mode_1000?.recentDate
                    ? new Date(stats.mode_1000.recentDate).toLocaleDateString('ko-KR')
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
