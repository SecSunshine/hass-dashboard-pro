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
    return raw;
  } catch {
    if (raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
      return raw;
    }
    return '';
  }
}

export function escapeURLAttribute(value: unknown): string {
  return escapeAttribute(sanitizeImageURL(value));
}

export function escapeInlineStyleValue(value: unknown): string {
  return String(value ?? '').replace(/[<>"'`;{}]/g, '');
}
