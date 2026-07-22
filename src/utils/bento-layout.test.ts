import { describe, expect, it } from 'vitest';
import { bentoWrap, DENSITY_PRESETS, generateBentoCSS, resolveBentoGridSpan } from './bento-layout';

describe('bento layout css', () => {
  it('uses shrink-safe grid tracks for all responsive layouts', () => {
    const css = generateBentoCSS();

    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.hdp-home-content \{[\s\S]*grid-auto-rows: auto;/);
    expect(css).toContain('min-width: 0');
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('grid-auto-rows: var(--hdp-density-row-height, 120px)');
    expect(css).not.toContain('grid-auto-rows: minmax(var(--hdp-density-row-height, 120px), auto)');
    expect(css).toContain('grid-auto-rows: auto');
    expect(css).toContain('align-items: start');
    expect(css).toContain(`.hdp-area-content > .hdp-bento {
    grid-column: 1 / -1;
    grid-row: auto;`);
    expect(css).not.toContain('grid-template-columns: repeat(4, 1fr)');
    expect(css).not.toContain('grid-template-columns: repeat(2, 1fr)');
    expect(css).toContain('.hdp-home-content .hdp-bento[data-hdp-bento-custom="true"]');
  });

  it('does not include topology preset branches', () => {
    const css = generateBentoCSS();

    expect(css).not.toContain('hdp-home-content--rows');
    expect(css).not.toContain('hdp-home-content--l_shape');
    expect(css).not.toContain('hdp-home-content--l_mirror');
    expect(css).not.toContain('hdp-home-content--u_shape');
    expect(css).not.toContain('hdp-home-content--custom');
  });

  it('uses compact fixed home tracks without applying them to content-driven pages', () => {
    expect(DENSITY_PRESETS.compact.rowHeight).toBe(84);
    expect(DENSITY_PRESETS.standard.rowHeight).toBe(96);
    expect(DENSITY_PRESETS.spacious.rowHeight).toBe(112);
  });

  it('wraps explicit spans as responsive grid variables', () => {
    const html = bentoWrap('<div>Card</div>', 'md', { columns: 3, rows: 4 });

    expect(html).toContain('data-hdp-bento-custom="true"');
    expect(bentoWrap('<div>Power</div>', 'lg', undefined, 'home.power_usage')).toContain('data-hdp-slot="home.power_usage"');
    expect(html).toContain('--hdp-bento-column-span: 3');
    expect(html).toContain('--hdp-bento-tablet-column-span: 2');
    expect(html).toContain('--hdp-bento-row-span: 4');
    expect(resolveBentoGridSpan(9, 0, 'md')).toEqual({ columns: 4, rows: 1 });
  });
});
