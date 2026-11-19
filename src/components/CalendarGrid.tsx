"use client";

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { CalendarEvent } from '@/lib/google';
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { updateScheduledTaskTime, createCalendarProfile } from '@/lib/actions';
import {
  DEFAULT_PROFILE_NAME,
  GOOGLE_PROFILE_NAME,
  ProfileOption,
  filterEventsByProfiles,
  getProfileMeta,
  mergeProfiles,
  toggleProfileSelection,
} from '@/lib/profiles';
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

const STORAGE_KEY = 'agenda_otto_active_profiles_v1';

function CustomEvent({ event }: any) {
  const showCountBadge = event.hasCounter && (event.count || 0) > 0;
  const profileMeta = event.calendarId === 'local-db' && event.profile
    ? getProfileMeta(event.profile)
    : null;
  return (
    <div className="w-full h-full flex items-start gap-1 overflow-hidden px-1.5 pt-0.5 leading-tight">
      {showCountBadge && (
        <span
          style={{ backgroundColor: '#ffffff', color: '#1e1b4b' }}
          className="shrink-0 font-mono font-extrabold text-[10px] leading-none px-1 py-0.5 rounded shadow-2xs"
        >
          {event.count}x
        </span>
      )}
      {profileMeta && profileMeta.name !== DEFAULT_PROFILE_NAME && (
        <span
          title={`Perfil: ${profileMeta.name}`}
          className="shrink-0 text-[10px] leading-none"
        >
          {profileMeta.icon}
        </span>
      )}
      <span className="font-bold text-[11px] truncate">{event.title}</span>
    </div>
  );
}

