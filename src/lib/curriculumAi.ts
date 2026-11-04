import { formatNoteLines } from "@/lib/curriculoSync";

export type SuggestionType = "REWRITE" | "ADD";

export interface CurriculumSuggestionInput {
  type: SuggestionType;
  sectionTitle: string;
  originalText?: string | null;
  suggestedText: string;
  reasoning: string;
  sourceDates: string;
}

export interface CheckInDiaryEntry {
  id?: string;
  taskTitle: string;
  note: string;
  timestamp: Date | string;
}

export const CURRICULUM_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    suggestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["REWRITE", "ADD"] },
          sectionTitle: { type: "STRING" },
          originalText: { type: "STRING" },
          suggestedText: { type: "STRING" },
          reasoning: { type: "STRING" },
          sourceDates: { type: "STRING" },
        },
        required: [
          "type",
          "sectionTitle",
          "suggestedText",
          "reasoning",
          "sourceDates",
        ],
      },
    },
  },
  required: ["suggestions"],
} as const;

function getDatePartsSP(isoOrDate: Date | string): {
  year: string;
  month: string;
  day: string;
  hour: number;
} {
  const d = new Date(isoOrDate);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  const rawHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const hour = rawHour === 24 ? 0 : rawHour;

  return { year, month, day, hour };
}

export function getDateKeySP(isoOrDate: Date | string): string {
  const { year, month, day } = getDatePartsSP(isoOrDate);
  return `${year}-${month}-${day}`;
}

export function formatDiaryEntriesForPrompt(entries: CheckInDiaryEntry[]): string {
  if (!entries || entries.length === 0) return "";

  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const byDate = new Map<string, { taskTitle: string; lines: string[] }[]>();

  for (const entry of sorted) {
    const lines = formatNoteLines(entry.note);
    if (lines.length === 0) continue;

    const dateKey = getDateKeySP(entry.timestamp);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push({
      taskTitle: entry.taskTitle,
      lines,
    });
  }

  const blocks: string[] = [];
  for (const [dateKey, items] of byDate.entries()) {
    const [y, m, d] = dateKey.split("-");
    const brDate = `${d}/${m}/${y}`;
    const dayLines: string[] = [];
    for (const item of items) {
      for (const line of item.lines) {
        const cleanLine = line.replace(/^-\s*/, "");
        dayLines.push(`- [${item.taskTitle}] ${cleanLine}`);
      }
    }
    if (dayLines.length > 0) {
      blocks.push(`## ${brDate}\n${dayLines.join("\n")}`);
    }
  }

  return blocks.join("\n\n");
}

/**
 * Determina se o fallback automático deve disparar ao abrir o app:
 * Dispara quando existem CheckIns com `timestamp > lastAnalyzedAt` (ou sem `lastAnalyzedAt`)
 * que foram criados em dias anteriores (no fuso America/Sao_Paulo) ou, se já passou das 20:00 BRT de hoje,
 * criados hoje.
 */
export function shouldTriggerAutoAnalysis(
  checkIns: { timestamp: Date | string; note?: string }[],
  lastAnalyzedAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!checkIns || checkIns.length === 0) return false;

  const cursorMs = lastAnalyzedAt ? new Date(lastAnalyzedAt).getTime() : 0;
  const unanalyzed = checkIns.filter((ci) => {
    const ts = new Date(ci.timestamp).getTime();
    if (ts <= cursorMs) return false;
    if (typeof ci.note === "string" && formatNoteLines(ci.note).length === 0) {
      return false;
    }
    return true;
  });

  if (unanalyzed.length === 0) return false;

  const nowParts = getDatePartsSP(now);
  const todayKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
  const isPast20hToday = nowParts.hour >= 20;

  return unanalyzed.some((ci) => {
    const ciDateKey = getDateKeySP(ci.timestamp);
    if (ciDateKey < todayKey) {
      return true;
    }
    if (ciDateKey === todayKey && isPast20hToday) {
      return true;
    }
    return false;
  });
}

