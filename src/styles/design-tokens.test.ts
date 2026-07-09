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
});
