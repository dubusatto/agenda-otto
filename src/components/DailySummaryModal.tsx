"use client";

import { GoogleTask } from "@/lib/google";
import { isToday } from "date-fns";
import { useEffect } from "react";

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: GoogleTask[];
  localTasks: any[]; // Scheduled tasks containing instances and checkins
}

export default function DailySummaryModal({ isOpen, onClose, tasks, localTasks }: DailySummaryModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtrar tarefas do Google concluídas hoje
  const completedToday = tasks.filter(t => 
    t.status === 'completed' && t.completedAt && isToday(new Date(t.completedAt))
  ).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  const checkinsToday: { taskTitle: string; note: string; timestamp: Date; durationMs: number }[] = [];
  localTasks.forEach(task => {
    task.instances?.forEach((instance: any) => {
      instance.timeEntries?.forEach((entry: any) => {
        // Ordena cronologicamente para calcular o tempo percorrido
        const sortedCheckins = [...(entry.checkins || [])].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        sortedCheckins.forEach((checkin: any, index: number) => {
          if (isToday(new Date(checkin.timestamp))) {
            const currentMs = new Date(checkin.timestamp).getTime();
            const previousMs = index === 0 
              ? new Date(entry.startTime).getTime() 
              : new Date(sortedCheckins[index - 1].timestamp).getTime();
              
            checkinsToday.push({
              taskTitle: task.title,
              note: checkin.note,
              timestamp: new Date(checkin.timestamp),
              durationMs: currentMs - previousMs
            });
          }
        });
      });
    });
  });

  checkinsToday.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📝</span> Resumo de Hoje
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Tarefas Concluídas */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Tarefas Concluídas ({completedToday.length})
            </h3>
            {completedToday.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhuma tarefa concluída hoje.</p>
            ) : (
              <ul className="space-y-2">
                {completedToday.map(task => (
                  <li key={task.id} className="text-sm bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-start gap-3">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <div>
                      <p className="font-medium text-gray-800 line-through decoration-gray-300">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(task.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Check-ins */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Check-ins do Dia ({checkinsToday.length})
            </h3>
            {checkinsToday.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum check-in feito hoje.</p>
            ) : (
              <ul className="space-y-3">
                {checkinsToday.map((checkin, index) => {
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const h = Math.floor(checkin.durationMs / (1000 * 60 * 60));
                  const m = Math.floor((checkin.durationMs % (1000 * 60 * 60)) / (1000 * 60));
                  const s = Math.floor((checkin.durationMs % (1000 * 60)) / 1000);

                  return (
                    <li key={index} className="text-sm bg-orange-50/50 border border-orange-100 p-3 rounded-lg flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-orange-800">{checkin.taskTitle}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded leading-none text-xs border border-emerald-100/50">
                            {pad(h)}:{pad(m)}:{pad(s)}
                          </span>
                          <span className="text-xs text-orange-400 font-medium">
                            {checkin.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{checkin.note}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-100 transition shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
