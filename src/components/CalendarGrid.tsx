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
  const tooltipText = `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`;
  
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

  const [pendingRecurrence, setPendingRecurrence] = useState<{event: any, start: Date, end: Date} | null>(null);

  const handleEventChange = async (event: any, start: Date, end: Date) => {
    if (event.rrule) {
      setPendingRecurrence({ event, start, end });
      return;
    }
    await updateScheduledTaskTime(event.id, start, end);
  };

  const executeRecurrenceAction = async (type: 'THIS' | 'ALL') => {
    if (!pendingRecurrence) return;
    const { event, start, end } = pendingRecurrence;
    setPendingRecurrence(null); // optimistically close
    
    startTransition(async () => {
      try {
        if (type === 'THIS') {
          const { extractScheduledTaskInstance } = await import('@/lib/actions');
          await extractScheduledTaskInstance(event.id, start, end);
        } else {
          await updateScheduledTaskTime(event.id, start, end);
        }
      } catch (err) {
        console.error("Failed to update recurring task", err);
      }
    });
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
        // @ts-ignore: Returning null explicitly removes the title attribute from the DOM, avoiding empty string bugs that suppress children tooltips
        tooltipAccessor={() => null}
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

      {pendingRecurrence && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Tarefa Recorrente</h3>
            <p className="text-sm text-gray-600 mb-6">
              Você está alterando uma tarefa recorrente. Deseja aplicar essa mudança apenas a este evento ou a todos da série?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => executeRecurrenceAction('THIS')}
                className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition"
              >
                Apenas este evento
              </button>
              <button
                onClick={() => executeRecurrenceAction('ALL')}
                className="w-full text-left px-4 py-3 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Todos os eventos recorrentes
              </button>
              <button
                onClick={() => setPendingRecurrence(null)}
                className="w-full mt-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition text-center"
              >
                Cancelar Ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
