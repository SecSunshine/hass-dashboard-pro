import { describe, expect, it } from 'vitest';
import { escapeAttribute, escapeHTML, escapeJSONAttribute, escapeURLAttribute } from './html';

describe('html escaping helpers', () => {
  it('escapes text content', () => {
    expect(escapeHTML(`<script>"x"&'y'</script>`)).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;');
  });

  it('escapes attributes', () => {
    expect(escapeAttribute(`a" onclick="evil()`)).toBe('a&quot; onclick=&quot;evil()');
  });

  it('escapes JSON attributes', () => {
    expect(escapeJSONAttribute({ name: `A&B"`, html: '<b>' })).toContain('&quot;A&amp;B\\&quot;&quot;');
  });

  it('rejects javascript URLs and allows image data URLs', () => {
    expect(escapeURLAttribute('javascript:alert(1)')).toBe('');
    expect(escapeURLAttribute('data:text/html,<svg>')).toBe('');
    expect(escapeURLAttribute('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });
});

