## Problem Statement

The user needs a personal, highly interactive, and visually vibrant calendar application ("Agenda Otto"). While Google Calendar and Google Tasks provide the necessary backend data, their native interfaces lack the customized, vibrant aesthetic and the specific drag-and-drop workflow the user desires for planning tasks visually without cluttering their official calendar.

## Solution

Build "Agenda Otto", a Next.js web application that acts as a custom frontend for Google Calendar and Google Tasks. The application will aggregate multiple Calendar Sources into a single vibrant view using Semantic Color-coding. It will allow users to drag Tasks from a sidebar and drop them onto the calendar grid, converting them into Scheduled Tasks that are stored in a local PostgreSQL database, rather than syncing them back as events to Google Calendar.

## User Stories

1. As a user, I want to authenticate securely with my Google account, so that the app can access my Calendar and Tasks data without repeatedly asking for permission.
2. As a user, I want to see events from multiple Google Calendar Sources (e.g., Personal, Work) in a single unified view, so that I have a complete picture of my day.
3. As a user, I want events and tasks to be automatically styled with vibrant colors based on their context (Semantic Color-coding), so that my agenda looks visually appealing and organized.
4. As a user, I want to see a sidebar containing my actionable Google Tasks, so that I can easily review what needs to be done.
5. As a user, I want to drag a Task from the sidebar and drop it onto a specific time slot in the calendar, so that I can visually plan when I will execute it.
6. As a user, I want a dropped Task to automatically occupy a 30-minute block on the calendar, so that I am encouraged to break work into manageable chunks.
7. As a user, I want dropped Tasks to become "Scheduled Tasks" stored only in the application's local state/database, so that my official Google Calendar remains clean and uncluttered.
8. As a user, I want to be able to resize or move Scheduled Tasks within the calendar grid, so that I can adjust my plan as the day progresses.
9. As a user, I want the application to respect free-tier constraints (e.g., using Supabase/Neon for PostgreSQL and Vercel for hosting), so that I don't incur monthly costs for personal use.

## Implementation Decisions

- **Tech Stack**: React with Next.js (App Router), leveraging Server Actions/API routes.
- **Styling**: Tailwind CSS for building the vibrant, opinionated design system.
- **Calendar Rendering**: Use `react-big-calendar` as the mathematical and accessibility foundation for the grid, heavily overriding its UI components with Tailwind.
- **Drag and Drop**: Use `@dnd-kit/core` to handle the 2D spatial drop interactions of moving a Task onto the calendar grid.
- **Authentication**: NextAuth.js / Auth.js configured for Google OAuth with offline access to securely handle refresh tokens on the server.
- **Database**: PostgreSQL (via a free tier provider like Supabase or Neon) with Prisma or Drizzle ORM to store user preferences and Scheduled Tasks.
- **Timezone Management**: `date-fns` and `date-fns-tz` to ensure correct rendering and calculation of events across different time zones.
- **Architecture**: A Scheduled Task is a domain entity that links a Google Task ID to a specific timestamp and duration in the local PostgreSQL database. It does NOT trigger a write to the Google Calendar API.

## Testing Decisions

- Tests should focus on the highest seam possible: the external behavior of the components and integration routes.
- **Frontend Seam**: Integration tests will render the main Agenda component, mock the Google API responses and NextAuth session, and simulate drag-and-drop interactions to verify that the UI updates correctly (e.g., a Task turns into a Scheduled Task in the grid) without testing the internal state of `@dnd-kit`.
- **Backend Seam**: Integration tests against a local/test PostgreSQL instance to verify that Scheduled Tasks and user preferences are persisted and retrieved correctly via server actions.
- Avoid testing the internal calculations of `react-big-calendar` or `date-fns`.

## Out of Scope

- Bi-directional sync of Scheduled Tasks back to Google Calendar.
- Manual configuration of color themes by the user (the system is opinionated).
- Mobile native application (focus is on a responsive web app).

## Further Notes

- Relies on ADR-0001 (Local State for Scheduled Tasks), ADR-0002 (Calendar Rendering and DnD), and ADR-0003 (Free Tier Infrastructure).
