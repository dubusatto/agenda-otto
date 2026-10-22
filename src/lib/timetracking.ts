export interface RawCheckIn {
  id: string;
  note: string;
  timestamp: string | Date;
  hasLunchDiscount?: boolean;
}

export interface RawTimeEntry {
  id: string;
  startTime: string | Date;
  endTime?: string | Date | null;
  checkins?: RawCheckIn[];
}

export interface ComputedCheckIn extends RawCheckIn {
  durationMs: number;
  hasLunchDiscount: boolean;
}

export const ONE_HOUR_MS = 60 * 60 * 1000;

export function calculateCheckInIntervals(entry: RawTimeEntry): ComputedCheckIn[] {
  const startMs = new Date(entry.startTime).getTime();
  const sorted = [...(entry.checkins || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return sorted.map((c, index) => {
    const currentMs = new Date(c.timestamp).getTime();
    const previousMs =
      index === 0 ? startMs : new Date(sorted[index - 1].timestamp).getTime();

    const rawDuration = Math.max(0, currentMs - previousMs);
    const hasLunchDiscount = !!c.hasLunchDiscount;
    const durationMs = hasLunchDiscount
      ? Math.max(0, rawDuration - ONE_HOUR_MS)
      : rawDuration;

    return {
      ...c,
      hasLunchDiscount,
      durationMs,
    };
  });
}

export function hasTaskLunchDiscount(timeEntries: RawTimeEntry[] = []): boolean {
  return timeEntries.some(te =>
    (te.checkins || []).some(c => !!c.hasLunchDiscount)
  );
}

export function canApplyLunchDiscount(
  timeEntries: RawTimeEntry[] = [],
  targetCheckInId: string
): boolean {
  const discountedCheckIn = timeEntries
    .flatMap(te => te.checkins || [])
    .find(c => !!c.hasLunchDiscount);

  if (!discountedCheckIn) return true;
  return discountedCheckIn.id === targetCheckInId;
}

export interface TaskAccumulatedTime {
  pastTimeMs: number;
  activeEntry?: RawTimeEntry;
  lunchDiscountMs: number;
  totalElapsedMs: number;
}

export function calculateTaskAccumulatedTime(
  timeEntries: RawTimeEntry[] = [],
  now: Date = new Date()
): TaskAccumulatedTime {
  const activeEntry = timeEntries.find(te => !te.endTime);
  const pastTimeMs = timeEntries
    .filter(te => !!te.endTime)
    .reduce((acc, te) => {
      const duration =
        new Date(te.endTime!).getTime() - new Date(te.startTime).getTime();
      return acc + Math.max(0, duration);
    }, 0);

  const activeElapsedMs = activeEntry
    ? Math.max(0, now.getTime() - new Date(activeEntry.startTime).getTime())
    : 0;

  const lunchDiscountMs = hasTaskLunchDiscount(timeEntries) ? ONE_HOUR_MS : 0;
  const totalElapsedMs = Math.max(
    0,
    pastTimeMs + activeElapsedMs - lunchDiscountMs
  );

  return {
    pastTimeMs,
    activeEntry,
    lunchDiscountMs,
    totalElapsedMs,
  };
}
