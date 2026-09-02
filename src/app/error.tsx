"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center font-sans">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Ops! Algo deu errado ao carregar sua agenda.</h2>
      <p className="text-gray-600 mb-6">Não conseguimos conectar com o Google Calendar. Verifique sua conexão.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
