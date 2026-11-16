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
export const DEFAULT_FALLBACK_DURATION_MS = 30 * 60 * 1000;
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export function getDateKeyInTimeZone(
  date: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/**
 * Returns true if the session started on a previous calendar day (in the user's timezone)
 * relative to `now`. Sessions on the same calendar day are never considered stale.
 */
export function isStaleTimeEntry(
  startTime: string | Date,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): boolean {
  const startDayKey = getDateKeyInTimeZone(startTime, timeZone);
  const nowDayKey = getDateKeyInTimeZone(now, timeZone);
  return startDayKey < nowDayKey;
}

/**
 * Computes the retroactive `endTime` for a session that was forgotten open from a previous day:
 * 1. If the session has check-ins, closes at the timestamp of the latest check-in.
 * 2. If the session has no check-ins, closes at `startTime + scheduledDurationMs` (fallback: 30m).
 */
export function resolveStaleTimeEntryEndTime(
  entry: RawTimeEntry,
  scheduledDurationMs?: number
): Date {
  const startMs = new Date(entry.startTime).getTime();
  const checkins = entry.checkins || [];

  if (checkins.length > 0) {
    const latestCheckInMs = Math.max(
      ...checkins.map(c => new Date(c.timestamp).getTime())
    );
    return new Date(Math.max(startMs, latestCheckInMs));
  }

  const fallbackDurationMs =
    typeof scheduledDurationMs === "number" && scheduledDurationMs > 0
      ? scheduledDurationMs
      : DEFAULT_FALLBACK_DURATION_MS;

  return new Date(startMs + fallbackDurationMs);
}

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
  now: Date = new Date(),
  scheduledDurationMs?: number
): TaskAccumulatedTime {
  const normalizedEntries = timeEntries.map(te => {
    if (!te.endTime && isStaleTimeEntry(te.startTime, now)) {
      return {
        ...te,
        endTime: resolveStaleTimeEntryEndTime(te, scheduledDurationMs),
      };
    }
    return te;
  });

  const activeEntry = normalizedEntries.find(te => !te.endTime);
  const pastTimeMs = normalizedEntries
    .filter(te => !!te.endTime)
    .reduce((acc, te) => {
      const duration =
        new Date(te.endTime!).getTime() - new Date(te.startTime).getTime();
      return acc + Math.max(0, duration);
    }, 0);

  const activeElapsedMs = activeEntry
    ? Math.max(0, now.getTime() - new Date(activeEntry.startTime).getTime())
    : 0;

  const lunchDiscountMs = hasTaskLunchDiscount(normalizedEntries) ? ONE_HOUR_MS : 0;
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
