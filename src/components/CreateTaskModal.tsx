import React, { useState, useTransition, useEffect } from 'react';
import { createScheduledTask, createGoogleTask } from '@/lib/actions';
import { DEFAULT_PROFILES, ProfileOption } from '@/lib/profiles';

export default function CreateTaskModal({ 
  isOpen, 
  onClose, 
  start, 
  end,
  profiles = DEFAULT_PROFILES,
  defaultProfile = 'Trabalho'
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  start: Date | null, 
  end: Date | null,
  profiles?: ProfileOption[],
  defaultProfile?: string
}) {
  const [title, setTitle] = useState('');
  const [profile, setProfile] = useState(defaultProfile);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setProfile(defaultProfile || 'Trabalho');
    }
  }, [isOpen, defaultProfile]);

  if (!isOpen || !start || !end) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      try {
        // 1. Create in Google Tasks
        const gTask = await createGoogleTask(title.trim());
        // 2. Schedule it immediately in our local DB with chosen profile
        await createScheduledTask({
          googleTaskId: gTask.id,
          title: gTask.title,
          start,
          end,
          profile,
        });
        setTitle('');
        onClose();
      } catch (err) {
        console.error("Failed to create and schedule task", err);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onPointerDown={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200" onPointerDown={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Agendar Nova Tarefa</h2>
          <p className="text-sm text-gray-500 mt-1">
            {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Título da Tarefa</label>
            <input 
              type="text" 
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que você vai fazer?"
              className="w-full border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Perfil</label>
            <div className="flex flex-wrap gap-1.5">
              {profiles.map((prof) => {
                const isSelected = profile.toLowerCase() === prof.name.toLowerCase();
                return (
                  <button
                    key={prof.name}
                    type="button"
                    disabled={isPending}
                    onClick={() => setProfile(prof.name)}
                    style={
                      isSelected
                        ? { backgroundColor: prof.color, borderColor: prof.color, color: '#ffffff' }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                      isSelected
                        ? 'shadow-xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{prof.icon}</span>
                    <span>{prof.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isPending || !title.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {isPending ? 'Criando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
