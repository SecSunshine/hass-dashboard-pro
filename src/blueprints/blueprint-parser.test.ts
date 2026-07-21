import { describe, expect, it } from 'vitest';
import { cardConfigToHTML } from './blueprint-parser';

function getScopeSelector(html: string): string {
  const token = html.match(/data-blueprint-scope="([a-z0-9-]+)"/)?.[1];
  if (!token) throw new Error('Missing blueprint scope token');
  return `.bp-html-card[data-blueprint-scope="${token}"]`;
}

describe('blueprint parser rendering', () => {
  it('isolates custom CSS with a stable scope per card definition', () => {
    const card = {
      type: 'custom:html-pro-card',
      content: '<style>@keyframes pulse { from { opacity: .5; } 50% { opacity: 1; } to { opacity: .5; } } .shared-tile { --pulse: 1s; color: red; animation: pulse var(--pulse) ease infinite; animation-name: pulse; }</style><div class="shared-tile">Tile</div>',
    };
    const first = cardConfigToHTML(card, 'home.summary');
    const repeated = cardConfigToHTML(card, 'home.summary');
    const second = cardConfigToHTML(card, 'home.environment');
    const firstScope = first.match(/data-blueprint-scope="([a-z0-9-]+)"/)?.[1];
    const secondScope = second.match(/data-blueprint-scope="([a-z0-9-]+)"/)?.[1];

    expect(firstScope).toBeTruthy();
    expect(secondScope).toBeTruthy();
    expect(firstScope).not.toBe(secondScope);
    expect(repeated).toContain(`data-blueprint-scope="${firstScope}"`);
    expect(first).toContain(`.bp-html-card[data-blueprint-scope="${firstScope}"] .shared-tile`);
    expect(first).toContain(`@keyframes ${firstScope}-pulse`);
    expect(first).toContain(`animation: ${firstScope}-pulse var(--pulse) ease infinite`);
    expect(first).not.toContain(`var(--${firstScope}-pulse)`);
    expect(first).toContain(`animation-name: ${firstScope}-pulse`);
    expect(first).not.toContain(`${getScopeSelector(first)} from`);
    expect(second).toContain(`@keyframes ${secondScope}-pulse`);
    expect(second).not.toContain(`@keyframes ${firstScope}-pulse`);
    expect(first).not.toContain(`data-blueprint-scope="${secondScope}"`);
  });

  it('sanitizes html-pro content before embedding it into the dashboard', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: `
        <!-- Internal layout note -->
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
    expect(html).toContain(`${getScopeSelector(html)} .tile { color: red; }`);
    expect(html).toContain('data-entity="light.kitchen"');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('Internal layout note');
    expect(html).not.toContain('&lt;!--');
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

  it('does not double-escape safe entities in attributes', () => {
    const html = cardConfigToHTML({
      type: 'custom:html-pro-card',
      content: '<button title="Kitchen &amp; Dining" aria-label="&lt;Status&gt; & live">Open</button>',
    }, 'Attribute entities');

    expect(html).toContain('title="Kitchen &amp; Dining"');
    expect(html).toContain('aria-label="&lt;Status&gt; &amp; live"');
    expect(html).not.toContain('&amp;amp;');
    expect(html).not.toContain('&amp;lt;');
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
        <input type="text" value="credential" data-entity="sensor.unsafe_text" />
        <input type="file" type="range" data-entity="sensor.unsafe_file" />
        <input type="range" type="file" min="0" max="100" value="30" data-action="cover-position" data-entity="cover.safe_duplicate" />
      `,
    }, 'Curtain');

    expect(html).toContain('<input type="range" min="0" max="100" step="5" value="45"');
    expect(html).toContain('data-action="cover-position"');
    expect(html).toContain('data-entity="cover.bed_blind"');
    expect(html).not.toContain('onchange');
    expect(html.match(/<input type="range"/g)).toHaveLength(2);
    expect(html).not.toContain('<input type="text"');
    expect(html).not.toContain('<input type="file"');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('data-entity="sensor.unsafe_text"');
    expect(html).not.toContain('data-entity="sensor.unsafe_file"');
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

    expect(html).toContain(`${getScopeSelector(html)} .tile`);
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
    const scope = getScopeSelector(html);
    expect(html).toContain(`${scope} .responsive-tile`);
    expect(html).toContain(`${scope}.compact`);
    expect(html).toContain(`${scope} .responsive-row`);
    expect(html).not.toMatch(/\{\s*\.responsive-(?:tile|row)\b/);
    expect(html).not.toContain('.bp-html-card :host');
  });
});