export function buildCurriculumSystemInstruction(): string {
  return [
    "Você é um Staff Software Engineer e Tech Recruiter especialista em currículos de alto impacto para Engenharia de Software.",
    "Sua missão é avaliar as novas entradas do diário de engenharia do candidato (CheckIns) contra o currículo oficial atual dele em Markdown.",
    "",
    "REGRAS CRÍTICAS:",
    "1. FILTRO DE RELEVÂNCIA RIGOROSO: Ignore tarefas puramente operacionais, rotineiras ou de manutenção trivial (ex: 'rodada migration', 'ajustado botão', 'corrigido teste flaky', 'reunião de alinhamento', 'limpeza de computador', 'ajustes visuais simples'). Se nenhuma atividade do período trouxer evolução arquitetural, nova entrega de produto, automação relevante, melhoria mensurável de performance/testes/custos ou nova competência técnica importante, retorne `suggestions: []`.",
    "2. REGRA DE OURO (`REWRITE` vs `ADD`):",
    "   - SEMPRE prefira `REWRITE` quando já existir um tópico, bullet ou parágrafo no currículo sobre aquele sistema, projeto ou competência. Reescreva o tópico existente para atualizar métricas (ex: número de testes, redução de custo/tempo, cobertura), incorporar a nova entrega ou refinar a maturidade técnica sem inflar o tamanho do currículo.",
    "   - Em `REWRITE`, o campo `originalText` DEVE SER UMA CÓPIA EXATA (caractere por caractere, incluindo `- ` inicial ou formatação Markdown da linha) do trecho atual no currículo, para permitir substituição determinística.",
    "   - Use `ADD` APENAS quando a atividade representar uma arquitetura, produto, integração ou conquista relevante que ainda não possui tópico equivalente na seção correspondente.",
    "3. ESTILO DE ESCRITA (`suggestedText`):",
    "   - Escreva em Português (ou no mesmo idioma da seção alvo do currículo), seguindo a fórmula de alto impacto: Verbo de Ação Forte + Arquitetura/Tecnologia + Resultado/Impacto/Métrica.",
    "   - Mantenha a formatação Markdown consistente com a seção alvo (ex: iniciando com `- ` se for uma lista de bullets).",
    "4. JUSTIFICATIVA (`reasoning`):",
    "   - Explique de forma direta e objetiva por que essa mudança tem peso real para recrutadores técnicos e entrevistas de Engenharia de Software.",
  ].join("\n");
}

export function buildCurriculumUserPrompt(
  curriculumMarkdown: string,
  diaryMarkdown: string
): string {
  return [
    "=== CURRÍCULO ATUAL (MARKDOWN) ===",
    curriculumMarkdown.trim(),
    "",
    "=== NOVAS ENTRADAS DO DIÁRIO DE ENGENHARIA ===",
    diaryMarkdown.trim(),
    "",
    "Avalie as entradas do diário acima em comparação com o currículo atual e retorne o JSON estruturado no formato `{ \"suggestions\": [...] }`.",
  ].join("\n");
}

export function parseAndValidateAiResponse(
  rawJson: string
): CurriculumSuggestionInput[] {
  if (!rawJson || !rawJson.trim()) {
    return [];
  }

  let cleaned = rawJson.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error("Invalid AI response: missing suggestions array");
  }

  const validSuggestions: CurriculumSuggestionInput[] = [];

  for (const item of parsed.suggestions) {
    if (!item || typeof item !== "object") continue;
    const type: SuggestionType = item.type === "REWRITE" ? "REWRITE" : "ADD";
    const sectionTitle =
      typeof item.sectionTitle === "string" ? item.sectionTitle.trim() : "";
    const suggestedText =
      typeof item.suggestedText === "string" ? item.suggestedText.trim() : "";
    const reasoning =
      typeof item.reasoning === "string" ? item.reasoning.trim() : "";
    const sourceDates =
      typeof item.sourceDates === "string" ? item.sourceDates.trim() : "";
    const originalText =
      typeof item.originalText === "string" && item.originalText.trim().length > 0
        ? item.originalText.trim()
        : null;

    if (!sectionTitle || !suggestedText || !reasoning) {
      continue;
    }

    validSuggestions.push({
      type,
      sectionTitle,
      originalText,
      suggestedText,
      reasoning,
      sourceDates: sourceDates || "Recente",
    });
  }

  return validSuggestions;
}

