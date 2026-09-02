"use client";

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { CalendarEvent } from '@/lib/google';
import React, { useState, useTransition } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { updateScheduledTaskTime } from '@/lib/actions';

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

const DnDCalendar = withDragAndDrop(Calendar as any);

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
  const [isPending, startTransition] = useTransition();

  const handleEventDrop = ({ event, start, end }: EventInteractionArgs<any>) => {
    if (event.calendarId !== 'local-db') return; // Only allow moving local scheduled tasks for now

    startTransition(async () => {
      try {
        await updateScheduledTaskTime(event.id, new Date(start as any), new Date(end as any));
      } catch (err) {
        console.error("Failed to move task", err);
      }
    });
  };

  const handleEventResize = ({ event, start, end }: EventInteractionArgs<any>) => {
    if (event.calendarId !== 'local-db') return;

    startTransition(async () => {
      try {
        await updateScheduledTaskTime(event.id, new Date(start as any), new Date(end as any));
      } catch (err) {
        console.error("Failed to resize task", err);
      }
    });
  };

  return (
    <div className={`h-full w-full ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        views={['month', 'week', 'day']}
        style={{ height: '100%' }}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        draggableAccessor={(event: any) => event.calendarId === 'local-db'}
        resizableAccessor={(event: any) => event.calendarId === 'local-db'}
        components={{
          timeSlotWrapper: TimeSlotWrapper,
          dateCellWrapper: DateCellWrapper,
        }}
        eventPropGetter={(event: any) => {
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
