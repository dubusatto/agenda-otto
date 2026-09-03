"use client";

import { GoogleTask } from "@/lib/google";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import { updateGoogleTask, createGoogleTask } from "@/lib/actions";
import { getSemanticColor } from "@/lib/colors";

function DraggableTask({ task, scheduledTask }: { task: GoogleTask, scheduledTask: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task
  });

  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const taskColor = getSemanticColor(task.id);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging || isPending ? 0.4 : 1,
  };

  const handleComplete = () => {
    startTransition(async () => {
      await updateGoogleTask(task.taskListId, task.id, { status: 'completed' });
    });
  };

  const saveTitle = () => {
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
      className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all relative z-20 group"
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
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

        <input 
          type="checkbox" 
          checked={false} // Uncontrolled issues fixed
          onChange={handleComplete}
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded cursor-pointer" 
          style={{ accentColor: taskColor }}
        />
        
        <div className="flex-1">
          {isEditing ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ tasks, localTasks = [] }: { tasks: GoogleTask[], localTasks?: any[] }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreating, startTransition] = useTransition();

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    startTransition(async () => {
      try {
        await createGoogleTask(newTaskTitle.trim());
        setNewTaskTitle("");
      } catch (err) {
        console.error("Failed to create task", err);
      }
    });
  };

  return (
    <aside className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full z-20">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900">Suas Tarefas</h2>
        <p className="text-sm text-gray-500 font-medium mb-3">Arraste para o calendário</p>
        
        <form onSubmit={handleCreateTask} className="flex gap-2">
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Nova tarefa..."
            disabled={isCreating}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
          />
          <button 
            type="submit" 
            disabled={isCreating || !newTaskTitle.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg px-3 py-2 font-bold text-sm transition shadow-sm"
          >
            {isCreating ? '...' : '+'}
          </button>
        </form>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.map(task => {
          const scheduledTask = localTasks.find(lt => lt.googleTaskId === task.id);
          return <DraggableTask key={task.id} task={task} scheduledTask={scheduledTask} />;
        })}
        
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm font-medium">
            Nenhuma tarefa pendente no Google Tasks.
          </div>
        )}
      </div>
    </aside>
  );
}
