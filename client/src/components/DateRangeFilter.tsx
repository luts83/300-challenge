import React, { useMemo, useState } from 'react';
import DateRangePicker from './DateRangePicker';
import { format, startOfToday, startOfWeek, startOfMonth, endOfToday } from 'date-fns';

interface DateRangeFilterProps<T> {
  items: T[];
  getDate: (item: T) => string | Date;
  children: (filtered: T[], highlightDates: Date[]) => React.ReactNode;
  className?: string;
}

const DateRangeFilter = <T,>({
  items,
  getDate,
  children,
  className = '',
}: DateRangeFilterProps<T>) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const highlightDates = useMemo(() => {
    const dateSet = new Set(items.map(item => format(new Date(getDate(item)), 'yyyy-MM-dd')));
    return Array.from(dateSet).map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [items, getDate]);

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return items;
    const start = new Date(format(startDate, 'yyyy-MM-dd')).getTime();
    const end = new Date(format(endDate, 'yyyy-MM-dd')).getTime();
    return items.filter(item => {
      const created = new Date(format(new Date(getDate(item)), 'yyyy-MM-dd')).getTime();
      return created >= start && created <= end;
    });
  }, [items, startDate, endDate, getDate]);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // 퀵 필터 핸들러
  const handleToday = () => {
    const today = startOfToday();
    setStartDate(today);
    setEndDate(today);
  };
  const handleThisWeek = () => {
    const today = startOfToday();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 월요일 시작
    setStartDate(weekStart);
    setEndDate(today);
  };
  const handleThisMonth = () => {
    const today = startOfToday();
    const monthStart = startOfMonth(today);
    setStartDate(monthStart);
    setEndDate(today);
  };
  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <>
      <div
        className={`
          bg-white 
          dark:bg-gray-800 
          text-black 
          dark:text-white 
          rounded-lg 
          shadow-sm 
          p-3 sm:p-4                    /* 모바일: 12px 패딩, 데스크탑: 16px 패딩 */
          mb-4 border 
          border-gray-100 
          dark:border-gray-700 
          flex 
          flex-col sm:flex-row          /* 모바일: 세로 스택, 데스크탑: 가로 배치 */
          items-stretch           /* stretch로 변경하여 세로 방향 꽉 채움 */
          w-full                 /* 바깥 박스 전체 너비 사용 */          
          gap-2                         /* 모바일/데스크탑: 요소간 8px 간격 */
          ${className}
          `}
      >
        <div className="flex flex-1 w-full">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            highlightDates={highlightDates}
            dayClassName={date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              return highlightDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)
                ? 'highlighted'
                : undefined;
            }}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
          {' '}
          {/* 모바일: 상단 8px 마진, 데스크탑: 마진 없음 */}
          <button
            onClick={handleToday}
            className="
            flex-1 sm:flex-none   /* 모바일에서만 늘어나도록 */
            px-3                         /* 모바일/데스크탑: 좌우 12px 패딩 */
            py-1                         /* 모바일/데스크탑: 상하 4px 패딩 */
            rounded 
            bg-blue-100 
            text-blue-700 
            text-xs                      /* 모바일: 작은 글자 크기 (12px) */
            font-medium 
            hover:bg-blue-200 
            transition 
            dark:bg-blue-900 
            dark:text-blue-200 
            dark:hover:bg-blue-800
            "
          >
            오늘
          </button>
          <button
            onClick={handleThisWeek}
            className="
            flex-1 sm:flex-none   /* 모바일에서만 늘어나도록 */
            px-3 
            py-1 
            rounded 
            bg-blue-100 
            text-blue-700 
            text-xs 
            font-medium 
            hover:bg-blue-200 
            transition 
            dark:bg-blue-900 
            dark:text-blue-200 
            dark:hover:bg-blue-800
            "
          >
            이번주
          </button>
          <button
            onClick={handleThisMonth}
            className="
            flex-1 sm:flex-none   /* 모바일에서만 늘어나도록 */
            px-3 
            py-1 
            rounded 
            bg-blue-100 
            text-blue-700 
            text-xs 
            font-medium 
            hover:bg-blue-200 
            transition 
            dark:bg-blue-900 
            dark:text-blue-200 
            dark:hover:bg-blue-800
            "
          >
            이번달
          </button>
          <button
            onClick={handleClear}
            className="
            flex-1 sm:flex-none   /* 모바일에서만 늘어나도록 */
            px-3 
            py-1 
            rounded 
            bg-gray-100 
            text-gray-700 
            text-xs 
            font-medium 
            hover:bg-gray-200 
            transition 
            dark:bg-gray-700 
            dark:text-gray-200 
            dark:hover:bg-gray-600
            "
          >
            <span className="sm:hidden">전체</span>
            <span className="hidden sm:inline">전체보기</span>
          </button>
        </div>
      </div>
      {children(filtered, highlightDates)}
    </>
  );
};

export default DateRangeFilter;
