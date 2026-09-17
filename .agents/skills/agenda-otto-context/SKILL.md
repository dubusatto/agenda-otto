---
name: agenda-otto-context
description: "Load before editing Agenda Otto. Use when an agent is about to modify any file in this Next.js/Prisma calendar project."
disable-model-invocation: true
---

# Agenda Otto — Project Context (read before changing anything)

This is a Next.js 16 (App Router) + React 19 + Tailwind 4 + Prisma 5 + next-auth 4
calendar app that aggregates **Google Calendar** (read-only feed) with **Google Tasks**,
letting a user drag a Task onto a calendar grid to create a *Scheduled Task* that is
stored **only in local PostgreSQL** (never synced back to Google Calendar — ADR-0001).
It is a **personal, single-per-Google-account** app; the `userEmail` from the session is
the tenant key.

> Do NOT confuse this with the multi-tenant finance project in your training memory
> (Postgres medallion pipeline / Supabase / FastAPI). That is a different codebase.

---

## 1. Domain glossary (use these terms; avoid the bracketed ones)

- **Calendar Source** — a Google Calendar feed (e.g. "Primary", "Work"). Many are aggregated.
- **Scheduled Task** — a local-DB task with start/end/duration (default 30 min) derived from a Google Task. Lives only in `ScheduledTask` table.
- **Event** — a Google Calendar event (read-only).
- **Task** — a Google Tasks item, draggable onto the calendar.
- **Semantic Color-coding** — vibrant per-context color from `VIBRANT_PALETTE`.
- **Agenda** — the main UI. Avoid: "Tela inicial", "Painel".
- Avoid "Todo"/"Afazer"; avoid "Compromisso"/"Appointment".

---

## 2. File layout

```
src/
  app/
    page.tsx                 # server component: auth gate + parallel fetch + maps to CalendarEvent[] -> DashboardClient
    layout.tsx               # root layout (Geist fonts, Tailwind)
    error.tsx                # error boundary ("Ops! Algo deu errado...")
    api/auth/[...nextauth]/route.ts   # next-auth handler
  lib/
    db.ts                    # PrismaClient singleton (globalThis guard)
    auth.ts                  # authOptions (Google, offline, JWT refresh, accessToken in session)
    google.ts                # Google API helpers + CalendarEvent/GoogleTask/TaskList interfaces
    colors.ts                # VIBRANT_PALETTE, getLeastUsedColor, getSemanticColor
    actions.ts               # "use server" Server Actions: CRUD on scheduledTask/taskInstance/
                             #   timeEntry/checkIn + Google Tasks write calls (PATCH/POST/DELETE)
  components/
    DashboardClient.tsx      # client shell: DndContext + Sidebar + CalendarGrid + DragOverlay
    CalendarGrid.tsx         # react-big-calendar (week/month/day) + dnd-kit drop zones + TaskModal/CreateTaskModal
    Sidebar.tsx              # Google task lists + DraggableTask (+ archived/virtual completed list)
    TaskModal.tsx            # modal: recurrence edit, time tracking (WIP), check-ins, delete
    CreateTaskModal.tsx      # modal for scheduling a new task from a clicked time slot
  types/next-auth.d.ts       # extends Session/JWT with accessToken + error
prisma/schema.prisma         # ScheduledTask, TaskInstance, TimeEntry, CheckIn
next.config.ts, eslint.config.mjs, tsconfig.json, globals.css (Tailwind + rbc overrides)
```

### Data model (prisma/schema.prisma)
```
ScheduledTask { id(cuid) googleTaskId title start end rrule? exdates[] color? completed
               userEmail; instances TaskInstance[] }
TaskInstance   { id scheduledTaskId ->ScheduledTask instanceDate completed completedAt?
               timeEntries TimeEntry[]; @@unique([scheduledTaskId, instanceDate]) }
TimeEntry      { id taskInstanceId ->TaskInstance startTime endTime? checkins CheckIn[] }
CheckIn        { id timeEntryId ->TimeEntry note timestamp }
```
`userEmail` is the auth/tenant discriminator; every local query is filtered by it.

---

## 3. Data flow

```
Google Calendar/Tasks API
      |  (accessToken = session.accessToken, sent as `Bearer ${accessToken}`)
      v
page.tsx (server)  -- Promise.all of:
      getCalendarEvents, getGoogleTasks, getGoogleTaskLists, getScheduledTasks   (getServerSession)
      -> maps each ScheduledTask to CalendarEvent (rrule expansions via `rrule` lib,
         instance overrides via exdates + TaskInstance rows)
      -> passes allEvents / tasks / taskLists / localTasks -> DashboardClient
      v
DashboardClient (client) -- DndContext, DragOverlay
      ├── CalendarGrid (react-big-calendar grid; dnd-kit droppable time slots)
      └── Sidebar (Google Tasks + local scheduled markers)
Local writes -> Server Actions in actions.ts -> prisma -> revalidatePath("/") -> UI refresh
```

Key invariants:
- Every Server Action and page starts with `getServerSession(authOptions)` and throws/redirects `Unauthorized` when missing.
- Mutations in `actions.ts` always end with `revalidatePath("/")` (no per-route revalidation).
- `react-big-calendar`'s own drag/resize ONLY applies to `local-db` events
  (`draggableAccessor`/`resizableAccessor` => `event.calendarId === 'local-db'`).
- dnd-kit handles the 2D spatial drop: `TimeSlotWrapper`/`DateCellWrapper` are `useDroppable`
  with `id = value.toISOString()`.
