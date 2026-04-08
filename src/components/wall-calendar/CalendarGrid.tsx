import { useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  isWeekend,
} from "date-fns";
import { motion } from "framer-motion";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface CalendarGridProps {
  currentMonth: Date;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  hoveredDate: Date | null;
  noteDates: Set<string>;
  onDayClick: (day: Date) => void;
  onDayHover: (day: Date | null) => void;
}

export default function CalendarGrid({
  currentMonth,
  rangeStart,
  rangeEnd,
  hoveredDate,
  noteDates,
  onDayClick,
  onDayHover,
}: CalendarGridProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const isInRange = useCallback(
    (day: Date) => {
      if (!rangeStart) return false;
      const end = rangeEnd || hoveredDate;
      if (!end) return false;
      const [s, e] = isBefore(rangeStart, end) ? [rangeStart, end] : [end, rangeStart];
      return (isAfter(day, s) || isSameDay(day, s)) && (isBefore(day, e) || isSameDay(day, e));
    },
    [rangeStart, rangeEnd, hoveredDate]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-[9px] sm:text-[10px] font-bold tracking-[0.18em] py-1 ${
              i >= 5 ? "text-calendar-weekend" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="h-px bg-border/60 mb-0.5" />

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1">
        {calendarDays.map((day, idx) => {
          const inMonth = isSameMonth(day, currentMonth);
          const inRange = isInRange(day);
          const isStart = rangeStart && isSameDay(day, rangeStart);
          const isEnd = rangeEnd && isSameDay(day, rangeEnd);
          const weekend = isWeekend(day);
          const noted = noteDates.has(format(day, "yyyy-MM-dd"));
          const today = isSameDay(day, new Date());

          return (
            <motion.button
              key={`${format(currentMonth, "yyyy-MM")}-${idx}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.008, type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => inMonth && onDayClick(day)}
              onMouseEnter={() => inMonth && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
              disabled={!inMonth}
              whileHover={inMonth ? { scale: 1.18, y: -1 } : {}}
              whileTap={inMonth ? { scale: 0.9 } : {}}
              className={`
                relative flex items-center justify-center
                text-xs sm:text-sm font-medium rounded-md transition-colors duration-150
                ${!inMonth ? "text-muted-foreground/15 cursor-default" : "cursor-pointer"}
                ${inMonth && !inRange && !isStart && !isEnd && weekend ? "text-calendar-weekend" : ""}
                ${inMonth && !inRange && !isStart && !isEnd && !weekend ? "text-foreground" : ""}
                ${inRange && !isStart && !isEnd ? "bg-calendar-range text-calendar-range-foreground" : ""}
                ${isStart ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 z-10" : ""}
                ${isEnd ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 z-10" : ""}
                ${today && !isStart && !isEnd ? "ring-1.5 ring-primary/40 ring-offset-1 ring-offset-card font-semibold" : ""}
              `}
            >
              {format(day, "d")}
              {noted && inMonth && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
