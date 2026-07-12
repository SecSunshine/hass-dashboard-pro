/**
 * Blueprint Parser
 *
 * Handles:
 *   1. Parsing blueprint YAML into BlueprintDefinition
 *   2. Placeholder substitution ($key$ → value)
 *   3. Version comparison for update checking
 *   4. Simple YAML subset parser (no external deps)
 *
 * Blueprint YAML format:
 *   meta:
 *     name: "My Page"
 *     description: "..."
 *     version: "1.0.0"
 *     type: page
 *     custom_cards: [card-mod]
 *     inputs:
 *       entity_id:
 *         name: "Entity"
 *         type: entity-picker
 *         description: "Pick a sensor"
 *         domain: sensor
 *   card:
 *     type: custom:html-pro-card
 *     content: |
 *       <div>Temperature: $entity_id$</div>
 */

import type { BlueprintDefinition, BlueprintMeta, BlueprintInput, BlueprintInputType, LovelaceCardConfig } from '../types';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue, escapeJSONAttribute, escapeLinkURLAttribute, escapeURLAttribute } from '../utils/html';

// ─── YAML Parser (Simple Subset) ────────────────────────────────────────────

/**
 * Parse a blueprint YAML string into a BlueprintDefinition.
 * Uses a simple line-by-line parser for the HA blueprint subset.
 * No external YAML library needed.
 */
export function parseBlueprintYAML(yaml: string): BlueprintDefinition {
  const lines = yaml.split('\n');
  const meta = parseMeta(lines);
  const card = parseCard(lines);

  return { meta, card };
}

export function parseCardYAML(yaml: string): LovelaceCardConfig {
  const trimmed = yaml.trim();
  if (!trimmed) return { type: '' };
  if (/^card\s*:/m.test(trimmed)) return parseBlueprintYAML(trimmed).card;
  const indented = trimmed.split('\n').map(line => line ? `  ${line}` : line).join('\n');
  return parseBlueprintYAML(`card:\n${indented}`).card;
}

/**
 * Parse the meta section of blueprint YAML.
 */
function parseMeta(lines: string[]): BlueprintMeta {
  const meta: BlueprintMeta = {
    name: 'Unnamed Blueprint',
    description: '',
    version: '1.0.0',
    type: 'page',
    inputs: {},
  };

  let inMeta = false;
  let inInputs = false;
  let currentInputKey = '';
  let currentInput: Partial<BlueprintInput> = {};

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Detect section boundaries
    if (line.match(/^meta:/)) { inMeta = true; inInputs = false; continue; }
    if (line.match(/^card:/)) { inMeta = false; inInputs = false; break; }

    if (!inMeta) continue;

    const indent = getIndent(line);

    // inputs: subsection
    if (line.trim() === 'inputs:') {
      inInputs = true;
      continue;
    }

    if (inInputs) {
      // Input key (indent level 4)
      if (indent === 4 && line.trim().endsWith(':')) {
        // Save previous input
        if (currentInputKey && currentInput.name) {
          meta.inputs[currentInputKey] = currentInput as BlueprintInput;
        }
        currentInputKey = line.trim().replace(/:$/, '');
        currentInput = { name: currentInputKey, type: 'text-field' };
        continue;
      }

      // Input properties (indent level 6+)
      if (indent >= 6 && currentInputKey) {
        const [key, val] = parseKeyValue(line.trim());
        switch (key) {
          case 'name': currentInput.name = val; break;
          case 'description': currentInput.description = val; break;
          case 'type': currentInput.type = val as BlueprintInputType; break;
          case 'default': currentInput.default = parseDefaultValue(val); break;
          case 'domain': currentInput.domain = val; break;
        }
        continue;
      }

      // End of inputs (back to meta level)
      if (indent <= 2) {
        if (currentInputKey && currentInput.name) {
          meta.inputs[currentInputKey] = currentInput as BlueprintInput;
        }
        currentInputKey = '';
        currentInput = {};
        inInputs = false;
      }
    }

    if (!inInputs) {
      const [key, val] = parseKeyValue(line.trim());
      switch (key) {
        case 'name': meta.name = val; break;
        case 'description': meta.description = val; break;
        case 'version': meta.version = val; break;
        case 'type': meta.type = val as 'page'; break;
        case 'custom_cards':
          meta.custom_cards = parseInlineArray(val);
          break;
      }
    }
  }

  // Save last input if we ended inside inputs
  if (currentInputKey && currentInput.name) {
    meta.inputs[currentInputKey] = currentInput as BlueprintInput;
  }

  return meta;
}

/**
 * Parse the card section of blueprint YAML.
 * Extracts the card config as a JSON-like object.
 */
function parseCard(lines: string[]): LovelaceCardConfig {
  let inCard = false;
  let cardIndent = -1;
  const cardLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.match(/^card:/)) {
      inCard = true;
      cardIndent = 0;
      continue;
    }

    if (!inCard) continue;

    // Remove the base card indent and collect
    cardLines.push(line);
  }

  // Parse card lines into a config object
  return parseSimpleYAMLObject(cardLines);
}

