import { describe, expect, it } from 'vitest';
import { bentoWrap, generateBentoCSS, resolveBentoGridSpan } from './bento-layout';

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
    expect(css).toContain('.hdp-home-content--custom .hdp-bento[data-hdp-bento-custom="true"]');
  });

  it('wraps explicit spans as responsive grid variables', () => {
    const html = bentoWrap('<div>Card</div>', 'md', { columns: 3, rows: 4 });

    expect(html).toContain('data-hdp-bento-custom="true"');
    expect(html).toContain('--hdp-bento-column-span: 3');
    expect(html).toContain('--hdp-bento-tablet-column-span: 2');
    expect(html).toContain('--hdp-bento-row-span: 4');
    expect(resolveBentoGridSpan(9, 0, 'md')).toEqual({ columns: 4, rows: 1 });
  });
});
