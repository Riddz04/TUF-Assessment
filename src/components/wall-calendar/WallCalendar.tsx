import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import CalendarGrid from "./CalendarGrid";
import StickyNote, { STICKY_COLOR_KEYS } from "./StickyNote";

// Light mode seasonal palettes
const LIGHT_PALETTES: Record<number, { wall: [string, string]; glow: string; accent: string }> = {
  0:  { wall: ["hsl(210, 18%, 88%)", "hsl(215, 15%, 82%)"], glow: "hsl(210, 30%, 85%)", accent: "hsl(210, 40%, 70%)" },
  1:  { wall: ["hsl(215, 16%, 87%)", "hsl(220, 14%, 81%)"], glow: "hsl(215, 28%, 84%)", accent: "hsl(220, 35%, 72%)" },
  2:  { wall: ["hsl(140, 14%, 88%)", "hsl(150, 12%, 83%)"], glow: "hsl(140, 25%, 85%)", accent: "hsl(150, 30%, 70%)" },
  3:  { wall: ["hsl(120, 12%, 89%)", "hsl(130, 10%, 84%)"], glow: "hsl(120, 20%, 86%)", accent: "hsl(130, 28%, 72%)" },
  4:  { wall: ["hsl(80, 14%, 89%)", "hsl(90, 12%, 84%)"],   glow: "hsl(80, 22%, 86%)",  accent: "hsl(90, 30%, 70%)" },
  5:  { wall: ["hsl(45, 18%, 89%)", "hsl(40, 16%, 83%)"],   glow: "hsl(45, 28%, 86%)",  accent: "hsl(40, 35%, 72%)" },
  6:  { wall: ["hsl(35, 22%, 89%)", "hsl(30, 20%, 82%)"],   glow: "hsl(35, 32%, 85%)",  accent: "hsl(30, 40%, 70%)" },
  7:  { wall: ["hsl(30, 24%, 88%)", "hsl(25, 22%, 81%)"],   glow: "hsl(30, 35%, 84%)",  accent: "hsl(25, 42%, 68%)" },
  8:  { wall: ["hsl(25, 18%, 88%)", "hsl(20, 16%, 83%)"],   glow: "hsl(25, 28%, 85%)",  accent: "hsl(20, 35%, 70%)" },
  9:  { wall: ["hsl(18, 16%, 87%)", "hsl(15, 14%, 82%)"],   glow: "hsl(18, 25%, 84%)",  accent: "hsl(15, 32%, 68%)" },
  10: { wall: ["hsl(220, 14%, 87%)", "hsl(225, 12%, 82%)"], glow: "hsl(220, 22%, 84%)", accent: "hsl(225, 28%, 70%)" },
  11: { wall: ["hsl(210, 20%, 90%)", "hsl(215, 18%, 84%)"], glow: "hsl(210, 30%, 87%)", accent: "hsl(215, 35%, 74%)" },
};

