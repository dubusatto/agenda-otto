import { describe, it, expect } from 'vitest';
import { VIBRANT_PALETTE, getSemanticColor, getLeastUsedColor } from './colors';

describe('Seam 4: Semantic Colors & Palette Distribution (colors.ts)', () => {
  it('returns the exact same hex color from VIBRANT_PALETTE deterministically for a given task ID', () => {
    const colorFirstCall = getSemanticColor('google-task-abc-123');
    const colorSecondCall = getSemanticColor('google-task-abc-123');

    expect(colorFirstCall).toBe(colorSecondCall);
    expect(VIBRANT_PALETTE).toContain(colorFirstCall);
  });

  it('selects an unused color when free colors exist, and the least repeated color when all are used', () => {
    // Use all colors except the last one ('#f97316')
    const allExceptLast = VIBRANT_PALETTE.slice(0, -1);
    expect(getLeastUsedColor(allExceptLast)).toBe('#f97316');

    // Use every color twice, except '#0ea5e9' which is used only once
    const twiceExceptSky = VIBRANT_PALETTE.flatMap(color =>
      color === '#0ea5e9' ? [color] : [color, color]
    );
    expect(getLeastUsedColor(twiceExceptSky)).toBe('#0ea5e9');
  });
});
