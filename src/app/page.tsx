import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, getGoogleTasks, getGoogleTaskLists } from "@/lib/google";
import { getScheduledTasks, createScheduledTask } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";
import { startOfMonth, endOfMonth, addHours } from "date-fns";
import { getSemanticColor } from "@/lib/colors";
import { RRule } from "rrule";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.error === "RefreshAccessTokenError") {
    redirect("/api/auth/signin");
  }

  const now = new Date();
  const timeMin = startOfMonth(now).toISOString();
  const timeMax = endOfMonth(now).toISOString();

  let googleEvents: any[] = [], tasks: any[] = [], taskLists: any[] = [], scheduledTasksData: any[] = [];
  try {
    if (session.accessToken) {
      [googleEvents, tasks, taskLists, scheduledTasksData] = await Promise.all([
        getCalendarEvents(session.accessToken, timeMin, timeMax),
        getGoogleTasks(session.accessToken),
        getGoogleTaskLists(session.accessToken),
        getScheduledTasks()
      ]);
    } else {
      scheduledTasksData = await getScheduledTasks();
    }
  } catch (err: any) {
    if (err?.message?.includes("Unauthorized") || err?.message?.includes("401")) {
      // Force sign-in if token is rejected by Google API
      redirect("/api/auth/signin");
    }
    throw err;
  }

  // Map local DB tasks to the unified CalendarEvent interface
  // using semantic colors based on their original google task ID so they are consistent
  const mappedScheduledTasks = scheduledTasksData.flatMap(st => {
    // For non-recurring tasks, just use the first/latest instance regardless of instanceDate
    const nonRecurringInstance = st.instances?.length > 0 
      ? [...st.instances].sort((a, b) => b.instanceDate.getTime() - a.instanceDate.getTime())[0]
      : undefined;
    const isCompleted = nonRecurringInstance ? nonRecurringInstance.completed : st.completed;
    
    const baseEvent = {
      id: st.id,
      title: isCompleted ? `✓ ${st.title} (Concluída)` : `✓ ${st.title}`,
      start: st.start,
      end: st.end,
      allDay: false,
      calendarId: 'local-db',
      backgroundColor: getSemanticColor(st.googleTaskId),
      completed: isCompleted,
      rrule: st.rrule || undefined,
      timeEntries: nonRecurringInstance?.timeEntries || [],
    };

    if (st.rrule) {
      try {
        const options = RRule.parseString(st.rrule);
        options.dtstart = st.start;
        const duration = st.end.getTime() - st.start.getTime();
        
        const rruleObj = new RRule(options);
        const occurrences = rruleObj.between(new Date(timeMin), new Date(timeMax), true);
        
        const exdatesTimes = new Set((st.exdates || []).map((d: Date) => d.getTime()));
        const validOccurrences = occurrences.filter(d => !exdatesTimes.has(d.getTime()));
        
        return validOccurrences.map((date) => {
          const instance = st.instances?.find(inst => inst.instanceDate.getTime() === date.getTime());
          const instCompleted = instance?.completed || false;
          
          return {
            ...baseEvent,
            id: `${st.id}-${date.getTime()}`,
            title: instCompleted ? `✓ ${st.title} (Concluída)` : `✓ ${st.title}`,
            start: date,
            end: new Date(date.getTime() + duration),
            completed: instCompleted,
            timeEntries: instance?.timeEntries || []
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
      <DashboardClient initialEvents={allEvents} tasks={tasks} taskLists={taskLists} localTasks={scheduledTasksData} />
    </div>
  );
}
