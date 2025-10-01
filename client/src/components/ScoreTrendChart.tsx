import React, { useState, useRef, useEffect } from 'react';

interface ScoreTrendData {
  date: string;
  score: number;
  title: string;
}

interface ScoreTrendChartProps {
  data: ScoreTrendData[];
  height?: number;
  onPeriodChange?: (period: 'week' | 'month' | 'all') => void;
  selectedPeriod?: 'week' | 'month' | 'all';
}

const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({
  data,
  height = 200,
  onPeriodChange,
  selectedPeriod = 'month',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  // 기간별 데이터 필터링
  const getFilteredData = (period: 'week' | 'month' | 'all') => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return data;
    }

    return data.filter(item => new Date(item.date) >= startDate);
  };

  const filteredData = getFilteredData(selectedPeriod);

  // 컨테이너 폭 측정
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setContainerWidth(Math.max(1, Math.floor(w))); // 최소 1px
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">아직 충분한 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  // 데이터 정렬 (날짜순)
  const sortedData = [...filteredData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 차트 크기 설정 (실제 컨테이너 폭 기준)
  const chartWidth = containerWidth;
  const chartHeight = height;
  const paddingLeft = Math.floor(containerWidth * 0.06); // 6%
  const paddingRight = Math.floor(containerWidth * 0.02); // 2%
  const paddingTop = Math.floor(height * 0.06); // 6%
  const paddingBottom = Math.floor(height * 0.1); // 10%
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // 점수 범위 계산 (100점 만점 기준)
  const scores = sortedData.map(item => item.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // 항상 0-100점 범위로 고정
  const adjustedMinScore = 0;
  const adjustedMaxScore = 100;
  const adjustedScoreRange = 100;

  // 점을 차트 좌표로 변환 (분모 0 방지)
  const points = sortedData.map((item, index) => {
    const denom = Math.max(1, sortedData.length - 1);
    const x = paddingLeft + (index / denom) * innerWidth;
    const y =
      paddingTop +
      innerHeight -
      ((item.score - adjustedMinScore) / adjustedScoreRange) * innerHeight;
    return { x, y, data: item, index };
  });

  // 라인 경로 생성
  const pathData = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    })
    .join(' ');

  // Y축 그리드 라인 생성 (100점 만점 기준)
  const gridLines = [];
  const gridCount = 5; // 0, 20, 40, 60, 80, 100
  for (let i = 0; i <= gridCount; i++) {
    const y = paddingTop + (innerHeight / gridCount) * i;
    const score = adjustedMaxScore - (adjustedScoreRange / gridCount) * i;
    gridLines.push({ y, score: Math.round(score) });
  }

  // X축 날짜 라벨 생성 (중복 제거)
  const dateLabels: Array<{ x: number; label: string }> = [];
  const maxDateLabels = Math.min(6, sortedData.length); // 적절한 개수로 조정

  // 중복되지 않는 날짜만 선택
  const selectedIndices = [];
  if (sortedData.length <= maxDateLabels) {
    // 데이터가 적으면 모든 날짜 표시
    for (let i = 0; i < sortedData.length; i++) {
      selectedIndices.push(i);
    }
  } else {
    // 데이터가 많으면 균등하게 분산
    for (let i = 0; i < maxDateLabels; i++) {
      const index = Math.floor((i / (maxDateLabels - 1)) * (sortedData.length - 1));
      selectedIndices.push(index);
    }
  }

  // 중복 제거 및 정렬
  const uniqueIndices = [...new Set(selectedIndices)].sort((a, b) => a - b);

  uniqueIndices.forEach(index => {
    const denom = Math.max(1, sortedData.length - 1);
    const x = paddingLeft + (index / denom) * innerWidth;
    const date = new Date(sortedData[index].date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    dateLabels.push({ x, label: `${month}/${day}` });
  });

  return (
    <div className="relative">
      {/* 기간 선택 버튼 */}
      <div className="flex justify-end mb-4">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['week', 'month', 'all'] as const).map(period => (
            <button
              key={period}
              onClick={() => onPeriodChange?.(period)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              {period === 'week' ? '1주일' : period === 'month' ? '1개월' : '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 컨테이너 */}
      <div ref={containerRef} className="relative w-full" style={{ height: `${height}px` }}>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="overflow-visible"
        >
          {/* 그라데이션 및 패턴 정의 */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 가로 그리드 (메이저/마이너) */}
          {(() => {
            const yMajorCount = 5; // 0,20,40,60,80,100
            const yMinorPerMajor = 4; // 5단위 보조선
            const yStep = innerHeight / yMajorCount;

            return Array.from({ length: yMajorCount + 1 }).map((_, i) => {
              const y = paddingTop + yStep * i;
              return (
                <g key={`y-major-${i}`}>
                  {/* 메이저 그리드 라인 */}
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={paddingLeft + innerWidth}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.6"
                    className="text-gray-300 dark:text-gray-700"
                    opacity="0.35"
                  />
                  {/* 마이너 그리드 라인 (점선) */}
                  {i < yMajorCount &&
                    Array.from({ length: yMinorPerMajor - 1 }).map((_, m) => {
                      const my = y + (yStep / yMinorPerMajor) * (m + 1);
                      return (
                        <line
                          key={`y-minor-${i}-${m}`}
                          x1={paddingLeft}
                          y1={my}
                          x2={paddingLeft + innerWidth}
                          y2={my}
                          stroke="currentColor"
                          strokeWidth="0.5"
                          strokeDasharray="2 3"
                          className="text-gray-300 dark:text-gray-700"
                          opacity="0.20"
                        />
                      );
                    })}
                </g>
              );
            });
          })()}

          {/* 세로 그리드 (메이저/마이너) */}
          {(() => {
            const xMajorIndices = uniqueIndices; // 이미 골라둔 라벨 인덱스
            const xMinorCount = Math.min(24, Math.max(6, sortedData.length - 1));

            return (
              <>
                {/* 마이너 세로 그리드 */}
                {Array.from({ length: xMinorCount + 1 }).map((_, i) => {
                  const x = paddingLeft + (innerWidth / xMinorCount) * i;
                  return (
                    <line
                      key={`x-minor-${i}`}
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + innerHeight}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-gray-300 dark:text-gray-700"
                      opacity="0.15"
                    />
                  );
                })}
                {/* 메이저 세로 그리드 */}
                {xMajorIndices.map((idx, i) => {
                  const denom = Math.max(1, sortedData.length - 1);
                  const x = paddingLeft + (idx / denom) * innerWidth;
                  return (
                    <line
                      key={`x-major-${i}`}
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + innerHeight}
                      stroke="currentColor"
                      strokeWidth="0.6"
                      className="text-gray-300 dark:text-gray-700"
                      opacity="0.30"
                    />
                  );
                })}
              </>
            );
          })()}

          {/* Y축 라벨 */}
          {gridLines.map((line, index) => (
            <text
              key={index}
              x={paddingLeft - 4}
              y={line.y + 4}
              fontSize="11"
              textAnchor="end"
              className="fill-gray-600 dark:fill-gray-300 font-semibold"
            >
              {line.score}
            </text>
          ))}

          {/* X축 날짜 라벨 */}
          {dateLabels.map((label, index) => (
            <text
              key={index}
              x={label.x}
              y={chartHeight - 2}
              fontSize="11"
              textAnchor="middle"
              className="fill-gray-600 dark:fill-gray-300 font-semibold"
            >
              {label.label}
            </text>
          ))}

          {/* 축 라인 */}
          {/* Y축 */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={paddingTop + innerHeight}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gray-400 dark:text-gray-600"
          />
          {/* X축 */}
          <line
            x1={paddingLeft}
            y1={paddingTop + innerHeight}
            x2={paddingLeft + innerWidth}
            y2={paddingTop + innerHeight}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gray-400 dark:text-gray-600"
          />

          {/* 라인 차트 */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="transition-all duration-500"
          />

          {/* 데이터 포인트 */}
          {points.map((point, index) => (
            <g key={index}>
              {/* 포인트 배경 그림자 */}
              <circle
                cx={point.x + 1}
                cy={point.y + 1}
                r={hoveredPoint === index ? '7' : '5'}
                fill="rgba(0,0,0,0.1)"
                className="transition-all duration-200"
              />
              {/* 메인 포인트 */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === index ? '6' : '4'}
                fill="url(#lineGradient)"
                stroke="white"
                strokeWidth="2.5"
                className="transition-all duration-200 cursor-pointer drop-shadow-lg"
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* 호버 시 펄스 효과 */}
              {hoveredPoint === index && (
                <>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="10"
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    opacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="1.5"
                    opacity="0.5"
                    className="animate-pulse"
                  />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* 호버 툴팁 */}
        {hoveredPoint !== null && (
          <div
            className="absolute bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl p-3 shadow-2xl z-20 pointer-events-none border border-gray-200 dark:border-gray-600 backdrop-blur-sm"
            style={{
              left: `${points[hoveredPoint].x}px`,
              top: `${points[hoveredPoint].y}px`,
              transform: 'translate(-50%, -100%)',
              marginTop: '-12px',
            }}
          >
            <div className="font-semibold text-base mb-1">{points[hoveredPoint].data.title}</div>
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">
              {new Date(points[hoveredPoint].data.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </div>
            <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">
              {points[hoveredPoint].data.score}점
            </div>
            {/* 툴팁 화살표 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
          </div>
        )}
      </div>

      {/* 차트 하단 정보 */}
      <div className="mt-4 flex justify-between text-sm text-gray-500 dark:text-gray-400 font-medium">
        <span>최저: {minScore}점</span>
        <span>최고: {maxScore}점</span>
        <span>
          평균: {Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)}점
        </span>
      </div>

      {/* 축 라벨 */}
      <div className="mt-2 flex justify-between text-sm text-gray-500 dark:text-gray-400 font-medium">
        <div className="flex items-center gap-1">
          <span>Y축: 점수</span>
        </div>
        <div className="flex items-center gap-1">
          <span>X축: 날짜</span>
        </div>
      </div>

      {/* 트렌드 분석 */}
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <div className="font-semibold mb-2">📊 트렌드 분석</div>
          <div className="text-sm space-y-1">
            {(() => {
              if (sortedData.length < 2) {
                return <div>• 데이터가 부족하여 트렌드를 분석할 수 없습니다.</div>;
              }

              const recentScores = sortedData.slice(-3).map(item => item.score);
              const isImproving =
                recentScores.length >= 2 && recentScores[0] < recentScores[recentScores.length - 1];
              const isDeclining =
                recentScores.length >= 2 && recentScores[0] > recentScores[recentScores.length - 1];

              const totalGrowth = sortedData[sortedData.length - 1].score - sortedData[0].score;
              const avgGrowth = totalGrowth / (sortedData.length - 1);

              return (
                <>
                  <div>
                    • <span className="font-medium">전체 변화</span>: {totalGrowth >= 0 ? '+' : ''}
                    {totalGrowth.toFixed(1)}점
                  </div>
                  <div>
                    • <span className="font-medium">평균 변화</span>: {avgGrowth >= 0 ? '+' : ''}
                    {avgGrowth.toFixed(1)}점/글
                  </div>
                  {isImproving && (
                    <div className="text-green-600 dark:text-green-400 font-medium">
                      📈 최근 점수가 상승하고 있습니다!
                    </div>
                  )}
                  {isDeclining && (
                    <div className="text-red-600 dark:text-red-400 font-medium">
                      📉 최근 점수가 하락하고 있습니다.
                    </div>
                  )}
                  {!isImproving && !isDeclining && (
                    <div className="text-gray-600 dark:text-gray-400 font-medium">
                      ➡️ 점수가 안정적으로 유지되고 있습니다.
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreTrendChart;
