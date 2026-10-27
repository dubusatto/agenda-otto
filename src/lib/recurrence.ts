import { getSemanticColor } from '@/lib/colors';
import { CalendarEvent } from '@/lib/google';
import { RRule } from 'rrule';

export interface ScheduledTaskInput {
  id: string;
  googleTaskId: string;
  title: string;
  start: Date;
  end: Date;
  color?: string | null;
  completed?: boolean;
  hasCounter?: boolean;
  rrule?: string | null;
  exdates?: Date[];
  instances?: {
    id?: string;
    instanceDate: Date;
    completed: boolean;
    count?: number;
    timeEntries?: any[];
  }[];
}

function formatTaskTitle(
  baseTitle: string,
  completed: boolean
): string {
  const completedSuffix = completed ? ' (Concluída)' : '';
  return `✓ ${baseTitle}${completedSuffix}`;
}

export function computeNextCounterState(
  currentCount: number,
  delta: number
): { count: number; completed: boolean } {
  const nextCount = Math.max(0, currentCount + delta);
  return {
    count: nextCount,
    completed: nextCount > 0,
  };
}

function calculateMonthlyCount(
  instances: ScheduledTaskInput['instances'] = [],
  referenceDate: Date
): number {
  const targetYear = referenceDate.getUTCFullYear();
  const targetMonth = referenceDate.getUTCMonth();

  return instances.reduce((sum, inst) => {
    const instDate = new Date(inst.instanceDate);
    if (
      instDate.getUTCFullYear() === targetYear &&
      instDate.getUTCMonth() === targetMonth
    ) {
      return sum + (inst.count || 0);
    }
    return sum;
  }, 0);
}

export function expandScheduledTaskOccurrences(
  st: ScheduledTaskInput,
  timeMin: Date | string,
  timeMax: Date | string
): CalendarEvent[] {
  const hasCounter = !!st.hasCounter;

  const nonRecurringInstance =
    st.instances && st.instances.length > 0
      ? [...st.instances].sort(
          (a, b) => b.instanceDate.getTime() - a.instanceDate.getTime()
        )[0]
      : undefined;

  const isCompleted = nonRecurringInstance
    ? nonRecurringInstance.completed
    : !!st.completed;
  const nonRecurringCount = nonRecurringInstance?.count || 0;
  const baseMonthlyCount = calculateMonthlyCount(
    st.instances,
    new Date(st.start)
  );

  const baseEvent: CalendarEvent = {
    id: st.id,
    title: formatTaskTitle(st.title, isCompleted),
    start: st.start,
    end: st.end,
    allDay: false,
    calendarId: 'local-db',
    backgroundColor: st.color || getSemanticColor(st.googleTaskId),
    completed: isCompleted,
    hasCounter,
    count: nonRecurringCount,
    totalCount: baseMonthlyCount,
    rrule: st.rrule || undefined,
    timeEntries: nonRecurringInstance?.timeEntries || [],
  };

  if (st.rrule) {
    try {
      const options = RRule.parseString(st.rrule);
      options.dtstart = st.start;
      const duration = st.end.getTime() - st.start.getTime();

      const rruleObj = new RRule(options);
      const occurrences = rruleObj.between(
        new Date(timeMin),
        new Date(timeMax),
        true
      );

      const exdatesTimes = new Set(
        (st.exdates || []).map((d: Date) => new Date(d).getTime())
      );
      const validOccurrences = occurrences.filter(
        d => !exdatesTimes.has(d.getTime())
      );

      return validOccurrences.map(date => {
        const instance = st.instances?.find(
          inst => new Date(inst.instanceDate).getTime() === date.getTime()
        );
        const instCompleted = instance?.completed || false;
        const instCount = instance?.count || 0;
        const monthlyTotalCount = calculateMonthlyCount(st.instances, date);

        return {
          ...baseEvent,
          id: `${st.id}-${date.getTime()}`,
          title: formatTaskTitle(st.title, instCompleted),
          start: date,
          end: new Date(date.getTime() + duration),
          completed: instCompleted,
          hasCounter,
          count: instCount,
          totalCount: monthlyTotalCount,
          timeEntries: instance?.timeEntries || [],
        };
      });
    } catch (e) {
      console.error('Error parsing rrule', e);
      return [baseEvent];
    }
  }

  return [baseEvent];
}