function normalizeHeadingText(text: string): string {
  return text
    .replace(/^#+\s*/, "")
    .replace(/[*_`~]/g, "")
    .trim()
    .toLowerCase();
}

function findSectionRange(
  lines: string[],
  sectionTitle: string
): { headerIndex: number; insertIndex: number } | null {
  const targetNorm = normalizeHeadingText(sectionTitle);
  if (!targetNorm) return null;

  let headerIndex = -1;
  let headerLevel = 0;

  // 1. Exact heading match
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const titleNorm = normalizeHeadingText(headingMatch[2]);
      if (titleNorm === targetNorm) {
        headerIndex = i;
        headerLevel = level;
        break;
      }
    }
  }

  // 2. Partial heading match if exact match wasn't found
  if (headerIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const titleNorm = normalizeHeadingText(headingMatch[2]);
        if (
          titleNorm.includes(targetNorm) ||
          targetNorm.includes(titleNorm)
        ) {
          headerIndex = i;
          headerLevel = level;
          break;
        }
      }
    }
  }

  if (headerIndex === -1) return null;

  // Find end of this section (next heading of same or higher importance, or any next heading if adding bullets to a specific block)
  let sectionEndIndex = lines.length;
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const nextLevel = headingMatch[1].length;
      if (nextLevel <= headerLevel || headerLevel >= 2) {
        sectionEndIndex = i;
        break;
      }
    }
  }

  // Walk backwards from sectionEndIndex to place after the last non-empty content line (and before trailing "---" or blank lines)
  let insertIndex = sectionEndIndex;
  while (
    insertIndex > headerIndex + 1 &&
    (lines[insertIndex - 1].trim() === "" ||
      lines[insertIndex - 1].trim() === "---")
  ) {
    insertIndex--;
  }

  return { headerIndex, insertIndex };
}

/**
 * Aplica determinísticamente uma sugestão (`REWRITE` ou `ADD`) ao documento Markdown do currículo.
 */
export function applyCurriculumPatch(
  markdown: string,
  suggestion: Pick<
    CurriculumSuggestionInput,
    "type" | "sectionTitle" | "originalText" | "suggestedText"
  >
): string {
  const normalizedMd = markdown.replace(/\r\n/g, "\n");
  const suggested = suggestion.suggestedText.replace(/\r\n/g, "\n").trim();

  if (!suggested) return normalizedMd;

  if (suggestion.type === "REWRITE" && suggestion.originalText) {
    const original = suggestion.originalText.replace(/\r\n/g, "\n").trim();

    // 1. Exact substring match
    if (original && normalizedMd.includes(original)) {
      return normalizedMd.replace(original, suggested);
    }

    // 2. Trimmed line-by-line match (in case of minor whitespace differences)
    if (original && !original.includes("\n")) {
      const lines = normalizedMd.split("\n");
      const lineIdx = lines.findIndex((l) => l.trim() === original);
      if (lineIdx !== -1) {
        lines[lineIdx] = suggested;
        return lines.join("\n");
      }
    }

    // 3. Fallback seguro (Seção 4.2 da arquitetura):
    // Se originalText não for encontrado literalmente, insere suggestedText logo abaixo do cabeçalho sectionTitle
    const lines = normalizedMd.split("\n");
    const range = findSectionRange(lines, suggestion.sectionTitle);
    if (range) {
      let insertAt = range.headerIndex + 1;
      while (insertAt < lines.length && lines[insertAt].trim() === "") {
        insertAt++;
      }
      lines.splice(insertAt, 0, suggested);
      return lines.join("\n");
    }
  }

  // Lógica para ADD (ou fallback final quando seção de REWRITE não foi encontrada)
  const lines = normalizedMd.split("\n");
  const range = findSectionRange(lines, suggestion.sectionTitle);

  if (range) {
    lines.splice(range.insertIndex, 0, suggested);
    return lines.join("\n");
  }

  // Se a seção não existir no documento, cria ao final do documento
  const cleanHeader = suggestion.sectionTitle.replace(/^#+\s*/, "").trim();
  const suffix = normalizedMd.endsWith("\n") ? "" : "\n";
  return `${normalizedMd}${suffix}\n## ${cleanHeader}\n\n${suggested}\n`;
}

export function applyCurriculumPatches(
  markdown: string,
  suggestions: Pick<
    CurriculumSuggestionInput,
    "type" | "sectionTitle" | "originalText" | "suggestedText"
  >[]
): string {
  return suggestions.reduce(
    (acc, suggestion) => applyCurriculumPatch(acc, suggestion),
    markdown
  );
}

/**
 * Chama o modelo Gemini Pro configurado (`GEMINI_MODEL` ou `gemini-2.5-pro`) com Structured Outputs.
 */
export async function generateCurriculumSuggestions(
  curriculumMarkdown: string,
  diaryEntries: CheckInDiaryEntry[]
): Promise<CurriculumSuggestionInput[]> {
  const diaryMarkdown = formatDiaryEntriesForPrompt(diaryEntries);
  if (!diaryMarkdown.trim()) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "A variável de ambiente GEMINI_API_KEY não está configurada no arquivo .env."
    );
  }

  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const defaultModels = [
    "gemini-3.6-flash",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
  ];
  const candidateModels = configuredModel
    ? [configuredModel, ...defaultModels]
    : defaultModels;

  const uniqueModels = Array.from(new Set(candidateModels));

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: buildCurriculumSystemInstruction() }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildCurriculumUserPrompt(curriculumMarkdown, diaryMarkdown),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: CURRICULUM_RESPONSE_SCHEMA,
    },
  });

  let lastError = "";
  let data: any = null;
  const cleanKey = apiKey.trim();

  for (const model of uniqueModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": cleanKey,
      },
      body: requestBody,
    });

    if (response.ok) {
      data = await response.json();
      break;
    }

    const errorText = await response.text().catch(() => response.statusText);
    lastError = `(${model} -> HTTP ${response.status}): ${errorText}`;

    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 429 ||
      response.status === 503
    ) {
      continue;
    }

    throw new Error(`Falha na chamada ao Gemini ${lastError}`);
  }

  if (!data) {
    throw new Error(
      `Falha na chamada ao Gemini. Detalhe: ${lastError}`
    );
  }
  const rawText =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") || "";

  if (!rawText) {
    return [];
  }

  return parseAndValidateAiResponse(rawText);
}

