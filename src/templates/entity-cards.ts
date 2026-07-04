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

function jsArg(value: unknown): string {
  return escapeAttribute(JSON.stringify(String(value ?? '')));
}

// ─── CSS (shared, injected by views) ─────────────────────────────────────────

export function getDomainCardCSS(): string {
  return `
  /* ── Base card (self-contained, matches dvc/ec styles) ── */
  .dvc {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-density-entity-padding, 14px);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  .dvc:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  .dvc--on { border-color: var(--hdp-primary); }
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
  }
  .dvc-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dvc-dot--on { background: var(--hdp-success); }
  .dvc-dot--off { background: var(--hdp-text-muted); }

  /* ── Climate Card ── */
  .dc-climate {
    grid-column: 1 / -1;
    padding: var(--hdp-density-entity-padding, 14px);
  }
  .dc-climate-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .dc-climate-current {
    margin-left: auto;
    text-align: right;
    flex-shrink: 0;
  }
  .dc-climate-current-val {
    font: inherit;
    font-size: 28px;
    font-weight: 800;
    color: var(--hdp-info, #3B82F6);
    line-height: 1.1;
  }
  .dc-climate-current-label {
    font: inherit;
    font-size: 10px;
    color: var(--hdp-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .dc-climate-target-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--hdp-divider, rgba(0,0,0,0.03));
    border-radius: var(--hdp-radius-sm, 8px);
    padding: 8px 12px;
    margin-bottom: 12px;
  }
  .dc-climate-target-label {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
    flex-shrink: 0;
  }
  .dc-climate-temp-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font: inherit;
    font-size: 18px;
    font-weight: 700;
    flex-shrink: 0;
    transition: all 0.15s ease;
    user-select: none;
  }
  .dc-climate-temp-btn:hover {
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .dc-climate-temp-btn:active {
    transform: scale(0.92);
  }
  .dc-climate-target-val {
    font: inherit;
    font-size: 22px;
    font-weight: 800;
    color: var(--hdp-text);
    text-align: center;
    flex: 1;
  }
  .dc-climate-modes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .dc-climate-mode {
    padding: 7px 14px;
    border-radius: var(--hdp-radius-pill, 20px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .dc-climate-mode:hover {
    border-color: var(--hdp-info, #3B82F6);
    color: var(--hdp-info, #3B82F6);
  }
  .dc-climate-mode--active {
    background: var(--hdp-info, #3B82F6);
    border-color: var(--hdp-info, #3B82F6);
    color: white;
  }
  .dc-climate-mode--active:hover {
    color: white;
  }
  .dc-climate-fan {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .dc-climate-fan-label {
    font: inherit;
    font-size: 11px;
    color: var(--hdp-text-muted);
    font-weight: 600;
    margin-right: 2px;
  }
  .dc-climate-fan-btn {
    padding: 4px 10px;
    border-radius: var(--hdp-radius-pill, 20px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 28px;
  }
  .dc-climate-fan-btn:hover {
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .dc-climate-fan-btn--active {
    background: var(--hdp-primary);
    border-color: var(--hdp-primary);
    color: white;
  }
  .dc-climate-fan-btn--active:hover {
    color: white;
  }

  /* ── Cover Card ── */
  .dc-cover {
    grid-column: 1 / -1;
  }
  .dc-cover-bar-wrap {
    background: var(--hdp-divider, rgba(0,0,0,0.06));
    border-radius: var(--hdp-radius-pill, 20px);
    height: 8px;
    overflow: hidden;
    margin: 10px 0;
    position: relative;
  }
  .dc-cover-bar-fill {
    height: 100%;
    background: var(--hdp-gradient-primary);
    border-radius: var(--hdp-radius-pill, 20px);
    transition: width 0.3s ease;
  }
  .dc-cover-actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  .dc-cover-btn {
    flex: 1;
    padding: 8px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
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
  .dc-cover-btn:hover {
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .dc-cover-btn:active {
    transform: scale(0.96);
  }
  .dc-cover-btn svg {
    width: 14px;
    height: 14px;
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
    border: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dc-lock-btn--locked {
    background: var(--hdp-success, #16A34A);
    color: white;
  }
  .dc-lock-btn--locked:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }
  .dc-lock-btn--unlocked {
    background: var(--hdp-danger, #EF4444);
    color: white;
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
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .dc-media-vol-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--hdp-primary);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
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
  }
  .dc-media-btn {
    flex: 1;
    padding: 8px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
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
    color: var(--hdp-primary);
  }
  .dc-media-btn:active {
    transform: scale(0.94);
  }
  .dc-media-btn svg { width: 18px; height: 18px; }
  .dc-media-btn--play {
    background: var(--hdp-primary);
    border-color: var(--hdp-primary);
    color: white;
  }
  .dc-media-btn--play:hover {
    color: white;
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
    background: var(--hdp-card-bg);
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
};

const FAN_MODE_LABELS: Record<string, string> = {
  auto: '自动',
  low: '低速',
  medium: '中速',
  high: '高速',
  quiet: '静音',
  'on': '开启',
};

// ─── Main Entry: Build domain-specific card or return null ───────────────────

/**
 * Returns domain-specific card HTML, or null if the domain uses the default card.
 * Callers should check the return value and fall back to the default card.
 */
export function buildDomainCard(entity: EntityInfo, stateObj: HassEntity | undefined, skin?: string): string | null {
  if (!stateObj) return null;

  switch (entity.domain) {
    case 'climate':
      return buildClimateCard(entity, stateObj, skin);
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

function buildClimateCard(entity: EntityInfo, stateObj: HassEntity, skin?: string): string {
  const attrs = stateObj.attributes || {};
  const currentTemp = attrs.current_temperature as number | undefined;
  const targetTemp = attrs.temperature as number | undefined;
  const hvacModes = (attrs.hvac_modes as string[]) || ['off', 'cool', 'heat', 'auto'];
  const fanModes = (attrs.fan_modes as string[]) || [];
  const fanMode = attrs.fan_mode as string | undefined;
  const currentState = stateObj.state;
  const skinCls = skin ? cardSkinClass(skin) : '';
  const step = (attrs.target_temp_step as number) || 0.5;
  const minTemp = (attrs.min_temp as number) || 16;
  const maxTemp = (attrs.max_temp as number) || 30;

  // Top row: icon + name + current temp
  const currentTempHTML = currentTemp != null
    ? `<div class="dc-climate-current">
        <div class="dc-climate-current-val">${currentTemp.toFixed(1)}°</div>
        <div class="dc-climate-current-label">当前温度</div>
      </div>`
    : '';

  // Target temp row
  const targetTempVal = targetTemp != null ? `${targetTemp.toFixed(1)}°` : '--';
  const tempUpDelta = step;
  const tempDownDelta = -step;

  // Mode pills
  const modePills = hvacModes.map(mode => {
    const label = HVAC_MODE_LABELS[mode] || mode;
    const active = currentState === mode;
    return `<div class="dc-climate-mode ${active ? 'dc-climate-mode--active' : ''}"
      data-action="climate-mode" onclick="hdpSetClimateMode(${jsArg(entity.entity_id)}, ${jsArg(mode)})">${escapeHTML(label)}</div>`;
  }).join('');

  // Fan mode pills (only if fan modes available)
  const fanPills = fanModes.length > 0
    ? `<div class="dc-climate-fan">
        <span class="dc-climate-fan-label">风速</span>
        ${fanModes.map(fm => {
          const label = FAN_MODE_LABELS[fm] || fm;
          const active = fanMode === fm;
          return `<div class="dc-climate-fan-btn ${active ? 'dc-climate-fan-btn--active' : ''}"
            data-action="climate-fan" onclick="hdpSetClimateFanMode(${jsArg(entity.entity_id)}, ${jsArg(fm)})">${escapeHTML(label)}</div>`;
        }).join('')}
      </div>`
    : '';

  return `<div class="dvc dc-climate ${skinCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dc-climate-top">
      <div class="dvc-ico ${currentState !== 'off' ? 'dvc-ico--on' : 'dvc-ico--off'}">
        ${getClimateIcon(currentState !== 'off')}
      </div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${currentState !== 'off' ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${escapeHTML(HVAC_MODE_LABELS[currentState] || currentState)}
        </div>
      </div>
      ${currentTempHTML}
    </div>
    <div class="dc-climate-target-row">
      <span class="dc-climate-target-label">目标温度</span>
      <div class="dc-climate-temp-btn"
        data-action="climate-temp" onclick="hdpSetClimateTemp(${jsArg(entity.entity_id)}, ${tempDownDelta}, ${minTemp}, ${maxTemp})">−</div>
      <div class="dc-climate-target-val">${escapeHTML(targetTempVal)}</div>
      <div class="dc-climate-temp-btn"
        data-action="climate-temp" onclick="hdpSetClimateTemp(${jsArg(entity.entity_id)}, ${tempUpDelta}, ${minTemp}, ${maxTemp})">+</div>
    </div>
    <div class="dc-climate-modes">${modePills}</div>
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
  const positionText = position != null ? `${position}%` : (isActive ? '开启' : '关闭');

  return `<div class="dvc dc-cover ${skinCls}" data-entity="${escapeAttribute(entity.entity_id)}" data-no-toggle>
    <div class="dvc-bar"></div>
    <div class="dvc-row">
      <div class="dvc-ico ${isActive ? 'dvc-ico--on' : 'dvc-ico--off'}">${getCoverIcon(isActive)}</div>
      <div class="dvc-info">
        <div class="dvc-name">${escapeHTML(entity.name)}</div>
        <div class="dvc-state">
          <span class="dvc-dot ${isActive ? 'dvc-dot--on' : 'dvc-dot--off'}"></span>
          ${escapeHTML(positionText)}
        </div>
      </div>
    </div>
    <div class="dc-cover-bar-wrap">
      <div class="dc-cover-bar-fill" style="width: ${barWidth}%"></div>
    </div>
    <div class="dc-cover-actions">
      <button class="dc-cover-btn" data-action="cover-open" onclick="hdpCoverAction(${jsArg(entity.entity_id)}, 'open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
        打开
      </button>
      <button class="dc-cover-btn" data-action="cover-stop" onclick="hdpCoverAction(${jsArg(entity.entity_id)}, 'stop')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        停止
      </button>
      <button class="dc-cover-btn" data-action="cover-close" onclick="hdpCoverAction(${jsArg(entity.entity_id)}, 'close')">
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
        <button class="${btnCls}" data-action="lock-${btnAction}" onclick="hdpLockAction(${jsArg(entity.entity_id)}, ${jsArg(btnAction)})">
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
        data-action="media-volume" oninput="hdpSetMediaVolume(${jsArg(entity.entity_id)}, this.value / 100)" />
      <span class="dc-media-vol-val">${volumePct}%</span>
    </div>
    <div class="dc-media-controls">
      <button class="dc-media-btn" data-action="media-previous" onclick="hdpMediaAction(${jsArg(entity.entity_id)}, 'previous')">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button class="dc-media-btn dc-media-btn--play" data-action="media-play-pause" onclick="hdpMediaAction(${jsArg(entity.entity_id)}, 'play_pause')">
        ${playPauseIcon}
      </button>
      <button class="dc-media-btn" data-action="media-next" onclick="hdpMediaAction(${jsArg(entity.entity_id)}, 'next')">
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
      <button class="dc-vacuum-btn" data-action="vacuum-start" onclick="hdpVacuumAction(${jsArg(entity.entity_id)}, 'start')">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        开始
      </button>
      <button class="dc-vacuum-btn" data-action="vacuum-pause" onclick="hdpVacuumAction(${jsArg(entity.entity_id)}, 'pause')">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
        暂停
      </button>
      <button class="dc-vacuum-btn" data-action="vacuum-dock" onclick="hdpVacuumAction(${jsArg(entity.entity_id)}, 'dock')">
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
