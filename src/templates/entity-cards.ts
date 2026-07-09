/**
 * Domain-Specific Entity Cards (v1.0)
 *
 * Replaces the one-size-fits-all toggle card for complex device types:
 *   - Climate: temperature display, target temp controls, HVAC mode selector, fan mode
 *   - Cover: position bar, open/stop/close controls
 *   - Lock: lock/unlock action button
 *   - Media player: volume slider, playback controls
 *   - Vacuum: status display, action buttons
 *
 * All cards use data-no-toggle to prevent the default document-level toggle handler.
 * Interactive elements have their own onclick handlers calling hdp* service functions.
 */

import type { Hass, HassEntity, EntityInfo } from '../types';
import { escapeAttribute, escapeHTML } from '../utils/html';
import { cardSkinClass } from '../utils/card-skin';

// ─── CSS (shared, injected by views) ─────────────────────────────────────────

export function getDomainCardCSS(): string {
  return `
  /* ── Base card (self-contained, matches dvc/ec styles) ── */
  .dvc {
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    border-radius: var(--hdp-radius);
    padding: var(--hdp-density-entity-padding, 14px);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    min-width: 0;
  }
  .dvc:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .dvc--on { border-color: var(--hdp-primary); }
  .dvc[data-no-toggle] {
    cursor: default;
  }
  .dvc button {
    appearance: none;
    font: inherit;
  }
  .dvc-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--hdp-gradient-primary);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .dvc--on .dvc-bar { opacity: 1; }
  .dvc-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .dvc-ico {
    width: 38px; height: 38px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s ease;
  }
  .dvc-ico svg { width: 19px; height: 19px; }
  .dvc-ico--off { background: var(--hdp-divider); color: var(--hdp-text-muted); }
  .dvc-ico--on { background: var(--hdp-primary-light); color: var(--hdp-primary); }
  .dvc-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dvc-name {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dvc-state {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dvc-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dvc-dot--on { background: var(--hdp-success); }
  .dvc-dot--off { background: var(--hdp-text-muted); }

  /* ── Control Card Language ── */
  .dc-control-card {
    padding: 16px;
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    border-color: color-mix(in srgb, var(--hdp-primary) 14%, var(--hdp-border));
  }
  .dc-control-card:hover {
    transform: translateY(-1px);
  }
  .dc-control-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    min-width: 0;
  }
  .dc-control-chip {
    margin-left: auto;
    flex: 0 0 auto;
    min-width: 72px;
    max-width: 38%;
    padding: 8px 10px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-surface-muted, color-mix(in srgb, var(--hdp-card-bg) 78%, transparent));
    text-align: right;
  }
  .dc-control-chip-value {
    font: inherit;
    font-size: 23px;
    font-weight: 850;
    line-height: 1.05;
    color: var(--hdp-primary);
    overflow-wrap: anywhere;
  }
  .dc-control-chip-label {
    margin-top: 2px;
    font: inherit;
    font-size: 11px;
    line-height: 1.2;
    color: var(--hdp-text-muted);
  }
  .dc-control-section {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-surface-muted, color-mix(in srgb, var(--hdp-card-bg) 76%, transparent));
  }
  .dc-control-section + .dc-control-section,
  .dc-control-section + .dc-cover-actions,
  .dc-climate-modes + .dc-climate-fan {
    margin-top: 10px;
  }
  .dc-control-section-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    color: var(--hdp-text-muted);
  }

  /* ── Climate Card ── */
  .dc-climate {
    border-color: color-mix(in srgb, var(--hdp-info, #3B82F6) 18%, var(--hdp-border));
  }
  .dc-climate-current {
    --hdp-primary: var(--hdp-info, #3B82F6);
  }
  .dc-climate-current-val {
    color: var(--hdp-info, #3B82F6);
  }
  .dc-climate-current-label {
    color: var(--hdp-text-muted);
  }
  .dc-climate-target-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .dc-climate-temp-btn {
    appearance: none;
    width: 42px;
    height: 42px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, color-mix(in srgb, var(--hdp-card-bg) 82%, var(--hdp-primary-light, rgba(79,110,247,0.1))));
    color: var(--hdp-text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font: inherit;
    font-size: 20px;
    font-weight: 850;
    flex-shrink: 0;
    transition: all 0.15s ease;
    user-select: none;
  }
  .dc-climate-temp-btn:hover {
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light, rgba(79,110,247,0.1)));
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .dc-climate-temp-btn:active {
    transform: scale(0.92);
  }
  .dc-climate-target-val {
    font: inherit;
    font-size: 28px;
    font-weight: 850;
    color: var(--hdp-text);
    text-align: center;
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .dc-climate-modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
    gap: 6px;
  }
  .dc-climate-mode {
    appearance: none;
    justify-content: center;
    padding: 8px 10px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, color-mix(in srgb, var(--hdp-card-bg) 84%, transparent));
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 36px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-align: center;
  }
  .dc-climate-mode:hover {
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light, rgba(79,110,247,0.1)));
    border-color: var(--hdp-info, #3B82F6);
    color: var(--hdp-info, #3B82F6);
  }
  .dc-climate-mode--active {
    background: var(--hdp-info, #3B82F6);
    border-color: var(--hdp-info, #3B82F6);
    color: var(--hdp-text-inverse, white);
  }
  .dc-climate-mode--active:hover {
    color: var(--hdp-text-inverse, white);
  }
  .dc-climate-fan {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 0;
  }
  .dc-climate-fan-label {
    font: inherit;
    font-size: 11px;
    color: var(--hdp-text-muted);
    font-weight: 600;
    flex: 0 0 auto;
    margin-right: 2px;
  }
  .dc-climate-fan-btn {
    appearance: none;
    padding: 6px 10px;
    border-radius: var(--hdp-radius-sm);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, color-mix(in srgb, var(--hdp-card-bg) 84%, transparent));
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 32px;
    text-align: center;
  }
  .dc-climate-fan-btn:hover {
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light, rgba(79,110,247,0.1)));
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .dc-climate-fan-btn--active {
    background: var(--hdp-primary);
    border-color: var(--hdp-primary);
    color: var(--hdp-text-inverse, white);
  }
  .dc-climate-fan-btn--active:hover {
    color: var(--hdp-text-inverse, white);
  }

  /* ── Cover Card ── */
  .dc-cover {
    border-color: color-mix(in srgb, var(--hdp-accent, #7c6ef7) 18%, var(--hdp-border));
    background: var(--hdp-surface-card, var(--hdp-card-bg));
  }
  .dc-cover-bar-wrap {
    background: color-mix(in srgb, var(--hdp-divider, rgba(0,0,0,0.06)) 80%, transparent);
    border-radius: var(--hdp-radius-pill, 20px);
    height: 10px;
    overflow: hidden;
    position: relative;
  }
  .dc-cover-bar-fill {
    height: 100%;
    background: var(--hdp-gradient-primary);
    border-radius: var(--hdp-radius-pill, 20px);
    transition: width 0.3s ease;
  }
  .dc-cover-visual {
    position: relative;
    min-height: 74px;
    border-radius: var(--hdp-radius);
    overflow: hidden;
    border: 1px solid var(--hdp-border);
    background:
      repeating-linear-gradient(90deg, color-mix(in srgb, var(--hdp-primary-light) 42%, transparent) 0 12px, transparent 12px 24px),
      var(--hdp-surface-muted, color-mix(in srgb, var(--hdp-card-bg) 80%, var(--hdp-primary-light, rgba(79,110,247,0.1))));
  }
  .dc-cover-visual::after {
    content: '';
    position: absolute;
    inset: 10px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--hdp-primary) 18%, transparent);
    pointer-events: none;
  }
  .dc-cover-curtain {
    position: absolute;
    inset: 0 auto 0 0;
    min-width: 14px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.18), transparent),
      var(--hdp-gradient-primary);
    opacity: 0.88;
  }
  .dc-cover-percent {
    position: absolute;
    right: 12px;
    bottom: 10px;
    padding: 4px 9px;
    border-radius: 999px;
    background: var(--hdp-surface-card, color-mix(in srgb, var(--hdp-card-bg) 82%, transparent));
    color: var(--hdp-text);
    border: 1px solid var(--hdp-border);
    font: inherit;
    font-size: 12px;
    font-weight: 850;
  }
  .dc-cover-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
    min-width: 0;
  }
  .dc-cover-btn {
    padding: 9px 8px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, color-mix(in srgb, var(--hdp-card-bg) 84%, transparent));
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .dc-cover-btn:hover {
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light, rgba(79,110,247,0.1)));
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .dc-cover-btn:active {
    transform: scale(0.96);
  }
  .dc-cover-btn--primary {
    border-color: color-mix(in srgb, var(--hdp-primary) 28%, var(--hdp-border));
    color: var(--hdp-primary);
  }
  .dc-cover-btn--stop {
    border-color: color-mix(in srgb, var(--hdp-warning, #F59E0B) 26%, var(--hdp-border));
    color: var(--hdp-warning, #F59E0B);
  }
  .dc-cover-btn svg {
    width: 14px;
    height: 14px;
  }
  @media (max-width: 420px) {
    .dc-control-head {
      align-items: flex-start;
    }
    .dc-control-chip {
      min-width: 64px;
      max-width: 34%;
    }
    .dc-climate-target-val {
      font-size: 24px;
    }
    .dc-cover-actions {
      grid-template-columns: 1fr;
    }
  }

  /* ── Lock Card ── */
  .dc-lock-action {
    flex-shrink: 0;
  }
  .dc-lock-btn {
    padding: 8px 18px;
    border-radius: var(--hdp-radius-sm, 8px);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 40px;
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dc-lock-btn--locked {
    background: var(--hdp-success, #16A34A);
    color: var(--hdp-text-inverse, white);
  }
  .dc-lock-btn--locked:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }
  .dc-lock-btn--unlocked {
    background: var(--hdp-danger, #EF4444);
    color: var(--hdp-text-inverse, white);
  }
  .dc-lock-btn--unlocked:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }
  .dc-lock-btn svg {
    width: 16px;
    height: 16px;
  }

  /* ── Media Player Card ── */
  .dc-media {
    grid-column: 1 / -1;
  }
  .dc-media-volume {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
  }
  .dc-media-vol-icon {
    flex-shrink: 0;
    color: var(--hdp-text-muted);
  }
  .dc-media-vol-icon svg { width: 16px; height: 16px; }
  .dc-media-vol-slider {
    flex: 1;
    min-width: 0;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: var(--hdp-divider, rgba(0,0,0,0.08));
    outline: none;
    cursor: pointer;
  }
  .dc-media-vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--hdp-primary);
    cursor: pointer;
    border: 2px solid var(--hdp-surface-card, white);
    box-shadow: var(--hdp-shadow-card, 0 1px 4px rgba(0,0,0,0.2));
  }
  .dc-media-vol-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--hdp-primary);
    cursor: pointer;
    border: 2px solid var(--hdp-surface-card, white);
    box-shadow: var(--hdp-shadow-card, 0 1px 4px rgba(0,0,0,0.2));
  }
  .dc-media-vol-val {
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    color: var(--hdp-text-secondary);
    min-width: 32px;
    text-align: right;
    flex-shrink: 0;
  }
  .dc-media-controls {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    min-width: 0;
  }
  .dc-media-btn {
    flex: 1;
    padding: 8px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text);
    font: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dc-media-btn:hover {
    border-color: var(--hdp-primary);
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light, rgba(79,110,247,0.1)));
    color: var(--hdp-primary);
  }
  .dc-media-btn:active {
    transform: scale(0.94);
  }
  .dc-media-btn svg { width: 18px; height: 18px; }
  .dc-media-btn--play {
    background: var(--hdp-primary);
    border-color: var(--hdp-primary);
    color: var(--hdp-text-inverse, white);
  }
  .dc-media-btn--play:hover {
    color: var(--hdp-text-inverse, white);
    filter: brightness(1.08);
  }

  /* ── Vacuum Card ── */
  .dc-vacuum-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .dc-vacuum-btn {
    flex: 1;
    padding: 8px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .dc-vacuum-btn:hover {
    border-color: var(--hdp-primary);
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light, rgba(79,110,247,0.1)));
    color: var(--hdp-primary);
  }
  .dc-vacuum-btn:active {
    transform: scale(0.96);
  }
  .dc-vacuum-btn svg { width: 14px; height: 14px; }
  `;
}

