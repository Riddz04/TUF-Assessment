# My Calendar View

An interactive wall calendar application with a realistic spiral-bound design, date range selection, and note-taking capabilities.

## Tech Stack & Choices

| Category | Technology | Rationale |
|----------|------------|-----------|
| **Framework** | [Vite](https://vitejs.dev/) + [React](https://react.dev/) | Fast HMR, optimized builds, modern dev experience |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type safety, better IDE support, fewer runtime errors |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Utility-first, rapid UI development, consistent design system |
| **Components** | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) | Accessible, composable, unstyled primitives |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | Declarative animations, gesture support, AnimatePresence for mount/unmount |
| **Date Logic** | [date-fns](https://date-fns.org/) | Modular, tree-shakeable, functional date utilities |
| **Icons** | [Lucide React](https://lucide.dev/) | Consistent, customizable, lightweight |
| **Testing** | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | Fast unit tests + reliable E2E testing |

## Key Features

- **Wall Calendar Aesthetic**: Spiral binding design with page-flip animations when navigating months
- **Date Range Selection**: Click to start, click again to end — visual feedback with hover preview
- **Note Taking**: Add notes to specific dates within a selected range
- **Month Notes**: General notes section per month for reminders
- **Responsive Layout**: Calendar grid adapts from mobile to desktop; notes sidebar moves below on small screens
- **Visual Polish**: Hero image header, weekday indicators, weekend highlighting, today's date marker

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components (Button, Tooltip, etc.)
│   └── WallCalendar.tsx   # Main calendar component
├── hooks/            # Custom React hooks (use-mobile, use-toast)
├── lib/              # Utilities (cn helper for Tailwind)
├── assets/           # Static assets (calendar-hero.jpg)
└── pages/            # Route pages (Index, NotFound)
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Install Dependencies

```bash
bun install
# or
npm install
```

### Run Development Server

```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
bun run build
# or
npm run build
```

### Run Tests

```bash
# Unit tests
bun run test

# E2E tests
bunx playwright test
```

## Design Decisions

1. **State Management**: Used React `useState` for simplicity — no external state library needed for a single-user calendar.

2. **Animations**: Implemented 3D flip effect using Framer Motion's `rotateX` with `perspective` CSS for realistic page-turning.

3. **Date Persistence**: Notes are stored in component state (ephemeral). For persistence, integrate with `localStorage` or a backend API.

4. **Accessibility**: Buttons have proper focus states; color contrast meets WCAG guidelines through shadcn/ui's default tokens.

5. **Performance**: `useMemo` for calendar grid calculation; `useCallback` for event handlers to prevent unnecessary re-renders.
