/**
 * Entity extraction and best-effort mapping for imported dashboards.
 */

import type { Hass } from '../types';

export interface EntityMappingResult {
  mapping: Record<string, string>;
  unmapped: string[];
}

const ENTITY_ID_RE = /\b([a-z_]+\.[a-z0-9_]+)\b/g;

export function extractEntityIds(value: unknown): string[] {
  const found = new Set<string>();
  walk(value, item => {
    if (typeof item !== 'string') return;
    for (const match of item.matchAll(ENTITY_ID_RE)) {
      found.add(match[1]);
    }
  });
  return Array.from(found).sort();
}

export function buildEntityMapping(sourceEntityIds: string[], hass: Hass): EntityMappingResult {
  const mapping: Record<string, string> = {};
  const unmapped: string[] = [];
  const used = new Set<string>();

  for (const sourceId of sourceEntityIds) {
    if (hass.states[sourceId] && !used.has(sourceId)) {
      mapping[sourceId] = sourceId;
      used.add(sourceId);
      continue;
    }

    const candidate = findBestCandidate(sourceId, hass, used);
    if (candidate) {
      mapping[sourceId] = candidate;
      used.add(candidate);
    } else {
      unmapped.push(sourceId);
    }
  }

  return { mapping, unmapped };
}

export function applyEntityMapping<T>(value: T, mapping: Record<string, string>): T {
  if (!value || Object.keys(mapping).length === 0) return value;

  if (typeof value === 'string') {
    let result = value as string;
    for (const [from, to] of Object.entries(mapping)) {
      result = result.split(from).join(to);
    }
    return result as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => applyEntityMapping(item, mapping)) as T;
  }

  if (typeof value === 'object') {
    const mapped: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      mapped[key] = applyEntityMapping(item, mapping);
    }
    return mapped as T;
  }

  return value;
}

function findBestCandidate(sourceId: string, hass: Hass, used: Set<string>): string | null {
  const sourceDomain = sourceId.split('.')[0];
  const sourceTokens = tokenize(sourceId);
  let best: { id: string; score: number } | null = null;

  for (const [entityId, state] of Object.entries(hass.states)) {
    if (used.has(entityId)) continue;
    if (entityId.split('.')[0] !== sourceDomain) continue;

    const name = String(state.attributes?.friendly_name || '');
    const registryName = String(hass.entities?.[entityId]?.name || '');
    const targetTokens = tokenize(`${entityId} ${name} ${registryName}`);
    const score = similarity(sourceTokens, targetTokens);

    if (!best || score > best.score) best = { id: entityId, score };
  }

  return best && best.score > 0 ? best.id : null;
}

function walk(value: unknown, visit: (value: unknown) => void): void {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) walk(item, visit);
  }
}

function tokenize(value: string): Set<string> {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  return new Set(normalized.split(/[_\s]+/).filter(token => token.length > 1));
}

function similarity(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const token of a) {
    if (b.has(token)) score += token.length;
  }
  return score;
}
