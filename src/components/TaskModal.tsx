"use client";

import { CalendarEvent } from "@/lib/google";
import { useState, useEffect, useTransition } from "react";
import { 
  updateScheduledTaskRecurrence, 
  deleteScheduledTask, 
  toggleScheduledTaskCompletion,
  startTimeTracking,
  stopTimeTracking,
  addCheckIn,
  deleteCheckIn
} from "@/lib/actions";

const DAYS_MAP = [
  { id: 'MO', label: 'S' },
  { id: 'TU', label: 'T' },
  { id: 'WE', label: 'Q' },
  { id: 'TH', label: 'Q' },
  { id: 'FR', label: 'S' },
  { id: 'SA', label: 'S' },
  { id: 'SU', label: 'D' },
];

function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startMs = new Date(startTime).getTime();
    const update = () => setElapsed(Math.max(0, Date.now() - startMs));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const h = Math.floor(elapsed / (1000 * 60 * 60));
  const m = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((elapsed % (1000 * 60)) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className="font-mono bg-orange-200 text-orange-800 px-2 py-0.5 rounded text-xs ml-1 shadow-sm border border-orange-300">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

function LiveTotalTimer({ pastTimeMs, activeStartTime }: { pastTimeMs: number, activeStartTime?: string }) {
  const [elapsed, setElapsed] = useState(pastTimeMs);

  useEffect(() => {
    if (!activeStartTime) {
      setElapsed(pastTimeMs);
      return;
    }

    const startMs = new Date(activeStartTime).getTime();
    const update = () => {
      const activeElapsed = Math.max(0, Date.now() - startMs);
      setElapsed(pastTimeMs + activeElapsed);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [pastTimeMs, activeStartTime]);

  const h = Math.floor(elapsed / (1000 * 60 * 60));
  const m = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((elapsed % (1000 * 60)) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (elapsed === 0) return <span>0h 0m</span>;

  return <span className="font-mono">{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

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
  const [recurrenceType, setRecurrenceType] = useState<'NONE' | 'WEEKLY'>('NONE');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [checkInText, setCheckInText] = useState("");
  
  // Sync state when modal opens
  useEffect(() => {
    if (event?.rrule) {
      if (event.rrule.includes('FREQ=WEEKLY')) {
        setRecurrenceType('WEEKLY');
        const byDayMatch = event.rrule.match(/BYDAY=([^;]+)/);
        if (byDayMatch) {
          setSelectedDays(byDayMatch[1].split(','));
        } else {
          // If no BYDAY is found, it implicitly means "this day of the week"
          // We can just leave selectedDays empty, and handle it gracefully
          setSelectedDays([]);
        }
      } else if (event.rrule.includes('FREQ=DAILY')) {
        setRecurrenceType('WEEKLY');
        setSelectedDays(DAYS_MAP.map(d => d.id)); // All days
      }
    } else {
      setRecurrenceType('NONE');
      setSelectedDays([]);
    }
    setPendingDeleteRecurrence(false);
  }, [event]);
  const [pendingDeleteRecurrence, setPendingDeleteRecurrence] = useState<boolean>(false);

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
      if (recurrenceType === 'WEEKLY') {
        if (selectedDays.length === 7) {
          rrule = 'FREQ=DAILY';
        } else if (selectedDays.length > 0) {
          rrule = `FREQ=WEEKLY;BYDAY=${selectedDays.join(',')}`;
        } else {
          // If no days selected, default to the start date's day of week
          const startDayIndex = new Date(event.start).getDay();
          const defaultDay = DAYS_MAP[startDayIndex === 0 ? 6 : startDayIndex - 1].id;
          rrule = `FREQ=WEEKLY;BYDAY=${defaultDay}`;
        }
      }
      
      await updateScheduledTaskRecurrence(event.id, rrule);
      onClose();
    });
  };


  const handleDelete = () => {
    if (!isLocal) return;
    if (event.rrule) {
      setPendingDeleteRecurrence(true);
      return;
    }
    
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
      startTransition(async () => {
        await deleteScheduledTask(event.id);
        onClose();
      });
    }
  };

  const executeDeleteRecurrence = async (type: 'THIS' | 'ALL') => {
    setPendingDeleteRecurrence(false);
    startTransition(async () => {
      if (type === 'THIS') {
        const { cancelScheduledTaskInstance } = await import('@/lib/actions');
        await cancelScheduledTaskInstance(event.id);
      } else {
        await deleteScheduledTask(event.id);
      }
      onClose();
    });
  };

  const hasRecurrenceChanged = () => {
    const originalRrule = event.rrule || null;
    let newRrule = null;
    if (recurrenceType === 'WEEKLY') {
      if (selectedDays.length === 7) {
        newRrule = 'FREQ=DAILY';
      } else if (selectedDays.length > 0) {
        newRrule = `FREQ=WEEKLY;BYDAY=${selectedDays.join(',')}`;
      } else {
        const startDayIndex = new Date(event.start).getDay();
        const defaultDay = DAYS_MAP[startDayIndex === 0 ? 6 : startDayIndex - 1].id;
        newRrule = `FREQ=WEEKLY;BYDAY=${defaultDay}`;
      }
    }
    return originalRrule !== newRrule;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onPointerDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative" onPointerDown={(e) => e.stopPropagation()}>
        <div className="h-4 w-full" style={{ backgroundColor: event.backgroundColor }}></div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{event.title}</h2>
          <p className="text-sm text-gray-500 mb-6 font-medium">
            {event.start.toLocaleDateString()} das {event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} às {event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>

          {isLocal ? (
            <div className="space-y-5">
              <div className="pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recorrência</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setRecurrenceType('NONE')}
                    disabled={isPending}
                    className={`flex-1 py-2 px-3 border rounded-xl text-sm font-medium transition ${recurrenceType === 'NONE' ? 'bg-gray-100 border-gray-300 text-gray-800 ring-1 ring-gray-300' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Não repete
                  </button>
                  <button 
                    onClick={() => {
                      setRecurrenceType('WEEKLY');
                      if (selectedDays.length === 0) {
                        setSelectedDays(DAYS_MAP.map(d => d.id)); // Default to all days (Daily) when clicking repeat
                      }
                    }}
                    disabled={isPending}
                    className={`flex-1 py-2 px-3 border rounded-xl text-sm font-medium transition ${recurrenceType === 'WEEKLY' ? 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700 ring-1 ring-fuchsia-300' : 'bg-white border-gray-200 text-gray-600 hover:bg-fuchsia-50 hover:text-fuchsia-600'}`}
                  >
                    Se repete
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

              {/* Time Tracking Section */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Time Tracking (WIP)</label>
                
                {(() => {
                  const activeEntry = event.timeEntries?.find((te: any) => !te.endTime);
                  const totalPastTimeMs = event.timeEntries?.filter((te: any) => te.endTime).reduce((acc: number, te: any) => {
                    return acc + (new Date(te.endTime).getTime() - new Date(te.startTime).getTime());
                  }, 0) || 0;
                  
                  const formatTime = (ms: number) => {
                    if (ms === 0) return '0h 0m';
                    const h = Math.floor(ms / (1000 * 60 * 60));
                    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                    return `${h}h ${m}m`;
                  };

                  const renderEntryHistory = (entry: any, index: number) => {
                    const startMs = new Date(entry.startTime).getTime();
                    
                    // Ordena os check-ins do mais antigo para o mais novo (cronológico)
                    const sortedCheckins = [...(entry.checkins || [])].sort((a, b) => 
                      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    );
                    
                    return (
                      <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700">
                            Sessão {index + 1} ({new Date(entry.startTime).toLocaleDateString()})
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(entry.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                            {' -> '} 
                            {entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Em andamento'}
                          </span>
                        </div>
                        
                        {sortedCheckins.length > 0 && (
                          <div className="space-y-1.5 mt-2 border-l-2 border-gray-200 pl-2">
                            {sortedCheckins.map((c: any, cIndex: number) => {
                              const current = new Date(c.timestamp).getTime();
                              const previousTime = cIndex === 0 
                                ? startMs 
                                : new Date(sortedCheckins[cIndex - 1].timestamp).getTime();
                              
                              const intervalDuration = current - previousTime;
                              
                              const pad = (n: number) => n.toString().padStart(2, '0');
                              const h = Math.floor(intervalDuration / (1000 * 60 * 60));
                              const m = Math.floor((intervalDuration % (1000 * 60 * 60)) / (1000 * 60));
                              const s = Math.floor((intervalDuration % (1000 * 60)) / 1000);
                              
                              return (
                                <div key={c.id} className="text-xs bg-white border border-gray-100 p-2 rounded flex justify-between items-center shadow-sm group">
                                  <span className="text-gray-800 font-medium">{c.note}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                      <span className="text-gray-400">{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      <span className="text-emerald-600 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{pad(h)}:{pad(m)}:{pad(s)}</span>
                                    </div>
                                    <button 
                                      onClick={() => startTransition(async () => { await deleteCheckIn(c.id); })}
                                      disabled={isPending}
                                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Excluir Check-in"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Tempo Acumulado:</span>
                        <span className="text-sm font-bold text-gray-900">
                          <LiveTotalTimer pastTimeMs={totalPastTimeMs} activeStartTime={activeEntry?.startTime} />
                        </span>
                      </div>

                      {/* Histórico completo */}
                      {event.timeEntries && event.timeEntries.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {[...event.timeEntries].reverse().map((entry: any, i: number) => renderEntryHistory(entry, i))}
                        </div>
                      )}

                      {!activeEntry ? (
                        <button
                          onClick={() => startTransition(async () => { await startTimeTracking(event.id); })}
                          disabled={isPending}
                          className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                        >
                          ▶️ Iniciar Sessão de Trabalho
                        </button>
                      ) : (
                        <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-orange-700 flex items-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                              </span>
                              Trabalhando agora...
                              {(() => {
                                const lastCheckpointTime = activeEntry.checkins?.length > 0 
                                  ? [...activeEntry.checkins].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
                                  : activeEntry.startTime;
                                return <LiveTimer startTime={lastCheckpointTime} />;
                              })()}
                            </span>
                            <button
                              onClick={() => startTransition(async () => { await stopTimeTracking(event.id); })}
                              disabled={isPending}
                              className="text-xs bg-orange-200 text-orange-800 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-300 transition"
                            >
                              ⏹️ Encerrar Sessão
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={checkInText}
                              onChange={(e) => setCheckInText(e.target.value)}
                              placeholder="Finalizei a tela inicial..."
                              className="flex-1 text-sm text-gray-900 placeholder:text-orange-400 border border-orange-200 bg-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                            <button
                              onClick={() => startTransition(async () => { 
                                if (!checkInText.trim()) return;
                                await addCheckIn(event.id, checkInText); 
                                setCheckInText("");
                              })}
                              disabled={isPending || !checkInText.trim()}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition"
                            >
                              Check-in
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

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

      {pendingDeleteRecurrence && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onPointerDown={() => setPendingDeleteRecurrence(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95" onPointerDown={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Tarefa Recorrente</h3>
            <p className="text-sm text-gray-600 mb-6">
              Você está excluindo uma tarefa recorrente. Deseja excluir apenas este evento ou todos da série?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => executeDeleteRecurrence('THIS')}
                className="w-full text-left px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition"
              >
                Apenas este evento
              </button>
              <button
                onClick={() => executeDeleteRecurrence('ALL')}
                className="w-full text-left px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition"
              >
                Todos os eventos recorrentes
              </button>
              <button
                onClick={() => setPendingDeleteRecurrence(false)}
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
