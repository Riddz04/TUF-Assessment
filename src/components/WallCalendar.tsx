import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, StickyNote, X, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroImage from "@/assets/calendar-hero.jpg";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface DateNote {
  date: string;
  text: string;
}

export default function WallCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [direction, setDirection] = useState(0); // -1 prev, 1 next
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<DateNote[]>([]);
  const [monthNotes, setMonthNotes] = useState<Record<string, string>>({});

  const monthKey = format(currentMonth, "yyyy-MM");
  const generalNote = monthNotes[monthKey] || "";

  const navigateMonth = (dir: "next" | "prev") => {
    setDirection(dir === "next" ? 1 : -1);
    setCurrentMonth(dir === "next" ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

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

  // Flip variants for the calendar page
  const flipVariants = {
    enter: (dir: number) => ({
      rotateX: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      rotateX: 0,
      opacity: 1,
      scale: 1,
      transition: {
        rotateX: { type: "spring", stiffness: 100, damping: 20, duration: 0.6 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
      },
    },
    exit: (dir: number) => ({
      rotateX: dir > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.95,
      transition: {
        rotateX: { type: "spring", stiffness: 100, damping: 20, duration: 0.5 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
      },
    }),
  };

  // Staggered day cell variants
  const dayVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.85 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.012,
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl" style={{ perspective: "1200px" }}>
        {/* Spiral binding */}
        <div className="flex justify-center gap-6 md:gap-10 relative z-20 mb-[-6px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-foreground/20 bg-background shadow-inner" />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={monthKey}
            custom={direction}
            variants={flipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="bg-card rounded-b-xl shadow-2xl overflow-hidden relative"
            style={{ transformOrigin: "top center", transformStyle: "preserve-3d" }}
          >
            {/* Hero Image Section */}
            <div className="relative overflow-hidden">
              <motion.img
                src={heroImage}
                alt="Monthly landscape"
                className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover"
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
              <svg
                className="absolute bottom-0 left-0 w-full"
                viewBox="0 0 1200 100"
                preserveAspectRatio="none"
                style={{ height: "80px" }}
              >
                <path
                  d="M0,100 L0,50 Q200,10 400,40 Q600,70 800,30 Q1000,0 1200,35 L1200,100 Z"
                  className="fill-primary/70"
                />
                <path
                  d="M0,100 L0,65 Q300,30 600,60 Q900,90 1200,50 L1200,100 Z"
                  className="fill-card"
                />
              </svg>
              {/* Month & Year */}
              <motion.div
                className="absolute bottom-5 right-6 md:right-10 text-right z-10"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <p className="text-sm font-semibold text-primary tracking-[0.25em] drop-shadow-sm">
                  {format(currentMonth, "yyyy")}
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-card-foreground tracking-wider drop-shadow-sm">
                  {format(currentMonth, "MMMM").toUpperCase()}
                </h2>
              </motion.div>
              <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-card/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <button
                onClick={() => navigateMonth("prev")}
                className="group flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-xs font-medium hidden sm:inline">
                  {format(subMonths(currentMonth, 1), "MMM")}
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                      i === currentMonth.getMonth() ? "bg-primary" : "bg-border"
                    }`}
                    animate={{
                      scale: i === currentMonth.getMonth() ? 1.4 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  />
                ))}
              </div>
              <button
                onClick={() => navigateMonth("next")}
                className="group flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs font-medium hidden sm:inline">
                  {format(addMonths(currentMonth, 1), "MMM")}
                </span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Calendar + Notes Layout */}
            <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 p-4 md:p-6 lg:p-8">
              {/* Notes Section */}
              <div className="order-2 lg:order-1 lg:w-56 shrink-0 mt-6 lg:mt-0">
                <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] mb-3 uppercase flex items-center gap-2">
                  <StickyNote className="w-3.5 h-3.5" />
                  Notes
                </h3>
                <textarea
                  value={generalNote}
                  onChange={(e) =>
                    setMonthNotes((prev) => ({ ...prev, [monthKey]: e.target.value }))
                  }
                  placeholder="Write notes for this month..."
                  className="w-full h-24 lg:h-32 border border-border rounded-lg bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all p-3"
                />

                <AnimatePresence>
                  {rangeStart && (
                    <motion.div
                      className="mt-4"
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-foreground">
                          {rangeEnd
                            ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`
                            : format(rangeStart, "MMM d")}
                        </p>
                        <button
                          onClick={addNote}
                          className="text-xs bg-primary/10 text-primary hover:bg-primary/20 font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
                        >
                          <StickyNote className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedRangeNotes.map((note) => {
                          const globalIndex = notes.indexOf(note);
                          return (
                            <motion.div
                              key={globalIndex}
                              className="flex items-center gap-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <input
                                type="text"
                                value={note.text}
                                onChange={(e) => updateNote(globalIndex, e.target.value)}
                                placeholder="Add a note..."
                                className="flex-1 border-b border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary py-1 transition-colors"
                              />
                              <button
                                onClick={() => removeNote(globalIndex)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="hidden lg:block mt-5 space-y-[18px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border-b border-border/60" />
                  ))}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="order-1 lg:order-2 flex-1">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((day, i) => (
                    <div
                      key={day}
                      className={`text-center text-[10px] md:text-xs font-bold tracking-[0.15em] py-2 ${
                        i >= 5 ? "text-calendar-weekend" : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border mb-1" />

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-px">
                  {calendarDays.map((day, idx) => {
                    const inMonth = isSameMonth(day, currentMonth);
                    const inRange = isInRange(day);
                    const isStart = rangeStart && isSameDay(day, rangeStart);
                    const isEnd = rangeEnd && isSameDay(day, rangeEnd);
                    const weekend = isWeekend(day);
                    const noted = hasNote(day);
                    const today = isSameDay(day, new Date());

                    return (
                      <motion.button
                        key={idx}
                        custom={idx}
                        variants={dayVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => !rangeEnd && rangeStart && setHoveredDate(day)}
                        onMouseLeave={() => setHoveredDate(null)}
                        disabled={!inMonth}
                        whileHover={inMonth ? { scale: 1.15, y: -2 } : {}}
                        whileTap={inMonth ? { scale: 0.92 } : {}}
                        className={`
                          relative aspect-square flex items-center justify-center text-sm md:text-base font-medium
                          transition-colors duration-200 rounded-lg
                          ${!inMonth ? "text-muted-foreground/20 cursor-default" : "cursor-pointer"}
                          ${inMonth && !inRange && !isStart && !isEnd && weekend ? "text-calendar-weekend" : ""}
                          ${inMonth && !inRange && !isStart && !isEnd && !weekend ? "text-foreground" : ""}
                          ${inRange && !isStart && !isEnd ? "bg-calendar-range text-calendar-range-foreground" : ""}
                          ${isStart ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 z-10 rounded-lg" : ""}
                          ${isEnd ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 z-10 rounded-lg" : ""}
                          ${today && !isStart && !isEnd ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-card font-semibold" : ""}
                        `}
                      >
                        {format(day, "d")}
                        {noted && inMonth && (
                          <motion.span
                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          />
                        )}
                        {today && !isStart && !isEnd && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Range indicator */}
                <AnimatePresence>
                  {rangeStart && (
                    <motion.div
                      className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <span className="inline-block w-3 h-3 rounded bg-primary shadow-sm" />
                      <span className="font-medium">
                        {rangeEnd
                          ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`
                          : `${format(rangeStart, "MMM d")} — click another day to set end`}
                      </span>
                      <button
                        onClick={() => {
                          setRangeStart(null);
                          setRangeEnd(null);
                        }}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors text-xs font-medium"
                      >
                        Clear
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
