import React, { useState } from 'react';

export type CalendarSlotStatus = 'available' | 'limited' | 'full' | 'none';

export interface CalendarProps {
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  isDateDisabled?: (date: Date) => boolean;
  getDateStatus?: (date: Date) => CalendarSlotStatus;
  showLegend?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const isSameDay = (d1?: Date | null, d2?: Date | null): boolean => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  isDateDisabled,
  getDateStatus,
  showLegend = true,
  className = '',
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // First day of month and total days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    if (onSelectDate) {
      onSelectDate(now);
    }
  };

  const renderDays = () => {
    const days: React.ReactNode[] = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(
        <div
          key={`prev-${i}`}
          className="h-9 sm:h-10 flex items-center justify-center text-xs text-slate-300 select-none"
        >
          {daysInPrevMonth - i}
        </div>
      );
    }

    // Days in current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = isSameDay(selectedDate, date);
      const isCurrentDay = isSameDay(today, date);

      let disabled = false;
      if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
        disabled = true;
      }
      if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) {
        disabled = true;
      }
      if (isDateDisabled && isDateDisabled(date)) {
        disabled = true;
      }

      const status = getDateStatus ? getDateStatus(date) : 'none';

      days.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelectDate && onSelectDate(date)}
          className={`
            relative h-9 sm:h-10 w-full flex flex-col items-center justify-center rounded-xl text-xs font-medium font-sans
            transition-all duration-150 group cursor-pointer
            ${
              isSelected
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30'
                : isCurrentDay
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                : disabled
                ? 'text-slate-300 cursor-not-allowed bg-transparent'
                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
            }
          `.trim()}
        >
          <span>{day}</span>

          {/* Status Dot */}
          {!disabled && status !== 'none' && (
            <span
              className={`
                w-1.5 h-1.5 rounded-full mt-0.5
                ${
                  status === 'available'
                    ? isSelected
                      ? 'bg-white'
                      : 'bg-emerald-500'
                    : status === 'limited'
                    ? isSelected
                      ? 'bg-white'
                      : 'bg-amber-500'
                    : isSelected
                    ? 'bg-white'
                    : 'bg-rose-500'
                }
              `}
            />
          )}
        </button>
      );
    }

    // Remaining slots to balance grid
    const totalSlots = Math.ceil((firstDayIndex + daysInCurrentMonth) / 7) * 7;
    const remainingSlots = totalSlots - (firstDayIndex + daysInCurrentMonth);

    for (let i = 1; i <= remainingSlots; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="h-9 sm:h-10 flex items-center justify-center text-xs text-slate-300 select-none"
        >
          {i}
        </div>
      );
    }

    return days;
  };

  return (
    <div
      className={`
        w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-100/90
        p-4 sm:p-5 shadow-glass font-sans select-none
        ${className}
      `.trim()}
    >
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
            {MONTH_NAMES[month]} {year}
          </h4>
          <p className="text-[11px] text-slate-400">Select reservation date</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToday}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Previous Month"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Next Month"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {WEEKDAY_NAMES.map((d) => (
          <span key={d} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>

      {/* Booking Legend */}
      {showLegend && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Full</span>
          </div>
        </div>
      )}
    </div>
  );
};
