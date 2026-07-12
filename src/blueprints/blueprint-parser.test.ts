import { describe, expect, it } from 'vitest';
import { cardConfigToHTML } from './blueprint-parser';

describe('blueprint parser rendering', () => {
  it('sanitizes html-pro content before embedding it into the dashboard', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: `
        <style>.tile { color: red; } @import url("https://example.com/a.css");</style>
        <div class="tile" onclick="alert(1)" data-entity="light.kitchen">
          <img src="javascript:alert(1)" onerror="alert(1)" />
          <img src="data:image/png;base64,abc" />
          <a href="data:image/svg+xml,%3Csvg%3E">Unsafe data link</a>
          <script>alert(1)</script>
        </div>
      `,
    }, 'Shared <Page>');

    expect(html).toContain('class="bp-html-card"');
    expect(html).toContain('data-blueprint-card="Shared &lt;Page&gt;"');
    expect(html).toContain('.bp-html-card .tile { color: red; }');
    expect(html).toContain('data-entity="light.kitchen"');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('onerror=');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('src="data:image/png;base64,abc"');
    expect(html).not.toContain('href="data:image/');
    expect(html).not.toContain('@import');
  });

  it('keeps declarative bindings and common svg icon attributes', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: `
        <button data-action="toggle" data-entity="light.kitchen">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 2v20" stroke="currentColor" stroke-width="2" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </button>
      `,
    }, 'Lights');

    expect(html).toContain('data-action="toggle"');
    expect(html).toContain('data-entity="light.kitchen"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('d="M12 2v20"');
    expect(html).toContain('cx="12"');
    expect(html).toContain('r="4"');
  });

  it('keeps safe keyboard focus metadata without inline handlers', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: '<div role="button" tabindex="0" data-action="more-info" data-entity="sensor.temperature" onkeydown="evil()">Temperature</div><div tabindex="9">Bad focus order</div>',
    }, 'Keyboard control');

    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('data-action="more-info"');
    expect(html).not.toContain('onkeydown');
    expect(html).not.toContain('tabindex="9"');
  });

  it('keeps safe range controls for declarative entity actions', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: `
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value="45"
          data-action="cover-position"
          data-entity="cover.bed_blind"
          aria-label="Curtain position"
          onchange="alert(1)"
        />
      `,
    }, 'Curtain');

    expect(html).toContain('<input type="range" min="0" max="100" step="5" value="45"');
    expect(html).toContain('data-action="cover-position"');
    expect(html).toContain('data-entity="cover.bed_blind"');
    expect(html).not.toContain('onchange');
  });

  it('preserves safe inline style declarations and drops unsafe ones', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: '<div style="display:flex; gap: 8px; --accent: var(--hdp-primary); background-image: url(javascript:alert(1)); behavior:url(x)">Tile</div>',
    }, 'Styled');

    expect(html).toContain('style="display: flex; gap: 8px; --accent: var(--hdp-primary)"');
    expect(html).not.toContain('background-image');
    expect(html).not.toContain('behavior');
    expect(html).not.toContain('javascript:');
  });

  it('removes external resource loads from style blocks without dropping safe declarations', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: `
        <style>
          @font-face { font-family: Tracker; src: url(https://tracker.test/font.woff2); }
          .tile { color: red; background-image: url(https://tracker.test/pixel); padding: 8px; }
          .mask { mask-image: image-set(url(https://tracker.test/mask.png) 1x); display: grid; }
        </style>
        <div class="tile mask">Safe style</div>
      `,
    }, 'No external CSS');

    expect(html).toContain('.bp-html-card .tile');
    expect(html).toContain('color: red');
    expect(html).toContain('padding: 8px');
    expect(html).toContain('display: grid');
    expect(html).not.toContain('tracker.test');
    expect(html).not.toContain('@font-face');
    expect(html).not.toContain('background-image');
    expect(html).not.toContain('mask-image');
  });

  it('scopes selectors nested inside responsive at-rules', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: `
        <style>
          @media (max-width: 600px) {
            .responsive-tile, :host.compact { display: grid; }
          }
          @supports (display: flex) {
            .responsive-row { display: flex; }
          }
        </style>
        <div class="responsive-tile responsive-row">Responsive</div>
      `,
    }, 'Responsive CSS');

    expect(html).toContain('@media (max-width: 600px)');
    expect(html).toContain('.bp-html-card .responsive-tile');
    expect(html).toContain('.bp-html-card.compact');
    expect(html).toContain('.bp-html-card .responsive-row');
    expect(html).not.toMatch(/\{\s*\.responsive-(?:tile|row)\b/);
    expect(html).not.toContain('.bp-html-card :host');
  });
});
