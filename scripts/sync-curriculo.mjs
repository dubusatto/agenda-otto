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

function formatNoteLines(note) {
  const rawLines = note
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.toLowerCase() !== 'opa');

  const items = [];
  for (const line of rawLines) {
    if (/^[-*•_]\s+/.test(line)) {
      items.push(`- ${line.replace(/^[-*•_]\s+/, '').trim()}`);
    } else if (/^\d+[.)]\s+/.test(line)) {
      items.push(`- ${line.replace(/^\d+[.)]\s+/, '').trim()}`);
    } else {
      items.push(`- ${line}`);
    }
  }
  return items;
}

async function main() {
  const filePath = path.join(PROJECT_ROOT, 'CURRICULO-DIARIO.md');

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

  for (const task of tasks) {
    for (const inst of task.instances) {
      for (const entry of inst.timeEntries) {
        for (const ci of entry.checkins) {
          checkInEvents.push({
            id: ci.id,
            taskTitle: task.title,
            dateKey: getDateKeySP(ci.timestamp),
            timestamp: ci.timestamp,
            note: ci.note,
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

  let md = `# Registro de Atividades do Diário (Agenda Edu)\n\n`;
  md += `> **Atualizado automaticamente em:** ${fmtDateBR(new Date())} às ${fmtTimeBR(new Date())}  \n`;
  md += `> **Período registrado:** ${firstDateStr} a ${lastDateStr} (${checkInEvents.length} check-ins)\n\n`;
  md += `---\n\n`;

  const sortedDates = Array.from(byDate.keys()).sort();
  for (const dateKey of sortedDates) {
    const events = byDate.get(dateKey);
    const [y, m, d] = dateKey.split('-');
    const brDate = `${d}/${m}/${y}`;

    const dayLines = [];
    for (const ev of events) {
      dayLines.push(...formatNoteLines(ev.note));
    }

    if (dayLines.length > 0) {
      md += `## ${brDate}\n\n`;
      md += `${dayLines.join('\n')}\n\n`;
    }
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
