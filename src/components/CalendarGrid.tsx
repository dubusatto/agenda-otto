"use client";

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent } from '@/lib/google';

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

export default function CalendarGrid({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="h-full w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={(event: CalendarEvent) => {
          return { 
            style: { 
              backgroundColor: event.backgroundColor, 
              borderRadius: '4px', 
              opacity: 0.9, 
              color: 'white', 
              border: 'none' 
            } 
          };
        }}
      />
    </div>
  );
}
