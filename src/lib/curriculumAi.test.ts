import { describe, it, expect } from "vitest";
import {
  applyCurriculumPatch,
  applyCurriculumPatches,
  formatDiaryEntriesForPrompt,
  parseAndValidateAiResponse,
  shouldTriggerAutoAnalysis,
} from "./curriculumAi";

const SAMPLE_CURRICULUM = `# Eduardo Busatto
**Software Engineer**

## Experiência Profissional

### Otto — Engenheiro de Software
- Desenvolvimento da plataforma Atlas com 120 testes automatizados em Vitest.
- Integração com APIs externas e automação de leads no CRM Sellbot.

## Projetos Pessoais

### Agenda Edu
- Aplicação Full-Stack em Next.js, TypeScript e PostgreSQL (Neon) integrada ao Google Calendar e Tasks.
`;

describe("Seam 4: Curadoria Inteligente de Currículo (curriculumAi.ts)", () => {
  it("applies a REWRITE suggestion by replacing originalText character-by-character", () => {
    const updated = applyCurriculumPatch(SAMPLE_CURRICULUM, {
      type: "REWRITE",
      sectionTitle: "Otto — Engenheiro de Software",
      originalText:
        "- Desenvolvimento da plataforma Atlas com 120 testes automatizados em Vitest.",
      suggestedText:
        "- Desenvolvimento da plataforma Atlas com 289 testes automatizados (unitários e integração) em Vitest e Playwright.",
    });

    expect(updated).toContain(
      "- Desenvolvimento da plataforma Atlas com 289 testes automatizados (unitários e integração) em Vitest e Playwright."
    );
    expect(updated).not.toContain("com 120 testes automatizados");
  });

  it("falls back safely on REWRITE when originalText was manually edited, inserting below sectionTitle", () => {
    const updated = applyCurriculumPatch(SAMPLE_CURRICULUM, {
      type: "REWRITE",
      sectionTitle: "Otto — Engenheiro de Software",
      originalText: "- Linha antiga que não existe mais literalmente.",
      suggestedText:
        "- Arquitetura de microsserviços e automação completa de onboarding/offboarding de TI.",
    });

    const lines = updated.split("\n");
    const headerIdx = lines.findIndex((l) =>
      l.includes("### Otto — Engenheiro de Software")
    );
    expect(headerIdx).toBeGreaterThan(-1);
    expect(lines[headerIdx + 1]).toBe(
      "- Arquitetura de microsserviços e automação completa de onboarding/offboarding de TI."
    );
  });

  it("applies an ADD suggestion at the end of the target section before the next heading", () => {
    const updated = applyCurriculumPatch(SAMPLE_CURRICULUM, {
      type: "ADD",
      sectionTitle: "Otto — Engenheiro de Software",
      originalText: null,
      suggestedText:
        "- Implementação do módulo executivo Key Financials e Overview em tempo real.",
    });

    const lines = updated.split("\n");
    const sellbotIdx = lines.findIndex((l) => l.includes("CRM Sellbot"));
    const addedIdx = lines.findIndex((l) => l.includes("Key Financials"));
    const nextSectionIdx = lines.findIndex((l) =>
      l.includes("## Projetos Pessoais")
    );

    expect(addedIdx).toBe(sellbotIdx + 1);
    expect(addedIdx).toBeLessThan(nextSectionIdx);
  });

  it("creates a new section at the end of the document if ADD targets a non-existent sectionTitle", () => {
    const updated = applyCurriculumPatch(SAMPLE_CURRICULUM, {
      type: "ADD",
      sectionTitle: "Certificações & Conquistas",
      originalText: null,
      suggestedText: "- Destaque técnico em automação com IA generativa.",
    });

    expect(updated).toContain("## Certificações & Conquistas");
    expect(
      updated.trim().endsWith("- Destaque técnico em automação com IA generativa.")
    ).toBe(true);
  });

  it("applies multiple suggestions sequentially via applyCurriculumPatches", () => {
    const updated = applyCurriculumPatches(SAMPLE_CURRICULUM, [
      {
        type: "REWRITE",
        sectionTitle: "Agenda Edu",
        originalText:
          "- Aplicação Full-Stack em Next.js, TypeScript e PostgreSQL (Neon) integrada ao Google Calendar e Tasks.",
        suggestedText:
          "- Aplicação Full-Stack em Next.js 16, TypeScript e PostgreSQL (Neon) com curadoria inteligente de currículo via Gemini Pro.",
      },
      {
        type: "ADD",
        sectionTitle: "Otto — Engenheiro de Software",
        originalText: null,
        suggestedText: "- Criação do Otto Portal e migração completa para infraestrutura própria.",
      },
    ]);

    expect(updated).toContain("curadoria inteligente de currículo via Gemini Pro");
    expect(updated).toContain("Criação do Otto Portal");
  });

  it("formats diary entries grouped by São Paulo date and ignores noise ('opa')", () => {
    const formatted = formatDiaryEntriesForPrompt([
      {
        taskTitle: "Desenvolvimento Atlas",
        note: "opa",
        timestamp: "2026-11-02T14:00:00.000Z",
      },
      {
        taskTitle: "Desenvolvimento Atlas",
        note: "- Implementado filtro de saúde de projetos\n- 45 novos testes unitários",
        timestamp: "2026-11-02T18:00:00.000Z",
      },
    ]);

    expect(formatted).toContain("## 02/11/2026");
    expect(formatted).toContain(
      "- [Desenvolvimento Atlas] Implementado filtro de saúde de projetos"
    );
    expect(formatted).not.toContain("opa");
  });

  it("evaluates morning and post-20h auto-analysis fallback accurately", () => {
    const checkIns = [
      {
        timestamp: "2026-11-02T18:00:00.000Z", // 02/11 15:00 BRT
        note: "Entrega relevante ontem",
      },
    ];

    // Morning of Nov 3 (09:00 BRT = 12:00 UTC), never analyzed before -> should trigger
    expect(
      shouldTriggerAutoAnalysis(
        checkIns,
        null,
        new Date("2026-11-03T12:00:00.000Z")
      )
    ).toBe(true);

    // Already analyzed after that check-in -> should NOT trigger
    expect(
      shouldTriggerAutoAnalysis(
        checkIns,
        "2026-11-02T23:00:00.000Z",
        new Date("2026-11-03T12:00:00.000Z")
      )
    ).toBe(false);

    // Check-in created today at 14:00 BRT (17:00 UTC), current time is 15:00 BRT (18:00 UTC) -> wait until 20:00 BRT
    const todayCheckIns = [
      {
        timestamp: "2026-11-03T17:00:00.000Z",
        note: "Entrega feita hoje à tarde",
      },
    ];
    expect(
      shouldTriggerAutoAnalysis(
        todayCheckIns,
        null,
        new Date("2026-11-03T18:00:00.000Z") // 15:00 BRT
      )
    ).toBe(false);

    // Same check-in when user opens app at 20:30 BRT (23:30 UTC) -> should trigger
    expect(
      shouldTriggerAutoAnalysis(
        todayCheckIns,
        null,
        new Date("2026-11-03T23:30:00.000Z") // 20:30 BRT
      )
    ).toBe(true);
  });

  it("parses and validates structured Gemini JSON output", () => {
    const raw = JSON.stringify({
      suggestions: [
        {
          type: "REWRITE",
          sectionTitle: "Experiência Profissional",
          originalText: "- Antigo texto",
          suggestedText: "- Novo texto com métricas",
          reasoning: "Demonstra evolução de escala e testes",
          sourceDates: "03/11/2026",
        },
      ],
    });

    const parsed = parseAndValidateAiResponse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("REWRITE");
    expect(parsed[0].originalText).toBe("- Antigo texto");
    expect(parsed[0].suggestedText).toBe("- Novo texto com métricas");
  });
});
