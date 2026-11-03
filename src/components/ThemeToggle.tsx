"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("agenda-edu-theme");
    const prefersDark =
      saved === "dark" ||
      (!saved && document.documentElement.classList.contains("dark"));
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("agenda-edu-theme", nextDark ? "dark" : "light");
  };

  if (!mounted) {
    return (
      <div className="w-9 h-8 rounded-full border border-gray-200 bg-gray-50" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn flex items-center gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs lg:text-sm font-semibold text-gray-700 transition cursor-pointer shadow-2xs"
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      <span>{isDark ? "☀️" : "🌙"}</span>
      <span className="hidden sm:inline">{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}