export interface CurriculumAnalysisResult {
  userEmail: string;
  analyzed: boolean;
  reason?: "no_curriculum" | "no_new_checkins";
  checkInsEvaluated: number;
  suggestionsCreated: number;
}

/**
 * Executa a análise de novas entradas do Diário (CheckIn) contra o currículo oficial do usuário no banco Neon.
 * Economiza tokens encerrando imediatamente caso não existam novos CheckIns desde `lastAnalyzedAt`.
 */
export async function runCurriculumAnalysisForUser(
  userEmail: string
): Promise<CurriculumAnalysisResult> {
  const { prisma } = await import("@/lib/db");

  const doc = await prisma.curriculumDocument.findUnique({
    where: { userEmail },
    include: {
      suggestions: {
        where: { status: "PENDING" },
      },
    },
  });

  if (!doc || !doc.content.trim()) {
    return {
      userEmail,
      analyzed: false,
      reason: "no_curriculum",
      checkInsEvaluated: 0,
      suggestionsCreated: 0,
    };
  }

  const rawCheckIns = await prisma.checkIn.findMany({
    where: {
      ...(doc.lastAnalyzedAt ? { timestamp: { gt: doc.lastAnalyzedAt } } : {}),
      timeEntry: {
        taskInstance: {
          scheduledTask: {
            userEmail,
          },
        },
      },
    },
    include: {
      timeEntry: {
        include: {
          taskInstance: {
            include: {
              scheduledTask: {
                select: { title: true },
              },
            },
          },
        },
      },
    },
    orderBy: { timestamp: "asc" },
  });

  if (rawCheckIns.length === 0) {
    return {
      userEmail,
      analyzed: false,
      reason: "no_new_checkins",
      checkInsEvaluated: 0,
      suggestionsCreated: 0,
    };
  }

  const latestCheckInTimestamp =
    rawCheckIns[rawCheckIns.length - 1].timestamp;

  const diaryEntries: CheckInDiaryEntry[] = rawCheckIns
    .filter((ci) => formatNoteLines(ci.note).length > 0)
    .map((ci) => ({
      id: ci.id,
      taskTitle: ci.timeEntry.taskInstance.scheduledTask.title,
      note: ci.note,
      timestamp: ci.timestamp,
    }));

  if (diaryEntries.length === 0) {
    await prisma.curriculumDocument.update({
      where: { id: doc.id },
      data: { lastAnalyzedAt: latestCheckInTimestamp },
    });
    return {
      userEmail,
      analyzed: false,
      reason: "no_new_checkins",
      checkInsEvaluated: 0,
      suggestionsCreated: 0,
    };
  }

  const aiSuggestions = await generateCurriculumSuggestions(
    doc.content,
    diaryEntries
  );

  const existingPendingTexts = new Set(
    doc.suggestions.map((s) => s.suggestedText.trim().toLowerCase())
  );

  const newSuggestions = aiSuggestions.filter(
    (s) => !existingPendingTexts.has(s.suggestedText.trim().toLowerCase())
  );

  await prisma.$transaction([
    ...(newSuggestions.length > 0
      ? [
          prisma.curriculumSuggestion.createMany({
            data: newSuggestions.map((s) => ({
              curriculumId: doc.id,
              type: s.type,
              sectionTitle: s.sectionTitle,
              originalText: s.originalText || null,
              suggestedText: s.suggestedText,
              reasoning: s.reasoning,
              sourceDates: s.sourceDates,
              status: "PENDING",
            })),
          }),
        ]
      : []),
    prisma.curriculumDocument.update({
      where: { id: doc.id },
      data: { lastAnalyzedAt: latestCheckInTimestamp },
    }),
  ]);

  return {
    userEmail,
    analyzed: true,
    checkInsEvaluated: diaryEntries.length,
    suggestionsCreated: newSuggestions.length,
  };
}