// Dark mode: cozy warm lamp-lit wall
const DARK_PALETTES: Record<number, { wall: [string, string]; glow: string; accent: string }> = {
  0:  { wall: ["hsl(220, 15%, 12%)", "hsl(225, 12%, 8%)"],  glow: "hsl(35, 50%, 25%)",  accent: "hsl(35, 60%, 35%)" },
  1:  { wall: ["hsl(225, 14%, 11%)", "hsl(230, 12%, 7%)"],  glow: "hsl(30, 45%, 24%)",  accent: "hsl(30, 55%, 33%)" },
  2:  { wall: ["hsl(160, 10%, 12%)", "hsl(170, 8%, 8%)"],   glow: "hsl(38, 48%, 26%)",  accent: "hsl(40, 50%, 34%)" },
  3:  { wall: ["hsl(140, 8%, 12%)", "hsl(150, 6%, 8%)"],    glow: "hsl(35, 50%, 27%)",  accent: "hsl(38, 55%, 35%)" },
  4:  { wall: ["hsl(100, 8%, 12%)", "hsl(110, 6%, 8%)"],    glow: "hsl(40, 52%, 28%)",  accent: "hsl(42, 55%, 36%)" },
  5:  { wall: ["hsl(40, 12%, 13%)", "hsl(35, 10%, 8%)"],    glow: "hsl(35, 55%, 30%)",  accent: "hsl(30, 60%, 38%)" },
  6:  { wall: ["hsl(30, 14%, 13%)", "hsl(25, 12%, 8%)"],    glow: "hsl(30, 58%, 32%)",  accent: "hsl(25, 62%, 40%)" },
  7:  { wall: ["hsl(25, 16%, 13%)", "hsl(20, 14%, 8%)"],    glow: "hsl(28, 60%, 33%)",  accent: "hsl(22, 65%, 40%)" },
  8:  { wall: ["hsl(22, 14%, 12%)", "hsl(18, 12%, 8%)"],    glow: "hsl(32, 55%, 30%)",  accent: "hsl(28, 58%, 38%)" },
  9:  { wall: ["hsl(18, 12%, 12%)", "hsl(14, 10%, 8%)"],    glow: "hsl(30, 50%, 28%)",  accent: "hsl(25, 55%, 36%)" },
  10: { wall: ["hsl(230, 12%, 11%)", "hsl(235, 10%, 7%)"],  glow: "hsl(33, 48%, 25%)",  accent: "hsl(30, 52%, 33%)" },
  11: { wall: ["hsl(220, 16%, 12%)", "hsl(225, 14%, 8%)"],  glow: "hsl(35, 52%, 27%)",  accent: "hsl(32, 58%, 35%)" },
};

interface NoteData {
  id: string;
  date: string;
  text: string;
  color: string;
  position: { x: number; y: number };
  rotation: number;
}

const NOTE_SIZE = { w: 13, h: 16 }; // approximate note size in vw/vh %
const MAX_NOTES = 12;

/**
 * Given the calendar's bounding box (in % of viewport), find available
 * positions on the wall that don't overlap the calendar or other notes.
 */
function findNotePosition(
  calRect: { x: number; y: number; w: number; h: number },
  existingNotes: { x: number; y: number }[]
): { x: number; y: number } {
  // Candidate zones: left of cal, right of cal, below cal, above cal
  const zones: { xMin: number; xMax: number; yMin: number; yMax: number }[] = [];

  // Right side
  if (calRect.x + calRect.w + NOTE_SIZE.w + 2 < 96) {
    zones.push({ xMin: calRect.x + calRect.w + 2, xMax: 96 - NOTE_SIZE.w, yMin: 4, yMax: 92 - NOTE_SIZE.h });
  }
  // Left side
  if (calRect.x - NOTE_SIZE.w - 2 > 2) {
    zones.push({ xMin: 2, xMax: calRect.x - NOTE_SIZE.w - 2, yMin: 4, yMax: 92 - NOTE_SIZE.h });
  }
  // Below
  if (calRect.y + calRect.h + NOTE_SIZE.h + 2 < 96) {
    zones.push({ xMin: 4, xMax: 92 - NOTE_SIZE.w, yMin: calRect.y + calRect.h + 2, yMax: 96 - NOTE_SIZE.h });
  }
  // Above
  if (calRect.y - NOTE_SIZE.h - 2 > 2) {
    zones.push({ xMin: 4, xMax: 92 - NOTE_SIZE.w, yMin: 2, yMax: calRect.y - NOTE_SIZE.h - 2 });
  }

  // Fallback: anywhere on the wall
  if (zones.length === 0) {
    zones.push({ xMin: 2, xMax: 92 - NOTE_SIZE.w, yMin: 4, yMax: 92 - NOTE_SIZE.h });
  }

  const overlaps = (x: number, y: number) => {
    for (const n of existingNotes) {
      if (Math.abs(n.x - x) < NOTE_SIZE.w + 1 && Math.abs(n.y - y) < NOTE_SIZE.h + 1) return true;
    }
    // Also check calendar overlap
    if (
      x + NOTE_SIZE.w > calRect.x - 1 &&
      x < calRect.x + calRect.w + 1 &&
      y + NOTE_SIZE.h > calRect.y - 1 &&
      y < calRect.y + calRect.h + 1
    ) return true;
    return false;
  };

  // Try to place in each zone, picking first non-overlapping spot
  for (const zone of zones) {
    const xRange = zone.xMax - zone.xMin;
    const yRange = zone.yMax - zone.yMin;
    if (xRange < 1 || yRange < 1) continue;

    // Try a few candidates with organic spacing
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = zone.xMin + Math.random() * xRange;
      const y = zone.yMin + Math.random() * yRange;
      if (!overlaps(x, y)) return { x, y };
    }
  }

  // Last resort: random position
  return {
    x: 2 + Math.random() * (90 - NOTE_SIZE.w),
    y: 4 + Math.random() * (88 - NOTE_SIZE.h),
  };
}

