import { describe, expect, it } from 'vitest';
import { buildBottomNavHTML, getBottomNavCSS } from './bottom-nav';

describe('bottom navigation', () => {
  it('uses shared surface and control tokens for mobile navigation', () => {
    const css = getBottomNavCSS();

    expect(css).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg, var(--ha-card-background, var(--card-background-color))));');
    expect(css).toContain('box-shadow: var(--hdp-shadow-elevated, 0 -4px 24px color-mix(in srgb, var(--hdp-text, CanvasText) 10%, transparent));');
    expect(css).toContain('background: var(--hdp-control-bg-hover, var(--hdp-surface-muted, var(--hdp-primary-light)));');
    expect(css).toContain('background: var(--hdp-primary-light, var(--hdp-control-bg-hover, var(--hdp-surface-muted)));');
    expect(css).toContain('background: var(--hdp-modal-bg, var(--hdp-surface-card, var(--hdp-card-bg, var(--ha-card-background, var(--card-background-color)))));');
    expect(css).toContain('background: var(--hdp-control-bg-hover, var(--hdp-surface-muted, var(--hdp-divider)));');
    expect(css).toContain('.bn-btn:focus-visible');
    expect(css).toContain('.bn-sheet-item:focus-visible');
  });

  it('renders settings and blueprint sheet navigation safely', () => {
    const html = buildBottomNavHTML({
      showSettings: true,
      blueprintPages: [
        { id: 'one', name: 'One <Page>', icon: 'mdi:puzzle', inputs: {}, card: { type: 'custom:html-pro-card' }, blueprint_yaml: '' },
        { id: 'two', name: 'Two', icon: 'mdi:puzzle', inputs: {}, card: { type: 'custom:html-pro-card' }, blueprint_yaml: '' },
      ],
    });

    expect(html).toContain('class="hdp-bottom-nav"');
    expect(html).toContain('data-view="settings"');
    expect(html).toContain('class="bn-sheet"');
    expect(html).toContain('One &lt;Page&gt;');
    expect(html).not.toContain('One <Page>');
  });
});
