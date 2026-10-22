import { describe, it, expect } from 'vitest';
import { expandScheduledTaskOccurrences } from './recurrence';

describe('Seam 3: Recurrence Engine & Calendar Window (recurrence.ts)', () => {
  it('returns a single CalendarEvent for a non-recurring task with its latest instance state', () => {
    const task = {
      id: 'task-single-1',
      googleTaskId: 'gtask-1',
      title: 'Revisar PR',
      start: new Date('2026-10-22T14:00:00.000Z'),
      end: new Date('2026-10-22T14:30:00.000Z'),
      color: '#3b82f6',
      completed: false,
      rrule: null,
      exdates: [],
      instances: [
        {
          id: 'inst-1',
          instanceDate: new Date('2026-10-22T14:00:00.000Z'),
          completed: true,
          timeEntries: [{ id: 'te-1', startTime: new Date('2026-10-22T14:00:00.000Z'), endTime: null }],
        },
      ],
    };

    const events = expandScheduledTaskOccurrences(
      task,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T23:59:59.000Z')
    );

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('task-single-1');
    expect(events[0].title).toBe('✓ Revisar PR (Concluída)');
    expect(events[0].completed).toBe(true);
    expect(events[0].timeEntries).toHaveLength(1);
  });

  it('expands recurring tasks across month boundaries preserving event duration', () => {
    // Created on the last day of September (Wed, Sep 30, 2026) with MO,WE,FR recurrence
    const task = {
      id: 'task-month-boundary',
      googleTaskId: 'gtask-2',
      title: 'Daily Standup',
      start: new Date('2026-09-30T12:00:00.000Z'),
      end: new Date('2026-09-30T12:30:00.000Z'), // 30m duration
      color: '#10b981',
      completed: false,
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      exdates: [],
      instances: [],
    };

    // Query window in October: Oct 1 (Thu) to Oct 7 (Wed) -> should match Oct 2 (Fri), Oct 5 (Mon), Oct 7 (Wed)
    const events = expandScheduledTaskOccurrences(
      task,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-07T23:59:59.000Z')
    );

    expect(events).toHaveLength(3);
    expect(events.map(e => e.start.toISOString())).toEqual([
      '2026-10-02T12:00:00.000Z',
      '2026-10-05T12:00:00.000Z',
      '2026-10-07T12:00:00.000Z',
    ]);
    // Verify 30m duration preserved on each occurrence
    events.forEach(ev => {
      expect(ev.end.getTime() - ev.start.getTime()).toBe(30 * 60 * 1000);
    });
  });

  it('omits dates in exdates and binds completed status and timeEntries per date-specific TaskInstance', () => {
    const oct2 = new Date('2026-10-02T12:00:00.000Z');
    const oct5 = new Date('2026-10-05T12:00:00.000Z');
    const oct7 = new Date('2026-10-07T12:00:00.000Z');

    const task = {
      id: 'task-rec-instances',
      googleTaskId: 'gtask-3',
      title: 'Refino Técnico',
      start: new Date('2026-09-30T12:00:00.000Z'),
      end: new Date('2026-09-30T12:30:00.000Z'),
      color: '#8b5cf6',
      completed: false,
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      exdates: [oct5], // Oct 5 was individually deleted
      instances: [
        {
          id: 'inst-oct2',
          instanceDate: oct2,
          completed: true,
          timeEntries: [{ id: 'te-oct2', startTime: oct2, endTime: null }],
        },
      ],
    };

    const events = expandScheduledTaskOccurrences(
      task,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-07T23:59:59.000Z')
    );

    // Oct 5 should be filtered out, leaving only Oct 2 and Oct 7
    expect(events.map(e => e.start.toISOString())).toEqual([
      oct2.toISOString(),
      oct7.toISOString(),
    ]);

    // Oct 2 has a completed instance with 1 timeEntry
    expect(events[0].completed).toBe(true);
    expect(events[0].title).toBe('✓ Refino Técnico (Concluída)');
    expect(events[0].timeEntries).toHaveLength(1);

    // Oct 7 has no instance yet -> not completed, empty timeEntries
    expect(events[1].completed).toBe(false);
    expect(events[1].title).toBe('✓ Refino Técnico');
    expect(events[1].timeEntries).toEqual([]);
  });
});
