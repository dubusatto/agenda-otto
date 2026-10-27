import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Armazena temporariamente disparos de teste em memória
let pendingTestAlarm: {
  id: string;
  title: string;
  message?: string;
  color: string;
  time: string;
  isTest: boolean;
} | null = null;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const daemonToken = process.env.ALARM_DAEMON_TOKEN || "otto_daemon_secret_2026";

  let isAuthorized = token === daemonToken;
  let userEmail: string | undefined;

  if (!isAuthorized) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      isAuthorized = true;
      userEmail = session.user.email;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Se tiver um alarme de teste pendente, retorna e limpa
  if (pendingTestAlarm) {
    const testToReturn = { ...pendingTestAlarm };
    pendingTestAlarm = null;
    return NextResponse.json({
      alarms: [],
      immediateTrigger: testToReturn,
    });
  }

  const whereClause: any = { enabled: true };
  if (userEmail) {
    whereClause.userEmail = userEmail;
  }

  const alarms = await prisma.alarm.findMany({
    where: whereClause,
    orderBy: { time: "asc" },
  });

  return NextResponse.json({
    alarms,
    immediateTrigger: null,
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const daemonToken = process.env.ALARM_DAEMON_TOKEN || "otto_daemon_secret_2026";

  let isAuthorized = token === daemonToken;
  if (!isAuthorized) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, alarmId, testAlarm } = body;

    if (action === "trigger_test") {
      pendingTestAlarm = {
        id: "test-" + Date.now(),
        title: testAlarm?.title || "TESTE DE ALARME",
        message: testAlarm?.message || "Este é um teste visual do aviso de impacto do Agenda Edu!",
        color: testAlarm?.color || "#ef4444",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isTest: true,
      };
      return NextResponse.json({ success: true, message: "Test alarm queued" });
    }

    if (!alarmId) {
      return NextResponse.json({ error: "Missing alarmId" }, { status: 400 });
    }

    if (action === "dismiss") {
      await prisma.alarm.update({
        where: { id: alarmId },
        data: {
          lastTriggered: new Date(),
          snoozeUntil: null,
        },
      });
      return NextResponse.json({ success: true, action: "dismissed" });
    }

    if (action === "snooze") {
      const snoozeMinutes = body.minutes || 5;
      const snoozeDate = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      await prisma.alarm.update({
        where: { id: alarmId },
        data: {
          snoozeUntil: snoozeDate,
        },
      });
      return NextResponse.json({ success: true, action: "snoozed", snoozeUntil: snoozeDate });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
