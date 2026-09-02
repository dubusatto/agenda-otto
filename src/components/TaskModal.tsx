"use client";

import { CalendarEvent } from "@/lib/google";
import { useTransition } from "react";
import { updateScheduledTaskRecurrence, deleteScheduledTask } from "@/lib/actions";

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
  
  if (!isOpen || !event) return null;

  const isLocal = event.calendarId === 'local-db';

  const handleSetRecurrence = (freq: 'DAILY' | 'WEEKLY' | 'NONE') => {
    if (!isLocal) return;
    
    startTransition(async () => {
      const rrule = freq === 'NONE' ? null : `FREQ=${freq}`;
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recorrência</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSetRecurrence('NONE')}
                    disabled={isPending}
                    className="flex-1 py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:bg-gray-100 transition font-medium"
                  >
                    Não repete
                  </button>
                  <button 
                    onClick={() => handleSetRecurrence('DAILY')}
                    disabled={isPending}
                    className="flex-1 py-2 px-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm hover:bg-blue-100 transition font-medium"
                  >
                    Diário
                  </button>
                  <button 
                    onClick={() => handleSetRecurrence('WEEKLY')}
                    disabled={isPending}
                    className="flex-1 py-2 px-3 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 rounded-xl text-sm hover:bg-fuchsia-100 transition font-medium"
                  >
                    Semanal
                  </button>
                </div>
              </div>
              
              <div className="pt-4 flex justify-between border-t border-gray-100 items-center">
                <button 
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition"
                >
                  Excluir do Calendário
                </button>
                <button 
                  onClick={onClose}
                  className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                >
                  Concluído
                </button>
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
