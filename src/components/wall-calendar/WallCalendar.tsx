import { useState, useMemo, useCallback } from "react";
import {
  format,
  addMonths,
  subMonths,
  isBefore,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CalendarGrid from "./CalendarGrid";
import StickyNote, { STICKY_COLOR_KEYS } from "./StickyNote";

// Seasonal wall palettes: [wallGradientStart, wallGradientEnd, accentGlow, warmth]
const MONTH_PALETTES: Record<number, { wall: [string, string]; glow: string; accent: string }> = {
  0:  { wall: ["hsl(210, 18%, 88%)", "hsl(215, 15%, 82%)"], glow: "hsl(210, 30%, 85%)", accent: "hsl(210, 40%, 70%)" },  // Jan - cool blue-grey
  1:  { wall: ["hsl(215, 16%, 87%)", "hsl(220, 14%, 81%)"], glow: "hsl(215, 28%, 84%)", accent: "hsl(220, 35%, 72%)" },  // Feb - steel blue
  2:  { wall: ["hsl(140, 14%, 88%)", "hsl(150, 12%, 83%)"], glow: "hsl(140, 25%, 85%)", accent: "hsl(150, 30%, 70%)" },  // Mar - soft sage
  3:  { wall: ["hsl(120, 12%, 89%)", "hsl(130, 10%, 84%)"], glow: "hsl(120, 20%, 86%)", accent: "hsl(130, 28%, 72%)" },  // Apr - spring green
  4:  { wall: ["hsl(80, 14%, 89%)", "hsl(90, 12%, 84%)"],   glow: "hsl(80, 22%, 86%)",  accent: "hsl(90, 30%, 70%)" },   // May - lime
  5:  { wall: ["hsl(45, 18%, 89%)", "hsl(40, 16%, 83%)"],   glow: "hsl(45, 28%, 86%)",  accent: "hsl(40, 35%, 72%)" },   // Jun - warm gold
  6:  { wall: ["hsl(35, 22%, 89%)", "hsl(30, 20%, 82%)"],   glow: "hsl(35, 32%, 85%)",  accent: "hsl(30, 40%, 70%)" },   // Jul - sunlit amber
  7:  { wall: ["hsl(30, 24%, 88%)", "hsl(25, 22%, 81%)"],   glow: "hsl(30, 35%, 84%)",  accent: "hsl(25, 42%, 68%)" },   // Aug - warm peach
  8:  { wall: ["hsl(25, 18%, 88%)", "hsl(20, 16%, 83%)"],   glow: "hsl(25, 28%, 85%)",  accent: "hsl(20, 35%, 70%)" },   // Sep - harvest
  9:  { wall: ["hsl(18, 16%, 87%)", "hsl(15, 14%, 82%)"],   glow: "hsl(18, 25%, 84%)",  accent: "hsl(15, 32%, 68%)" },   // Oct - autumn rust
  10: { wall: ["hsl(220, 14%, 87%)", "hsl(225, 12%, 82%)"], glow: "hsl(220, 22%, 84%)", accent: "hsl(225, 28%, 70%)" },  // Nov - cool slate
  11: { wall: ["hsl(210, 20%, 90%)", "hsl(215, 18%, 84%)"], glow: "hsl(210, 30%, 87%)", accent: "hsl(215, 35%, 74%)" },  // Dec - icy blue
};

interface NoteData {
  id: string;
  date: string;
  text: string;
  color: string;
  position: { x: number; y: number };
  rotation: number;
}

// Predefined positions for sticky notes around the calendar
const NOTE_POSITIONS = [
  { x: 1, y: 8 },
  { x: 1, y: 42 },
  { x: 1, y: 72 },
  { x: 74, y: 5 },
  { x: 76, y: 38 },
  { x: 73, y: 70 },
  { x: 30, y: 82 },
  { x: 55, y: 84 },
];

const flipVariants = {
  enter: (dir: number) => ({
    rotateX: dir > 0 ? 90 : -90,
    opacity: 0,
    scale: 0.97,
    filter: "brightness(0.7)",
  }),
  center: {
    rotateX: 0,
    opacity: 1,
    scale: 1,
    filter: "brightness(1)",
    transition: {
      rotateX: { type: "spring" as const, stiffness: 80, damping: 18, duration: 0.7 },
      opacity: { duration: 0.35 },
      scale: { duration: 0.35 },
      filter: { duration: 0.4 },
    },
  },
  exit: (dir: number) => ({
    rotateX: dir > 0 ? -90 : 90,
    opacity: 0,
    scale: 0.97,
    filter: "brightness(0.7)",
    transition: {
      rotateX: { type: "spring" as const, stiffness: 80, damping: 18, duration: 0.55 },
      opacity: { duration: 0.25 },
    },
  }),
};

export default function WallCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<NoteData[]>([]);

  const monthKey = format(currentMonth, "yyyy-MM");

  const navigateMonth = (dir: "next" | "prev") => {
    setDirection(dir === "next" ? 1 : -1);
    setCurrentMonth(dir === "next" ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

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

  const addStickyNote = () => {
    if (!rangeStart) return;
    const existingCount = notes.length;
    const posIdx = existingCount % NOTE_POSITIONS.length;
    const pos = NOTE_POSITIONS[posIdx];
    const colorIdx = existingCount % STICKY_COLOR_KEYS.length;

    const newNote: NoteData = {
      id: `note-${Date.now()}`,
      date: format(rangeStart, "yyyy-MM-dd"),
      text: "",
      color: STICKY_COLOR_KEYS[colorIdx],
      position: {
        x: pos.x + (Math.random() * 4 - 2),
        y: pos.y + (Math.random() * 4 - 2),
      },
      rotation: Math.random() * 10 - 5,
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNote = (id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const noteDates = useMemo(() => new Set(notes.map((n) => n.date)), [notes]);

  const rangeLabel = useMemo(() => {
    if (!rangeStart) return null;
    if (rangeEnd) return `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`;
    return format(rangeStart, "MMM d");
  }, [rangeStart, rangeEnd]);

  const palette = MONTH_PALETTES[currentMonth.getMonth()];

  return (
    <motion.div
      className="h-screen w-screen overflow-hidden relative flex items-center justify-center"
      animate={{
        background: `
          radial-gradient(ellipse at 25% 15%, ${palette.glow} 0%, transparent 55%),
          radial-gradient(ellipse at 75% 85%, ${palette.accent}33 0%, transparent 50%),
          linear-gradient(170deg, ${palette.wall[0]} 0%, ${palette.wall[1]} 100%)
        `,
      }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      {/* Wall texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Subtle cross pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient light effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: `radial-gradient(ellipse at 50% 30%, ${palette.accent}15 0%, transparent 70%)`,
        }}
        transition={{ duration: 1.2 }}
      />

      {/* Shadow on the wall behind calendar */}
      <div
        className="absolute rounded-2xl"
        style={{
          width: "min(90vw, 520px)",
          height: "min(82vh, 580px)",
          background: "hsla(0, 0%, 0%, 0.1)",
          filter: "blur(35px)",
          transform: "translate(5px, 12px)",
        }}
      />

      {/* Pin */}
      <motion.div
        className="absolute z-40"
        style={{ top: "calc(50% - min(41vh, 290px) - 10px)" }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      >
        <div className="relative">
          <div className="w-5 h-5 rounded-full bg-destructive shadow-lg shadow-destructive/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive-foreground/50" />
        </div>
      </motion.div>

      {/* Sticky notes floating on the wall */}
      <AnimatePresence>
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            id={note.id}
            text={note.text}
            color={note.color}
            position={note.position}
            rotation={note.rotation}
            onUpdate={updateNote}
            onRemove={removeNote}
            dateLabel={format(new Date(note.date + "T00:00:00"), "MMM d")}
          />
        ))}
      </AnimatePresence>

      {/* Calendar card */}
      <div
        className="relative z-10 flex flex-col"
        style={{
          width: "min(90vw, 520px)",
          height: "min(82vh, 580px)",
          perspective: "1200px",
        }}
      >
        {/* Spiral holes */}
        <div className="flex justify-center gap-8 sm:gap-12 relative z-20 mb-[-4px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-foreground/15 bg-background/80 shadow-inner"
            />
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
            className="flex-1 flex flex-col bg-card rounded-b-xl overflow-hidden relative border border-border/30"
            style={{
              transformOrigin: "top center",
              transformStyle: "preserve-3d",
              boxShadow: `
                0 1px 4px hsla(0,0%,0%,0.06),
                0 4px 16px hsla(0,0%,0%,0.08),
                0 12px 32px hsla(0,0%,0%,0.1),
                0 24px 56px hsla(0,0%,0%,0.06),
                inset 0 1px 0 hsla(0,0%,100%,0.7)
              `,
            }}
          >
            {/* Month header with navigation */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2">
              <button
                onClick={() => navigateMonth("prev")}
                className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-[10px] font-medium hidden sm:inline">
                  {format(subMonths(currentMonth, 1), "MMM")}
                </span>
              </button>

              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="text-lg sm:text-xl font-black tracking-wider text-foreground">
                  {format(currentMonth, "MMMM").toUpperCase()}
                </h2>
                <p className="text-[10px] font-semibold text-primary tracking-[0.3em]">
                  {format(currentMonth, "yyyy")}
                </p>
              </motion.div>

              <button
                onClick={() => navigateMonth("next")}
                className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
              >
                <span className="text-[10px] font-medium hidden sm:inline">
                  {format(addMonths(currentMonth, 1), "MMM")}
                </span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Month dot indicator */}
            <div className="flex items-center justify-center gap-1 pb-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i === currentMonth.getMonth() ? "bg-primary" : "bg-border"
                  }`}
                  animate={{ scale: i === currentMonth.getMonth() ? 1.6 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                />
              ))}
            </div>

            <div className="h-px bg-border/50 mx-4" />

            {/* Calendar grid */}
            <div className="flex-1 px-3 sm:px-5 py-2 flex flex-col min-h-0">
              <CalendarGrid
                currentMonth={currentMonth}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hoveredDate={hoveredDate}
                noteDates={noteDates}
                onDayClick={handleDayClick}
                onDayHover={(d) => {
                  if (!rangeEnd && rangeStart) setHoveredDate(d);
                  else setHoveredDate(null);
                }}
              />
            </div>

            {/* Bottom action bar */}
            <AnimatePresence>
              {rangeStart && (
                <motion.div
                  className="px-4 sm:px-5 pb-3 pt-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary shadow-sm" />
                    <span className="text-[11px] font-medium text-muted-foreground flex-1">
                      {rangeLabel}
                      {!rangeEnd && " — click end date"}
                    </span>
                    <button
                      onClick={addStickyNote}
                      className="flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Sticky Note
                    </button>
                    <button
                      onClick={() => {
                        setRangeStart(null);
                        setRangeEnd(null);
                      }}
                      className="text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary/15 via-primary/50 to-primary/15" />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
