import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

function fmtDateBR(isoOrDate: string | Date): string {
  const d = new Date(isoOrDate);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function fmtTimeBR(isoOrDate: string | Date): string {
  const d = new Date(isoOrDate);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDateKeySP(isoOrDate: string | Date): string {
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

export function formatNoteLines(note: string): string[] {
  const rawLines = note
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.toLowerCase() !== 'opa');

  const items: string[] = [];
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

/**
 * Sincroniza o arquivo local CURRICULO-DIARIO.md com todos os dados atuais do banco Neon,
 * organizado em ordem cronológica por data (DD/MM/AAAA) com a lista do que foi feito em cada dia.
 */
export async function syncCurriculoMd(): Promise<void> {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST || !prisma.scheduledTask?.findMany) {
    return;
  }
  try {
    const filePath = path.join(process.cwd(), 'CURRICULO-DIARIO.md');

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

    interface CheckInEvent {
      id: string;
      taskTitle: string;
      dateKey: string;
      timestamp: Date;
      note: string;
    }

    const checkInEvents: CheckInEvent[] = [];

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

    const byDate = new Map<string, CheckInEvent[]>();
    for (const ev of checkInEvents) {
      if (!byDate.has(ev.dateKey)) byDate.set(ev.dateKey, []);
      byDate.get(ev.dateKey)!.push(ev);
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
      const events = byDate.get(dateKey)!;
      const [y, m, d] = dateKey.split('-');
      const brDate = `${d}/${m}/${y}`;

      const dayLines: string[] = [];
      for (const ev of events) {
        dayLines.push(...formatNoteLines(ev.note));
      }

      if (dayLines.length > 0) {
        md += `## ${brDate}\n\n`;
        md += `${dayLines.join('\n')}\n\n`;
      }
    }

    fs.writeFileSync(filePath, md, 'utf8');
  } catch (err) {
    console.warn('syncCurriculoMd skipped or failed:', (err as Error)?.message);
  }
}

/**
 * Atualiza uma cópia local do currículo oficial (CURRICULO-OFICIAL.md) quando rodando localmente.
 */
export async function syncOfficialCurriculumMd(content: string): Promise<void> {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return;
  }
  try {
    const filePath = path.join(process.cwd(), 'CURRICULO-OFICIAL.md');
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.warn('syncOfficialCurriculumMd skipped or failed:', (err as Error)?.message);
  }
}