/**
 * Parse simple YAML key-value lines into an object.
 * Handles: strings, numbers, booleans, simple nested objects, and multi-line strings (|).
 */
function parseSimpleYAMLObject(lines: string[]): LovelaceCardConfig {
  const result: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = getIndent(line);
    const trimmed = line.trim();

    // Pop stack to find parent at correct indent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    // Check for multi-line string indicator
    if (trimmed.endsWith('|') || trimmed.endsWith('>')) {
      const key = trimmed.replace(/[|>]\s*$/, '').trim().replace(/:$/, '').trim();
      const isFolded = trimmed.endsWith('>');
      const blockLines: string[] = [];
      let blockIndent = -1;

      // Collect indented block
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!nextLine.trim()) { blockLines.push(''); i++; continue; }
        const nextIndent = getIndent(nextLine);
        if (blockIndent === -1) blockIndent = nextIndent;
        if (nextIndent < blockIndent) break;
        blockLines.push(nextLine.substring(blockIndent));
        i++;
      }

      parent[key] = isFolded
        ? blockLines.join(' ').replace(/\s+/g, ' ').trim()
        : blockLines.join('\n');
      continue;
    }

    const [key, val] = parseKeyValue(trimmed);
    if (!key) continue;

    if (val === '' || val === undefined) {
      // This is a nested object
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ obj: child, indent });
    } else {
      parent[key] = parseYAMLValue(val);
    }
  }

  return result as LovelaceCardConfig;
}

// ─── Placeholder Substitution ───────────────────────────────────────────────

/**
 * Replace all $key$ placeholders in a card config with input values.
 * Deep-clones the config to avoid mutating the template.
 */
export function substitutePlaceholders(
  card: LovelaceCardConfig,
  inputs: Record<string, string | number | boolean>,
): LovelaceCardConfig {
  return deepCloneAndReplace(card, inputs) as LovelaceCardConfig;
}

function deepCloneAndReplace(obj: unknown, inputs: Record<string, string | number | boolean>): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)\$/g, (_, key) => {
      return inputs[key] !== undefined ? String(inputs[key]) : `$${key}$`;
    });
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepCloneAndReplace(item, inputs));
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = deepCloneAndReplace(v, inputs);
    }
    return result;
  }
  return obj;
}

