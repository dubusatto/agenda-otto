import type { CalendarEvent } from "./google";

export interface ProfileOption {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_PROFILE_NAME = "Trabalho";
export const GOOGLE_PROFILE_NAME = "Google";

export const DEFAULT_PROFILES: ProfileOption[] = [
  { name: "Trabalho", icon: "💼", color: "#2563eb" },
  { name: "Pessoal", icon: "🏠", color: "#10b981" },
  { name: "PUC", icon: "🎓", color: "#7c3aed" },
];

const EXTRA_COLORS = ["#f59e0b", "#ec4899", "#06b6d4", "#ef4444", "#84cc16"];

export function normalizeProfileName(profile?: string | null): string {
  const cleaned = (profile || "").trim();
  return cleaned || DEFAULT_PROFILE_NAME;
}

export function getProfileMeta(
  profileName: string,
  allProfiles: ProfileOption[] = DEFAULT_PROFILES
): ProfileOption {
  const normalized = normalizeProfileName(profileName);
  const found = allProfiles.find(
    (p) => p.name.toLowerCase() === normalized.toLowerCase()
  );
  if (found) return found;
  return { name: normalized, icon: "📌", color: "#64748b" };
}

export function mergeProfiles(
  customProfiles: Partial<ProfileOption>[] = [],
  taskProfiles: (string | null | undefined)[] = []
): ProfileOption[] {
  const result: ProfileOption[] = [];
  const seen = new Set<string>();

  const addIfMissing = (option: ProfileOption) => {
    const key = option.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(option);
  };

  for (const def of DEFAULT_PROFILES) {
    addIfMissing(def);
  }

  let colorIdx = 0;
  for (const custom of customProfiles) {
    const name = (custom.name || "").trim();
    if (!name) continue;
    addIfMissing({
      name,
      icon: custom.icon || "📌",
      color: custom.color || EXTRA_COLORS[colorIdx++ % EXTRA_COLORS.length],
    });
  }

  for (const rawName of taskProfiles) {
    const name = normalizeProfileName(rawName);
    addIfMissing({
      name,
      icon: "📌",
      color: EXTRA_COLORS[colorIdx++ % EXTRA_COLORS.length],
    });
  }

  return result;
}

export function filterEventsByProfiles(
  events: CalendarEvent[],
  activeProfiles: string[]
): CalendarEvent[] {
  if (!activeProfiles || activeProfiles.length === 0) {
    return events;
  }
  const activeSet = new Set(activeProfiles.map((p) => p.toLowerCase()));
  return events.filter((event) => {
    if (event.calendarId !== "local-db") {
      return activeSet.has(GOOGLE_PROFILE_NAME.toLowerCase());
    }
    const profileName = normalizeProfileName(event.profile);
    return activeSet.has(profileName.toLowerCase());
  });
}

export function toggleProfileSelection(
  currentSelected: string[],
  targetProfile: string,
  allProfiles: string[]
): string[] {
  const exists = currentSelected.includes(targetProfile);
  if (exists) {
    if (currentSelected.length <= 1) {
      return currentSelected;
    }
    return currentSelected.filter((p) => p !== targetProfile);
  }
  const next = [...currentSelected, targetProfile];
  // Maintain stable order based on allProfiles
  return allProfiles.filter((p) => next.includes(p)).concat(
    next.filter((p) => !allProfiles.includes(p))
  );
}
