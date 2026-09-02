"use client";

import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import CalendarGrid from "./CalendarGrid";
import Sidebar from "./Sidebar";
import { GoogleTask, CalendarEvent } from "@/lib/google";
import { useState } from "react";
import { createScheduledTask } from "@/lib/actions";

export default function DashboardClient({ 
  initialEvents, 
  tasks 
}: { 
  initialEvents: CalendarEvent[], 
  tasks: GoogleTask[] 
}) {
  const [activeTask, setActiveTask] = useState<GoogleTask | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (over && over.id) {
      // over.id is the ISO string of the time slot
      const startTime = new Date(over.id as string);
      
      // Default task length: 30 minutes
      const endTime = new Date(startTime.getTime() + 30 * 60000);
      
      const task = tasks.find(t => t.id === active.id);
      if (task) {
        try {
          await createScheduledTask({
            googleTaskId: task.id,
            title: task.title,
            start: startTime,
            end: endTime
          });
        } catch (e) {
          console.error("Failed to create scheduled task", e);
        }
      }
    }
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex-1 overflow-hidden flex relative z-10">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full h-full p-4">
            <CalendarGrid events={initialEvents} />
          </div>
        </div>
        <Sidebar tasks={tasks} />
      </main>
      
      {/* Visual overlay for dragging */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div className="p-3 bg-white border-2 border-blue-500 rounded-lg shadow-xl w-72 opacity-90 rotate-2">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300" readOnly />
              <div className="flex-1">
                <h3 className="font-medium text-gray-800 text-sm leading-tight">{activeTask.title}</h3>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
