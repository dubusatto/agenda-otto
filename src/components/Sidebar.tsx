"use client";

import { GoogleTask } from "@/lib/google";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import { updateGoogleTask } from "@/lib/actions";

function DraggableTask({ task }: { task: GoogleTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task
  });

  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

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

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-400 hover:shadow-md transition-all relative z-20 group"
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div 
          {...listeners}
          {...attributes}
          className="mt-1 cursor-grab text-gray-300 hover:text-gray-500 transition-colors"
          title="Arrastar para o calendário"
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <path d="M4 2a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm-8 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm-8 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>

        <input 
          type="checkbox" 
          onChange={handleComplete}
          disabled={isPending}
          className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer" 
        />
        
        <div className="flex-1">
          {isEditing ? (
            <input
              autoFocus
              className="w-full text-sm font-medium text-gray-800 border-b border-blue-400 outline-none bg-blue-50 px-1 rounded-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            />
          ) : (
            <h3 
              className="font-medium text-gray-800 text-sm leading-tight cursor-text hover:text-blue-600"
              onClick={() => setIsEditing(true)}
              title="Clique para editar"
            >
              {title}
            </h3>
          )}
          
          {task.notes && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.notes}</p>
          )}
          {task.due && (
            <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
              Prazo: {new Date(task.due).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ tasks }: { tasks: GoogleTask[] }) {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 h-full flex flex-col shadow-sm z-10">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Tarefas</h2>
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {tasks.map(task => (
          <DraggableTask key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 mt-10 text-sm">
            Nenhuma tarefa pendente! 🎉
          </div>
        )}
      </div>
    </aside>
  );
}
