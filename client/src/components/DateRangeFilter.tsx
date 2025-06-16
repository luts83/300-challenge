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
        className={`bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-2 ${className}`}
      >
        <div className="flex items-center gap-2 flex-1">
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
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            오늘
          </button>
          <button
            onClick={handleThisWeek}
            className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            이번주
          </button>
          <button
            onClick={handleThisMonth}
            className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            이번달
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            전체보기
          </button>
        </div>
      </div>
      {children(filtered, highlightDates)}
    </>
  );
};

export default DateRangeFilter;