// ─── Mode/Fan Label Maps ─────────────────────────────────────────────────────

const HVAC_MODE_LABELS: Record<string, string> = {
  off: '关闭',
  heat: '制热',
  cool: '制冷',
  auto: '自动',
  dry: '除湿',
  fan_only: '送风',
  unavailable: '不可用',
  unknown: '未知',
};

const FAN_MODE_LABELS: Record<string, string> = {
  auto: '自动',
  low: '低速',
  medium: '中速',
  high: '高速',
  quiet: '静音',
  'on': '开启',
};

const COVER_STATE_LABELS: Record<string, string> = {
  open: '已打开',
  closed: '已关闭',
  opening: '打开中',
  closing: '关闭中',
  stopped: '已停止',
  unavailable: '不可用',
  unknown: '未知',
};

function parseOptionalNumber(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const result = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return result.length ? result : fallback;
}

function isEntityAvailable(state: string): boolean {
  return state !== 'unavailable' && state !== 'unknown';
}

// ─── Main Entry: Build domain-specific card or return null ───────────────────

/**
 * Returns domain-specific card HTML, or null if the domain uses the default card.
 * Callers should check the return value and fall back to the default card.
 */
export function buildDomainCard(entity: EntityInfo, stateObj: HassEntity | undefined, skin?: string): string | null {
  if (!stateObj) return null;

  switch (entity.domain) {
    case 'climate':
      return buildAccessibleClimateCard(entity, stateObj, skin);
    case 'cover':
      return buildCoverCard(entity, stateObj, skin);
    case 'lock':
      return buildLockCard(entity, stateObj, skin);
    case 'media_player':
      return buildMediaPlayerCard(entity, stateObj, skin);
    case 'vacuum':
      return buildVacuumCard(entity, stateObj, skin);
    default:
      return null;
  }
}

