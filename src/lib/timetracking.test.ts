import { describe, it, expect } from 'vitest';
import {
  calculateCheckInIntervals,
  canApplyLunchDiscount,
  calculateTaskAccumulatedTime,
} from './timetracking';

describe('Seam 1: Time Tracking, Check-ins & Lunch Discount (timetracking.ts)', () => {
  it('orders check-ins chronologically and calculates first interval from startTime and subsequent from previous check-in', () => {
    const entry = {
      id: 'entry-1',
      startTime: '2026-10-22T09:00:00.000Z',
      checkins: [
        // Deliberately out of chronological order
        {
          id: 'c2',
          note: 'Implemented API route',
          timestamp: '2026-10-22T10:15:00.000Z', // 45m after c1
          hasLunchDiscount: false,
        },
        {
          id: 'c1',
          note: 'Created database schema',
          timestamp: '2026-10-22T09:30:00.000Z', // 30m after startTime
          hasLunchDiscount: false,
        },
      ],
    };

    const result = calculateCheckInIntervals(entry);

    expect(result.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(result[0].durationMs).toBe(30 * 60 * 1000); // 1,800,000 ms
    expect(result[1].durationMs).toBe(45 * 60 * 1000); // 2,700,000 ms
  });

  it('deducts 1 hour when hasLunchDiscount is true and clamps to 0ms if interval is under 1 hour', () => {
    const entry = {
      id: 'entry-lunch',
      startTime: '2026-10-22T11:30:00.000Z',
      checkins: [
        {
          id: 'c-long',
          note: 'Finished module after lunch',
          timestamp: '2026-10-22T13:40:00.000Z', // 2h 10m (130m) raw -> 1h 10m (70m) after -1h
          hasLunchDiscount: true,
        },
        {
          id: 'c-short',
          note: 'Quick fix during short break',
          timestamp: '2026-10-22T14:20:00.000Z', // 40m raw -> 0ms after -1h
          hasLunchDiscount: true,
        },
      ],
    };

    const result = calculateCheckInIntervals(entry);

    expect(result[0].durationMs).toBe(70 * 60 * 1000); // 4,200,000 ms (1h 10m)
    expect(result[1].durationMs).toBe(0);
  });

  it('enforces lunch discount exclusivity across all time entries of a task', () => {
    const timeEntries = [
      {
        id: 'te-1',
        startTime: '2026-10-22T09:00:00.000Z',
        endTime: '2026-10-22T12:00:00.000Z',
        checkins: [
          { id: 'c1', note: 'Morning work', timestamp: '2026-10-22T11:00:00.000Z', hasLunchDiscount: false },
        ],
      },
      {
        id: 'te-2',
        startTime: '2026-10-22T13:00:00.000Z',
        endTime: null,
        checkins: [
          { id: 'c2', note: 'Afternoon work', timestamp: '2026-10-22T14:30:00.000Z', hasLunchDiscount: true },
        ],
      },
    ];

    // c1 cannot apply lunch discount because c2 already has it
    expect(canApplyLunchDiscount(timeEntries, 'c1')).toBe(false);
    // c2 is the one that already has it, so it remains actionable (to toggle off)
    expect(canApplyLunchDiscount(timeEntries, 'c2')).toBe(true);
  });

  it('calculates total accumulated task time across closed and active entries minus lunch discount', () => {
    const timeEntries = [
      {
        id: 'te-closed',
        startTime: '2026-10-22T09:00:00.000Z',
        endTime: '2026-10-22T11:00:00.000Z', // 2h closed
        checkins: [],
      },
      {
        id: 'te-active',
        startTime: '2026-10-22T13:00:00.000Z',
        endTime: null, // active
        checkins: [
          {
            id: 'c-lunch',
            note: 'Post-lunch progress',
            timestamp: '2026-10-22T14:00:00.000Z',
            hasLunchDiscount: true, // -1h discount
          },
        ],
      },
    ];

    const now = new Date('2026-10-22T14:30:00.000Z'); // 1h30m into active session
    // Total = 2h (closed) + 1h30m (active) - 1h (lunch) = 2h30m (150 minutes)
    const summary = calculateTaskAccumulatedTime(timeEntries, now);

    expect(summary.pastTimeMs).toBe(120 * 60 * 1000);
    expect(summary.lunchDiscountMs).toBe(60 * 60 * 1000);
    expect(summary.totalElapsedMs).toBe(150 * 60 * 1000);
  });
});
