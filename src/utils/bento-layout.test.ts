import { describe, expect, it } from 'vitest';
import { generateBentoCSS } from './bento-layout';

describe('bento layout css', () => {
  it('uses shrink-safe grid tracks for all responsive layouts', () => {
    const css = generateBentoCSS();

    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toContain('min-width: 0');
    expect(css).toContain('box-sizing: border-box');
    expect(css).not.toContain('grid-template-columns: repeat(4, 1fr)');
    expect(css).not.toContain('grid-template-columns: repeat(2, 1fr)');
  });
});