- Composite instance IDs are `${scheduledTaskId}-${instanceDate.getTime()}`; several actions
  `split('-')` and `parseInt` the date part. Don't change this encoding.

---

## 4. Conventions to follow

- **Aliases/imports**: `@/*` maps to `src/*` (tsconfig paths). Servers can use `@/lib/db` etc.
- **Component hygiene**: App Router = Server Components by default. Any interactive component
  must be marked `"use client"` and import hooks from React 19.
- **Server Actions**: file begins with `"use server"`; invoked directly from client components.
  Gate every one with the session check.
- **Prisma**: use the `prisma` singleton from `@/lib/db` only. Never `new PrismaClient()` inline.
- **Styling**: Tailwind utility classes; design rules live in `DESIGN.md` (vibrant palette
  `500`/`600`, `rounded-xl`/`rounded-2xl`, white cards + soft shadows, modal backdrop
  `bg-black/40 backdrop-blur-sm`, hover transitions, `cursor-grab`/`opacity-30->100` for drag).
  Don't invent new color logic — reuse `getSemanticColor`/`getLeastUsedColor`.
- **Recurrence**: store an `rrule` string; expand in `page.tsx` with the `rrule` library.
  Per-instance overrides use `exdates` (cancel this occurrence) or a dedicated `TaskInstance` row
  (extract/reschedule this occurrence — see `extractScheduledTaskInstance`/`cancelScheduledTaskInstance`).
- **Time tracking (WIP)**: TaskInstance -> TimeEntry (open `endTime`) -> CheckIn note.
  Live timers use `setInterval` in components (see `LiveTimer`/`LiveTotalTimer`).
- **Modals**: click-away handled via `onPointerDown` on the backdrop with
  `stopPropagation` on the card body. Keep this pattern.
- **Env**: `.env` holds `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` (and `DATABASE_URL`, which is NOT in `.env.example`).
  `.env` is secret-bearing — do **not** read it with tools; use `.env.example` as the template.

---

## 5. Verify before/after changes (known-good baseline)

- `npx tsc --noEmit`  -> **exit 0** (clean)
- `npm run build`     -> **exit 0** (compiles; Next 16.3.4, no live DB required at build time)
- `npm run lint`      -> **exit non-zero (pre-existing)**: `@typescript-eslint/no-explicit-any`
  in `page.tsx` and `CalendarGrid.tsx`, an unused-vars warning in `page.tsx`/`CalendarGrid.tsx`,
  and a `@typescript-eslint/no-loop-func`/effect `setState` warning in `CalendarGrid.tsx` (effect
  at line 80 calling `setSelectedEvent`). **Do not regress this; fix root causes instead of
  `eslint-disable`.**
- `npx prisma generate` -> works (Prisma 5.22 client).
- `npm run dev`       -> needs a real `.env` (Google OAuth + DATABASE_URL).

AGENTS.md caveat: this is a non-standard Next.js (breaking APIs/conventions) — read
`node_modules/next/dist/docs/` before writing framework code.

---

## 6. Guardrails / gotchas (watch when editing)

- **Secret redaction artifact**: the local toolchain redacts `` `Bearer ${accessToken}` `` to
  `*** ${accessToken}` in tool *output only*. The bytes on disk are the correct Bearer header
  (verified via raw hex). Do **not** "fix" `***` occurrences.
- **No Alembic**: migrations are manual SQL against `DATABASE_URL` (per repo conventions from
  the finance context). Confirm `DATABASE_URL` before touching the schema.
- dnd-kit + react-big-calendar interop is fragile; keep drop zones confined to the two wrappers.
- `revalidatePath("/")` is the only invalidation path — adding new mutation paths must include it.
- Click-away + stopPropagation pattern is used in 3 modals; mirror it rather than reinvent.

---

## 7. Where to make the common changes

| Want to… | Edit |
|---|---|
| Add a Google API call | `src/lib/google.ts` (extend `googleFetch` or add a function) |
| Add a local DB operation | `src/lib/actions.ts` (`"use server"`, session-gated, `revalidatePath("/")`) |
| Feed the grid from a new server action | `src/app/page.tsx` (+ `DashboardClient`/`CalendarGrid` props if needed) |
| Change a UI component | `src/components/*.tsx` |
| Change the data model | `prisma/schema.prisma` then `npx prisma generate` |
| Change colors | `src/lib/colors.ts` |
| Change design tokens/spacing | `DESIGN.md` + `src/app/globals.css` |
| Change auth scopes | `src/lib/auth.ts` (the `scope:` string) |
| Add a route | `src/app/<route>/page.tsx` (App Router) |

---

## 8. Specs & ADRs (ground truth — read these first)

- `docs/specs/0001-agenda-otto-foundation.md` — main spec + testing decisions
- `docs/adr/0001-local-state-for-scheduled-tasks.md`
- `docs/adr/0002-calendar-rendering-and-dnd.md`
- `docs/adr/0003-free-tier-infrastructure.md`
- `docs/SDD-Agenda-Otto-Everywhere.md` — future phase (Google Calendar mirror write-back + PWA)
- `CONTEXT.md` — domain glossary
- `DESIGN.md` — design system
- `AGENTS.md` — Next.js version caveats

## 9. Current repository state at handoff

- Branch `main`, ahead of `origin/main` by 41 commits, working tree clean.
- Last commits are UI polish (TaskModal refinement, completed-tasks list, click-away closing).
- TypeScript clean; production build passes; lint has pre-existing errors (see §5).
