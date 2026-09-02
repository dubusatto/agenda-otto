import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, getGoogleTasks } from "@/lib/google";
import CalendarGrid from "@/components/CalendarGrid";
import Sidebar from "@/components/Sidebar";
import { startOfMonth, endOfMonth } from "date-fns";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  const now = new Date();
  const timeMin = startOfMonth(now).toISOString();
  const timeMax = endOfMonth(now).toISOString();

  const [events, tasks] = session.accessToken 
    ? await Promise.all([
        getCalendarEvents(session.accessToken, timeMin, timeMax),
        getGoogleTasks(session.accessToken)
      ])
    : [[], []];

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            O
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Agenda Otto</h1>
        </div>
        <div className="text-sm text-gray-600 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          {session.user?.name}
        </div>
      </header>
      <main className="flex-1 overflow-hidden flex relative z-10">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full h-full p-4">
            <CalendarGrid events={events} />
          </div>
        </div>
        <Sidebar tasks={tasks} />
      </main>
    </div>
  );
}