// ─── Climate Card ─────────────────────────────────────────────────────────────

// ─── Accessible Climate Card ─────────────────────────────────────────────────

function buildAccessibleClimateCard(entity: EntityInfo, stateObj: HassEntity, skin?: string): string {
  const attrs = stateObj.attributes || {};
  const currentTemp = parseOptionalNumber(attrs.current_temperature);
  const targetTemp = parseOptionalNumber(attrs.temperature);
  const hvacModes = normalizeStringArray(attrs.hvac_modes, ['off', 'cool', 'heat', 'auto']);
  const fanModes = normalizeStringArray(attrs.fan_modes, []);
  const fanMode = typeof attrs.fan_mode === 'string' ? attrs.fan_mode : undefined;
  const currentState = stateObj.state;
  const active = isEntityAvailable(currentState) && currentState !== 'off';
  const skinCls = skin ? cardSkinClass(skin) : '';
  const step = parseOptionalNumber(attrs.target_temp_step) ?? 0.5;
  const minTemp = parseOptionalNumber(attrs.min_temp) ?? 16;
  const maxTemp = parseOptionalNumber(attrs.max_temp) ?? 30;
  const entityId = escapeAttribute(entity.entity_id);

  const currentTempHTML = currentTemp != null
    ? `<div class="dc-control-chip dc-climate-current">
        <div class="dc-control-chip-value dc-climate-current-val">${currentTemp.toFixed(1)}&deg;</div>
        <div class="dc-control-chip-label dc-climate-current-label">当前</div>
      </div>`
    : '';

  const targetTempVal = targetTemp != null ? `${targetTemp.toFixed(1)}&deg;` : '--';
  const tempUpDelta = step;
  const tempDownDelta = -step;

  const modePills = hvacModes.map(mode => {
    const label = HVAC_MODE_LABELS[mode] || mode;
    const active = currentState === mode;
    return `<button type="button" class="dc-climate-mode ${active ? 'dc-climate-mode--active' : ''}"
      data-entity="${entityId}"
      data-action="climate-mode"
      data-mode="${escapeAttribute(mode)}"
      aria-pressed="${active ? 'true' : 'false'}">${escapeHTML(label)}</button>`;
  }).join('');

  const fanPills = fanModes.length > 0
    ? `<div class="dc-control-section dc-climate-fan">
        <span class="dc-climate-fan-label">风速</span>
        ${fanModes.map(fm => {
          const label = FAN_MODE_LABELS[fm] || fm;
          const active = fanMode === fm;
          return `<button type="button" class="dc-climate-fan-btn ${active ? 'dc-climate-fan-btn--active' : ''}"
            data-entity="${entityId}"
            data-action="climate-fan"
            data-fan-mode="${escapeAttribute(fm)}"
            aria-pressed="${active ? 'true' : 'false'}">${escapeHTML(label)}</button>`;
        }).join('')}
      </div>`
    : '';

  return `<div class="dvc dc-control-card dc-climate ${skinCls}" data-entity="${entityId}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dc-control-head">
      <div class="dvc-ico ${active ? 'dvc-ico--on' : 'dvc-ico--off'}">
        ${getClimateIcon(active)}
      </div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${active ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${escapeHTML(HVAC_MODE_LABELS[currentState] || currentState)}
        </div>
      </div>
      ${currentTempHTML}
    </div>
    <div class="dc-control-section">
      <div class="dc-control-section-label"><span>目标温度</span><span>${escapeHTML(String(minTemp))}&deg; - ${escapeHTML(String(maxTemp))}&deg;</span></div>
      <div class="dc-climate-target-row">
        <button type="button" class="dc-climate-temp-btn"
          data-entity="${entityId}"
          data-action="climate-temp"
          data-step="${escapeAttribute(String(tempDownDelta))}"
          data-min-temp="${escapeAttribute(String(minTemp))}"
          data-max-temp="${escapeAttribute(String(maxTemp))}"
          aria-label="Decrease target temperature"
          >-</button>
        <div class="dc-climate-target-val">${targetTempVal}</div>
        <button type="button" class="dc-climate-temp-btn"
          data-entity="${entityId}"
          data-action="climate-temp"
          data-step="${escapeAttribute(String(tempUpDelta))}"
          data-min-temp="${escapeAttribute(String(minTemp))}"
          data-max-temp="${escapeAttribute(String(maxTemp))}"
          aria-label="Increase target temperature"
          >+</button>
      </div>
    </div>
    <div class="dc-control-section">
      <div class="dc-control-section-label"><span>运行模式</span></div>
      <div class="dc-climate-modes">${modePills}</div>
    </div>
    ${fanPills}
  </div>`;
}

