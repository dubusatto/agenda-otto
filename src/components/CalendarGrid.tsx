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
import TaskModal from './TaskModal';

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
  const [date, setDate] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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
        date={date}
        onNavigate={setDate}
        views={['month', 'week', 'day']}
        style={{ height: '100%' }}
        onSelectEvent={(event) => setSelectedEvent(event as any)}
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
              borderRadius: '6px', 
              opacity: event.completed ? 0.5 : 1, 
              color: 'white', 
              border: 'none',
              padding: '2px 4px',
              fontSize: '12px',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            } 
          };
        }}
      />
      <TaskModal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        event={selectedEvent} 
      />
    </div>
  );
}
