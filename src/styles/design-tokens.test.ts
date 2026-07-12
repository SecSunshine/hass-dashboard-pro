import { describe, expect, it } from 'vitest';
import { generateDesignTokenCSS } from './design-tokens';

describe('design tokens', () => {
  it('exports shared surface tokens for cards, controls and modals', () => {
    const css = generateDesignTokenCSS();

    expect(css).toContain('--hdp-surface-card: var(--hdp-card-bg);');
    expect(css).toContain('--hdp-surface-muted: color-mix');
    expect(css).toContain('--hdp-surface-raised: color-mix');
    expect(css).toContain('--hdp-control-bg: color-mix');
    expect(css).toContain('--hdp-control-bg-hover: color-mix');
    expect(css).toContain('--hdp-modal-bg: color-mix');
    expect(css).toContain('--hdp-overlay-bg: color-mix');
  });

  it('cannot break out of the generated style block through imported tokens', () => {
    const css = generateDesignTokenCSS({
      primary: 'red;</style><script>alert(1)</script><style>',
      font_family: 'Inter; } body { display: none',
      border_radius: '10;</style><img src=x onerror=alert(1)>' as any,
    });

    expect(css.match(/<\/style>/g)).toHaveLength(1);
    expect(css).not.toContain('<script>');
    expect(css).not.toContain('<img');
    expect(css).not.toContain('body {');
    expect(css).toContain('--hdp-radius: 10px;');
  });
});
