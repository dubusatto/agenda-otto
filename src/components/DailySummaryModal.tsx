"use client";

import { GoogleTask } from "@/lib/google";
import { isSameDay, isToday, addDays, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState, useTransition } from "react";
import { toggleCheckInLunchDiscount } from "@/lib/actions";
import { calculateCheckInIntervals } from "@/lib/timetracking";

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: GoogleTask[];
  localTasks: any[]; // Scheduled tasks containing instances and checkins
}

export default function DailySummaryModal({ isOpen, onClose, tasks, localTasks }: DailySummaryModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date()); // Sempre volta pra hoje ao abrir
    }
  }, [isOpen]);

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

  // Filtrar tarefas do Google concluídas no dia selecionado
  const completedOnDate = tasks.filter(t => 
    t.status === 'completed' && t.completedAt && isSameDay(new Date(t.completedAt), selectedDate)
  ).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  // Filtrar check-ins do dia selecionado
  const checkinsOnDate: { 
    id: string; 
    taskId: string; 
    taskTitle: string; 
    note: string; 
    timestamp: Date; 
    durationMs: number; 
    hasLunchDiscount: boolean; 
  }[] = [];

  localTasks.forEach(task => {
    task.instances?.forEach((instance: any) => {
      instance.timeEntries?.forEach((entry: any) => {
        const computedCheckins = calculateCheckInIntervals(entry);
        
        computedCheckins.forEach((checkin) => {
          if (isSameDay(new Date(checkin.timestamp), selectedDate)) {
            checkinsOnDate.push({
              id: checkin.id,
              taskId: task.id,
              taskTitle: task.title,
              note: checkin.note,
              timestamp: new Date(checkin.timestamp),
              durationMs: checkin.durationMs,
              hasLunchDiscount: checkin.hasLunchDiscount
            });
          }
        });
      });
    });
  });

  checkinsOnDate.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const formattedDate = isToday(selectedDate) 
    ? "Hoje, " + format(selectedDate, "dd 'de' MMM", { locale: ptBR })
    : format(selectedDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-0 items-center justify-between bg-blue-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📝</span> Diário
          </h2>
          
          {/* Navegador de Data */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition"
              title="Dia Anterior"
            >
              ◀
            </button>
            <span className="text-sm font-bold text-gray-700 min-w-[120px] text-center">
              {formattedDate}
            </span>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition"
              title="Próximo Dia"
            >
              ▶
            </button>
            {!isToday(selectedDate) && (
              <button 
                onClick={() => setSelectedDate(new Date())}
                className="ml-1 text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-200 transition"
              >
                Hoje
              </button>
            )}
          </div>

          <button 
            onClick={onClose}
            className="hidden sm:block text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Tarefas Concluídas */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Tarefas Concluídas ({completedOnDate.length})
            </h3>
            {completedOnDate.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhuma tarefa concluída neste dia.</p>
            ) : (
              <ul className="space-y-2">
                {completedOnDate.map(task => (
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
              Check-ins ({checkinsOnDate.length})
            </h3>
            {checkinsOnDate.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum check-in feito neste dia.</p>
            ) : (
              <ul className="space-y-3">
                {checkinsOnDate.map((checkin, index) => {
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const h = Math.floor(checkin.durationMs / (1000 * 60 * 60));
                  const m = Math.floor((checkin.durationMs % (1000 * 60 * 60)) / (1000 * 60));
                  const s = Math.floor((checkin.durationMs % (1000 * 60)) / 1000);

                  const isAnotherInTaskDiscounted = checkinsOnDate.some(
                    c => c.taskId === checkin.taskId && c.hasLunchDiscount && c.id !== checkin.id
                  );

                  return (
                    <li key={checkin.id || index} className="text-sm bg-orange-50/50 border border-orange-100 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-orange-800">{checkin.taskTitle}</span>
                          {checkin.hasLunchDiscount && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              <span>🥪</span> Almoço (-1h)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Botão de Almoço */}
                          {checkin.hasLunchDiscount ? (
                            <button
                              onClick={() => startTransition(async () => { await toggleCheckInLunchDiscount(checkin.id); })}
                              disabled={isPending}
                              className="text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
                              title="Almoço aplicado (-1h). Clique para remover."
                            >
                              <span>🥪</span> -1h
                            </button>
                          ) : isAnotherInTaskDiscounted ? (
                            <button
                              disabled
                              className="text-[11px] font-bold bg-gray-100 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded cursor-not-allowed opacity-40 flex items-center gap-1"
                              title="O almoço já foi descontado em outro check-in desta tarefa"
                            >
                              <span>🥪</span> -1h
                            </button>
                          ) : (
                            <button
                              onClick={() => startTransition(async () => { await toggleCheckInLunchDiscount(checkin.id); })}
                              disabled={isPending}
                              className="text-[11px] font-bold bg-white hover:bg-amber-50 text-gray-500 hover:text-amber-700 border border-orange-200 hover:border-amber-300 px-1.5 py-0.5 rounded transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Descontar 1h de almoço deste check-in"
                            >
                              <span>🥪</span> -1h
                            </button>
                          )}

                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded leading-none text-xs border ${
                            checkin.hasLunchDiscount 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                          }`}>
                            {pad(h)}:{pad(m)}:{pad(s)}
                          </span>
                          <span className="text-xs text-orange-400 font-medium ml-0.5">
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
