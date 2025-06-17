import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  className?: string;
  highlightDates?: Date[] | string[];
  dayClassName?: (date: Date) => string | undefined;
}

const inputBaseClass =
  'px-3 py-1 border rounded text-sm transition-colors ' +
  'border-gray-200 focus:border-blue-400 ' +
  'bg-white dark:bg-gray-700 dark:text-white dark:border-gray-700 ' +
  'placeholder-gray-400 dark:placeholder-gray-500 ' +
  'text-blue-700 dark:text-blue-200 w-full max-w-[160px]';

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
  highlightDates,
  dayClassName,
}) => {
  return (
    <div className={`flex flex-row items-center gap-2 w-full ${className}`}>
      <DatePicker
        selected={startDate}
        onChange={date => onChange(date, endDate)}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        dateFormat="yyyy-MM-dd"
        placeholderText="시작 날짜"
        className={inputBaseClass}
        highlightDates={highlightDates}
        dayClassName={dayClassName}
        calendarClassName="dark:bg-gray-900"
        maxDate={endDate || new Date()}
        popperPlacement="bottom-start"
        withPortal={false}
      />
      <span className="text-gray-400 dark:text-gray-500">~</span>
      <DatePicker
        selected={endDate}
        onChange={date => onChange(startDate, date)}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        maxDate={new Date()}
        dateFormat="yyyy-MM-dd"
        placeholderText="종료 날짜"
        className={inputBaseClass}
        highlightDates={highlightDates}
        dayClassName={dayClassName}
        calendarClassName="dark:bg-gray-900"
        popperPlacement="bottom-start"
        withPortal={false}
      />
    </div>
  );
};

export default DateRangePicker;
