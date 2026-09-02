"use client";

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent } from '@/lib/google';
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';

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

function TimeSlotWrapper({ children, value }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: value.toISOString(),
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`h-full w-full flex-1 transition-colors ${isOver ? 'bg-blue-100/50 ring-2 ring-inset ring-blue-400' : ''}`}
    >
      {children}
    </div>
  );
}

function DateCellWrapper({ children, value }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: value.toISOString(),
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`h-full w-full transition-colors ${isOver ? 'bg-blue-100/50 ring-2 ring-inset ring-blue-400' : ''}`}
    >
      {children}
    </div>
  );
}

export default function CalendarGrid({ events }: { events: CalendarEvent[] }) {
  const [view, setView] = useState<View>('week');

  return (
    <div className="h-full w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        views={['month', 'week', 'day']}
        style={{ height: '100%' }}
        components={{
          timeSlotWrapper: TimeSlotWrapper,
          dateCellWrapper: DateCellWrapper,
        }}
        eventPropGetter={(event: CalendarEvent) => {
          return { 
            style: { 
              backgroundColor: event.backgroundColor, 
              borderRadius: '4px', 
              opacity: 0.9, 
              color: 'white', 
              border: 'none',
              padding: '2px 4px',
              fontSize: '12px'
            } 
          };
        }}
      />
    </div>
  );
}
