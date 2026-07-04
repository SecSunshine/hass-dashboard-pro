import { describe, expect, it } from 'vitest';
import { cardSkinClass, sanitizeCardSkin } from './card-skin';

describe('card skin helpers', () => {
  it('keeps valid built-in skins', () => {
    expect(sanitizeCardSkin('glass')).toBe('glass');
    expect(sanitizeCardSkin('neon')).toBe('neon');
  });

  it('falls back for untrusted skin values', () => {
    expect(sanitizeCardSkin('bad" onclick="evil()')).toBe('classic');
    expect(cardSkinClass('bad hdp-card--neon')).toBe('hdp-card hdp-card--classic');
  });
});
