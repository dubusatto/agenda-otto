"use client";

import { GoogleTask } from "@/lib/google";

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
          <div 
            key={task.id} 
            className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-grab"
          >
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer" 
                readOnly 
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-800 text-sm leading-tight">{task.title}</h3>
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
