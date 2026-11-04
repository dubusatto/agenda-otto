import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runCurriculumAnalysisForUser } from "@/lib/curriculumAi";

export const maxDuration = 60;

async function handleAnalyzeRequest(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();

    const cronSecret = process.env.CRON_SECRET;
    const daemonToken =
      process.env.ALARM_DAEMON_TOKEN || "otto_daemon_secret_2026";
    const agendaToken = process.env.AGENDA_API_TOKEN;

    const isTokenAuthorized =
      Boolean(
        bearerToken &&
          ((cronSecret && bearerToken === cronSecret) ||
            bearerToken === daemonToken ||
            (agendaToken && bearerToken === agendaToken))
      ) ||
      (!cronSecret && request.headers.get("x-vercel-cron") === "1");

    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email;

    if (!isTokenAuthorized && !sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let targetEmails: string[] = [];

    if (sessionEmail) {
      targetEmails = [sessionEmail];
    } else {
      const docs = await prisma.curriculumDocument.findMany({
        select: { userEmail: true },
      });
      targetEmails = docs.map((d) => d.userEmail);
    }

    if (targetEmails.length === 0) {
      return NextResponse.json({
        success: true,
        analyzed: false,
        reason: "no_curriculum",
        checkInsEvaluated: 0,
        suggestionsCreated: 0,
        results: [],
      });
    }

    const results = [];
    for (const email of targetEmails) {
      const res = await runCurriculumAnalysisForUser(email);
      results.push(res);
    }

    revalidatePath("/");

    const totalCheckIns = results.reduce(
      (sum, r) => sum + r.checkInsEvaluated,
      0
    );
    const totalSuggestions = results.reduce(
      (sum, r) => sum + r.suggestionsCreated,
      0
    );
    const anyAnalyzed = results.some((r) => r.analyzed);

    return NextResponse.json({
      success: true,
      analyzed: anyAnalyzed,
      reason: anyAnalyzed ? undefined : results[0]?.reason,
      checkInsEvaluated: totalCheckIns,
      suggestionsCreated: totalSuggestions,
      results,
    });
  } catch (error: any) {
    console.error("Erro em /api/curriculum/analyze:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno ao analisar currículo",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleAnalyzeRequest(request);
}

export async function POST(request: Request) {
  return handleAnalyzeRequest(request);
}
