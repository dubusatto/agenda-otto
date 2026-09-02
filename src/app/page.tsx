import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, getGoogleTasks } from "@/lib/google";
import { getScheduledTasks, createScheduledTask } from "@/lib/actions";
import CalendarGrid from "@/components/CalendarGrid";
import Sidebar from "@/components/Sidebar";
import { startOfMonth, endOfMonth, addHours } from "date-fns";

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
  const mappedScheduledTasks = scheduledTasksData.map(st => ({
    id: st.id,
    title: `✓ ${st.title}`,
    start: st.start,
    end: st.end,
    allDay: false,
    calendarId: 'local-db',
    backgroundColor: '#10b981', // emerald-500
  }));

  const allEvents = [...googleEvents, ...mappedScheduledTasks];

  // Inline server action to test DB creation
  async function testCreateTask() {
    "use server";
    const start = new Date();
    const end = addHours(start, 1);
    await createScheduledTask({
      googleTaskId: "mock-task-123",
      title: "Tarefa Teste (Salva no Neon)",
      start,
      end,
    });
  }

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
          <form action={testCreateTask}>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm">
              + Testar Banco de Dados
            </button>
          </form>
          <div className="text-sm text-gray-600 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            {session.user?.name}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden flex relative z-10">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full h-full p-4">
            <CalendarGrid events={allEvents} />
          </div>
        </div>
        <Sidebar tasks={tasks} />
      </main>
    </div>
  );
}
