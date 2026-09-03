import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, getGoogleTasks } from "@/lib/google";
import { getScheduledTasks, createScheduledTask } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";
import { startOfMonth, endOfMonth, addHours } from "date-fns";
import { getSemanticColor } from "@/lib/colors";
import { RRule } from "rrule";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  const now = new Date();
  const timeMin = startOfMonth(now).toISOString();
  const timeMax = endOfMonth(now).toISOString();

  const [googleEvents, tasks, scheduledTasksData] = session.accessToken 
    ? await Promise.all([
        getCalendarEvents(session.accessToken, timeMin, timeMax),
        getGoogleTasks(session.accessToken),
        getScheduledTasks()
      ])
    : [[], [], []];

  // Map local DB tasks to the unified CalendarEvent interface
  // using semantic colors based on their original google task ID so they are consistent
  const mappedScheduledTasks = scheduledTasksData.flatMap(st => {
    const baseEvent = {
      id: st.id,
      title: st.completed ? `✓ ${st.title} (Concluída)` : `✓ ${st.title}`,
      start: st.start,
      end: st.end,
      allDay: false,
      calendarId: 'local-db',
      backgroundColor: getSemanticColor(st.googleTaskId),
      completed: st.completed,
      rrule: st.rrule || undefined,
    };

    if (st.rrule) {
      try {
        const duration = st.end.getTime() - st.start.getTime();
        const options = RRule.parseString(st.rrule);
        options.dtstart = new Date(Date.UTC(st.start.getUTCFullYear(), st.start.getUTCMonth(), st.start.getUTCDate(), st.start.getUTCHours(), st.start.getUTCMinutes(), st.start.getUTCSeconds()));
        
        const rruleObj = new RRule(options);
        const occurrences = rruleObj.between(new Date(timeMin), new Date(timeMax), true);
        
        return occurrences.map((date, i) => {
          // Adjust UTC back to local if needed, rrule outputs UTC dates based on dtstart
          return {
            ...baseEvent,
            id: `${st.id}-${i}`,
            start: date,
            end: new Date(date.getTime() + duration)
          };
        });
      } catch (e) {
        console.error("Error parsing rrule", e);
        return [baseEvent];
      }
    }

    return [baseEvent];
  });

  const allEvents = [...googleEvents, ...mappedScheduledTasks];

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            O
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Agenda Otto</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            {session.user?.name}
          </div>
        </div>
      </header>
      
      {/* Client-side Drag and Drop wrapper */}
      <DashboardClient initialEvents={allEvents} tasks={tasks} />
    </div>
  );
}
