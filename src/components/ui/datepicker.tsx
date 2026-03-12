/**
 * Custom DatePicker Component
 * Adapted from provided HTML/CSS/JS to match Arisara UI/UX patterns
 */
import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (date: string) => void; // Returns YYYY-MM-DD format
  disabled?: boolean;
  maxDate?: string; // YYYY-MM-DD format (e.g., today)
  minDate?: string; // YYYY-MM-DD format
  className?: string;
}

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const monthAbbreviations = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ViewMode = "calendar" | "month";

export function DatePicker({
  value,
  onChange,
  disabled = false,
  maxDate,
  minDate,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [date, setDate] = useState<Date>(() => {
    if (value) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  });
  const [month, setMonth] = useState(date.getMonth());
  const [year, setYear] = useState(date.getFullYear());
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    // Initialize based on current year, showing 12-year range
    const currentYear = new Date().getFullYear();
    const initialYear = value ? date.getFullYear() : currentYear;
    return Math.floor((initialYear - 6) / 12) * 12; // Round down to nearest 12-year block
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split("-").map(Number);
      const newDate = new Date(year, month - 1, day);
      setDate(newDate);
      setMonth(newDate.getMonth());
      setYear(newDate.getFullYear());
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setViewMode("calendar");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Reset view mode when picker closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode("calendar");
    }
  }, [isOpen]);

  const renderCalendar = () => {
    const start = new Date(year, month, 1).getDay();
    const endDate = new Date(year, month + 1, 0).getDate();
    const end = new Date(year, month, endDate).getDay();
    const endDatePrev = new Date(year, month, 0).getDate();

    const dates: JSX.Element[] = [];

    // Previous month days
    for (let i = start; i > 0; i--) {
      const day = endDatePrev - i + 1;
      dates.push(
        <li key={`prev-${day}`} className="old">
          <span>{day}</span>
        </li>
      );
    }

    // Current month days
    for (let i = 1; i <= endDate; i++) {
      const isToday =
        i === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear();
      const isSelected =
        value &&
        i === date.getDate() &&
        month === date.getMonth() &&
        year === date.getFullYear();
      const isDisabled = isDateDisabled(year, month, i);

      dates.push(
        <li
          key={`current-${i}`}
          className={cn(
            isToday && !isSelected && "today",
            isSelected && "selected"
          )}
        >
          <span
            onClick={() => {
              if (!disabled && !isDisabled) {
                handleDateSelect(year, month, i);
              }
            }}
            className={cn(
              isDisabled && "opacity-30 cursor-not-allowed pointer-events-none"
            )}
          >
            {i}
          </span>
        </li>
      );
    }

    // Next month days
    for (let i = end; i < 6; i++) {
      const day = i - end + 1;
      dates.push(
        <li key={`next-${day}`} className="old">
          <span>{day}</span>
        </li>
      );
    }

    return dates;
  };

  const formatDate = (y: number, m: number, d: number): string => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
  };

  const isDateDisabled = (y: number, m: number, d: number): boolean => {
    const dateStr = formatDate(y, m, d);
    if (maxDate && dateStr > maxDate) return true;
    if (minDate && dateStr < minDate) return true;
    return false;
  };

  const handleDateSelect = (y: number, m: number, d: number) => {
    const dateStr = formatDate(y, m, d);
    const newDate = new Date(y, m, d);
    setDate(newDate);
    setMonth(m);
    setYear(y);
    onChange?.(dateStr);
    setIsOpen(false);
    setViewMode("calendar");
  };

  const handleMonthSelect = (selectedMonth: number) => {
    setMonth(selectedMonth);
    // Don't close - allow user to also select year
  };

  const handleYearSelect = (selectedYear: number) => {
    setYear(selectedYear);
    // Adjust year range to include selected year
    const newRangeStart = Math.floor((selectedYear - 6) / 12) * 12;
    setYearRangeStart(Math.max(1900, newRangeStart));
    // Close and return to calendar after selecting both month and year
    setViewMode("calendar");
  };

  const handleYearRangePrev = () => {
    if (yearRangeStart > 1900) {
      setYearRangeStart(Math.max(1900, yearRangeStart - 12));
    }
  };

  const handleYearRangeNext = () => {
    const currentYear = new Date().getFullYear();
    if (yearRangeStart + 12 <= currentYear) {
      setYearRangeStart(yearRangeStart + 12);
    }
  };

  const renderMonthYearPicker = () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    const endYear = Math.min(yearRangeStart + 11, currentYear);

    for (let y = yearRangeStart; y <= endYear; y++) {
      years.push(y);
    }

    // Split months: Jan-Jun (first 6) and Jul-Dec (last 6)
    const monthsFirstHalf = months.slice(0, 6);
    const monthsSecondHalf = months.slice(6, 12);
    const monthAbbrFirstHalf = monthAbbreviations.slice(0, 6);
    const monthAbbrSecondHalf = monthAbbreviations.slice(6, 12);

    // Split years: first 6 and last 6 (to match months grid: 2 columns of 6)
    const yearsFirstHalf = years.slice(0, 6);
    const yearsSecondHalf = years.slice(6, 12);

    return (
      <div className="datepicker-calendar calendar">
        {/* Header - matches calendar exactly */}
        <div className="cal-head relative">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 border-0 bg-white/5 rounded-full cursor-pointer transition-all hover:bg-white/10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h3 className="title text-white text-lg font-semibold inline-block bg-white/5 px-6 py-3 rounded-lg">
            Selecione Mês e Ano
          </h3>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        {/* Horizontal Split: Months on left, Years on right */}
        <div className="cal-body">
          <div className="month-year-split">
            {/* Left Side: Months in 2 columns */}
            <div className="month-section">
              {/* Invisible navigation to match year header space */}
              <div className="year-header">
                <button
                  type="button"
                  disabled
                  className="year-nav-button-small invisible"
                  aria-hidden="true"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled
                  className="year-nav-button-small invisible"
                  aria-hidden="true"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="month-columns">
                {/* Column 1: Jan-Jun */}
                <div className="month-column">
                  <ul className="dates month-column-grid">
                    {monthsFirstHalf.map((monthName, index) => {
                      const isSelected = month === index;
                      return (
                        <li
                          key={index}
                          className={cn(isSelected && "selected")}
                        >
                          <span
                            onClick={() => handleMonthSelect(index)}
                            className={cn(isSelected && "selected")}
                          >
                            {monthAbbrFirstHalf[index]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Column 2: Jul-Dec */}
                <div className="month-column">
                  <ul className="dates month-column-grid">
                    {monthsSecondHalf.map((monthName, index) => {
                      const monthIndex = index + 6;
                      const isSelected = month === monthIndex;
                      return (
                        <li
                          key={monthIndex}
                          className={cn(isSelected && "selected")}
                        >
                          <span
                            onClick={() => handleMonthSelect(monthIndex)}
                            className={cn(isSelected && "selected")}
                          >
                            {monthAbbrSecondHalf[index]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Side: Years in 2 columns */}
            <div className="year-section">
              {/* Year Navigation */}
              <div className="year-header">
                <button
                  type="button"
                  onClick={handleYearRangePrev}
                  className="year-nav-button-small"
                  disabled={yearRangeStart <= 1900}
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleYearRangeNext}
                  className="year-nav-button-small"
                  disabled={yearRangeStart + 12 > currentYear}
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="year-columns">
                {/* Column 1: First 6 years */}
                <div className="year-column">
                  <ul className="dates year-column-grid">
                    {yearsFirstHalf.map((y) => {
                      const isSelected = year === y;
                      const isDisabled = y > currentYear;
                      return (
                        <li
                          key={y}
                          className={cn(
                            isSelected && "selected",
                            isDisabled && "old"
                          )}
                        >
                          <span
                            onClick={() => {
                              if (!isDisabled) {
                                handleYearSelect(y);
                              }
                            }}
                            className={cn(
                              isDisabled &&
                                "opacity-30 cursor-not-allowed pointer-events-none"
                            )}
                          >
                            {y}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Column 2: Last 6 years */}
                <div className="year-column">
                  <ul className="dates year-column-grid">
                    {yearsSecondHalf.map((y) => {
                      const isSelected = year === y;
                      const isDisabled = y > currentYear;
                      return (
                        <li
                          key={y}
                          className={cn(
                            isSelected && "selected",
                            isDisabled && "old"
                          )}
                        >
                          <span
                            onClick={() => {
                              if (!isDisabled) {
                                handleYearSelect(y);
                              }
                            }}
                            className={cn(
                              isDisabled &&
                                "opacity-30 cursor-not-allowed pointer-events-none"
                            )}
                          >
                            {y}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const displayValue = value
    ? (() => {
        const [y, m, d] = value.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      })()
    : "Selecione uma data";

  return (
    <div className={cn("relative", className)} ref={pickerRef}>
      {/* Input Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 text-left rounded-lg border transition-colors",
          disabled
            ? "bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
            : "bg-white/5 border-white/10 text-white hover:border-white/20 focus:outline-none focus:border-[#EC4899]/50",
          !value && "text-white/40"
        )}
      >
        {displayValue}
      </button>

      {/* Calendar Popup */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[400px] bg-[#0f0f10] border border-white/10 rounded-xl p-5 shadow-xl backdrop-blur-lg">
          {viewMode === "calendar" && (
            <div className="datepicker-calendar calendar">
              {/* Header */}
              <div className="cal-head relative">
                <button
                  type="button"
                  id="prev"
                  onClick={handlePrevMonth}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 border-0 bg-white/5 rounded-full cursor-pointer transition-all hover:bg-white/10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <h3 className="title text-white text-lg font-semibold inline-block bg-white/5 px-6 py-3 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      // Set year range to include current year
                      const rangeStart = Math.floor((year - 6) / 12) * 12;
                      setYearRangeStart(Math.max(1900, rangeStart));
                      setViewMode("month");
                    }}
                    className="hover:text-[#EC4899] transition-colors cursor-pointer"
                  >
                    {months[month]} {year}
                  </button>
                </h3>
                <button
                  type="button"
                  id="next"
                  onClick={handleNextMonth}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 border-0 bg-white/5 rounded-full cursor-pointer transition-all hover:bg-white/10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Calendar Body */}
              <div className="cal-body">
                {/* Week Days */}
                <ul className="days">
                  {weekDays.map((day) => (
                    <li
                      key={day}
                      className="text-white/60 font-medium text-sm uppercase"
                    >
                      {day}
                    </li>
                  ))}
                </ul>

                {/* Dates */}
                <ul className="dates">{renderCalendar()}</ul>
              </div>
            </div>
          )}

          {viewMode === "month" && renderMonthYearPicker()}
        </div>
      )}
    </div>
  );
}

// Add CSS styles (should be added to a CSS file or inline)
const datepickerStyles = `
.datepicker-calendar {
  font-family: inherit;
  width: 100%;
}

.datepicker-calendar .cal-head {
  text-align: center;
  position: relative;
  margin-bottom: 20px;
}

.datepicker-calendar .cal-head .title {
  font-size: 18px;
  font-weight: 600;
  display: inline-block;
  background: rgba(255, 255, 255, 0.05);
  padding: 13px 25px;
  border-radius: 10px;
}

.datepicker-calendar .cal-body {
  margin-top: 15px;
}

.datepicker-calendar .days,
.datepicker-calendar .dates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
  gap: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.datepicker-calendar .days li,
.datepicker-calendar .dates li {
  width: calc((100% - 24px) / 7);
  text-align: center;
  font-size: 16px;
}

.datepicker-calendar .days {
  margin-bottom: 15px;
}

.datepicker-calendar .days li {
  font-weight: 500;
  color: #EC4899;
  text-transform: uppercase;
  font-size: 12px;
}

.datepicker-calendar .dates li span {
  background: rgba(255, 255, 255, 0.05);
  width: 100%;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  color: white;
  font-size: 14px;
}

.datepicker-calendar .dates li span:hover:not(.opacity-30):not(.pointer-events-none) {
  border-color: rgba(236, 72, 153, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #EC4899;
}

.datepicker-calendar .dates li.old span {
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  border-color: transparent;
  cursor: default;
}

.datepicker-calendar .dates li.today span {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 2px solid rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  font-weight: 600;
}

.datepicker-calendar .dates li.selected span {
  background: #EC4899 !important;
  color: white !important;
  font-weight: 600;
  border-color: #EC4899 !important;
}

.datepicker-calendar .dates li.selected.today span {
  background: #EC4899 !important;
  border-color: #EC4899 !important;
}

/* Month and Year Picker Styles - Horizontal Split Layout */
.month-year-split {
  display: flex;
  gap: 12px;
  width: 100%;
}

.month-section,
.year-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.month-columns,
.year-columns {
  display: flex;
  gap: 8px;
  width: 100%;
}

.month-column,
.year-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.year-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  height: 28px; /* Button height */
}

.year-nav-button-small {
  width: 28px;
  height: 28px;
  border: 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.year-nav-button-small:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.year-nav-button-small:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.year-nav-button-small.invisible {
  opacity: 0;
  pointer-events: none;
  cursor: default;
}

.datepicker-calendar .month-column-grid,
.datepicker-calendar .year-column-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.datepicker-calendar .month-column-grid li,
.datepicker-calendar .year-column-grid li {
  width: 100%;
  text-align: center;
  font-size: 16px;
}

.datepicker-calendar .month-column-grid li span,
.datepicker-calendar .year-column-grid li span {
  background: rgba(255, 255, 255, 0.05);
  width: 100%;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  color: white;
  font-size: 14px;
}

.datepicker-calendar .month-column-grid li span:hover:not(.opacity-30):not(.pointer-events-none),
.datepicker-calendar .year-column-grid li span:hover:not(.opacity-30):not(.pointer-events-none) {
  border-color: rgba(236, 72, 153, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #EC4899;
}

.datepicker-calendar .month-column-grid li.selected span,
.datepicker-calendar .year-column-grid li.selected span {
  background: #EC4899 !important;
  color: white !important;
  font-weight: 600;
  border-color: #EC4899 !important;
}

.datepicker-calendar .year-column-grid li.old span {
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  border-color: transparent;
  cursor: default;
}
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleId = "datepicker-custom-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = datepickerStyles;
    document.head.appendChild(style);
  }
}
