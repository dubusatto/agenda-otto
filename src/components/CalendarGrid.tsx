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
import CreateTaskModal from './CreateTaskModal';

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

function CustomEvent({ event }: any) {
  // O title nativo do HTML cria um tooltip quando o mouse fica em cima
  const tooltipText = `${event.title} \n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`;
  
  return (
    <div title={tooltipText} className="w-full h-full flex flex-col overflow-hidden px-1 leading-none py-0.5">
      <span className="font-bold text-[11px] truncate">{event.title}</span>
    </div>
  );
}

export default function CalendarGrid({ events }: { events: CalendarEvent[] }) {
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newTaskSlot, setNewTaskSlot] = useState<{start: Date, end: Date} | null>(null);

  // Sync selected event when server data updates
  React.useEffect(() => {
    if (selectedEvent) {
      const updated = events.find(e => e.id === selectedEvent.id);
      if (updated) setSelectedEvent(updated);
    }
  }, [events]);

  const handleEventChange = async (event: any, start: Date, end: Date) => {
    if (event.rrule) {
      const confirmAll = window.confirm("Você está alterando uma tarefa que se repete.\n\nClique em OK para alterar SÓ ESTE evento.\nClique em Cancelar para alterar TODOS os eventos.");
      if (confirmAll) {
        // Change only this one (extract)
        const { extractScheduledTaskInstance } = await import('@/lib/actions');
        await extractScheduledTaskInstance(event.id, start, end);
        return;
      }
    }
    // Change all (or it's a non-recurring task)
    await updateScheduledTaskTime(event.id, start, end);
  };

  const handleEventDrop = ({ event, start, end }: EventInteractionArgs<any>) => {
    if (event.calendarId !== 'local-db') return;
    startTransition(async () => {
      try { await handleEventChange(event, new Date(start as any), new Date(end as any)); }
      catch (err) { console.error("Failed to move task", err); }
    });
  };

  const handleEventResize = ({ event, start, end }: EventInteractionArgs<any>) => {
    if (event.calendarId !== 'local-db') return;
    startTransition(async () => {
      try { await handleEventChange(event, new Date(start as any), new Date(end as any)); }
      catch (err) { console.error("Failed to resize task", err); }
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
        selectable
        onSelectSlot={(slotInfo) => {
          if (slotInfo.action === 'click' || slotInfo.action === 'select') {
            setNewTaskSlot({ start: slotInfo.start, end: slotInfo.end });
          }
        }}
        onSelectEvent={(event) => setSelectedEvent(event as any)}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        draggableAccessor={(event: any) => event.calendarId === 'local-db'}
        resizableAccessor={(event: any) => event.calendarId === 'local-db'}
        components={{
          timeSlotWrapper: TimeSlotWrapper,
          dateCellWrapper: DateCellWrapper,
          event: CustomEvent
        }}
        eventPropGetter={(event: any) => {
          return { 
            style: { 
              backgroundColor: event.backgroundColor, 
              borderRadius: '6px', 
              opacity: event.completed ? 0.5 : 1, 
              color: 'white', 
              border: 'none',
              padding: '0',
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
      <CreateTaskModal
        isOpen={!!newTaskSlot}
        onClose={() => setNewTaskSlot(null)}
        start={newTaskSlot?.start || null}
        end={newTaskSlot?.end || null}
      />
    </div>
  );
}
