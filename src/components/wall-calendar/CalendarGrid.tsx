import { useMemo, useCallback, useRef, useState } from "react";
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
  isWithinInterval,
  isBefore,
} from "date-fns";
import { motion } from "framer-motion";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface CalendarGridProps {
  currentMonth: Date;
  noteDates: Set<string>;
  onDayDoubleClick: (day: Date) => void;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
}

export default function CalendarGrid({
  currentMonth,
  noteDates,
  onDayDoubleClick,
  rangeStart,
  rangeEnd,
  onRangeChange,
}: CalendarGridProps) {
  const clickTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [hoverDay, setHoverDay] = useState<Date | null>(null);

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
      const end = rangeEnd || hoverDay;
      if (!end) return false;
      const [s, e] = isBefore(rangeStart, end) ? [rangeStart, end] : [end, rangeStart];
      return isWithinInterval(day, { start: s, end: e });
    },
    [rangeStart, rangeEnd, hoverDay]
  );

  const isRangeEdge = useCallback(
    (day: Date) => {
      if (rangeStart && isSameDay(day, rangeStart)) return true;
      if (rangeEnd && isSameDay(day, rangeEnd)) return true;
      return false;
    },
    [rangeStart, rangeEnd]
  );

  const handleClick = useCallback(
    (day: Date, idx: number) => {
      if (!isSameMonth(day, currentMonth)) return;

      // Double-click detection
      if (clickTimers.current.has(idx)) {
        clearTimeout(clickTimers.current.get(idx)!);
        clickTimers.current.delete(idx);
        onDayDoubleClick(day);
        return;
      }

      const timer = setTimeout(() => {
        clickTimers.current.delete(idx);
        // Single click: range selection
        if (!rangeStart || rangeEnd) {
          // Start new range
          onRangeChange(day, null);
        } else {
          // Complete range
          onRangeChange(rangeStart, day);
        }
      }, 300);
      clickTimers.current.set(idx, timer);
    },
    [currentMonth, onDayDoubleClick, rangeStart, rangeEnd, onRangeChange]
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
          const inRange = inMonth && isInRange(day);
          const edge = inMonth && isRangeEdge(day);

          return (
            <motion.button
              key={`${format(currentMonth, "yyyy-MM")}-${idx}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.006, type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => handleClick(day, idx)}
              onMouseEnter={() => inMonth && setHoverDay(day)}
              onMouseLeave={() => setHoverDay(null)}
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
                ${inRange && !edge ? "bg-primary/15" : ""}
                ${edge ? "bg-primary text-primary-foreground rounded-lg" : ""}
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

      {/* Range info */}
      {rangeStart && (
        <div className="text-center pt-1">
          <span className="text-[9px] text-muted-foreground">
            {rangeEnd
              ? `${format(isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd, "MMM d")} — ${format(isBefore(rangeStart, rangeEnd) ? rangeEnd : rangeStart, "MMM d")}`
              : `${format(rangeStart, "MMM d")} — select end date`}
            {rangeEnd && (
              <button
                onClick={(e) => { e.stopPropagation(); onRangeChange(null, null); }}
                className="ml-1.5 text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                ✕
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
