import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, getGoogleTasks, getGoogleTaskLists } from "@/lib/google";
import { getScheduledTasks, createScheduledTask } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";
import { subMonths, addMonths } from "date-fns";
import { expandScheduledTaskOccurrences } from "@/lib/recurrence";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.error === "RefreshAccessTokenError") {
    redirect("/api/auth/signin");
  }

  const now = new Date();
  const timeMin = subMonths(now, 2).toISOString();
  const timeMax = addMonths(now, 2).toISOString();

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
  const mappedScheduledTasks = scheduledTasksData.flatMap(st =>
    expandScheduledTaskOccurrences(st, timeMin, timeMax)
  );

  const allEvents = [...googleEvents, ...mappedScheduledTasks];

  return (
    <div className="h-[100dvh] bg-gray-100 flex flex-col font-sans overflow-hidden">
      <header className="app-header bg-white border-b px-3 py-2 lg:px-6 lg:py-4 flex items-center justify-between shadow-sm z-20 relative shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 lg:w-8 lg:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base lg:text-xl">
            E
          </div>
          <h1 className="text-base lg:text-xl font-bold text-gray-900 tracking-tight">Agenda Edu</h1>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="text-xs lg:text-sm text-gray-600 font-medium bg-gray-50 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full border border-gray-200 truncate max-w-[160px] lg:max-w-none">
            {session.user?.name}
          </div>
        </div>
      </header>
      
      {/* Client-side Drag and Drop wrapper */}
      <DashboardClient initialEvents={allEvents} tasks={tasks} taskLists={taskLists} localTasks={scheduledTasksData} />
    </div>
  );
}