function createBlueprintScopeToken(pageName: string, content: string): string {
  const source = `${pageName}\u0000${content}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `bp-${(hash >>> 0).toString(36)}`;
}

/**
 * Convert a resolved card config to HTML for rendering.
 * If the card is an html-pro-card, return its content directly.
 * Otherwise, render as a JSON card config (for HA native cards).
 */
export function cardConfigToHTML(card: LovelaceCardConfig, pageName: string): string {
  if (card.type === 'custom:html-pro-card' && typeof card.content === 'string') {
    const scopeToken = createBlueprintScopeToken(pageName, card.content);
    const scopeSelector = `.bp-html-card[data-blueprint-scope="${scopeToken}"]`;
    return `<div class="bp-html-card" data-blueprint-card="${escapeAttribute(pageName)}" data-blueprint-scope="${scopeToken}">
      ${sanitizeHtmlProContent(card.content, scopeSelector)}
    </div>`;
  }

  // For non-html-pro cards, wrap in a container that HA can render
  return `<div class="bp-native-card" data-card-config='${escapeJSONAttribute(card)}'>
    <div class="bp-card-placeholder">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="4"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
      <span class="bp-card-type">${escapeHTML(card.type)}</span>
      <span class="bp-card-hint">此卡片需要在 Home Assistant 中渲染</span>
    </div>
  </div>
  <style>
    .bp-native-card {
      background: var(--hdp-card-bg);
      border-radius: var(--hdp-radius);
      padding: 20px;
      border: 1px solid var(--hdp-border);
    }
    .bp-card-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      color: var(--hdp-text-muted);
    }
    .bp-card-type {
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      color: var(--hdp-text-secondary);
    }
    .bp-card-hint {
      font: inherit;
      font-size: 12px;
      color: var(--hdp-text-muted);
    }
  </style>`;
}

// ─── Version Comparison ─────────────────────────────────────────────────────

const DANGEROUS_TAGS = new Set([
  'base',
  'embed',
  'form',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
]);

const ALLOWED_HTML_TAGS = new Set([
  'a',
  'article',
  'aside',
  'b',
  'br',
  'button',
  'canvas',
  'circle',
  'code',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ha-icon',
  'ha-state-icon',
  'header',
  'hr',
  'i',
  'img',
  'input',
  'li',
  'line',
  'main',
  'nav',
  'ol',
  'p',
  'path',
  'polygon',
  'polyline',
  'rect',
  'section',
  'small',
  'span',
  'state-badge',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'svg',
  'ul',
]);

const ALLOWED_ATTRS = new Set([
  'alt',
  'class',
  'cx',
  'cy',
  'd',
  'data-action',
  'data-area',
  'data-device',
  'data-domain',
  'data-entity',
  'data-view',
  'fill',
  'height',
  'href',
  'icon',
  'id',
  'max',
  'min',
  'r',
  'role',
  'rx',
  'ry',
  'src',
  'stroke',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-width',
  'step',
  'style',
  'tabindex',
  'title',
  'type',
  'value',
  'viewbox',
  'viewBox',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
]);

function sanitizeHtmlProContent(content: string, scopeSelector: string): string {
  return content
    .replace(/<\s*(script|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*style\b[^>]*>([\s\S]*?)<\s*\/\s*style\s*>/gi, (_, css) => {
      return `<style>${scopeBlueprintCSS(String(css), scopeSelector)}</style>`;
    })
    .replace(/<[^>]+>/g, tag => sanitizeTag(tag));
}

function sanitizeTag(tag: string): string {
  const match = tag.match(/^<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>$/);
  if (!match) return escapeHTML(tag);

  const [, closing, rawName, rawAttrs] = match;
  const name = rawName.toLowerCase();
  if (DANGEROUS_TAGS.has(name) || !ALLOWED_HTML_TAGS.has(name)) return escapeHTML(tag);
  if (closing) return `</${name}>`;
  if (name === 'style') return '<style>';

  const attrs = sanitizeAttributes(rawAttrs || '');
  return attrs ? `<${name} ${attrs}>` : `<${name}>`;
}

function sanitizeAttributes(rawAttrs: string): string {
  const attrs: string[] = [];
  const attrPattern = /([:@a-zA-Z_][:@a-zA-Z0-9_.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(rawAttrs)) !== null) {
    const rawName = match[1];
    const name = rawName.toLowerCase();
    if (name.startsWith('on')) continue;
    if (!isAllowedAttribute(name)) continue;

    const rawValue = match[3] ?? match[4] ?? match[5] ?? '';
    const safeValue = sanitizeAttributeValue(name, rawValue);
    if (safeValue === null) continue;
    attrs.push(`${rawName}="${safeValue}"`);
  }

  return attrs.join(' ');
}

function isAllowedAttribute(name: string): boolean {
  return ALLOWED_ATTRS.has(name) || name.startsWith('data-') || name.startsWith('aria-');
}

function sanitizeAttributeValue(name: string, value: string): string | null {
  if (name === 'tabindex') {
    const normalized = value.trim();
    return normalized === '0' || normalized === '-1' ? normalized : null;
  }
  if (name === 'href' || name === 'src') {
    const safe = name === 'href' ? escapeLinkURLAttribute(value) : escapeURLAttribute(value);
    return safe || null;
  }
  if (name === 'style') return sanitizeStyleAttribute(value);
  return escapeAttribute(value);
}

function sanitizeStyleAttribute(value: string): string {
  const safeDeclarations = value
    .split(';')
    .map(declaration => declaration.trim())
    .filter(Boolean)
    .map(declaration => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return '';

      const property = declaration.slice(0, separator).trim();
      const rawValue = declaration.slice(separator + 1).trim();
      if (!/^(?:--)?[a-zA-Z][a-zA-Z0-9-]*$/.test(property)) return '';
      if (/javascript\s*:|expression\s*\(|behavior\s*:|@import|url\s*\(/i.test(rawValue)) return '';

      const safeValue = escapeInlineStyleValue(rawValue);
      return safeValue ? `${property}: ${safeValue}` : '';
    })
    .filter(Boolean);

  return escapeAttribute(safeDeclarations.join('; '));
}

function stripCSSResourceLoads(css: string): string {
  return css
    .replace(/@font-face\s*{[^{}]*}/gi, '')
    .replace(/(^|[;{])\s*[^;{}]*:\s*[^;{}]*(?:url|(?:-webkit-)?image-set)\s*\([^;{}]*\)[^;{}]*;?/gi, '$1');
}

function scopeBlueprintCSS(css: string, scopeSelector: string): string {
  const cleaned = stripCSSResourceLoads(css)
    .replace(/@import[^;]+;?/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/<\/?style/gi, '');

  return cleaned.replace(/(^|[{}])\s*([^@{}\s][^{}]*)\{/g, (_, prefix, selectors) => {
    const scopedSelectors = String(selectors)
      .split(',')
      .map(selector => selector.trim())
      .filter(Boolean)
      .map(selector => {
        if (selector.startsWith('.bp-html-card')) return selector.replace(/^\.bp-html-card\b/, scopeSelector);
        if (/^:host\b/.test(selector)) return selector.replace(/^:host\b/, scopeSelector);
        return `${scopeSelector} ${selector}`;
      })
      .join(', ');
    return `${prefix} ${scopedSelectors} {`;
  });
}

/**
 * Compare two semver version strings.
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function parseKeyValue(line: string): [string, string] {
  const idx = line.indexOf(':');
  if (idx === -1) return ['', ''];
  const key = line.substring(0, idx).trim();
  const val = line.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
  return [key, val];
}

function parseYAMLValue(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  return val.replace(/^["']|["']$/g, '');
}

function parseDefaultValue(val: string): string | number | boolean {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}

function parseInlineArray(val: string): string[] {
  // Handle [item1, item2] format
  const trimmed = val.replace(/^\[|\]$/g, '').trim();
  if (!trimmed) return [];
  return trimmed.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
}
