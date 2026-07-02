/**
 * DOM/path ID helpers shared by generated dashboard views.
 */

export function safeDomIdSegment(value: unknown): string {
  return String(value || 'page').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64) || 'page';
}

export function safeBlueprintViewId(id: unknown): string {
  return `bp-${safeDomIdSegment(id)}`;
}

export function safePathSegment(value: unknown): string {
  return safeDomIdSegment(value);
}
