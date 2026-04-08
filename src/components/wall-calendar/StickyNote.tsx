import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface StickyNoteProps {
  id: string;
  text: string;
  color: string;
  position: { x: number; y: number };
  rotation: number;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  dateLabel: string;
}

const STICKY_COLORS: Record<string, { bg: string; shadow: string; tape: string }> = {
  yellow: {
    bg: "linear-gradient(135deg, hsl(48, 96%, 76%) 0%, hsl(45, 90%, 70%) 100%)",
    shadow: "hsla(45, 50%, 40%, 0.25)",
    tape: "hsla(45, 20%, 80%, 0.6)",
  },
  pink: {
    bg: "linear-gradient(135deg, hsl(340, 80%, 82%) 0%, hsl(335, 75%, 76%) 100%)",
    shadow: "hsla(340, 40%, 40%, 0.25)",
    tape: "hsla(340, 20%, 85%, 0.6)",
  },
  blue: {
    bg: "linear-gradient(135deg, hsl(207, 80%, 82%) 0%, hsl(210, 75%, 76%) 100%)",
    shadow: "hsla(207, 40%, 40%, 0.25)",
    tape: "hsla(207, 20%, 85%, 0.6)",
  },
  green: {
    bg: "linear-gradient(135deg, hsl(130, 60%, 78%) 0%, hsl(135, 55%, 72%) 100%)",
    shadow: "hsla(130, 40%, 35%, 0.25)",
    tape: "hsla(130, 20%, 82%, 0.6)",
  },
  orange: {
    bg: "linear-gradient(135deg, hsl(30, 90%, 78%) 0%, hsl(25, 85%, 72%) 100%)",
    shadow: "hsla(30, 50%, 40%, 0.25)",
    tape: "hsla(30, 20%, 82%, 0.6)",
  },
};

export default function StickyNote({
  id,
  text,
  color,
  position,
  rotation,
  onUpdate,
  onRemove,
  dateLabel,
}: StickyNoteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colors = STICKY_COLORS[color] || STICKY_COLORS.yellow;

  return (
    <motion.div
      className="absolute z-30 select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: "clamp(120px, 12vw, 160px)",
      }}
      initial={{ scale: 0, rotate: rotation - 15, opacity: 0, y: -40 }}
      animate={{ scale: 1, rotate: rotation, opacity: 1, y: 0 }}
      exit={{ scale: 0, rotate: rotation + 20, opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08, rotate: 0, zIndex: 50 }}
      drag
      dragMomentum={false}
    >
      {/* Tape strip */}
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-10 h-5 rounded-sm z-10"
        style={{
          background: colors.tape,
          transform: `translateX(-50%) rotate(${rotation > 0 ? -2 : 2}deg)`,
        }}
      />
      {/* Note body */}
      <div
        className="relative rounded-sm pt-4 pb-2 px-3 cursor-grab active:cursor-grabbing"
        style={{
          background: colors.bg,
          boxShadow: `2px 4px 12px ${colors.shadow}, 0 1px 3px hsla(0,0%,0%,0.08)`,
        }}
      >
        {/* Date label */}
        <p className="text-[9px] font-bold tracking-wider mb-1" style={{ color: "hsla(0,0%,20%,0.55)" }}>
          {dateLabel}
        </p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onUpdate(id, e.target.value)}
          placeholder="Write note..."
          rows={3}
          className="w-full bg-transparent resize-none text-xs leading-relaxed focus:outline-none placeholder:opacity-40"
          style={{ color: "hsl(0,0%,15%)", fontFamily: "'Caveat', cursive, sans-serif" }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
          style={{ background: "hsla(0, 60%, 50%, 0.85)", boxShadow: "0 1px 4px hsla(0,0%,0%,0.2)" }}
        >
          <X className="w-3 h-3" style={{ color: "hsl(0,0%,100%)" }} />
        </button>
        {/* Curled corner */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4"
          style={{
            background: `linear-gradient(225deg, hsla(0,0%,100%,0.3) 0%, transparent 50%)`,
            borderRadius: "0 0 2px 0",
          }}
        />
      </div>
    </motion.div>
  );
}

export const STICKY_COLOR_KEYS = Object.keys(STICKY_COLORS);
