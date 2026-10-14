"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  getAlarms, 
  createAlarm, 
  updateAlarm, 
  deleteAlarm, 
  toggleAlarm, 
  triggerTestAlarm 
} from "@/lib/actions";

interface Alarm {
  id: string;
  title: string;
  message?: string | null;
  time: string;
  color: string;
  daysOfWeek: number[];
  date?: Date | null;
  enabled: boolean;
}

interface AlarmManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { label: "Vermelho Alerta", hex: "#ef4444" },
  { label: "Laranja Neon", hex: "#f97316" },
  { label: "Roxo Elétrico", hex: "#a855f7" },
  { label: "Amarelo Choque", hex: "#eab308" },
  { label: "Pink Shock", hex: "#ec4899" },
  { label: "Azul Cobalto", hex: "#3b82f6" },
];

const DAYS_OF_WEEK = [
  { id: 0, label: "D", full: "Domingo" },
  { id: 1, label: "S", full: "Segunda" },
  { id: 2, label: "T", full: "Terça" },
  { id: 3, label: "Q", full: "Quarta" },
  { id: 4, label: "Q", full: "Quinta" },
  { id: 5, label: "S", full: "Sexta" },
  { id: 6, label: "S", full: "Sábado" },
];

export default function AlarmManagerModal({ isOpen, onClose }: AlarmManagerModalProps) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [time, setTime] = useState("17:30");
  const [color, setColor] = useState("#ef4444");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Default: Mon-Fri
  const [testSent, setTestSent] = useState(false);

  // Fetch alarms when opened
  useEffect(() => {
    if (isOpen) {
      loadAlarms();
    }
  }, [isOpen]);

  const loadAlarms = () => {
    startTransition(async () => {
      const list = await getAlarms();
      setAlarms(list as Alarm[]);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isFormOpen) onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFormOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setTime("17:30");
    setColor("#ef4444");
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setEditingAlarmId(null);
    setIsFormOpen(false);
    setTestSent(false);
  };

  const handleEdit = (alarm: Alarm) => {
    setTitle(alarm.title);
    setMessage(alarm.message || "");
    setTime(alarm.time);
    setColor(alarm.color);
    setDaysOfWeek(alarm.daysOfWeek || []);
    setEditingAlarmId(alarm.id);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !time) return;

    startTransition(async () => {
      if (editingAlarmId) {
        await updateAlarm(editingAlarmId, {
          title: title.trim(),
          message: message.trim(),
          time,
          color,
          daysOfWeek,
        });
      } else {
        await createAlarm({
          title: title.trim(),
          message: message.trim(),
          time,
          color,
          daysOfWeek,
        });
      }
      resetForm();
      loadAlarms();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este alarme?")) return;
    startTransition(async () => {
      await deleteAlarm(id);
      loadAlarms();
    });
  };

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleAlarm(id, !current);
      loadAlarms();
    });
  };

  const handleTestNow = (testData: { title: string; message?: string; color: string }) => {
    startTransition(async () => {
      await triggerTestAlarm(testData);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    });
  };

  const toggleDay = (dayId: number) => {
    if (daysOfWeek.includes(dayId)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== dayId));
    } else {
      setDaysOfWeek([...daysOfWeek, dayId].sort());
    }
  };

  const formatDays = (days: number[]) => {
    if (days.length === 0) return "Uma vez";
    if (days.length === 7) return "Todos os dias";
    if (days.length === 5 && days.every(d => [1, 2, 3, 4, 5].includes(d))) return "Segunda a Sexta (Úteis)";
    return days.map(d => DAYS_OF_WEEK.find(item => item.id === d)?.label).join(", ");
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <h2 className="text-xl font-bold text-gray-900">Alarmes de Impacto</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Form Create / Edit */}
          {isFormOpen ? (
            <form onSubmit={handleSave} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 animate-in fade-in">
              <h3 className="font-bold text-gray-800 text-sm">
                {editingAlarmId ? "Editar Alarme" : "Novo Alarme de Impacto"}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título do Alerta *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lançar horas no sistema"
                  required
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-400 focus:outline-none bg-white text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mensagem ou Detalhes (Opcional)</label>
                <textarea 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Não esquecer de preencher o fechamento das tarefas de hoje."
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-400 focus:outline-none bg-white text-gray-900 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Horário de Disparo *</label>
                  <input 
                    type="time" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-400 focus:outline-none bg-white text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cor de Choque</label>
                  <div className="flex gap-1.5 items-center mt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`w-7 h-7 rounded-full transition-transform ${color === c.hex ? 'scale-120 ring-2 ring-gray-900 ring-offset-2' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Repetição por dias da semana */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Repetir nos dias:</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}
                      className="text-[11px] text-red-600 font-bold hover:underline"
                    >
                      Seg-Sex
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                      className="text-[11px] text-red-600 font-bold hover:underline"
                    >
                      Todos
                    </button>
                  </div>
                </div>
                <div className="flex justify-between gap-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = daysOfWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition ${
                          isSelected 
                            ? 'bg-red-600 text-white shadow-xs' 
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                        title={day.full}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions Form */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => handleTestNow({ title: title || "TESTE DE ALARME", message, color })}
                  disabled={isPending}
                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-2 rounded-lg transition flex items-center gap-1 shadow-2xs"
                  title="Disparar teste em tela cheia agora no monitor"
                >
                  <span>⚡</span> {testSent ? "Disparado!" : "Testar na Tela"}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !title.trim()}
                    className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-xs"
                  >
                    {editingAlarmId ? "Atualizar" : "Salvar Alarme"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsFormOpen(true)}
              className="w-full py-2.5 border-2 border-dashed border-red-300 hover:border-red-500 bg-red-50/50 hover:bg-red-50 text-red-700 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
            >
              <span>➕</span> Criar Novo Alarme de Impacto
            </button>
          )}

          {/* Alarm list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Seus Alarmes ({alarms.length})</span>
            </h3>

            {alarms.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">
                Nenhum alarme configurado. Crie o primeiro acima!
              </p>
            ) : (
              <ul className="space-y-2.5">
                {alarms.map((alarm) => (
                  <li 
                    key={alarm.id} 
                    className={`border rounded-xl p-3.5 flex items-center justify-between transition shadow-2xs ${
                      alarm.enabled 
                        ? 'bg-white border-gray-200 hover:border-gray-300' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3.5 h-10 rounded-full shrink-0" 
                        style={{ backgroundColor: alarm.color }} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-base">{alarm.time}</span>
                          <span className="font-semibold text-gray-800 text-sm">{alarm.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                            {formatDays(alarm.daysOfWeek)}
                          </span>
                          {alarm.message && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px]" title={alarm.message}>
                              {alarm.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestNow({ title: alarm.title, message: alarm.message || undefined, color: alarm.color })}
                        disabled={isPending}
                        className="p-1.5 text-xs text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        title="Testar alarme na tela cheia agora"
                      >
                        ⚡
                      </button>
                      <button
                        onClick={() => handleToggle(alarm.id, alarm.enabled)}
                        disabled={isPending}
                        className={`text-xs font-bold px-2 py-1 rounded transition ${
                          alarm.enabled 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={alarm.enabled ? 'Desativar Alarme' : 'Ativar Alarme'}
                      >
                        {alarm.enabled ? "Ativo" : "Pausado"}
                      </button>
                      <button
                        onClick={() => handleEdit(alarm)}
                        disabled={isPending}
                        className="p-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(alarm.id)}
                        disabled={isPending}
                        className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* System companion tip */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>🖥️</span> Sobreposição Nativa no Ubuntu GNOME:
            </p>
            <p className="text-amber-800 leading-relaxed">
              Para o alarme cobrir os dois monitores por cima de todos os programas (incluindo seu terminal do Claude Code), o daemon de alarmes deve estar rodando no sistema:
            </p>
            <code className="block bg-amber-100/80 p-1.5 rounded font-mono text-[11px] text-amber-950 font-bold">
              ./scripts/otto-alarm.sh autostart
            </code>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-100 transition shadow-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
