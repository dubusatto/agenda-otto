# Agenda Otto

A vibrant, colorful, and interactive calendar application integrating Google Calendar and Google Tasks.

## Language

**Calendar Source**:
A specific calendar feed provided by the Google Calendar API (e.g., "Primary", "Work", "Holidays"). Multiple sources are aggregated and displayed together in the Agenda, differentiated by the color-coding system.

**Scheduled Task**:
A Task that has been assigned a specific time slot on the Agenda. It exists only within the application's state and is not synced back to Google Calendar as an Event. Defaults to a 30-minute duration.

**Event**:
A scheduled block of time synchronized with Google Calendar.
_Avoid_: Compromisso, Appointment

**Task**:
An actionable item synchronized with Google Tasks that can be scheduled onto the calendar via drag and drop.
_Avoid_: Todo, Afazer

**Semantic Color-coding**:
The automated visual styling where Tasks and Events are assigned specific vibrant colors based on context, keywords, or lists.

**Agenda**:
The main interactive interface (built with React/Next.js) where both Events and Tasks are visualized and manipulated.
_Avoid_: Tela inicial, Painel

## Infrastructure
- **Database**: Cloud-hosted on **Neon** (`neon.tech`). The application connects to it via Prisma using the `DATABASE_URL` in the `.env` file.
- **Application Hosting**: Currently strictly local (`localhost`). It has **not** been deployed to Vercel or any other cloud provider yet.
- **Version Control**: Hosted on GitHub (`dubusatto/agenda-otto`).

## Pending Implementations (Next Session / Mobile Phase)
The following responsive design architecture has been approved and is queued for implementation:
1. **Drawer/Bottom Sheet for Tasks:** Hide the sidebar on mobile. Use a floating button ("📝 Ver Tarefas") to slide up the task list from the bottom.
2. **Mobile Calendar View:** Force the default view to `Day` (1 day) or a custom `3 Days` view on mobile screens so columns remain wide and readable.
3. **Touch-friendly Scheduling:** Since native HTML5 Drag-and-Drop is clunky on mobile touch screens, implement an alternative "Tap to schedule" pattern (e.g., tapping a task in the bottom sheet opens a modal to select "Schedule for today at X").
