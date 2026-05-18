# Shadow Harness — Codebase Guide for Agents

## What this app does
Shadow Harness is an AI-powered weekly planner. The user inputs ranked goals, current state, and optional docs. Claude analyzes them, asks clarifying questions, then generates 3 plan variations the user can approve. The approved plan is stuffed into a mock calendar as time-blocked events.

## Tech Stack
- Next.js 15 App Router, TypeScript, Tailwind CSS 4
- `@anthropic-ai/sdk` — Claude claude-sonnet-4-6 for all AI calls (streaming)
- `zustand` with `persist` — global state across pages
- `@dnd-kit/*` — drag-to-reorder goals
- `pdfjs-dist` — client-side PDF text extraction

## File Map

```
src/
├── lib/
│   ├── types.ts            ← ALL shared TypeScript types (source of truth)
│   ├── store.ts            ← Zustand store (goals, answers, variations, calendarEvents)
│   ├── mock-calendar.ts    ← Static existing calendar events + DAYS_ORDER + WORK_HOURS
│   └── claude.ts           ← Anthropic client, model constant, system prompts
│
├── app/
│   ├── layout.tsx          ← Root layout, imports globals.css
│   ├── globals.css         ← CSS vars (--background, --accent, --card, --border, etc.)
│   ├── page.tsx            ← Landing page
│   ├── setup/page.tsx      ← Step 1: goals, current state, calendar preview, file upload
│   ├── review/page.tsx     ← Step 2: streams Claude questions, renders QuizQuestion
│   ├── plans/page.tsx      ← Step 3: streams plan variations, renders PlanCard grid
│   ├── calendar/page.tsx   ← Step 4: full week view of approved plan
│   └── api/
│       ├── analyze/route.ts        ← POST → streams Claude JSON {assessment, questions[]}
│       ├── generate-plans/route.ts ← POST → streams Claude JSON {variations[]}
│       └── calendar/route.ts       ← GET/POST/DELETE mock calendar in-memory store
│
└── components/
    ├── GoalsList.tsx        ← Drag-to-reorder goal list, inline add + double-click edit
    ├── CalendarWeekView.tsx ← Custom week grid, Mon–Sun, 7:00–22:00, per-type colors
    ├── QuizQuestion.tsx     ← Renders yesno/select/text question with styled inputs
    └── PlanCard.tsx         ← Plan variation card with compact CalendarWeekView
```

## Shared Types (src/lib/types.ts)
```ts
Goal          { id, text, priority }
CalendarEvent { id, title, day, startHour, endHour, description?, type, goalRef?, source }
Question      { id, text, type: "text"|"select"|"yesno", options? }
QuizAnswer    { questionId, answer }
PlanVariation { id, name, description, philosophy, events: CalendarEvent[] }
```

## Zustand Store Shape (src/lib/store.ts)
```ts
goals: Goal[]                       // set by setup page
currentState: string                // set by setup page
documentsContext: string            // extracted PDF/TXT text, set by setup page
assessment: string                  // set by review page after Claude streams
answers: QuizAnswer[]               // set by review page on submit
variations: PlanVariation[]         // set by plans page after Claude streams
selectedVariationId: string | null  // set by plans page when user picks a card
calendarEvents: CalendarEvent[]     // set by plans page on approve (mock + generated merged)
```

## CSS Variables (use these everywhere, no raw hex)
```
--background  #0a0a0a   page background
--foreground  #ededed   default text
--accent      #6366f1   indigo — primary CTA
--accent-light #818cf8  lighter indigo — labels, highlights
--muted       #1e1e2e   input backgrounds
--border      #2a2a3a   borders, dividers
--card        #111122   card backgrounds
```

## User Flow
```
/ (landing) → /setup → /review → /plans → /calendar
```
Each page has a breadcrumb nav showing the 4 steps. Store persists across navigation via sessionStorage.

## API Routes

### POST /api/analyze
Input: `{ goals, currentState, documentsContext, existingEvents }`
Output: streaming text → parse as `{ assessment: string, questions: Question[] }`

