/**
 * HTML escaping helpers for all HA/user/template sourced strings.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char]);
}

export function escapeAttribute(value: unknown): string {
  return escapeHTML(value);
}

export function escapeAttributePreservingEntities(value: unknown): string {
  return String(value ?? '').replace(
    /&(?!(?:amp|lt|gt|quot|#39);)|[<>"']/g,
    char => HTML_ESCAPE_MAP[char],
  );
}

export function escapeJSONAttribute(value: unknown): string {
  return escapeAttribute(JSON.stringify(value ?? null));
}

export function escapeScriptJSON(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function sanitizeImageURL(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/[\r\n)"'\\]/.test(raw)) return '';

  try {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(raw, origin);
    if (!['http:', 'https:', 'data:'].includes(url.protocol)) return '';
    if (url.protocol === 'data:' && !/^data:image\//i.test(raw)) return '';
    if (/^(https?:|data:image\/)/i.test(raw) || raw.startsWith('/')) return raw;
    if (/^(?:\.{1,2}\/|\/)/.test(raw)) return '';
    // HA serves user-uploaded dashboard images from /local. A file picker can
    // provide just a filename, which otherwise resolves against the current
    // Lovelace route and fails after a refresh.
    if (!/^[a-z0-9][a-z0-9._/ -]*$/i.test(raw)
      || raw.includes('//')
      || raw.split('/').some(part => part === '.' || part === '..')) return '';
    return `/local/${raw}`;
  } catch {
    return '';
  }
}

export function escapeURLAttribute(value: unknown): string {
  return escapeAttributePreservingEntities(sanitizeImageURL(value));
}

export function sanitizeLinkURL(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || /[\u0000-\u001f\u007f\\]/.test(raw)) return '';

  try {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(raw, origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? raw : '';
  } catch {
    return '';
  }
}

export function escapeLinkURLAttribute(value: unknown): string {
  return escapeAttributePreservingEntities(sanitizeLinkURL(value));
}

export function escapeInlineStyleValue(value: unknown): string {
  return String(value ?? '').replace(/[<>"'`;{}]/g, '');
}
