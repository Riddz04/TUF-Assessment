import { useState, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  isWeekend,
  eachDayOfInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight, StickyNote, X } from "lucide-react";
import heroImage from "@/assets/calendar-hero.jpg";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface DateNote {
  date: string;
  text: string;
}

export default function WallCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<DateNote[]>([]);
  const [monthNotes, setMonthNotes] = useState<Record<string, string>>({});

  const monthKey = format(currentMonth, "yyyy-MM");
  const generalNote = monthNotes[monthKey] || "";

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
      const [s, e] = isBefore(rangeStart, end)
        ? [rangeStart, end]
        : [end, rangeStart];
      return (isAfter(day, s) || isSameDay(day, s)) && (isBefore(day, e) || isSameDay(day, e));
    },
    [rangeStart, rangeEnd, hoveredDate]
  );

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, currentMonth)) return;
    if (!rangeStart || rangeEnd) {
      setRangeStart(day);
      setRangeEnd(null);
    } else {
      if (isBefore(day, rangeStart)) {
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
    }
  };

  const selectedRangeNotes = useMemo(() => {
    if (!rangeStart) return [];
    const end = rangeEnd || rangeStart;
    const [s, e] = isBefore(rangeStart, end) ? [rangeStart, end] : [end, rangeStart];
    const days = eachDayOfInterval({ start: s, end: e });
    return notes.filter((n) => days.some((d) => format(d, "yyyy-MM-dd") === n.date));
  }, [rangeStart, rangeEnd, notes]);

  const addNote = () => {
    if (!rangeStart) return;
    const dateKey = format(rangeStart, "yyyy-MM-dd");
    setNotes((prev) => [...prev, { date: dateKey, text: "" }]);
  };

  const updateNote = (index: number, text: string) => {
    setNotes((prev) => prev.map((n, i) => (i === index ? { ...n, text } : n)));
  };

  const removeNote = (index: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const hasNote = (day: Date) => notes.some((n) => n.date === format(day, "yyyy-MM-dd"));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl bg-card rounded-xl shadow-2xl overflow-hidden">
        {/* Hero Image Section */}
        <div className="relative">
          <img
            src={heroImage}
            alt="Monthly landscape"
            className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover"
          />
          {/* Decorative wave overlay */}
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1200 80"
            preserveAspectRatio="none"
            style={{ height: "60px" }}
          >
            <path
              d="M0,80 L0,40 Q300,0 600,40 Q900,80 1200,30 L1200,80 Z"
              className="fill-primary opacity-80"
            />
            <path
              d="M0,80 L0,55 Q400,20 800,55 Q1000,70 1200,45 L1200,80 Z"
              className="fill-card"
            />
          </svg>
          {/* Month & Year Label */}
          <div className="absolute bottom-4 right-6 md:right-10 text-right z-10">
            <p className="text-sm font-semibold text-primary tracking-wider">
              {format(currentMonth, "yyyy")}
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-card-foreground tracking-wide">
              {format(currentMonth, "MMMM").toUpperCase()}
            </h2>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pt-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar + Notes Layout */}
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 p-4 md:p-6">
          {/* Notes Section (left on desktop, below on mobile) */}
          <div className="order-2 lg:order-1 lg:w-56 shrink-0 mt-4 lg:mt-0">
            <h3 className="text-xs font-bold text-foreground tracking-wider mb-3 uppercase">
              Notes
            </h3>
            {/* General month notes */}
            <textarea
              value={generalNote}
              onChange={(e) =>
                setMonthNotes((prev) => ({ ...prev, [monthKey]: e.target.value }))
              }
              placeholder="Month notes..."
              className="w-full h-24 lg:h-32 border-b border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary transition-colors p-1"
            />

            {/* Range-specific notes */}
            {rangeStart && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    {rangeEnd
                      ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`
                      : format(rangeStart, "MMM d")}
                  </p>
                  <button
                    onClick={addNote}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    <StickyNote className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedRangeNotes.map((note, i) => {
                    const globalIndex = notes.indexOf(note);
                    return (
                      <div key={globalIndex} className="flex items-start gap-1">
                        <input
                          type="text"
                          value={note.text}
                          onChange={(e) => updateNote(globalIndex, e.target.value)}
                          placeholder="Add a note..."
                          className="flex-1 border-b border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary p-1"
                        />
                        <button
                          onClick={() => removeNote(globalIndex)}
                          className="text-muted-foreground hover:text-destructive mt-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Note lines decoration */}
            <div className="hidden lg:block mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-b border-border" />
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="order-1 lg:order-2 flex-1">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`text-center text-xs font-bold tracking-wider py-2 ${
                    i >= 5 ? "text-calendar-weekend" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const inMonth = isSameMonth(day, currentMonth);
                const inRange = isInRange(day);
                const isStart = rangeStart && isSameDay(day, rangeStart);
                const isEnd = rangeEnd && isSameDay(day, rangeEnd);
                const weekend = isWeekend(day);
                const noted = hasNote(day);
                const today = isSameDay(day, new Date());

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => !rangeEnd && rangeStart && setHoveredDate(day)}
                    onMouseLeave={() => setHoveredDate(null)}
                    disabled={!inMonth}
                    className={`
                      relative aspect-square flex items-center justify-center text-sm font-medium
                      transition-all duration-150 rounded-md
                      ${!inMonth ? "text-muted-foreground/30 cursor-default" : "cursor-pointer hover:bg-accent"}
                      ${inMonth && weekend && !inRange && !isStart && !isEnd ? "text-calendar-weekend" : ""}
                      ${inMonth && !weekend && !inRange && !isStart && !isEnd ? "text-foreground" : ""}
                      ${inRange && !isStart && !isEnd ? "bg-calendar-range text-calendar-range-foreground" : ""}
                      ${isStart || isEnd ? "bg-primary text-primary-foreground font-bold rounded-md shadow-md" : ""}
                      ${today && !isStart && !isEnd ? "ring-2 ring-primary/30 ring-offset-1" : ""}
                    `}
                  >
                    {format(day, "d")}
                    {noted && inMonth && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Range indicator */}
            {rangeStart && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded bg-primary" />
                <span>
                  {rangeEnd
                    ? `Selected: ${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`
                    : `Start: ${format(rangeStart, "MMM d")} — click another day to set end`}
                </span>
                <button
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                  }}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Spiral binding decoration */}
        <div className="h-2 bg-gradient-to-r from-border via-muted to-border" />
      </div>
    </div>
  );
}
