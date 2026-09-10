export const VIBRANT_PALETTE = [
  '#f43f5e', // rose-500
  '#ec4899', // pink-500
  '#d946ef', // fuchsia-500
  '#a855f7', // purple-500
  '#8b5cf6', // violet-500
  '#6366f1', // indigo-500
  '#3b82f6', // blue-500
  '#0ea5e9', // sky-500
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#10b981', // emerald-500
  '#22c55e', // green-500
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
];

export function getLeastUsedColor(usedColors: string[]): string {
  const colorCounts = new Map<string, number>();
  VIBRANT_PALETTE.forEach(c => colorCounts.set(c, 0));
  
  usedColors.forEach(c => {
    if (colorCounts.has(c)) {
      colorCounts.set(c, colorCounts.get(c)! + 1);
    }
  });

  let leastUsed = VIBRANT_PALETTE[0];
  let minCount = Infinity;

  for (const [color, count] of colorCounts.entries()) {
    if (count < minCount) {
      minCount = count;
      leastUsed = color;
    }
  }

  return leastUsed;
}

/**
 * Returns a deterministic vibrant hex color based on a string seed.
 * Useful for ensuring the same calendar or task always gets the same color.
 */
export function getSemanticColor(seedText: string): string {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = seedText.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % VIBRANT_PALETTE.length;
  return VIBRANT_PALETTE[index];
}