// ─── Cover Card ───────────────────────────────────────────────────────────────

function buildCoverCard(entity: EntityInfo, stateObj: HassEntity, skin?: string): string {
  const attrs = stateObj.attributes || {};
  const rawPosition = Number(attrs.current_position);
  const position = Number.isFinite(rawPosition) ? Math.max(0, Math.min(100, rawPosition)) : null;
  const currentState = stateObj.state;
  const isActive = currentState === 'open' || currentState === 'opening';
  const skinCls = skin ? cardSkinClass(skin) : '';

  // Position bar: 0% = closed, 100% = open
  const barWidth = position != null ? position : (isActive ? 100 : 0);
  const stateLabel = COVER_STATE_LABELS[currentState] || currentState;
  const positionText = position != null ? `开合 ${position}%` : stateLabel;

  return `<div class="dvc dc-control-card dc-cover ${skinCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dc-control-head">
      <div class="dvc-ico ${isActive ? 'dvc-ico--on' : 'dvc-ico--off'}">${getCoverIcon(isActive)}</div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${isActive ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${escapeHTML(positionText)}
        </div>
      </div>
      <div class="dc-control-chip">
        <div class="dc-control-chip-value">${position != null ? `${position}%` : '--'}</div>
        <div class="dc-control-chip-label">${escapeHTML(stateLabel)}</div>
      </div>
    </div>
    <div class="dc-control-section">
      <div class="dc-control-section-label"><span>窗帘位置</span><span>${escapeHTML(stateLabel)}</span></div>
      <div class="dc-cover-visual" aria-hidden="true">
        <div class="dc-cover-curtain" style="width: ${barWidth}%"></div>
        <div class="dc-cover-percent">${barWidth}%</div>
      </div>
      <div class="dc-cover-bar-wrap">
        <div class="dc-cover-bar-fill" style="width: ${barWidth}%"></div>
      </div>
    </div>
    <div class="dc-cover-actions">
      <button type="button" class="dc-cover-btn dc-cover-btn--primary" data-entity="${escapeAttribute(entity.entity_id)}" data-action="cover-open" aria-label="打开 ${escapeAttribute(entity.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
        打开
      </button>
      <button type="button" class="dc-cover-btn dc-cover-btn--stop" data-entity="${escapeAttribute(entity.entity_id)}" data-action="cover-stop" aria-label="停止 ${escapeAttribute(entity.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        停止
      </button>
      <button type="button" class="dc-cover-btn" data-entity="${escapeAttribute(entity.entity_id)}" data-action="cover-close" aria-label="关闭 ${escapeAttribute(entity.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        关闭
      </button>
    </div>
  </div>`;
}

