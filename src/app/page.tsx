import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google";
import CalendarGrid from "@/components/CalendarGrid";
import { startOfMonth, endOfMonth } from "date-fns";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  const now = new Date();
  const timeMin = startOfMonth(now).toISOString();
  const timeMax = endOfMonth(now).toISOString();

  // Se a API falhar, não engolimos o erro silenciosamente. Ele será tratado pelo error.tsx
  const events = session.accessToken 
    ? await getCalendarEvents(session.accessToken, timeMin, timeMax)
    : [];

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Agenda Otto</h1>
        <div className="text-sm text-gray-600">
          {session.user?.name}
        </div>
      </header>
      <main className="flex-1 p-6 overflow-hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full h-full p-4">
          <CalendarGrid events={events} />
        </div>
      </main>
    </div>
  );
}
