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

export function escapeURLAttribute(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(raw, origin);
    if (!['http:', 'https:', 'data:'].includes(url.protocol)) return '';
    if (url.protocol === 'data:' && !raw.startsWith('data:image/')) return '';
    return escapeAttribute(raw);
  } catch {
    if (raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
      return escapeAttribute(raw);
    }
    return '';
  }
}

export function escapeInlineStyleValue(value: unknown): string {
  return String(value ?? '').replace(/[<>"'`;{}]/g, '');
}

