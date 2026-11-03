#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Carrega .env caso DATABASE_URL ainda não esteja no ambiente
const envPath = path.join(PROJECT_ROOT, '.env');
if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();

const DEFAULT_EXECUTIVE_SUMMARY = `## 1. Síntese para Currículo / Portfólio Profissional

### Engenharia de IA, Agentes & Governança de LLMs (OpenRouter)
- **Arquitetura de Assistente de IA Multi-Perfil (Analista & Cliente):** Desenvolvimento completo do Assistente Otto integrado à Arena e ao Portal, com isolamento estrito de contexto por sessão e perfil, citações de fontes e histórico de conversação com rate-limiting configurável.
- **Triagem Inteligente em 3 Camadas (Redução de Custos):** Implementação de pipeline de roteamento com regras determinísticas no backend (custo zero para interações sociais/fora de escopo) → modelo roteador leve sem exposição de dados sensíveis → modelo principal acionado exclusivamente para perguntas de negócio.
- **Verificação Determinística de Dados Financeiros:** Criação de validador numérico (\`numeros.py\`) e linter de estilo (\`estilo.py\`) com suporte a escalas financeiras (\`K\`, \`MM\`, \`mil\`, \`mi\`, \`bi\`), recálculo de expressões no backend e mecanismo de *self-correction* (segunda tentativa automática guiada pelo erro quando o modelo alucina algum número).
- **Extração e Leitura Multi-Formato (RAG / Contexto Longo):** Pipeline de ingestão e resumo com controle de permissão para relatórios HTML, PDF, Excel, Word, CSV e TXT (suportando contexto direto de até 250.000 caracteres + fallback BM25).
- **FinOps de IA & Roteamento por Tiers:** Auditoria e contenção de custos no OpenRouter, migração de 15+ Edge Functions do gateway Lovable para chaves dedicadas com guardrails, criação de núcleo de roteamento por *tiers* (Google, OpenAI, Anthropic) com teto de custo por chamada (US$ 0,25), validação objetiva e redução de ~80–90% no custo de agentes recorrentes (Newsletter e Status Report).

### Arquitetura Full-Stack & Produtos (Plataforma Otto, Arena, Portal, Atlas, RFI)
- **Integração e Sincronização Bidirecional (Atlas × Otto):** Motor de sincronização de entregáveis, projetos multi-escopo e régua mensal automática para contratos recorrentes, além de painel comparativo administrativo ("Sincronizar todos").
- **Módulo de Jornada do Cliente & Gestão de Insumos:** Criação do fluxo *"O que precisamos de você"* (envio/retirada de arquivos pelo cliente, status *Pendente / Em análise*, notificações in-app segmentadas por papel e download/re-solicitação pela equipe).
- **Performance Frontend & Design System:** Unificação da identidade visual (Paleta Atlas quase-preto + verde-lima, busca global \`Ctrl+K\`, componente único de Jornada entre Arena e Portal) e redução de **88% no bundle JS inicial** do Otto Atlas (de \`1.979 kB\` para \`229 kB\` gzip) via *lazy-loading*, \`Suspense\` e orçamento de bundle no CI.
- **Sistemas Satélites (RFI Onboarding, Gestão de TI, Sellbot, CIAL, ICI):**
  - **RFI Onboarding:** Exportação CSV UTF-8 com BOM, reaproveitamento de rascunho por 30 dias, prevenção de envio sem anexos e upload em sessão para o SharePoint (arquivos > 4 MB) com 95% de cobertura de testes.
  - **Gestão de TI:** Desacoplamento e migração completa da plataforma para fora do Lovable, incluindo fluxos de on/offboarding.
  - **Automação Comercial:** Automação de cadastro de leads no CRM Sellbot e modelagem de P&L, Key Financials e fluxo de caixa.

### Segurança da Informação (AppSec) & Hardening de Banco de Dados
- **Isolamento Multi-Tenant & RLS (Row-Level Security):** Auditoria completa de rotas e políticas PostgreSQL/Supabase; correção de vazamentos cross-company no feed e em relatórios de sócios; criação de testes automatizados de mutação rodando sob o papel restrito \`otto_app\`.
- **Redução de Superfície Anônima (\`anon\` / \`PUBLIC\`):** Mapeamento e revogação de execução anônima em mais de 100 funções \`SECURITY DEFINER\` (migrations \`0208\`–\`0220\`), remoção da função crítica \`bootstrap-admin\`, e criação de RPC segura \`get_public_proposal\` para propostas públicas.
- **Gates de Dispositivos e Defesas de API:** Autorização explícita de telas de TV (\`/command-vista\` e \`/gestao-vista\` via \`useTvDevice\`), sanitização contra *Prompt Injection* em nomes de contas contábeis do DRE, e proteção de Edge Functions com validação de schema (Zod), limites de payload (\`413\`) e timeouts (\`504\`).

### Qualidade de Software (SDD + TDD) & Engenharia de CI/CD
- **Cultura SDD (Spec-Driven Development) & TDD com Prova de Mutação:** Especificações técnicas prévias, desenvolvimento orientado a testes (vermelho → verde) e validação por mutação.
- **Suítes de Testes Automatizados em Larga Escala:**
  - **Backend (\`finance_app\`):** +2.761 testes passando (unitários + integração real com banco PostgreSQL descartável, trava anti-produção, Redis de teste e storage R2 em memória), zerando todas as 13 falhas históricas da suíte.
  - **Frontend (\`frontend_app2\`):** +804 testes automatizados passando + suíte E2E com **Playwright** rodando contra backend real no CI.
  - **Otto Atlas:** +329 testes (Vitest + Deno + suíte SQL com replay completo de migrations) e catraca progressiva de cobertura e de paginação de consultas (\`fetchAllRows\` para eliminar truncamentos de 1.000 linhas do Supabase).`;

