"use client";

import { GoogleTask, TaskList } from "@/lib/google";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import { updateGoogleTask, createGoogleTask, createGoogleTaskList, deleteGoogleTaskList, clearOldCompletedTasks, createScheduledTask } from "@/lib/actions";
import { getSemanticColor } from "@/lib/colors";
import DailySummaryModal from "./DailySummaryModal";
import AlarmManagerModal from "./AlarmManagerModal";

function DraggableTask({ task, scheduledTask, readOnly = false, onScheduled }: { task: GoogleTask, scheduledTask: any, readOnly?: boolean, onScheduled?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
    disabled: readOnly
  });

  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() < 30 ? 30 : 0);
    if (now.getMinutes() === 0) now.setHours(now.getHours() + 1);
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const taskColor = getSemanticColor(task.id);
  const isCompleted = task.status === 'completed';

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging || isPending || isCompleted ? 0.4 : 1,
  };

  const handleToggleComplete = () => {
    if (readOnly) return;
    startTransition(async () => {
      await updateGoogleTask(task.taskListId, task.id, { status: isCompleted ? 'needsAction' : 'completed' });
    });
  };

  const saveTitle = () => {
    if (readOnly) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    if (title.trim() !== task.title && title.trim() !== '') {
      startTransition(async () => {
        await updateGoogleTask(task.taskListId, task.id, { title: title.trim() });
      });
    } else {
      setTitle(task.title); // revert if empty
    }
  };

  const isScheduled = !!scheduledTask;
  const isRecurring = !!scheduledTask?.rrule;

  return (
    <div 
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: taskColor, borderLeftWidth: '4px' }}
      className={`p-3 bg-white border border-gray-200 rounded-lg shadow-sm transition-all relative z-20 group ${readOnly ? '' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        {!readOnly && (
          <div 
            {...listeners}
            {...attributes}
            className="mt-1 cursor-grab opacity-30 hover:opacity-100 transition-opacity"
            title="Arrastar para o calendário"
            style={{ color: taskColor }}
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
              <path d="M4 2a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm-8 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm-8 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        )}

        <input 
          type="checkbox" 
          checked={isCompleted}
          onChange={handleToggleComplete}
          disabled={isPending || readOnly}
          className={`mt-1 h-4 w-4 rounded ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} 
          style={{ accentColor: taskColor }}
        />
        
        <div className="flex-1">
          {isEditing && !readOnly ? (
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              autoFocus
              className="w-full text-sm font-medium text-gray-800 border-b border-blue-400 focus:outline-none"
            />
          ) : (
            <h3 
              onClick={() => setIsEditing(true)}
              className="font-medium text-gray-800 text-sm leading-tight cursor-text hover:text-blue-600 transition-colors"
            >
              {task.title}
            </h3>
          )}
          
          <div className="flex items-center gap-3 mt-1">
            {task.due && (
              <p className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block">
                Prazo: {new Date(task.due).toLocaleDateString()}
              </p>
            )}
            
            {/* Indicators */}
            {isScheduled && (
              <div className="flex items-center gap-1 opacity-60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {isRecurring && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                )}
              </div>
            )}

            {/* Touch-friendly schedule button (especially helpful on mobile) */}
            {!readOnly && !isCompleted && (
              <button
                type="button"
                onClick={() => setIsScheduling(!isScheduling)}
                className="lg:opacity-0 lg:group-hover:opacity-100 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition ml-auto"
                title="Agendar horário para hoje"
              >
                📅 Agendar
              </button>
            )}
          </div>

          {isScheduling && !readOnly && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 animate-in fade-in">
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-800 font-bold bg-gray-50"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const [h, m] = scheduleTime.split(':').map(Number);
                  const start = new Date();
                  start.setHours(h, m, 0, 0);
                  const end = new Date(start.getTime() + 30 * 60000);
                  startTransition(async () => {
                    await createScheduledTask({
                      googleTaskId: task.id,
                      title: task.title,
                      start,
                      end
                    });
                    setIsScheduling(false);
                    onScheduled?.();
                  });
                }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded transition"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setIsScheduling(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { startOfWeek } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function Sidebar({ tasks, taskLists, localTasks = [] }: { tasks: GoogleTask[], taskLists: TaskList[], localTasks?: any[] }) {
  const router = useRouter();
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Create list state
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggleList = (listId: string) => {
    setExpandedLists(prev => ({ ...prev, [listId]: !prev[listId] }));
  };

  const startOfCurrentSprint = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday 00:00

  // Active tasks = Pending + Completed within current sprint
  const activeTasks = tasks.filter(t => {
    if (t.status !== 'completed') return true;
    if (t.status === 'completed' && t.completedAt) {
      return new Date(t.completedAt) >= startOfCurrentSprint;
    }
    return false; // se tiver completed mas sem data, escondemos
  });

  const archivedTasks = tasks.filter(t => {
    if (t.status === 'completed') {
      if (!t.completedAt) return true; // se completou e não tem data, joga pro arquivo
      return new Date(t.completedAt) < startOfCurrentSprint;
    }
    return false;
  });

  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const pendingTasksCount = activeTasks.filter(t => t.status !== 'completed').length;

  return (
    <>
    {/* Mobile Backdrop when Bottom Sheet is open */}
    {isMobileDrawerOpen && (
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
        onClick={() => setIsMobileDrawerOpen(false)}
      />
    )}

    <aside className={`${
      isMobileDrawerOpen 
        ? 'fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] rounded-t-2xl shadow-2xl flex' 
        : 'hidden lg:flex'
    } lg:static lg:w-80 bg-gray-50 border-l border-gray-200 flex-col lg:h-full lg:max-h-none lg:rounded-none lg:shadow-none lg:z-20`}>
      {/* Mobile Handle Bar */}
      <div className="flex justify-center pt-2 pb-1 bg-white rounded-t-2xl lg:hidden" onClick={() => setIsMobileDrawerOpen(false)}>
        <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
      </div>

      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold text-gray-900">Suas Listas</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCreatingList(!isCreatingList)}
              className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm font-bold transition"
            >
              + Lista
            </button>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600 p-1 text-sm font-bold"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500 font-medium">Organize e agende</p>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                setIsMobileDrawerOpen(false);
                setIsAlarmModalOpen(true);
              }}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-2 py-1 rounded transition flex items-center gap-1 shadow-2xs"
              title="Configurar Alarmes de Impacto"
            >
              <span>⏰</span> Alarmes
            </button>
            <button 
              onClick={() => {
                setIsMobileDrawerOpen(false);
                setIsDailySummaryOpen(true);
                router.refresh();
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2 py-1 rounded transition flex items-center gap-1"
            >
              <span>📊</span> Diário
            </button>
          </div>
        </div>
        
        {isCreatingList && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!newListTitle.trim()) return;
              startTransition(async () => {
                await createGoogleTaskList(newListTitle.trim());
                setNewListTitle("");
                setIsCreatingList(false);
              });
            }}
            className="flex gap-2 animate-in fade-in slide-in-from-top-2"
          >
            <input 
              type="text" 
              autoFocus
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="Nome da lista..."
              disabled={isPending}
              className="flex-1 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button 
              type="submit" 
              disabled={isPending || !newListTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg px-3 py-2 font-bold text-sm transition shadow-sm"
            >
              ✓
            </button>
          </form>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {taskLists.map(list => {
          const isExpanded = expandedLists[list.id];
          const listTasks = activeTasks.filter(t => t.taskListId === list.id);
          
          return (
            <div key={list.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div 
                onClick={() => toggleList(list.id)}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition select-none group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                  <span className="font-bold text-gray-800 text-sm">{list.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                    {listTasks.filter(t => t.status === 'completed').length}/{listTasks.length}
                  </span>
                  <button 
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-1 transition opacity-0 group-hover:opacity-100"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if(confirm('Excluir esta lista e todas as tarefas dentro dela?')) {
                        startTransition(async () => { await deleteGoogleTaskList(list.id); });
                      }
                    }}
                    title="Excluir lista"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-3 pt-0 bg-gray-50/50 border-t border-gray-100 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-2 mt-3">
                    {listTasks.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2 italic">Lista vazia</p>
                    ) : (
                      listTasks.map((task) => {
                        const isScheduled = localTasks?.some(lt => lt.googleTaskId === task.id);
                        const scheduledTask = localTasks?.find(lt => lt.googleTaskId === task.id);
                        return (
                          <DraggableTask 
                            key={task.id} 
                            task={task} 
                            scheduledTask={scheduledTask}
                            onScheduled={() => setIsMobileDrawerOpen(false)}
                          />
                        );
                      })
                    )}
                  </div>
                  
                  {/* Create task input for this list */}
                  <form 
                    className="mt-3 relative"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('title') as HTMLInputElement;
                      const title = input.value.trim();
                      if (!title) return;
                      startTransition(async () => {
                        await createGoogleTask(title, list.id);
                        input.value = '';
                      });
                    }}
                  >
                    <input 
                      type="text" 
                      name="title"
                      placeholder="Nova tarefa aqui..."
                      disabled={isPending}
                      className="w-full text-xs text-gray-900 placeholder:text-gray-400 border border-gray-200 bg-white rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button type="submit" disabled={isPending} className="absolute right-2 top-1.5 text-blue-500 hover:text-blue-700 font-bold text-sm">+</button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Virtual List: Concluídas */}
        {archivedTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div 
              onClick={() => toggleList('virtual-concluidas')}
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition select-none group"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">{expandedLists['virtual-concluidas'] ? '▼' : '▶'}</span>
                <span className="font-bold text-gray-800 text-sm">Concluídas 🗄️</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                  {archivedTasks.length}
                </span>
                <button 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition opacity-0 group-hover:opacity-100 font-bold text-xs px-2"
                  disabled={isPending}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm('Isso excluirá DEFINITIVAMENTE todas essas tarefas antigas do sistema. Tem certeza?')) {
                      startTransition(async () => {
                        await clearOldCompletedTasks(archivedTasks.map(t => ({ taskId: t.id, taskListId: t.taskListId })));
                      });
                    }
                  }}
                  title="Limpar Histórico"
                >
                  Limpar
                </button>
              </div>
            </div>
            
            {expandedLists['virtual-concluidas'] && (
              <div className="p-3 pt-0 bg-gray-50/50 border-t border-gray-100 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2 mt-3">
                  {archivedTasks.map((task) => (
                    <DraggableTask 
                      key={task.id} 
                      task={task} 
                      scheduledTask={null}
                      readOnly={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>

      {/* Mobile Bottom Dock */}
      <div className="mobile-bottom-dock lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-around gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="mobile-dock-btn flex-1 bg-blue-600 active:bg-blue-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
        >
          <span>📋</span> Suas Listas
          {pendingTasksCount > 0 && (
            <span className="bg-white/25 text-white text-[11px] px-1.5 py-0.2 rounded-full">
              {pendingTasksCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setIsDailySummaryOpen(true);
            router.refresh();
          }}
          className="mobile-dock-btn bg-gray-100 active:bg-gray-200 text-gray-800 font-bold text-xs py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1"
        >
          <span>📊</span> Diário
        </button>
        <button
          onClick={() => setIsAlarmModalOpen(true)}
          className="mobile-dock-btn bg-red-50 active:bg-red-100 text-red-700 border border-red-200 font-bold text-xs py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1"
        >
          <span>⏰</span> Alarmes
        </button>
      </div>

      <DailySummaryModal 
        isOpen={isDailySummaryOpen} 
        onClose={() => setIsDailySummaryOpen(false)} 
        tasks={tasks} 
        localTasks={localTasks} 
      />
      <AlarmManagerModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
      />
    </>
  );
}
