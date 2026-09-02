"use client";

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CalendarGrid({ events }: { events: any[] }) {
  // Map Google events to react-big-calendar format
  const formattedEvents = events.map(e => ({
    title: e.summary,
    start: new Date(e.start?.dateTime || e.start?.date || Date.now()),
    end: new Date(e.end?.dateTime || e.end?.date || Date.now()),
    allDay: !e.start?.dateTime,
    resource: e,
  }));

  return (
    <div className="h-full w-full">
      <Calendar
        localizer={localizer}
        events={formattedEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={(event) => {
          const backgroundColor = event.resource?.backgroundColor || '#3174ad';
          return { style: { backgroundColor, borderRadius: '4px', opacity: 0.9, color: 'white', border: 'none' } };
        }}
      />
    </div>
  );
}
