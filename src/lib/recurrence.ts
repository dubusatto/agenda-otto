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
  rrule?: string | null;
  exdates?: Date[];
  instances?: {
    id?: string;
    instanceDate: Date;
    completed: boolean;
    timeEntries?: any[];
  }[];
}

export function expandScheduledTaskOccurrences(
  st: ScheduledTaskInput,
  timeMin: Date | string,
  timeMax: Date | string
): CalendarEvent[] {
  const nonRecurringInstance =
    st.instances && st.instances.length > 0
      ? [...st.instances].sort(
          (a, b) => b.instanceDate.getTime() - a.instanceDate.getTime()
        )[0]
      : undefined;

  const isCompleted = nonRecurringInstance
    ? nonRecurringInstance.completed
    : !!st.completed;

  const baseEvent: CalendarEvent = {
    id: st.id,
    title: isCompleted ? `✓ ${st.title} (Concluída)` : `✓ ${st.title}`,
    start: st.start,
    end: st.end,
    allDay: false,
    calendarId: 'local-db',
    backgroundColor: st.color || getSemanticColor(st.googleTaskId),
    completed: isCompleted,
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

        return {
          ...baseEvent,
          id: `${st.id}-${date.getTime()}`,
          title: instCompleted ? `✓ ${st.title} (Concluída)` : `✓ ${st.title}`,
          start: date,
          end: new Date(date.getTime() + duration),
          completed: instCompleted,
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
