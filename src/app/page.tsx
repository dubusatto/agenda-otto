import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center font-sans">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Agenda Otto</h1>
      <p className="text-lg text-gray-600 mb-8">
        Welcome, {session.user?.name}! Your vibrant calendar is being built.
      </p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-4xl h-96 flex items-center justify-center text-gray-400">
        Dashboard Area (Empty for now)
      </div>
    </div>
  );
}