export default function CalendarGrid({
  events,
  customProfiles = [],
  onDefaultProfileChange,
}: {
  events: CalendarEvent[];
  customProfiles?: Partial<ProfileOption>[];
  onDefaultProfileChange?: (profile: string) => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newTaskSlot, setNewTaskSlot] = useState<{start: Date, end: Date} | null>(null);
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, Partial<CalendarEvent>>>({});
  const [localAddedProfiles, setLocalAddedProfiles] = useState<ProfileOption[]>([]);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const allProfiles = React.useMemo(() => {
    const taskProfiles = events
      .filter((e) => e.calendarId === 'local-db')
      .map((e) => e.profile);
    return mergeProfiles([...customProfiles, ...localAddedProfiles], taskProfiles);
  }, [customProfiles, localAddedProfiles, events]);

  const hasGoogleEvents = React.useMemo(
    () => events.some((e) => e.calendarId !== 'local-db'),
    [events]
  );

  const allFilterNames = React.useMemo(() => {
    const names = allProfiles.map((p) => p.name);
    if (hasGoogleEvents) names.push(GOOGLE_PROFILE_NAME);
    return names;
  }, [allProfiles, hasGoogleEvents]);

  const [activeProfiles, setActiveProfiles] = useState<string[]>(() => allFilterNames);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  // Restore saved profile filter from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveProfiles(parsed);
        }
      }
    } catch {
      // ignore storage errors
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  React.useEffect(() => {
    if (!hasLoadedStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProfiles));
    } catch {
      // ignore storage errors
    }
  }, [activeProfiles, hasLoadedStorage]);

  const defaultCreateProfile = React.useMemo(() => {
    const activeLocal = activeProfiles.filter((p) => p !== GOOGLE_PROFILE_NAME);
    if (activeLocal.length === 1) return activeLocal[0];
    return DEFAULT_PROFILE_NAME;
  }, [activeProfiles]);

  React.useEffect(() => {
    onDefaultProfileChange?.(defaultCreateProfile);
  }, [defaultCreateProfile, onDefaultProfileChange]);

  const isAllSelected = React.useMemo(
    () => allFilterNames.every((name) => activeProfiles.includes(name)),
    [allFilterNames, activeProfiles]
  );

  const handleToggleProfile = (name: string) => {
    setActiveProfiles((prev) => toggleProfileSelection(prev, name, allFilterNames));
  };

  const handleSelectAllProfiles = () => {
    setActiveProfiles(allFilterNames);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newProfileName.trim();
    if (!cleaned) return;
    setNewProfileName('');
    setIsAddingProfile(false);
    setLocalAddedProfiles((prev) => [...prev, { name: cleaned, icon: '📌', color: '#3b82f6' }]);
    setActiveProfiles((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    startTransition(async () => {
      try {
        await createCalendarProfile(cleaned);
        router.refresh();
      } catch (err) {
        console.error('Erro ao criar perfil', err);
      }
    });
  };

  const displayEvents = React.useMemo(() => {
    const withOverrides = events.map(ev =>
      optimisticOverrides[ev.id] ? { ...ev, ...optimisticOverrides[ev.id] } : ev
    );
    return filterEventsByProfiles(withOverrides, activeProfiles);
  }, [events, optimisticOverrides, activeProfiles]);

  const handleOptimisticEventUpdate = React.useCallback(
    (eventId: string, patch: Partial<CalendarEvent>) => {
      setOptimisticOverrides(prev => ({
        ...prev,
        [eventId]: { ...(prev[eventId] || {}), ...patch },
      }));
      setSelectedEvent(prev =>
        prev && prev.id === eventId ? { ...prev, ...patch } : prev
      );
    },
    []
  );

  // Switch to Day view automatically on mobile screens (portrait or landscape) so columns aren't squished
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setView('day');
    }
  }, []);

  // Sync selected event when server data updates
  React.useEffect(() => {
    setOptimisticOverrides({});
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
    <div className={`h-full w-full flex flex-col ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Barra de Perfis / Contextos (multi-seleção) */}
      <div className="flex items-center gap-1.5 flex-wrap pb-2 mb-2 border-b border-gray-100 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-1">
          Perfis:
        </span>
        <button
          type="button"
          onClick={handleSelectAllProfiles}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
            isAllSelected
              ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          Todos
        </button>
        {allProfiles.map((prof) => {
          const isActive = activeProfiles.includes(prof.name);
          return (
            <button
              key={prof.name}
              type="button"
              onClick={() => handleToggleProfile(prof.name)}
              style={
                isActive
                  ? { backgroundColor: prof.color, borderColor: prof.color, color: '#ffffff' }
                  : undefined
              }
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition border inline-flex items-center gap-1 ${
                isActive
                  ? 'shadow-xs'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 opacity-70'
              }`}
            >
              <span>{prof.icon}</span>
              <span>{prof.name}</span>
            </button>
          );
        })}
        {hasGoogleEvents && (
          <button
            type="button"
            onClick={() => handleToggleProfile(GOOGLE_PROFILE_NAME)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition border inline-flex items-center gap-1 ${
              activeProfiles.includes(GOOGLE_PROFILE_NAME)
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 opacity-70'
            }`}
          >
            <span>🗓️</span>
            <span>Google</span>
          </button>
        )}

        {isAddingProfile ? (
          <form onSubmit={handleCreateProfile} className="inline-flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Ex: Saúde"
              className="px-2 py-0.5 text-xs border border-blue-400 rounded-full w-24 text-gray-800 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingProfile(false);
                setNewProfileName('');
              }}
              className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingProfile(true)}
            className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
          >
            + Perfil
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
      <DnDCalendar
        localizer={localizer}
        events={displayEvents}
        startAccessor="start"
        endAccessor="end"
        // @ts-ignore: Returning null explicitly removes the title attribute from the DOM, avoiding empty string bugs that suppress children tooltips
        tooltipAccessor={() => null}
        formats={{
          eventTimeRangeFormat: () => '',
        }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        views={['month', 'week', 'day']}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
        style={{ height: '100%' }}
        selectable
        onSelectSlot={(slotInfo) => {
          if (slotInfo.action === 'click' || slotInfo.action === 'select') {
            setNewTaskSlot({ start: slotInfo.start, end: slotInfo.end });
          }
        }}
        onSelectEvent={(event) => {
          setSelectedEvent(event as any);
        }}
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
      </div>
      <TaskModal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        event={selectedEvent}
        profiles={allProfiles}
        onOptimisticUpdate={handleOptimisticEventUpdate}
      />
      <CreateTaskModal
        isOpen={!!newTaskSlot}
        onClose={() => setNewTaskSlot(null)}
        start={newTaskSlot?.start || null}
        end={newTaskSlot?.end || null}
        profiles={allProfiles}
        defaultProfile={defaultCreateProfile}
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
