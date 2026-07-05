/**
 * Entity extraction and best-effort mapping for imported dashboards.
 */

import type { Hass } from '../types';

export interface EntityMappingResult {
  mapping: Record<string, string>;
  matches: EntityMappingMatch[];
  unmapped: string[];
}

export interface EntityMappingMatch {
  source: string;
  target: string;
  score: number;
  confidence: 'exact' | 'high' | 'medium' | 'low';
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
  const matches: EntityMappingMatch[] = [];
  const unmapped: string[] = [];
  const used = new Set<string>();

  for (const sourceId of sourceEntityIds) {
    if (hass.states[sourceId] && !used.has(sourceId) && isRegistryVisible(hass, sourceId)) {
      mapping[sourceId] = sourceId;
      matches.push({ source: sourceId, target: sourceId, score: 999, confidence: 'exact' });
      used.add(sourceId);
      continue;
    }

    const candidate = findBestCandidate(sourceId, hass, used);
    if (candidate) {
      mapping[sourceId] = candidate.id;
      matches.push({
        source: sourceId,
        target: candidate.id,
        score: candidate.score,
        confidence: toConfidence(candidate.score),
      });
      used.add(candidate.id);
    } else {
      unmapped.push(sourceId);
    }
  }

  return { mapping, matches, unmapped };
}

export function applyEntityMapping<T>(value: T, mapping: Record<string, string>): T {
  if (!value || Object.keys(mapping).length === 0) return value;

  if (typeof value === 'string') {
    let result = value as string;
    const entries = Object.entries(mapping).sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of entries) {
      result = replaceEntityId(result, from, to);
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

function findBestCandidate(sourceId: string, hass: Hass, used: Set<string>): { id: string; score: number } | null {
  const sourceDomain = sourceId.split('.')[0];
  const sourceTokens = tokenize(stripDomain(sourceId));
  let best: { id: string; score: number } | null = null;

  for (const [entityId, state] of Object.entries(hass.states)) {
    if (used.has(entityId)) continue;
    if (entityId.split('.')[0] !== sourceDomain) continue;
    if (!isRegistryVisible(hass, entityId)) continue;

    const name = String(state.attributes?.friendly_name || '');
    const registryEntry = hass.entities?.[entityId];
    const registryName = String(registryEntry?.name || '');
    const device = registryEntry?.device_id ? hass.devices?.[registryEntry.device_id] : undefined;
    const deviceName = `${device?.name || ''} ${device?.name_by_user || ''} ${device?.manufacturer || ''} ${device?.model || ''}`;
    const areaName = getEntityAreaName(entityId, hass);
    const targetTokens = tokenize(`${stripDomain(entityId)} ${name} ${registryName} ${deviceName} ${areaName}`);
    const score = similarity(sourceTokens, targetTokens);

    if (!best || score > best.score) best = { id: entityId, score };
  }

  return best && best.score > 0 ? best : null;
}

function stripDomain(entityId: string): string {
  return entityId.includes('.') ? entityId.split('.').slice(1).join('.') : entityId;
}

function getEntityAreaName(entityId: string, hass: Hass): string {
  const registryEntry = hass.entities?.[entityId];
  const areaId = registryEntry?.area_id
    || (registryEntry?.device_id ? hass.devices?.[registryEntry.device_id]?.area_id : null)
    || (hass.states[entityId]?.attributes?.area_id as string | undefined)
    || null;
  return areaId ? hass.areas?.[areaId]?.name || areaId : '';
}

function replaceEntityId(value: string, from: string, to: string): string {
  const escaped = escapeRegExp(from);
  return value.replace(new RegExp(`(^|[^a-z0-9_])(${escaped})(?=$|[^a-z0-9_])`, 'g'), `$1${to}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRegistryVisible(hass: Hass, entityId: string): boolean {
  const registryEntry = hass.entities?.[entityId];
  return !registryEntry?.disabled_by && !registryEntry?.hidden_by;
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

function toConfidence(score: number): EntityMappingMatch['confidence'] {
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}
