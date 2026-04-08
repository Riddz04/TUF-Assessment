import { useMemo, useCallback, useRef } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWeekend,
} from "date-fns";
import { motion } from "framer-motion";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface CalendarGridProps {
  currentMonth: Date;
  noteDates: Set<string>;
  onDayDoubleClick: (day: Date) => void;
}

export default function CalendarGrid({
  currentMonth,
  noteDates,
  onDayDoubleClick,
}: CalendarGridProps) {
  const clickTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

  const handleClick = useCallback(
    (day: Date, idx: number) => {
      if (!isSameMonth(day, currentMonth)) return;

      // Double-click detection
      if (clickTimers.current.has(idx)) {
        clearTimeout(clickTimers.current.get(idx)!);
        clickTimers.current.delete(idx);
        onDayDoubleClick(day);
      } else {
        const timer = setTimeout(() => {
          clickTimers.current.delete(idx);
        }, 300);
        clickTimers.current.set(idx, timer);
      }
    },
    [currentMonth, onDayDoubleClick]
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
          const weekend = isWeekend(day);
          const noted = noteDates.has(format(day, "yyyy-MM-dd"));
          const today = isSameDay(day, new Date());

          return (
            <motion.button
              key={`${format(currentMonth, "yyyy-MM")}-${idx}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.006, type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => handleClick(day, idx)}
              disabled={!inMonth}
              whileHover={inMonth ? { scale: 1.15, y: -1 } : {}}
              whileTap={inMonth ? { scale: 0.92 } : {}}
              className={`
                relative flex items-center justify-center
                text-xs sm:text-sm font-medium rounded-lg transition-all duration-200
                ${!inMonth ? "text-muted-foreground/12 cursor-default" : "cursor-pointer hover:bg-accent/40"}
                ${inMonth && weekend ? "text-calendar-weekend" : ""}
                ${inMonth && !weekend ? "text-foreground/80" : ""}
                ${today ? "ring-1 ring-primary/30 ring-offset-1 ring-offset-card font-semibold" : ""}
              `}
            >
              {format(day, "d")}
              {noted && inMonth && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
