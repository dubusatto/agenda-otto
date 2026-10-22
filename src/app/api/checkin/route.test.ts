import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    timeEntry: {
      findFirst: vi.fn(),
    },
    checkIn: {
      create: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from './route';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

describe('Seam 2: Claude Code MCP Check-in Webhook (POST /api/checkin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENDA_API_TOKEN = 'secret-otto-token';
  });

  it('returns 401 Unauthorized when Authorization header is missing or invalid', async () => {
    const reqNoAuth = new Request('http://localhost:3000/api/checkin', {
      method: 'POST',
      body: JSON.stringify({ resumo: 'Did something' }),
    });
    const resNoAuth = await POST(reqNoAuth);
    expect(resNoAuth.status).toBe(401);

    const reqWrongToken = new Request('http://localhost:3000/api/checkin', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-token' },
      body: JSON.stringify({ resumo: 'Did something' }),
    });
    const resWrongToken = await POST(reqWrongToken);
    expect(resWrongToken.status).toBe(401);
  });

  it('returns 400 Bad Request when resumo is missing or empty', async () => {
    const req = new Request('http://localhost:3000/api/checkin', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-otto-token' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('resumo');
  });

  it('returns 404 Not Found when no active TimeEntry (endTime: null) exists', async () => {
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/checkin', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-otto-token' },
      body: JSON.stringify({ resumo: 'Finished refactoring' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Nenhuma sessão de trabalho ativa');
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
  });

  it('creates CheckIn on the active TimeEntry, revalidates root path, and returns 200 OK', async () => {
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValueOnce({
      id: 'active-entry-99',
      taskInstanceId: 'inst-1',
      startTime: new Date('2026-10-22T10:00:00.000Z'),
      endTime: null,
    } as any);

    vi.mocked(prisma.checkIn.create).mockResolvedValueOnce({
      id: 'checkin-1',
      timeEntryId: 'active-entry-99',
      note: 'Implemented Vitest suite',
      timestamp: new Date(),
      hasLunchDiscount: false,
    } as any);

    const req = new Request('http://localhost:3000/api/checkin', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-otto-token' },
      body: JSON.stringify({ resumo: 'Implemented Vitest suite' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.checkIn.create).toHaveBeenCalledWith({
      data: {
        timeEntryId: 'active-entry-99',
        note: 'Implemented Vitest suite',
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
});
