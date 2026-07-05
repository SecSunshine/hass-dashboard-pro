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
});