// ─── Lock Card ────────────────────────────────────────────────────────────────

function buildLockCard(entity: EntityInfo, stateObj: HassEntity, skin?: string): string {
  const currentState = stateObj.state;
  const isLocked = currentState === 'locked';
  const skinCls = skin ? cardSkinClass(skin) : '';

  const btnCls = isLocked ? 'dc-lock-btn dc-lock-btn--locked' : 'dc-lock-btn dc-lock-btn--unlocked';
  const btnLabel = isLocked ? '已锁' : '已解锁';
  const btnAction = isLocked ? 'unlock' : 'lock';
  const btnIcon = isLocked
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

  return `<div class="dvc ${skinCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dvc-row">
      <div class="dvc-ico ${!isLocked ? 'dvc-ico--on' : 'dvc-ico--off'}">${getLockIcon(isLocked)}</div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${!isLocked ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${isLocked ? '已锁' : '已开锁'}
        </div>
      </div>
      <div class="dc-lock-action">
        <button type="button" class="${btnCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-action="lock-${btnAction}">
          ${btnIcon}
          ${btnLabel}
        </button>
      </div>
    </div>
  </div>`;
}

// ─── Media Player Card ────────────────────────────────────────────────────────

function buildMediaPlayerCard(entity: EntityInfo, stateObj: HassEntity, skin?: string): string {
  const attrs = stateObj.attributes || {};
  const currentState = stateObj.state;
  const isPlaying = currentState === 'playing';
  const isActive = currentState !== 'off' && currentState !== 'standby';
  const volumeLevel = (attrs.volume_level as number) ?? 0;
  const volumePct = Math.round(volumeLevel * 100);
  const mediaTitle = (attrs.media_title as string) || '';
  const mediaArtist = (attrs.media_artist as string) || '';
  const skinCls = skin ? cardSkinClass(skin) : '';

  const playPauseIcon = isPlaying
    ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

  const mediaInfo = mediaTitle
    ? `<div class="dvc-state">${escapeHTML(mediaArtist ? mediaArtist + ' - ' : '')}${escapeHTML(mediaTitle)}</div>`
    : `<div class="dvc-state">${isPlaying ? '正在播放' : isActive ? '已暂停' : '关闭'}</div>`;

  return `<div class="dvc dc-media ${skinCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dvc-row">
      <div class="dvc-ico ${isActive ? 'dvc-ico--on' : 'dvc-ico--off'}">${getMediaIcon(isActive)}</div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        ${mediaInfo}
      </div>
    </div>
    ${isActive ? `
    <div class="dc-media-volume">
      <div class="dc-media-vol-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </div>
      <input type="range" class="dc-media-vol-slider" min="0" max="100" value="${volumePct}"
        data-entity="${escapeAttribute(entity.entity_id)}" data-action="media-volume" />
      <span class="dc-media-vol-val">${volumePct}%</span>
    </div>
    <div class="dc-media-controls">
      <button type="button" class="dc-media-btn" data-entity="${escapeAttribute(entity.entity_id)}" data-action="media-previous">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button type="button" class="dc-media-btn dc-media-btn--play" data-entity="${escapeAttribute(entity.entity_id)}" data-action="media-play-pause">
        ${playPauseIcon}
      </button>
      <button type="button" class="dc-media-btn" data-entity="${escapeAttribute(entity.entity_id)}" data-action="media-next">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zm-9.5 6l8.5-6v12z"/></svg>
      </button>
    </div>
    ` : ''}
  </div>`;
}

