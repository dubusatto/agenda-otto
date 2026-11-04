"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCurriculumData,
  saveCurriculumContent,
  reviewCurriculumSuggestions,
  triggerCurriculumAnalysisNow,
  undoLastCurriculumChange,
} from "@/lib/actions";

export interface CurriculumSuggestionItem {
  id: string;
  curriculumId: string;
  type: string; // "REWRITE" | "ADD"
  sectionTitle: string;
  originalText: string | null;
  suggestedText: string;
  reasoning: string;
  sourceDates: string;
  status: string; // "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
}

export interface CurriculumDocumentData {
  id: string;
  userEmail: string;
  content: string;
  previousBackup: string | null;
  lastAnalyzedAt: string | Date | null;
  updatedAt: string | Date;
  suggestions: CurriculumSuggestionItem[];
}

interface CurriculumModalProps {
  initialData?: {
    document: CurriculumDocumentData | null;
    pendingCount: number;
    unanalyzedCheckInsCount: number;
    shouldAutoAnalyze: boolean;
  };
}

export default function CurriculumModal({ initialData }: CurriculumModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"suggestions" | "editor">(
    "suggestions"
  );

  const [documentData, setDocumentData] =
    useState<CurriculumDocumentData | null>(initialData?.document ?? null);
  const [pendingCount, setPendingCount] = useState<number>(
    initialData?.pendingCount ?? 0
  );
  const [unanalyzedCount, setUnanalyzedCount] = useState<number>(
    initialData?.unanalyzedCheckInsCount ?? 0
  );

  const [editorContent, setEditorContent] = useState<string>(
    initialData?.document?.content ?? ""
  );
  const [isDirty, setIsDirty] = useState(false);

  // Selection and inline edits for suggestions
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const autoAnalyzeTriggeredRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const fresh = await getCurriculumData();
      const doc = fresh.document as CurriculumDocumentData | null;
      setDocumentData(doc);
      setPendingCount(fresh.pendingCount);
      setUnanalyzedCount(fresh.unanalyzedCheckInsCount);
      if (doc && !isDirty) {
        setEditorContent(doc.content);
      }
      return fresh;
    } catch (err) {
      console.error("Failed to load curriculum data:", err);
      return null;
    }
  }, [isDirty]);

  // Initial sync & Morning / Post-20h Fallback Trigger
  useEffect(() => {
    let mounted = true;

    async function init() {
      const data = initialData ?? (await refreshData());
      if (!mounted || !data) return;

      if (data.shouldAutoAnalyze && !autoAnalyzeTriggeredRef.current) {
        autoAnalyzeTriggeredRef.current = true;
        try {
          const res = await fetch("/api/curriculum/analyze", {
            method: "POST",
          });
          if (res.ok && mounted) {
            await refreshData();
            router.refresh();
          }
        } catch (err) {
          console.warn("Silent curriculum auto-analyze fallback skipped:", err);
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [initialData, refreshData, router]);

  // Listen to custom event so Sidebar or Mobile Dock buttons can also open the modal
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
      refreshData();
    };
    window.addEventListener("open-curriculum-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("open-curriculum-modal", handleOpenEvent);
    };
  }, [refreshData]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const pendingSuggestions =
    documentData?.suggestions.filter((s) => s.status === "PENDING") ?? [];

  const resolvedSuggestions =
    documentData?.suggestions
      .filter((s) => s.status !== "PENDING")
      .slice(0, 10) ?? [];

  const selectedPendingIds = pendingSuggestions
    .map((s) => s.id)
    .filter((id) => selectedIds[id]);

  const handleOpenModal = () => {
    setFeedback(null);
    setIsOpen(true);
    refreshData().then((fresh) => {
      if (fresh && (!fresh.document || !fresh.document.content.trim())) {
        setActiveTab("editor");
      } else if (fresh && fresh.pendingCount > 0) {
        setActiveTab("suggestions");
      }
    });
  };

  const handleAnalyzeNow = async () => {
    if (!documentData || !documentData.content.trim()) {
      setFeedback({
        type: "error",
        message:
          "Salve o seu currículo na aba 'Meu Currículo (.md)' antes de rodar a análise da IA.",
      });
      setActiveTab("editor");
      return;
    }

    setFeedback(null);
    setIsAnalyzing(true);
    try {
      const result = await triggerCurriculumAnalysisNow();
      await refreshData();
      router.refresh();

      if (!result.analyzed && result.reason === "no_new_checkins") {
        setFeedback({
          type: "info",
          message:
            "✅ Tudo em dia! Não há novos check-ins no Diário desde a última análise.",
        });
      } else if (result.suggestionsCreated === 0) {
        setFeedback({
          type: "info",
          message: `✅ ${result.checkInsEvaluated} check-in(s) avaliado(s) pelo Gemini Pro. Nenhuma mudança estrutural foi necessária para o currículo.`,
        });
      } else {
        setFeedback({
          type: "success",
          message: `✨ Análise concluída! ${result.suggestionsCreated} nova(s) sugestão(ões) gerada(s) a partir de ${result.checkInsEvaluated} check-in(s).`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.message ||
          "Erro ao executar análise com o Gemini. Verifique a GEMINI_API_KEY no .env.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveCurriculum = () => {
    setFeedback(null);
    startTransition(async () => {
      try {
        await saveCurriculumContent(editorContent);
        setIsDirty(false);
        await refreshData();
        router.refresh();
        setFeedback({
          type: "success",
          message: "💾 Currículo salvo com sucesso no banco Neon!",
        });
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err?.message || "Erro ao salvar o currículo.",
        });
      }
    });
  };

  const handleDecision = (
    decisions: {
      id: string;
      action: "APPROVE" | "REJECT";
      editedText?: string;
    }[]
  ) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        await reviewCurriculumSuggestions(decisions);
        const nextSelected = { ...selectedIds };
        decisions.forEach((d) => delete nextSelected[d.id]);
        setSelectedIds(nextSelected);
        setIsDirty(false);
        await refreshData();
        router.refresh();

        const approvedCount = decisions.filter(
          (d) => d.action === "APPROVE"
        ).length;
        const rejectedCount = decisions.filter(
          (d) => d.action === "REJECT"
        ).length;

        if (approvedCount > 0) {
          setFeedback({
            type: "success",
            message: `✅ ${approvedCount} sugestão(ões) aplicada(s) ao seu currículo oficial!`,
          });
        } else if (rejectedCount > 0) {
          setFeedback({
            type: "info",
            message: `🗑️ ${rejectedCount} sugestão(ões) descartada(s).`,
          });
        }
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err?.message || "Erro ao processar decisão.",
        });
      }
    });
  };

  const handleApproveSelected = () => {
    if (selectedPendingIds.length === 0) return;
    const decisions = selectedPendingIds.map((id) => ({
      id,
      action: "APPROVE" as const,
      editedText: editedTexts[id],
    }));
    handleDecision(decisions);
  };

  const handleUndo = () => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const restored = await undoLastCurriculumChange();
        setEditorContent(restored.content);
        setIsDirty(false);
        await refreshData();
        router.refresh();
        setFeedback({
          type: "info",
          message: "↩️ Última alteração desfeita com sucesso!",
        });
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err?.message || "Não foi possível desfazer a última alteração.",
        });
      }
    });
  };

  const handleDownloadMd = () => {
    const contentToDownload = editorContent || documentData?.content || "";
    if (!contentToDownload.trim()) return;

    const blob = new Blob([contentToDownload], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const todayStr = new Date().toISOString().slice(0, 10);
    a.download = `curriculo-eduardo-${todayStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = typeof ev.target?.result === "string" ? ev.target.result : "";
      if (text) {
        setEditorContent(text);
        setIsDirty(true);
        setFeedback({
          type: "info",
          message: `📂 Arquivo "${file.name}" carregado no editor. Clique em "💾 Salvar Currículo" para gravar no banco Neon.`,
        });
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const toggleSelectAll = () => {
    if (selectedPendingIds.length === pendingSuggestions.length) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      pendingSuggestions.forEach((s) => {
        next[s.id] = true;
      });
      setSelectedIds(next);
    }
  };

  const formattedLastAnalyzed = documentData?.lastAnalyzedAt
    ? new Date(documentData.lastAnalyzedAt).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Ainda não analisado";

  return (
    <>
      {/* Botão Pílula no Cabeçalho */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`flex items-center gap-1.5 px-2.5 py-1 lg:px-3.5 lg:py-1.5 rounded-full border text-xs lg:text-sm font-bold transition cursor-pointer shadow-2xs ${
          pendingCount > 0
            ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 animate-pulse"
            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
        }`}
        title="Curadoria Inteligente de Currículo com IA"
      >
        <span>🎓</span>
        <span>Currículo</span>
        {pendingCount > 0 && (
          <span className="bg-white text-indigo-700 font-extrabold text-[11px] px-1.5 py-0.2 rounded-full shadow-2xs">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Modal de Curadoria */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/50 backdrop-blur-xs"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>🎓</span> Curadoria Inteligente de Currículo (IA)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Última análise:{" "}
                  <strong className="text-gray-700">
                    {formattedLastAnalyzed}
                  </strong>
                  {unanalyzedCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      {unanalyzedCount} check-in(s) novo(s)
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {documentData?.previousBackup && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={isPending || isAnalyzing}
                    className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                    title="Restaurar a versão imediatamente anterior do currículo"
                  >
                    ↩️ Desfazer
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAnalyzeNow}
                  disabled={isAnalyzing || isPending}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Avaliar novos check-ins do Diário contra o currículo agora"
                >
                  <span className={isAnalyzing ? "animate-spin" : ""}>🔄</span>
                  <span>
                    {isAnalyzing ? "Analisando com Gemini..." : "Analisar agora"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 p-1.5 rounded-full transition cursor-pointer"
                  title="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navegação de Abas */}
            <div className="px-4 sm:px-6 border-b border-gray-200 bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("suggestions")}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                    activeTab === "suggestions"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <span>✨ Sugestões Pendentes</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                      pendingSuggestions.length > 0
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {pendingSuggestions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                    activeTab === "editor"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <span>📄 Meu Currículo (.md)</span>
                  {isDirty && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Alterações não salvas" />
                  )}
                </button>
              </div>

              {activeTab === "editor" && (
                <div className="flex items-center gap-2 py-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    title="Importar arquivo .md do seu computador"
                  >
                    📂 Importar .md
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMd}
                    disabled={!editorContent.trim()}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-40"
                    title="Baixar currículo atualizado em arquivo .md"
                  >
                    📥 Baixar .md
                  </button>
                </div>
              )}
            </div>

            {/* Banner de Feedback */}
            {feedback && (
              <div
                className={`px-6 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between border-b ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : feedback.type === "error"
                    ? "bg-red-50 text-red-800 border-red-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                <span>{feedback.message}</span>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="text-xs font-bold ml-4 opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Corpo do Modal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {activeTab === "suggestions" ? (
                <>
                  {!documentData || !documentData.content.trim() ? (
                    <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                      <p className="text-3xl mb-2">📄</p>
                      <h3 className="text-base font-bold text-gray-900 mb-1">
                        Seu currículo oficial ainda não foi cadastrado no banco Neon
                      </h3>
                      <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                        Cole ou importe o arquivo Markdown (<code>.md</code>) do seu currículo na aba{" "}
                        <strong>Meu Currículo (.md)</strong> para que a IA possa comparar suas entregas diárias às 20h.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("editor")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
                      >
                        Ir para Meu Currículo (.md) →
                      </button>
                    </div>
                  ) : pendingSuggestions.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="text-3xl mb-2">✨</p>
                      <h3 className="text-base font-bold text-gray-900 mb-1">
                        Nenhuma sugestão pendente de revisão
                      </h3>
                      <p className="text-sm text-gray-600 max-w-lg mx-auto">
                        A avaliação automática roda diariamente às 20:00 BRT (ou ao abrir a agenda pela manhã caso existam check-ins anteriores não analisados). Você também pode clicar em{" "}
                        <strong>🔄 Analisar agora</strong> no topo.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Barra de Ação em Lote */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={
                              pendingSuggestions.length > 0 &&
                              selectedPendingIds.length ===
                                pendingSuggestions.length
                            }
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
                          />
                          <span>
                            Selecionar todas ({selectedPendingIds.length}/
                            {pendingSuggestions.length})
                          </span>
                        </label>

                        <button
                          type="button"
                          disabled={
                            selectedPendingIds.length === 0 || isPending
                          }
                          onClick={handleApproveSelected}
                          className="text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
                        >
                          ✅ Aprovar Selecionadas ({selectedPendingIds.length})
                        </button>
                      </div>

                      {/* Lista de Cards de Sugestão */}
                      <div className="space-y-4">
                        {pendingSuggestions.map((s) => {
                          const isRewrite = s.type === "REWRITE";
                          const isEditing = Boolean(editingIds[s.id]);
                          const currentText =
                            editedTexts[s.id] ?? s.suggestedText;
                          const isSelected = Boolean(selectedIds[s.id]);

                          return (
                            <div
                              key={s.id}
                              className={`p-4 sm:p-5 rounded-xl border transition bg-white shadow-xs ${
                                isSelected
                                  ? "border-indigo-500 ring-1 ring-indigo-500"
                                  : "border-gray-200"
                              }`}
                            >
                              {/* Topo do Card */}
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) =>
                                      setSelectedIds((prev) => ({
                                        ...prev,
                                        [s.id]: e.target.checked,
                                      }))
                                    }
                                    className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
                                  />

                                  <span
                                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                      isRewrite
                                        ? "bg-amber-100 text-amber-800 border-amber-300"
                                        : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    }`}
                                  >
                                    {isRewrite
                                      ? "🔄 REWRITE · Atualizar Tópico"
                                      : "➕ ADD · Novo Tópico"}
                                  </span>

                                  <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200">
                                    📌 {s.sectionTitle}
                                  </span>

                                  {s.sourceDates && (
                                    <span className="text-xs text-gray-500 font-medium">
                                      📅 Diário: {s.sourceDates}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isEditing && editedTexts[s.id] === undefined) {
                                      setEditedTexts((prev) => ({
                                        ...prev,
                                        [s.id]: s.suggestedText,
                                      }));
                                    }
                                    setEditingIds((prev) => ({
                                      ...prev,
                                      [s.id]: !prev[s.id],
                                    }));
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 rounded hover:bg-indigo-50 transition cursor-pointer"
                                >
                                  {isEditing ? "Concluir edição" : "✏️ Editar texto"}
                                </button>
                              </div>

                              {/* Justificativa Técnica */}
                              <div className="curriculum-reasoning-box mb-3 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs sm:text-sm text-gray-800">
                                <span className="font-bold text-indigo-900">
                                  💡 Por que tem peso em vagas:{" "}
                                </span>
                                <span>{s.reasoning}</span>
                              </div>

                              {/* Diff Visual */}
                              <div className="space-y-2 mb-4">
                                {isRewrite && s.originalText && (
                                  <div className="curriculum-diff-old p-3 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">
                                      Como está hoje (será substituído):
                                    </div>
                                    <pre className="whitespace-pre-wrap font-mono text-red-900 leading-relaxed">
                                      {s.originalText}
                                    </pre>
                                  </div>
                                )}

                                <div className="curriculum-diff-new p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                                    {isRewrite
                                      ? "Como fica (nova versão):"
                                      : "Como fica (novo tópico na seção):"}
                                  </div>

                                  {isEditing ? (
                                    <textarea
                                      rows={3}
                                      value={currentText}
                                      onChange={(e) =>
                                        setEditedTexts((prev) => ({
                                          ...prev,
                                          [s.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full mt-1 p-2 rounded-lg border border-emerald-400 bg-white font-mono text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                  ) : (
                                    <pre className="whitespace-pre-wrap font-mono text-emerald-950 leading-relaxed">
                                      {currentText}
                                    </pre>
                                  )}
                                </div>
                              </div>

                              {/* Botões de Ação Individual */}
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    handleDecision([
                                      { id: s.id, action: "REJECT" },
                                    ])
                                  }
                                  className="text-xs font-bold text-gray-600 hover:text-red-700 bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                                >
                                  🗑️ Descartar
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    handleDecision([
                                      {
                                        id: s.id,
                                        action: "APPROVE",
                                        editedText: editedTexts[s.id],
                                      },
                                    ])
                                  }
                                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                                >
                                  ✅ Aprovar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Histórico Recente de Sugestões Resolvidas */}
                  {resolvedSuggestions.length > 0 && (
                    <details className="pt-4 border-t border-gray-200">
                      <summary className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700">
                        Histórico recente de decisões ({resolvedSuggestions.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {resolvedSuggestions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                    s.status === "APPROVED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {s.status === "APPROVED"
                                    ? "APROVADA"
                                    : "DESCARTADA"}
                                </span>
                                <span className="font-semibold text-gray-700">
                                  {s.sectionTitle}
                                </span>
                                <span className="text-gray-400">
                                  ({s.sourceDates})
                                </span>
                              </div>
                              <p className="font-mono text-gray-600 whitespace-pre-wrap">
                                {s.suggestedText}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                /* Aba 2: Meu Currículo (.md) */
                <div className="flex flex-col h-full space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>
                      Cole aqui o Markdown oficial do seu currículo ou edite livremente. Esta é a fonte da verdade usada pela IA.
                    </span>
                    <span className="font-mono">
                      {editorContent.length} caracteres ·{" "}
                      {editorContent ? editorContent.split("\n").length : 0} linhas
                    </span>
                  </div>

                  <textarea
                    value={editorContent}
                    onChange={(e) => {
                      setEditorContent(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="# Seu Nome&#10;**Engenheiro de Software**&#10;&#10;## Experiência Profissional&#10;- Descreva suas entregas..."
                    rows={18}
                    className="w-full flex-1 p-4 rounded-xl border border-gray-300 bg-gray-50 font-mono text-xs sm:text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      {isDirty ? (
                        <span className="text-amber-600 font-semibold">
                          ● Existem alterações não salvas no editor
                        </span>
                      ) : documentData ? (
                        <span className="text-emerald-600 font-semibold">
                          ✓ Sincronizado com o banco Neon
                        </span>
                      ) : (
                        <span>Nenhum currículo salvo ainda</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSaveCurriculum}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-xl transition cursor-pointer shadow-sm"
                    >
                      {isPending ? "Salvando..." : "💾 Salvar Currículo"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                Cron diário configurado para 20:00 BRT (`0 23 * * *` UTC) + fallback matinal automático
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-gray-100 transition cursor-pointer shadow-2xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