### POST /api/generate-plans
Input: `{ goals, currentState, documentsContext, existingEvents, questions, answers }`
Output: streaming text → parse as `{ variations: PlanVariation[] }`

### GET /api/calendar → `{ events: CalendarEvent[] }`
### POST /api/calendar `{ events }` → merges with mock events, returns merged
### DELETE /api/calendar → resets to mock only

---

## Agent Task Division

### Agent 1 (main / you) — Robustness & Store fixes
**Already in progress. Files owned:**
- `src/lib/store.ts` — add `questions: Question[]` field so review saves parsed questions; plans page passes them to generate-plans API
- `src/app/review/page.tsx` — save parsed questions to store; fix JSON parse (strip fences, catch malformed); add retry button on error
- `src/app/plans/page.tsx` — pull questions from store and pass to API payload; fix `useEffect` dependency on `fetchTrigger` already done
- `src/app/api/analyze/route.ts` — guard against empty goals array (return 400)
- `src/app/api/generate-plans/route.ts` — same input validation
- `src/app/api/calendar/route.ts` — persist calendar to `data/calendar.json` file instead of in-memory so it survives server restart

---

### Agent 2 — UI Polish & Animations
**Spin up a fresh agent. Hand it this file and say: "do Agent 2 tasks". Files owned:**
- `src/app/page.tsx` — enhance landing: animated gradient background, shadow silhouette visual, smoother step cards
- `src/app/setup/page.tsx` — character counter on current-state textarea; file upload drag-and-drop zone (replace label hack); section transitions
- `src/app/review/page.tsx` — animate questions appearing one at a time with fade-in; progress bar across questions; better streaming indicator (typing dots)
- `src/app/plans/page.tsx` — loading skeleton cards while generating; highlight key differences between plans (e.g. "+3 deep-work blocks vs Balanced")
- `src/app/calendar/page.tsx` — click an event to open a detail drawer/popover with full description and goalRef
- `src/components/CalendarWeekView.tsx` — hover tooltip on events; today-column highlight
- `src/components/PlanCard.tsx` — animated ring on selection; diff badge showing event count vs other plans
- `src/app/globals.css` — keyframe for fade-in-up, stagger delay utilities

**Do NOT touch:** API routes, store.ts, types.ts, claude.ts

---

### Agent 3 — Calendar & Data layer
**Spin up a fresh agent. Hand it this file and say: "do Agent 3 tasks". Files owned:**
- `src/app/api/calendar/route.ts` — real Google Calendar OAuth swap-in: add `GET /api/calendar/auth` and `GET /api/calendar/callback` routes using `googleapis` package; keep mock as fallback when `GOOGLE_CLIENT_ID` env is absent
- `src/lib/mock-calendar.ts` — make MOCK events date-aware (use actual next Monday as base date instead of day names only)
- `src/app/calendar/page.tsx` — "Export to Google Calendar" button (calls the auth route); show which events are synced vs local
- `src/app/setup/page.tsx` — "Connect Google Calendar" button that fetches real events from `/api/calendar` and replaces the mock preview
- New file: `src/lib/google-calendar.ts` — thin wrapper around googleapis client (auth, list events, insert event)
- New file: `src/app/api/calendar/auth/route.ts` — OAuth redirect
- New file: `src/app/api/calendar/callback/route.ts` — OAuth callback, store token in cookie

**Do NOT touch:** analyze route, generate-plans route, components, store.ts types

---

## Rules for All Agents
1. Never change `src/lib/types.ts` without updating all usages
2. Never change CSS variable names — use `var(--name)` via Tailwind arbitrary values like `bg-[var(--card)]`
3. All Claude calls stream — do not switch to non-streaming
4. The store uses `persist` from zustand/middleware — new fields need to be added to both the interface AND `initialState`
5. Use `crypto.randomUUID()` for new IDs
6. No new dependencies without checking package.json first
7. Each agent owns its files exclusively — do not edit another agent's files
