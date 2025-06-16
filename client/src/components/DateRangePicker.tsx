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

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
  highlightDates,
  dayClassName,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DatePicker
        selected={startDate}
        onChange={date => onChange(date, endDate)}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        dateFormat="yyyy-MM-dd"
        placeholderText="시작 날짜"
        className="px-3 py-1 border rounded text-sm dark:bg-gray-900 dark:text-white"
        highlightDates={highlightDates}
        dayClassName={dayClassName}
        calendarClassName="dark:bg-gray-800"
      />
      <span>~</span>
      <DatePicker
        selected={endDate}
        onChange={date => onChange(startDate, date)}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        dateFormat="yyyy-MM-dd"
        placeholderText="종료 날짜"
        className="px-3 py-1 border rounded text-sm dark:bg-gray-900 dark:text-white"
        highlightDates={highlightDates}
        dayClassName={dayClassName}
        calendarClassName="dark:bg-gray-800"
        maxDate={new Date()} // 오늘까지만
      />
    </div>
  );
};

export default DateRangePicker;