const flipVariants = {
  enter: (dir: number) => ({
    rotateX: dir > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    rotateX: 0,
    opacity: 1,
    scale: 1,
    transition: {
      rotateX: { type: "spring" as const, stiffness: 200, damping: 22, duration: 0.3 },
      opacity: { duration: 0.15 },
      scale: { duration: 0.15 },
    },
  },
  exit: (dir: number) => ({
    rotateX: dir > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.98,
    transition: {
      rotateX: { type: "spring" as const, stiffness: 200, damping: 22, duration: 0.25 },
      opacity: { duration: 0.12 },
    },
  }),
};

export default function WallCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendar drag position (pixels from center)
  const calX = useMotionValue(0);
  const calY = useMotionValue(0);

  // Track calendar position as % for note placement
  const [calCenterPct, setCalCenterPct] = useState({ x: 50, y: 50 });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Update calendar center % on drag
  const handleCalDrag = useCallback((_: any, info: PanInfo) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2 + calX.get();
    const cy = rect.height / 2 + calY.get();
    setCalCenterPct({
      x: (cx / rect.width) * 100,
      y: (cy / rect.height) * 100,
    });
  }, [calX, calY]);

  const getCalRect = useCallback(() => {
    // Calendar card approx dimensions in % of viewport
    const w = 36; // ~520px / 1440 * 100
    const h = 72; // ~580px / 800 * 100
    return {
      x: calCenterPct.x - w / 2,
      y: calCenterPct.y - h / 2,
      w,
      h,
    };
  }, [calCenterPct]);

  const monthKey = format(currentMonth, "yyyy-MM");

  const playFlipSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 0.15;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 40);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
      source.onended = () => ctx.close();
    } catch {}
  }, []);

  const navigateMonth = (dir: "next" | "prev") => {
    playFlipSound();
    setDirection(dir === "next" ? 1 : -1);
    setCurrentMonth(dir === "next" ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const addStickyNote = useCallback((day: Date) => {
    if (!isSameMonth(day, currentMonth)) return;
    if (notes.length >= MAX_NOTES) return;

    const calRect = getCalRect();
    const existingPositions = notes.map((n) => n.position);
    const position = findNotePosition(calRect, existingPositions);
    const colorIdx = notes.length % STICKY_COLOR_KEYS.length;

    const newNote: NoteData = {
      id: `note-${Date.now()}`,
      date: format(day, "yyyy-MM-dd"),
      text: "",
      color: STICKY_COLOR_KEYS[colorIdx],
      position,
      rotation: Math.random() * 8 - 4,
    };
    setNotes((prev) => [...prev, newNote]);
  }, [currentMonth, notes, getCalRect]);

  const updateNote = (id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const noteDates = useMemo(() => new Set(notes.map((n) => n.date)), [notes]);

  const palettes = isDark ? DARK_PALETTES : LIGHT_PALETTES;
  const palette = palettes[currentMonth.getMonth()];

  // Recalculate note positions when calendar moves significantly
  useEffect(() => {
    if (notes.length === 0) return;
    const calRect = getCalRect();
    const newPositions: { x: number; y: number }[] = [];

    setNotes((prev) =>
      prev.map((note) => {
        const pos = findNotePosition(calRect, newPositions);
        newPositions.push(pos);
        return { ...note, position: pos };
      })
    );
    // Only re-run when calendar center changes meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(calCenterPct.x / 8), Math.round(calCenterPct.y / 8)]);

  return (
    <motion.div
      ref={containerRef}
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

      {/* Ambient light / lamp glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: isDark
            ? `radial-gradient(ellipse at 50% 0%, ${palette.glow}90 0%, ${palette.glow}30 25%, transparent 60%)`
            : `radial-gradient(ellipse at 50% 30%, ${palette.accent}15 0%, transparent 70%)`,
        }}
        transition={{ duration: 1.2 }}
      />

      {/* Dark mode warm vignette */}
      <AnimatePresence>
        {isDark && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              background: "radial-gradient(ellipse at 50% 40%, transparent 30%, hsla(20, 30%, 5%, 0.5) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Dark mode toggle */}
      <motion.button
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm border transition-colors"
        style={{
          background: isDark ? "hsla(35, 40%, 20%, 0.7)" : "hsla(0, 0%, 100%, 0.6)",
          borderColor: isDark ? "hsla(35, 30%, 30%, 0.5)" : "hsla(0, 0%, 0%, 0.08)",
        }}
        onClick={() => setIsDark(!isDark)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={isDark ? "Switch to day mode" : "Switch to night mode"}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div key="sun" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.3 }}>
              <Sun className="w-4.5 h-4.5" style={{ color: "hsl(35, 70%, 60%)" }} />
            </motion.div>
          ) : (
            <motion.div key="moon" initial={{ rotate: 90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.3 }}>
              <Moon className="w-4.5 h-4.5 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Hint text */}
      <motion.p
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50 tracking-wider z-50 select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        Double-click a date to add a note • Drag the calendar to reposition
      </motion.p>

      {/* Sticky notes floating on the wall */}
      <AnimatePresence>
        {notes.map((note, i) => (
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
            delay={i * 0.06}
          />
        ))}
      </AnimatePresence>

      {/* Draggable calendar card */}
      <motion.div
        className="relative z-10 flex flex-col cursor-grab active:cursor-grabbing"
        style={{
          width: "min(90vw, 520px)",
          height: "min(82vh, 580px)",
          perspective: "1200px",
          x: calX,
          y: calY,
        }}
        drag
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={containerRef}
        onDrag={handleCalDrag}
        onDragEnd={handleCalDrag}
        whileDrag={{ scale: 1.02 }}
      >
        {/* Wall shadow behind calendar */}
        <div
          className="absolute inset-0 rounded-2xl -z-10"
          style={{
            background: isDark ? "hsla(0, 0%, 0%, 0.4)" : "hsla(0, 0%, 0%, 0.12)",
            filter: isDark ? "blur(45px)" : "blur(35px)",
            transform: "translate(5px, 12px)",
          }}
        />

        {/* Pin */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40">
          <div className="relative">
            <div className="w-5 h-5 rounded-full bg-destructive shadow-lg shadow-destructive/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive-foreground/50" />
          </div>
        </div>

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
            {/* Month header */}
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
                noteDates={noteDates}
                onDayDoubleClick={addStickyNote}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onRangeChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
              />
            </div>

            {/* Note count indicator */}
            {notes.length > 0 && (
              <div className="px-4 pb-2 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-[10px] text-muted-foreground">
                  {notes.length} note{notes.length !== 1 ? "s" : ""}{notes.length >= MAX_NOTES ? " (max)" : ""}
                </span>
              </div>
            )}

            {/* Bottom accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 rounded-b-xl" />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