// ─── Vacuum Card ──────────────────────────────────────────────────────────────

function buildVacuumCard(entity: EntityInfo, stateObj: HassEntity, skin?: string): string {
  const currentState = stateObj.state;
  const isActive = currentState === 'cleaning' || currentState === 'returning';
  const skinCls = skin ? cardSkinClass(skin) : '';

  const stateLabels: Record<string, string> = {
    cleaning: '清扫中',
    docked: '已回充',
    returning: '回充中',
    idle: '待机',
    paused: '已暂停',
    error: '错误',
    off: '关闭',
  };
  const stateLabel = stateLabels[currentState] || currentState;

  return `<div class="dvc ${skinCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dvc-row">
      <div class="dvc-ico ${isActive ? 'dvc-ico--on' : 'dvc-ico--off'}">${getVacuumIcon(isActive)}</div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${isActive ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${escapeHTML(stateLabel)}
        </div>
      </div>
    </div>
    <div class="dc-vacuum-actions">
      <button type="button" class="dc-vacuum-btn" data-entity="${escapeAttribute(entity.entity_id)}" data-action="vacuum-start">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        开始
      </button>
      <button type="button" class="dc-vacuum-btn" data-entity="${escapeAttribute(entity.entity_id)}" data-action="vacuum-pause">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
        暂停
      </button>
      <button type="button" class="dc-vacuum-btn" data-entity="${escapeAttribute(entity.entity_id)}" data-action="vacuum-dock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        回充
      </button>
    </div>
  </div>`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const c = 'currentColor';

function getClimateIcon(active: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"${active ? '' : ' opacity="0.5"'}/><circle cx="12" cy="17" r="1.5" fill="${c}"${active ? '' : ' opacity="0.3"'}/></svg>`;
}

function getCoverIcon(active: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9" opacity="0.5"/><line x1="3" y1="15" x2="21" y2="15" opacity="0.3"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
}

function getLockIcon(locked: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/>${locked ? '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' : '<path d="M7 11V7a5 5 0 0 1 9.9-1"/>'}<circle cx="12" cy="16" r="1" fill="${c}"/></svg>`;
}

function getMediaIcon(active: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="${c}"${active ? '' : ' opacity="0.5"'}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
}

function getVacuumIcon(active: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"${active ? ` fill="${c}" opacity="0.3"` : ''}/></svg>`;
}