function fmtDuration(ms) {
  const totalMins = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtDateBR(isoOrDate) {
  const d = new Date(isoOrDate);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function fmtTimeBR(isoOrDate) {
  const d = new Date(isoOrDate);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDateKeySP(isoOrDate) {
  const d = new Date(isoOrDate);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

async function main() {
  const filePath = path.join(PROJECT_ROOT, 'CURRICULO-DIARIO.md');

  let executiveSummary = DEFAULT_EXECUTIVE_SUMMARY;
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    const sec1Start = existing.indexOf('## 1. Síntese para Currículo');
    const sec2Start = existing.indexOf('## 2. Histórico Completo de Check-ins');
    if (sec1Start !== -1 && sec2Start !== -1 && sec2Start > sec1Start) {
      executiveSummary = existing
        .slice(sec1Start, sec2Start)
        .replace(/\n---\s*$/, '')
        .trim();
    }
  }

  const tasks = await prisma.scheduledTask.findMany({
    include: {
      instances: {
        include: {
          timeEntries: {
            include: {
              checkins: {
                orderBy: { timestamp: 'asc' },
              },
            },
            orderBy: { startTime: 'asc' },
          },
        },
        orderBy: { instanceDate: 'asc' },
      },
    },
    orderBy: { start: 'asc' },
  });

  const checkInEvents = [];
  const completedInstances = [];

  for (const task of tasks) {
    for (const inst of task.instances) {
      if (inst.completed || (inst.count && inst.count > 0)) {
        completedInstances.push({
          taskTitle: task.title,
          instanceDate: inst.instanceDate,
          completed: inst.completed,
          count: inst.count || 0,
        });
      }
      for (const entry of inst.timeEntries) {
        let prevTime = new Date(entry.startTime).getTime();
        for (const ci of entry.checkins) {
          const ciTime = new Date(ci.timestamp).getTime();
          let diff = Math.max(0, ciTime - prevTime);
          if (ci.hasLunchDiscount) {
            diff = Math.max(0, diff - 3600000);
          }
          prevTime = ciTime;
          checkInEvents.push({
            id: ci.id,
            taskTitle: task.title,
            dateKey: getDateKeySP(ci.timestamp),
            timestamp: ci.timestamp,
            note: ci.note,
            durationMs: diff,
            hasLunchDiscount: ci.hasLunchDiscount,
          });
        }
      }
    }
  }

  checkInEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const byDate = new Map();
  for (const ev of checkInEvents) {
    if (!byDate.has(ev.dateKey)) byDate.set(ev.dateKey, []);
    byDate.get(ev.dateKey).push(ev);
  }

  const firstDateStr =
    checkInEvents.length > 0 ? fmtDateBR(checkInEvents[0].timestamp) : fmtDateBR(new Date());
  const lastDateStr =
    checkInEvents.length > 0
      ? fmtDateBR(checkInEvents[checkInEvents.length - 1].timestamp)
      : fmtDateBR(new Date());

  let md = `# Portfólio Técnico & Registro Completo do Diário (Agenda Edu)\n\n`;
  md += `> **Atualizado automaticamente em:** ${fmtDateBR(new Date())} às ${fmtTimeBR(new Date())}  \n`;
  md += `> **Período registrado no banco:** ${firstDateStr} a ${lastDateStr}  \n`;
  md += `> **Total de Check-ins Técnicos detalhados:** ${checkInEvents.length} registros\n\n`;
  md += `---\n\n`;
  md += `${executiveSummary}\n\n`;
  md += `---\n\n`;
  md += `## 2. Histórico Completo de Check-ins por Dia (Cronológico)\n\n`;

  const sortedDates = Array.from(byDate.keys()).sort();
  for (const dateKey of sortedDates) {
    const events = byDate.get(dateKey);
    const totalDayMs = events.reduce((acc, e) => acc + e.durationMs, 0);
    const [y, m, d] = dateKey.split('-');
    const brDate = `${d}/${m}/${y}`;

    md += `### 📅 ${brDate} (Tempo registrado nos check-ins: ${fmtDuration(totalDayMs)})\n\n`;

    for (const ev of events) {
      const timeStr = fmtTimeBR(ev.timestamp);
      const durStr = fmtDuration(ev.durationMs);
      const lunchTag = ev.hasLunchDiscount ? ' *(🥪 -1h almoço descontado)*' : '';
      md += `#### 🕒 ${timeStr} — **${ev.taskTitle}** (\`${durStr}\`)${lunchTag}\n\n`;
      md += `${ev.note.trim()}\n\n`;
      md += `---\n\n`;
    }
  }

  md += `## 3. Resumo de Hábitos e Tarefas Recorrentes Concluídas\n\n`;
  const byTaskTitle = new Map();
  for (const ci of completedInstances) {
    if (!byTaskTitle.has(ci.taskTitle)) byTaskTitle.set(ci.taskTitle, []);
    byTaskTitle.get(ci.taskTitle).push(ci);
  }

  for (const [title, list] of byTaskTitle.entries()) {
    const totalCompletions = list.filter((x) => x.completed).length;
    const totalCount = list.reduce((acc, x) => acc + (x.count || 0), 0);
    const datesList = list
      .map((x) => fmtDateBR(x.instanceDate) + (x.count > 0 ? ` (${x.count}x)` : ''))
      .join(', ');
    md += `- **${title}:** ${totalCompletions} dia(s) concluído(s)${
      totalCount > 0 ? ` — Total de repetições registradas: **${totalCount}x**` : ''
    } (${datesList})\n`;
  }

  fs.writeFileSync(filePath, md, 'utf8');
  console.log(`[SyncCurrículo] CURRICULO-DIARIO.md sincronizado (${checkInEvents.length} check-ins).`);
}

main()
  .catch((err) => {
    console.error('[SyncCurrículo] Erro:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
