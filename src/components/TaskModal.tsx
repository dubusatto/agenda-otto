"use client";

import { CalendarEvent } from "@/lib/google";
import { useState, useEffect, useTransition } from "react";
import { updateScheduledTaskRecurrence, deleteScheduledTask, toggleScheduledTaskCompletion } from "@/lib/actions";

const DAYS_MAP = [
  { id: 'MO', label: 'S' },
  { id: 'TU', label: 'T' },
  { id: 'WE', label: 'Q' },
  { id: 'TH', label: 'Q' },
  { id: 'FR', label: 'S' },
  { id: 'SA', label: 'S' },
  { id: 'SU', label: 'D' },
];

export default function TaskModal({ 
  isOpen, 
  onClose, 
  event 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  event: CalendarEvent | null 
}) {
  const [isPending, startTransition] = useTransition();
  const [recurrenceType, setRecurrenceType] = useState<'NONE' | 'DAILY' | 'WEEKLY'>('NONE');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Sync state when modal opens
  useEffect(() => {
    if (event?.rrule) {
      if (event.rrule.includes('FREQ=WEEKLY')) {
        setRecurrenceType('WEEKLY');
        const byDayMatch = event.rrule.match(/BYDAY=([^;]+)/);
        if (byDayMatch) {
          setSelectedDays(byDayMatch[1].split(','));
        } else {
          setSelectedDays([]); // If no days specified, it's just every week on the start date
        }
      } else if (event.rrule.includes('FREQ=DAILY')) {
        setRecurrenceType('DAILY');
        setSelectedDays([]);
      }
    } else {
      setRecurrenceType('NONE');
      setSelectedDays([]);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const isLocal = event.calendarId === 'local-db';

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSaveRecurrence = () => {
    if (!isLocal) return;
    
    startTransition(async () => {
      let rrule = null;
      if (recurrenceType === 'DAILY') {
        rrule = 'FREQ=DAILY';
      } else if (recurrenceType === 'WEEKLY') {
        rrule = selectedDays.length > 0 ? `FREQ=WEEKLY;BYDAY=${selectedDays.join(',')}` : 'FREQ=WEEKLY';
      }
      
      await updateScheduledTaskRecurrence(event.id, rrule);
      onClose();
    });
  };

  const handleDelete = () => {
    if (!isLocal) return;
    startTransition(async () => {
      await deleteScheduledTask(event.id);
      onClose();
    });
  };

  const hasRecurrenceChanged = () => {
    const originalRrule = event.rrule || null;
    let newRrule = null;
    if (recurrenceType === 'DAILY') {
      newRrule = 'FREQ=DAILY';
    } else if (recurrenceType === 'WEEKLY') {
      newRrule = selectedDays.length > 0 ? `FREQ=WEEKLY;BYDAY=${selectedDays.join(',')}` : 'FREQ=WEEKLY';
    }
    return originalRrule !== newRrule;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="h-4 w-full" style={{ backgroundColor: event.backgroundColor }}></div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{event.title}</h2>
          <p className="text-sm text-gray-500 mb-6 font-medium">
            {event.start.toLocaleDateString()} das {event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} às {event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>

          {isLocal ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Padrão de Repetição</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setRecurrenceType('NONE')}
                    disabled={isPending}
                    className={`flex-1 py-2 px-3 border rounded-xl text-sm font-medium transition ${recurrenceType === 'NONE' ? 'bg-gray-100 border-gray-300 text-gray-900 ring-1 ring-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    Não repete
                  </button>
                  <button 
                    onClick={() => setRecurrenceType('DAILY')}
                    disabled={isPending}
                    className={`flex-1 py-2 px-3 border rounded-xl text-sm font-medium transition ${recurrenceType === 'DAILY' ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-300' : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    Diário
                  </button>
                  <button 
                    onClick={() => setRecurrenceType('WEEKLY')}
                    disabled={isPending}
                    className={`flex-1 py-2 px-3 border rounded-xl text-sm font-medium transition ${recurrenceType === 'WEEKLY' ? 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700 ring-1 ring-fuchsia-300' : 'bg-white border-gray-200 text-gray-600 hover:bg-fuchsia-50 hover:text-fuchsia-600'}`}
                  >
                    Semanal
                  </button>
                </div>
              </div>

              {recurrenceType === 'WEEKLY' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Repetir nos dias:</label>
                  <div className="flex justify-between gap-1">
                    {DAYS_MAP.map(day => {
                      const isSelected = selectedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(day.id)}
                          className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${isSelected ? 'bg-fuchsia-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {hasRecurrenceChanged() && (
                <div className="pt-2">
                  <button 
                    onClick={handleSaveRecurrence}
                    disabled={isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    Salvar Mudança de Recorrência
                  </button>
                </div>
              )}

              <div className="pt-4 flex justify-between border-t border-gray-100 items-center">
                <button 
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition"
                >
                  Excluir
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      startTransition(async () => {
                        await toggleScheduledTaskCompletion(event.id, !event.completed);
                        onClose();
                      });
                    }}
                    disabled={isPending}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    {event.completed ? 'Reabrir Tarefa' : 'Marcar Concluída'}
                  </button>
                  <button 
                    onClick={onClose}
                    className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          ) : (
             <div className="pt-4 flex justify-end border-t border-gray-100">
                <button 
                  onClick={onClose}
                  className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                >
                  Fechar
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
