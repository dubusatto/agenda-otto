import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROFILES,
  GOOGLE_PROFILE_NAME,
  normalizeProfileName,
  mergeProfiles,
  filterEventsByProfiles,
  toggleProfileSelection,
} from "./profiles";
import type { CalendarEvent } from "./google";

describe("Calendar Profiles logic", () => {
  it("normalizes empty or missing profile names to 'Trabalho'", () => {
    expect(normalizeProfileName(undefined)).toBe("Trabalho");
    expect(normalizeProfileName(null)).toBe("Trabalho");
    expect(normalizeProfileName("   ")).toBe("Trabalho");
    expect(normalizeProfileName("  PUC  ")).toBe("PUC");
  });

  it("merges default profiles, custom DB profiles, and task profiles without duplicates", () => {
    const merged = mergeProfiles(
      [{ name: "Saúde", icon: "🩺", color: "#10b981" }],
      ["Trabalho", "Pessoal", "Freela"]
    );
    const names = merged.map((p) => p.name);
    expect(names).toContain("Trabalho");
    expect(names).toContain("Pessoal");
    expect(names).toContain("PUC");
    expect(names).toContain("Saúde");
    expect(names).toContain("Freela");
    expect(new Set(names).size).toBe(names.length);
    expect(DEFAULT_PROFILES.length).toBeGreaterThanOrEqual(3);
  });

  it("filters local tasks by selected profiles and hides Pessoal/PUC when only Trabalho is active", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    const end = new Date("2026-11-20T11:00:00Z");
    const events: CalendarEvent[] = [
      { id: "1", title: "Daily", start: now, end, calendarId: "local-db", profile: "Trabalho" },
      { id: "2", title: "Médico", start: now, end, calendarId: "local-db", profile: "Pessoal" },
      { id: "3", title: "Prova IA", start: now, end, calendarId: "local-db", profile: "PUC" },
      { id: "4", title: "Evento Google", start: now, end, calendarId: "primary" },
    ];

    const onlyWork = filterEventsByProfiles(events, ["Trabalho"]);
    expect(onlyWork.map((e) => e.id)).toEqual(["1"]);

    const workAndPuc = filterEventsByProfiles(events, ["Trabalho", "PUC"]);
    expect(workAndPuc.map((e) => e.id)).toEqual(["1", "3"]);

    const withGoogle = filterEventsByProfiles(events, ["Trabalho", GOOGLE_PROFILE_NAME]);
    expect(withGoogle.map((e) => e.id)).toEqual(["1", "4"]);
  });

  it("toggles profiles safely and supports multi-selection without ending up empty", () => {
    const all = ["Trabalho", "Pessoal", "PUC"];

    // Deselecting one from all leaves the others
    expect(toggleProfileSelection(all, "Pessoal", all)).toEqual(["Trabalho", "PUC"]);

    // Adding one back
    expect(toggleProfileSelection(["Trabalho"], "PUC", all)).toEqual(["Trabalho", "PUC"]);

    // Clicking the last remaining active profile keeps it selected (prevents blank confusion)
    expect(toggleProfileSelection(["Trabalho"], "Trabalho", all)).toEqual(["Trabalho"]);
  });
});
