/**
 * Settings Sections (v4.0)
 *
 * Expanded settings panel with 12 sections:
 *   1. Dashboard — name, icon
 *   2. Home — section order, hidden sections
 *   3. Header — time, weather, notifications toggles
 *   4. People — hidden persons
 *   5. Areas — hidden areas, ordering, unavailable toggle
 *   6. Devices — hidden domains, device types
 *   7. Blueprints — gallery + import
 *   8. Visual — (existing visual settings from settings-view.ts)
 *   9. Theme Files — JSON theme switching
 *   10. Permissions — admin/restrict toggles
 *   11. About — version, links
 *   12. Reset — reset config, export/import
 *
 * All sections generate HTML strings for embedding in the layout card.
 * Settings are staged in hdpSettingsDraft and saved only from hdpCommitSettings().
 */

import type { Hass, StrategyConfig, BlueprintInstance, HomeLayoutPreset, HomeSectionKey } from '../types';
import { HIDDEN_DOMAINS, HOME_SECTION_LABELS } from '../types';
import { buildBlueprintGalleryHTML } from '../blueprints/blueprint-gallery';
import { buildDashboardDesignPlan, buildPlanAlternatives, type DashboardDesignPlan } from '../utils/design-plan';
import { escapeAttribute, escapeHTML } from '../utils/html';
import { getEntityDeviceType } from '../utils/area-entities';
import {
  getConfiguredHiddenAreas,
  getConfiguredAreaOrder,
  getConfiguredHiddenDeviceTypes,
  getConfiguredHiddenDomains,
  getConfiguredHiddenKeywords,
  getConfiguredHiddenPersons,
  getConfiguredVisibleKeywords,
  resolveEntityAreaId,
  UNASSIGNED_AREA_ID,
  UNASSIGNED_AREA_NAME,
} from '../utils/dashboard-model';

function jsArg(value: unknown): string {
  return escapeAttribute(JSON.stringify(String(value ?? '')));
}

function jsValue(value: unknown): string {
  return escapeAttribute(JSON.stringify(value ?? null));
}

function isVisibleRegistryEntity(hass: Hass | undefined, entityId: string): boolean {
  const registryEntry = hass?.entities?.[entityId];
  return !registryEntry?.disabled_by && !registryEntry?.hidden_by;
}

// ─── Section Container ──────────────────────────────────────────────────────

function sectionCard(id: string, title: string, icon: string, content: string): string {
  return `<div class="st-section" id="st-${id}" data-component="settings-${id}">
    <div class="st-section-hdr" data-action="toggle-section" data-section="st-${id}" role="button" aria-expanded="false" tabindex="0" onclick="hdpToggleSection('st-${id}')" onkeydown="if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); this.click(); }">
      <div class="st-section-icon">${icon}</div>
      <span class="st-section-title">${title}</span>
      <svg class="st-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="st-section-body" id="st-${id}-body">
      ${content}
    </div>
  </div>`;
}

// ─── Shared CSS (injected once) ─────────────────────────────────────────────

export function getSettingsSectionsCSS(): string {
  return `
  .st-section {
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    overflow: hidden;
    margin-bottom: 12px;
    width: 100%;
    min-width: 0;
  }
  .st-section,
  .st-section * {
    box-sizing: border-box;
  }
  .st-section button {
    appearance: none;
    font: inherit;
  }
  .st-section button,
  .st-section input,
  .st-section select,
  .st-section textarea {
    font: inherit;
    max-width: 100%;
  }
  .st-section a.st-btn {
    text-decoration: none;
  }
  .st-section svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    max-width: 100%;
  }
  .st-section-hdr {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    cursor: pointer;
    transition: background 0.15s ease;
    min-height: 44px;
  }
  .st-section-hdr:hover {
    background: var(--hdp-divider, rgba(0,0,0,0.03));
  }
  .st-section-icon {
    width: 32px; height: 32px;
    border-radius: var(--hdp-radius-sm, 8px);
    display: flex; align-items: center; justify-content: center;
    background: var(--hdp-primary-light, rgba(79,110,247,0.08));
    color: var(--hdp-primary);
    flex-shrink: 0;
  }
  .st-section-icon svg { width: 16px; height: 16px; }
  .st-section-title {
    flex: 1;
    min-width: 0;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: var(--hdp-text);
    overflow-wrap: anywhere;
  }
  .st-chevron {
    width: 18px; height: 18px;
    color: var(--hdp-text-muted);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .st-section--open .st-chevron {
    transform: rotate(180deg);
  }
  .st-section-body {
    display: none;
    padding: 0 18px 18px 18px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }
  .st-section-body > * {
    max-width: 100%;
    min-width: 0;
  }
  .st-section--open .st-section-body {
    display: block;
  }
  .st-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--hdp-divider, rgba(0,0,0,0.04));
    min-height: 44px;
    min-width: 0;
  }
  .st-row > div {
    min-width: 0;
    flex: 1 1 auto;
  }
  .st-row > :not(:first-child) {
    flex: 0 1 auto;
    min-width: 0;
  }
  .st-row > .st-input {
    flex: 0 1 min(240px, 45vw);
  }
  .st-row > .st-toggle {
    flex: 0 0 44px;
  }
  .st-row:last-child { border-bottom: none; }
  .st-row--spaced {
    margin-top: 12px;
  }
  .st-row-label {
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--hdp-text);
    overflow-wrap: anywhere;
  }
  .st-row-desc {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-muted);
    margin-top: 2px;
    overflow-wrap: anywhere;
  }
  .st-input {
    font: inherit;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-bg);
    color: var(--hdp-text);
    outline: none;
    min-width: 140px;
    max-width: 240px;
    min-height: 36px;
    width: min(240px, 45vw);
  }
  .st-input--wide {
    width: min(420px, 52vw);
    max-width: 420px;
  }
  .st-input:focus {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.12));
  }
  .st-input::placeholder {
    color: var(--hdp-text-muted);
    opacity: 0.82;
  }
  .st-textarea {
    display: block;
    min-height: 76px;
    resize: vertical;
    line-height: 1.4;
  }
  .st-toggle {
    width: 44px; height: 24px;
    border-radius: 12px;
    display: flex; align-items: center;
    padding: 2px;
    transition: background 0.2s ease;
    cursor: pointer;
    flex-shrink: 0;
  }
  .st-toggle--on { background: var(--hdp-primary); justify-content: flex-end; }
  .st-toggle--off { background: var(--hdp-divider, #ddd); justify-content: flex-start; }
  .st-toggle-knob {
    width: 20px; height: 20px;
    border-radius: 50%;
    background: var(--hdp-surface-card, white);
    box-shadow: var(--hdp-shadow-card, 0 1px 3px rgba(0,0,0,0.15));
  }
  .st-chip-list {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
    margin-top: 8px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: visible;
  }
  .st-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: 0 1 auto;
    padding: 5px 12px;
    border-radius: var(--hdp-radius-pill, 20px);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    color: var(--hdp-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 32px;
    min-width: 0;
    max-width: min(220px, 100%);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    appearance: none;
  }
  .st-chip--active {
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .st-chip:hover {
    background: var(--hdp-surface-raised, var(--hdp-card-bg));
    transform: translateY(-1px);
  }
  .st-chip:focus-visible,
  .st-btn:focus-visible,
  .st-toggle:focus-visible,
  .st-section-hdr:focus-visible,
  .st-layout-choice:focus-visible,
  .st-plan-choice:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
  }
  .st-chip[disabled],
  .st-chip[data-saving="true"] {
    cursor: progress;
    opacity: 0.72;
    pointer-events: none;
  }
  .st-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--hdp-radius-sm, 8px);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
    min-width: 0;
    max-width: 100%;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    color: var(--hdp-text);
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
  }
  .st-btn:hover {
    transform: translateY(-2px);
    border-color: var(--hdp-primary);
    background: var(--hdp-surface-raised, var(--hdp-card-bg));
  }
  .st-action-row,
  .st-link-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    min-width: 0;
  }
  .st-action-row .st-btn,
  .st-link-row .st-btn {
    flex: 1 1 120px;
    min-width: 0;
  }
  .st-settings-actions {
    position: sticky;
    top: 8px;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    margin-bottom: 12px;
    border-radius: var(--hdp-radius, 14px);
    background: color-mix(in srgb, var(--hdp-card-bg) 88%, transparent);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .st-settings-actions,
  .st-settings-actions * {
    box-sizing: border-box;
  }
  .st-settings-actions-text {
    flex: 1 1 auto;
    min-width: 0;
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-muted);
    overflow-wrap: anywhere;
  }
  .st-settings-actions-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
  }
  .st-settings-actions-buttons .st-btn {
    justify-content: center;
    text-align: center;
  }
  .st-settings-actions-buttons .st-btn:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
  }
  .st-keyword-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    margin-top: 10px;
    min-width: 0;
  }
  .st-keyword-field {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--hdp-border);
    border-radius: var(--hdp-radius-sm, 8px);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
  }
  .st-keyword-field .st-input,
  .st-keyword-field .st-textarea {
    width: 100%;
    max-width: none;
    margin-top: 8px;
  }
  .st-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-top: 10px;
    min-width: 0;
  }
  .st-layout-choice {
    appearance: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    min-height: 84px;
    padding: 12px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    color: var(--hdp-text);
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .st-layout-choice:hover {
    transform: translateY(-1px);
    border-color: var(--hdp-primary);
    background: var(--hdp-surface-raised, var(--hdp-card-bg));
  }
  .st-layout-choice--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.12));
  }
  .st-layout-choice-name {
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    color: var(--hdp-text);
  }
  .st-layout-choice-desc {
    font: inherit;
    font-size: 11px;
    color: var(--hdp-text-muted);
    line-height: 1.35;
  }
  .st-btn--primary {
    background: var(--hdp-primary);
    color: var(--hdp-text-inverse, #fff);
    border-color: var(--hdp-primary);
  }
  .st-btn--primary:hover {
    background: var(--hdp-primary);
  }
  .st-btn--danger {
    color: var(--hdp-danger, #EF4444);
    border-color: var(--hdp-danger, #EF4444);
  }
  .st-btn--danger:hover {
    background: var(--hdp-danger-light, rgba(239,68,68,0.1));
  }
  .st-about-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font: inherit;
    font-size: 13px;
    color: var(--hdp-text-secondary);
    gap: 12px;
    min-width: 0;
  }
  .st-about-val {
    font-weight: 600;
    color: var(--hdp-text);
    text-align: right;
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .st-about-row > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .st-section-subtitle {
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--hdp-text-muted);
    margin: 16px 0 8px 0;
  }
  .st-plan-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 220px);
    gap: 14px;
    align-items: center;
    padding: 14px;
    border-radius: var(--hdp-radius, 14px);
    background: var(--hdp-primary-light, rgba(79,110,247,0.08));
    border: 1px solid var(--hdp-border);
  }
  .st-plan-hero > div {
    min-width: 0;
  }
  .st-plan-hero > .st-btn {
    justify-self: end;
    text-align: center;
    min-width: 0;
  }
  .st-plan-title {
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    color: var(--hdp-text);
    margin-bottom: 4px;
  }
  .st-plan-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .st-plan-pill {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 3px 9px;
    border-radius: var(--hdp-radius-pill, 20px);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    border: 1px solid var(--hdp-border);
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .st-plan-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    gap: 8px;
    margin-top: 12px;
  }
  .st-plan-choice {
    appearance: none;
    display: flex;
    flex-direction: column;
    min-height: 92px;
    min-width: 0;
    text-align: left;
    border-radius: var(--hdp-radius, 14px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    font: inherit;
    overflow: hidden;
  }
  .st-plan-choice:hover {
    transform: translateY(-2px);
    border-color: var(--hdp-primary);
    background: var(--hdp-surface-raised, var(--hdp-card-bg));
  }
  .st-plan-choice--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.12));
  }
  .st-plan-swatch {
    height: 28px;
    border-radius: 8px;
    margin-bottom: 8px;
    border: 1px solid var(--hdp-border);
  }
  .st-plan-choice-name {
    font-size: 12px;
    font-weight: 800;
    color: var(--hdp-text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .st-plan-choice-desc {
    font-size: 10px;
    color: var(--hdp-text-muted);
    margin-top: 2px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .st-plan-reasons {
    margin-top: 12px;
    display: grid;
    gap: 6px;
  }
  .st-plan-reason {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
  }
  @media (max-width: 720px) {
    .st-plan-hero { grid-template-columns: 1fr; }
    .st-plan-hero > .st-btn {
      justify-self: stretch;
      width: 100%;
    }
    .st-plan-grid { grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); }
    .st-row {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .st-input {
      width: 100%;
      max-width: none;
      flex: 1 1 180px;
    }
    .st-input--wide {
      width: 100%;
      max-width: none;
    }
    .st-btn {
      justify-content: center;
    }
    .st-settings-actions {
      align-items: stretch;
      flex-direction: column;
    }
    .st-settings-actions-buttons {
      width: 100%;
    }
    .st-settings-actions-buttons .st-btn {
      flex: 1 1 120px;
    }
    .st-row > :not(:first-child) {
      flex-basis: 100%;
    }
    .st-row > .st-toggle {
      flex: 0 0 44px;
    }
  }
  @media (max-width: 420px) {
    .st-plan-grid { grid-template-columns: 1fr; }
  }
  `;
}

// ─── Client-Side JS ─────────────────────────────────────────────────────────

export function generateSettingsSectionsJS(): string {
  return `
// ─── Settings Sections JS ────────────────────────────────────────────────

window.hdpToggleSection = function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.toggle('st-section--open');
    var hdr = el.querySelector('.st-section-hdr');
    if (hdr) hdr.setAttribute('aria-expanded', el.classList.contains('st-section--open') ? 'true' : 'false');
  }
};

function hdpLoadRawSettingsConfig() {
  var initial = hdpCloneConfig(window.hdpInitialSettingsConfig || {});
  try {
    var raw = localStorage.getItem('hdp_config');
    if (!raw) return initial;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return initial;
    var hasInitial = Object.keys(initial).length > 0;
    var pendingSync = localStorage.getItem('hdp_config_pending_sync') === 'true';
    if (hasInitial && !pendingSync) return initial;
    if (!hasInitial) return parsed;
    var merged = typeof hdpDeepMerge === 'function' ? hdpDeepMerge(initial, parsed) : parsed;
    if (initial.permissions) merged.permissions = hdpCloneConfig(initial.permissions);
    return merged;
  } catch(e) {
    return initial;
  }
}

function hdpCloneConfig(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch(e) {
    return {};
  }
}

window.hdpSettingsDraft = hdpCloneConfig(hdpLoadRawSettingsConfig());
window.hdpSettingsDirty = false;

window.hdpGetSettingsDraft = function() {
  if (!window.hdpSettingsDraft || typeof window.hdpSettingsDraft !== 'object' || Array.isArray(window.hdpSettingsDraft)) {
    window.hdpSettingsDraft = hdpCloneConfig(hdpLoadRawSettingsConfig());
  }
  return window.hdpSettingsDraft;
};

function hdpSetDraftPath(path, value) {
  var parts = path.split('.');
  var current = window.hdpGetSettingsDraft();
  for (var i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object' || Array.isArray(current[parts[i]])) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  hdpMarkSettingsDirty();
  return window.hdpGetSettingsDraft();
}

function hdpGetDraftArray(path) {
  var parts = path.split('.');
  var current = window.hdpGetSettingsDraft();
  for (var i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object' || Array.isArray(current[parts[i]])) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  var key = parts[parts.length - 1];
  if (!Array.isArray(current[key])) current[key] = [];
  return current[key];
}

function hdpGetDraftPathValue(path) {
  var parts = String(path || '').split('.');
  var current = window.hdpGetSettingsDraft();
  for (var i = 0; i < parts.length; i++) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[parts[i]];
  }
  return current;
}

function hdpSyncSettingsControlsFromDraft() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  var controls = document.querySelectorAll('[data-setting]');
  for (var i = 0; i < controls.length; i++) {
    var control = controls[i];
    if (!control || !control.getAttribute) continue;
    var path = control.getAttribute('data-setting');
    if (!path) continue;
    var value = hdpGetDraftPathValue(path);
    var item = control.getAttribute('data-value');
    if (item != null && control.classList) {
      var active = Array.isArray(value) && value.indexOf(item) >= 0;
      control.classList.toggle('st-chip--active', active);
      control.setAttribute('aria-pressed', active ? 'true' : 'false');
      continue;
    }
    if (control.getAttribute('role') === 'switch' && control.classList) {
      var on = value === true;
      control.classList.toggle('st-toggle--on', on);
      control.classList.toggle('st-toggle--off', !on);
      control.setAttribute('aria-checked', on ? 'true' : 'false');
      continue;
    }
    if ('value' in control) {
      control.value = Array.isArray(value) ? value.join(', ') : (value == null ? '' : String(value));
    }
  }
  var layoutPreset = hdpGetDraftPathValue('home.layout_preset') || 'grid';
  var layoutButtons = document.querySelectorAll('[data-layout-preset]');
  for (var j = 0; j < layoutButtons.length; j++) {
    var button = layoutButtons[j];
    if (!button || !button.getAttribute || !button.classList) continue;
    var selected = button.getAttribute('data-layout-preset') === layoutPreset;
    button.classList.toggle('st-layout-choice--active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  }
}

function hdpMarkSettingsDirty() {
  window.hdpSettingsDirty = true;
  if (typeof document === 'undefined') return;
  var bar = document.querySelector && document.querySelector('.st-settings-actions');
  if (bar) bar.setAttribute('data-dirty', 'true');
  var text = document.querySelector && document.querySelector('.st-settings-actions-text');
  if (text) text.textContent = '有未保存的更改';
}

function hdpMarkSettingsClean() {
  window.hdpSettingsDirty = false;
  if (typeof document === 'undefined') return;
  var bar = document.querySelector && document.querySelector('.st-settings-actions');
  if (bar) bar.setAttribute('data-dirty', 'false');
  var text = document.querySelector && document.querySelector('.st-settings-actions-text');
  if (text) text.textContent = '修改设置后点击保存生效';
}

window.hdpPersistSettingsAndReload = function(successDelay, fallbackDelay, configOverride) {
  successDelay = successDelay || 800;
  fallbackDelay = fallbackDelay || 1200;
  var showToast = typeof hdpShowToast === 'function' ? hdpShowToast : function() {};
  var config = configOverride || window.hdpGetSettingsDraft();
  var savedConfig = hdpCloneConfig(config);
  try {
    localStorage.setItem('hdp_config', JSON.stringify(savedConfig));
    localStorage.setItem('hdp_config_pending_sync', 'true');
  } catch(e) {
    console.error('[HDP] Save failed:', e);
  }
  if (typeof hdpSaveToLovelace === 'function') {
    showToast('正在保存设置...', 'info');
    hdpSaveToLovelace(savedConfig).then(function() {
      showToast('设置已保存，正在刷新...', 'success');
      setTimeout(function() { location.reload(); }, successDelay);
    }).catch(function(err) {
      console.warn('[HDP] Lovelace sync failed, saved to localStorage only', err);
      showToast('已保存到本地，正在刷新...', 'info');
      setTimeout(function() { location.reload(); }, fallbackDelay);
    });
  } else {
    showToast('已保存，正在刷新...', 'success');
    setTimeout(function() { location.reload(); }, successDelay);
  }
};

window.hdpSaveSetting = function(path, value) {
  hdpSetDraftPath(path, value);
};

window.hdpSelectHomeLayout = function(preset, evt) {
  var allowed = ['grid', 'rows', 'l_shape', 'l_mirror', 'u_shape', 'custom'];
  var safePreset = allowed.indexOf(preset) >= 0 ? preset : 'grid';
  hdpSetDraftPath('home.layout_preset', safePreset);
  if (evt && evt.currentTarget && evt.currentTarget.closest) {
    var root = evt.currentTarget.closest('.st-layout-grid');
    if (root && root.querySelectorAll) {
      var buttons = root.querySelectorAll('.st-layout-choice');
      for (var i = 0; i < buttons.length; i++) {
        var active = buttons[i] === evt.currentTarget;
        buttons[i].classList.toggle('st-layout-choice--active', active);
        buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }
  }
};

window.hdpToggleArrayItem = function(path, item) {
  var evt = arguments.length > 2 ? arguments[2] : window.event;
  var chip = evt && evt.target && evt.target.closest ? evt.target.closest('.st-chip') : null;
  var arr = hdpGetDraftArray(path);
  var idx = arr.indexOf(item);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(item);
  hdpMarkSettingsDirty();
  if (chip) {
    chip.classList.toggle('st-chip--active');
    chip.setAttribute('aria-pressed', chip.classList.contains('st-chip--active') ? 'true' : 'false');
  }
};

window.hdpSaveKeywordList = function(path, value) {
  var arr = String(value || '')
    .split(/[,，\\n]/)
    .map(function(item) { return item.trim().toLowerCase(); })
    .filter(function(item, index, list) { return item && list.indexOf(item) === index; });
  hdpSetDraftPath(path, arr);
};

window.hdpCommitSettings = function() {
  if (window.hdpDraftVisualDirty && typeof window.hdpLoadDraftVisualConfig === 'function') {
    var visual = window.hdpLoadDraftVisualConfig();
    hdpSetDraftPath('visual', visual);
    try {
      localStorage.setItem('hdp_visual_config', JSON.stringify(visual));
    } catch(e) {
      console.warn('[HDP] Failed to save visual config locally', e);
    }
  }
  window.hdpPersistSettingsAndReload(700, 1000, window.hdpGetSettingsDraft());
};

window.hdpCancelSettings = function() {
  window.hdpSettingsDraft = hdpCloneConfig(hdpLoadRawSettingsConfig());
  window.hdpDraftVisualConfig = undefined;
  window.hdpDraftVisualDirty = false;
  hdpSyncSettingsControlsFromDraft();
  hdpMarkSettingsClean();
  if (typeof hdpShowToast === 'function') hdpShowToast('已放弃未保存更改', 'info');
};

window.hdpResetConfig = function() {
  if (!confirm('确定重置所有设置？此操作不可撤销。')) return;
  hdpClearConfig();
  var resetConfig = hdpLoadConfig();
  var reload = function() { location.reload(); };
  if (typeof hdpShowToast === 'function') hdpShowToast('正在重置配置...', 'info');
  if (typeof hdpSaveToLovelace === 'function') {
    hdpSaveToLovelace(resetConfig).then(reload).catch(function(err) {
      console.warn('[HDP] Lovelace reset sync failed, cleared locally only', err);
      reload();
    });
  } else {
    reload();
  }
};

window.hdpExportConfig = function() {
  var config = hdpLoadConfig();
  var json = JSON.stringify(config, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'hdp-config.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.hdpImportConfig = function() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var config = JSON.parse(ev.target.result);
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
          throw new Error('配置文件格式不正确');
        }
        var normalized = hdpNormalizeHDPConfig(config);
        if (!normalized) {
          throw new Error('配置文件格式不正确');
        }
        hdpClearConfig();
        hdpSaveConfig(normalized);
        var reload = function() {
          alert('配置已导入，页面将刷新');
          location.reload();
        };
        if (typeof hdpSaveToLovelace === 'function') {
          hdpSaveToLovelace(hdpLoadConfig()).then(reload).catch(function(err) {
            console.warn('[HDP] Lovelace import sync failed, saved locally only', err);
            reload();
          });
        } else {
          reload();
        }
      } catch(err) {
        alert('导入失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

function hdpBase64UrlEncode(value) {
  return btoa(unescape(encodeURIComponent(value))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
}

function hdpBase64UrlDecode(value) {
  var normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  return decodeURIComponent(escape(atob(normalized)));
}

function hdpExtractEntityIds(value) {
  var found = {};
  var re = /\\b([a-z_]+\\.[a-z0-9_]+)\\b/g;
  function walk(item) {
    if (typeof item === 'string') {
      var match;
      while ((match = re.exec(item))) found[match[1]] = true;
      re.lastIndex = 0;
    } else if (Array.isArray(item)) {
      item.forEach(walk);
    } else if (item && typeof item === 'object') {
      Object.keys(item).forEach(function(key) { walk(item[key]); });
    }
  }
  walk(value);
  return Object.keys(found).sort();
}

function hdpApplyEntityMapping(value, mapping) {
  if (typeof value === 'string') {
    var result = value;
    Object.keys(mapping).sort(function(a, b) { return b.length - a.length; }).forEach(function(from) {
      result = hdpReplaceEntityId(result, from, mapping[from]);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map(function(item) { return hdpApplyEntityMapping(item, mapping); });
  if (value && typeof value === 'object') {
    var mapped = {};
    Object.keys(value).forEach(function(key) { mapped[key] = hdpApplyEntityMapping(value[key], mapping); });
    return mapped;
  }
  return value;
}

function hdpEscapeRegExp(value) {
  var slash = String.fromCharCode(92);
  var specials = slash + '^$.*+?()[]{}|';
  return String(value).split('').map(function(ch) {
    return specials.indexOf(ch) >= 0 ? slash + ch : ch;
  }).join('');
}

function hdpReplaceEntityId(value, from, to) {
  var escaped = hdpEscapeRegExp(from);
  return String(value).replace(new RegExp('(^|[^a-z0-9_])(' + escaped + ')(?=$|[^a-z0-9_])', 'g'), '$1' + to);
}

function hdpBuildEntityMapping(sourceEntities) {
  var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
  var states = hass && hass.states ? hass.states : {};
  var registry = hass && hass.entities ? hass.entities : {};
  var areas = hass && hass.areas ? hass.areas : {};
  var devices = hass && hass.devices ? hass.devices : {};
  var mapping = {};
  var matches = [];
  var unmapped = [];
  var used = {};
  function isVisibleEntity(entityId) {
    var entry = registry[entityId];
    return !(entry && (entry.disabled_by || entry.hidden_by));
  }

  function tokens(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').split(/[_\\s]+/).filter(function(t) { return t.length > 1; });
  }
  function stripDomain(entityId) {
    var idx = String(entityId || '').indexOf('.');
    return idx === -1 ? entityId : String(entityId).slice(idx + 1);
  }
  function score(source, target) {
    var sourceTokens = tokens(source);
    var targetTokens = tokens(target);
    var targetSet = {};
    targetTokens.forEach(function(t) { targetSet[t] = true; });
    return sourceTokens.reduce(function(total, t) { return total + (targetSet[t] ? t.length : 0); }, 0);
  }
  function areaName(entityId) {
    var entry = registry[entityId] || {};
    var areaId = entry.area_id;
    if (!areaId && entry.device_id && devices[entry.device_id]) areaId = devices[entry.device_id].area_id;
    if (!areaId && states[entityId] && states[entityId].attributes) areaId = states[entityId].attributes.area_id;
    return areaId && areas[areaId] ? (areas[areaId].name || areaId) : (areaId || '');
  }
  function deviceText(entityId) {
    var entry = registry[entityId] || {};
    var device = entry.device_id ? devices[entry.device_id] : null;
    if (!device) return '';
    return [device.name, device.name_by_user, device.manufacturer, device.model].filter(Boolean).join(' ');
  }

  sourceEntities.forEach(function(sourceId) {
    if (states[sourceId] && !used[sourceId] && isVisibleEntity(sourceId)) {
      mapping[sourceId] = sourceId;
      matches.push({ source: sourceId, target: sourceId, score: 999, confidence: 'exact' });
      used[sourceId] = true;
      return;
    }
    var domain = sourceId.split('.')[0];
    var best = null;
    Object.keys(states).forEach(function(entityId) {
      if (used[entityId] || entityId.split('.')[0] !== domain) return;
      if (!isVisibleEntity(entityId)) return;
      var friendly = states[entityId].attributes && states[entityId].attributes.friendly_name || '';
      var registryName = registry[entityId] && registry[entityId].name || '';
      var s = score(stripDomain(sourceId), stripDomain(entityId) + ' ' + friendly + ' ' + registryName + ' ' + deviceText(entityId) + ' ' + areaName(entityId));
      if (!best || s > best.score) best = { id: entityId, score: s };
    });
    if (best && best.score > 0) {
      mapping[sourceId] = best.id;
      matches.push({
        source: sourceId,
        target: best.id,
        score: best.score,
        confidence: best.score >= 12 ? 'high' : (best.score >= 6 ? 'medium' : 'low')
      });
      used[best.id] = true;
    } else {
      unmapped.push(sourceId);
    }
  });

  return { mapping: mapping, matches: matches, unmapped: unmapped };
}

function hdpSaveImportReport(kind, mapping) {
  var report = {
    kind: kind,
    imported_at: new Date().toISOString(),
    mapped_count: mapping && mapping.matches ? mapping.matches.length : 0,
    unmapped_count: mapping && mapping.unmapped ? mapping.unmapped.length : 0,
    matches: mapping && mapping.matches ? mapping.matches : [],
    unmapped: mapping && mapping.unmapped ? mapping.unmapped : []
  };
  try { localStorage.setItem('hdp_last_import_report', JSON.stringify(report)); } catch(e) {}
  return report;
}

function hdpSanitizeCardSkin(value) {
  var allowed = ['classic', 'glass', 'gradient', 'aurora', 'soft', 'neon', 'soft-data'];
  return allowed.indexOf(value) >= 0 ? value : 'classic';
}

function hdpSanitizeLayoutDensity(value) {
  var allowed = ['compact', 'standard', 'spacious'];
  return allowed.indexOf(value) >= 0 ? value : 'standard';
}

function hdpSanitizeHomeLayoutPreset(value) {
  var allowed = ['grid', 'rows', 'l_shape', 'l_mirror', 'u_shape', 'custom'];
  return allowed.indexOf(value) >= 0 ? value : 'grid';
}

function hdpNormalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(function(item) { return typeof item === 'string' && item.length > 0; });
}

function hdpMergeStringArrays() {
  var seen = {};
  var result = [];
  Array.prototype.slice.call(arguments).forEach(function(value) {
    hdpNormalizeStringArray(value).forEach(function(item) {
      if (seen[item]) return;
      seen[item] = true;
      result.push(item);
    });
  });
  return result;
}

function hdpNormalizeCardSizes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  var allowed = ['sm', 'md', 'lg', 'wide', 'tall'];
  var result = {};
  Object.keys(value).forEach(function(key) {
    if (key && allowed.indexOf(value[key]) >= 0) result[key] = value[key];
  });
  return Object.keys(result).length ? result : undefined;
}

function hdpNormalizeSkinMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  var allowed = ['classic', 'glass', 'gradient', 'aurora', 'soft', 'neon', 'soft-data'];
  var result = {};
  Object.keys(value).forEach(function(key) {
    if (key && allowed.indexOf(value[key]) >= 0) result[key] = value[key];
  });
  return Object.keys(result).length ? result : undefined;
}

function hdpNormalizeTimeMoods(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  var periods = ['dawn', 'day', 'dusk', 'night', 'midnight'];
  var moods = ['coral', 'abyss', 'forest', 'amber', 'mono', 'neon'];
  var result = {};
  periods.forEach(function(period) {
    if (moods.indexOf(value[period]) >= 0) result[period] = value[period];
  });
  return Object.keys(result).length ? result : undefined;
}

function hdpNormalizeVisualConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return undefined;
  var normalized = Object.assign({}, config);
  if (normalized.card_style) normalized.card_style = hdpSanitizeCardSkin(normalized.card_style);
  if (normalized.layout_density) normalized.layout_density = hdpSanitizeLayoutDensity(normalized.layout_density);
  var cardSizes = hdpNormalizeCardSizes(normalized.card_sizes);
  if (cardSizes) normalized.card_sizes = cardSizes;
  else delete normalized.card_sizes;
  var areaSkins = hdpNormalizeSkinMap(normalized.area_skins);
  if (areaSkins) normalized.area_skins = areaSkins;
  else delete normalized.area_skins;
  var timeMoods = hdpNormalizeTimeMoods(normalized.time_moods);
  if (timeMoods) normalized.time_moods = timeMoods;
  else delete normalized.time_moods;
  return normalized;
}

function hdpNormalizeBlueprints(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(function(page) {
    return page && typeof page === 'object'
      && typeof page.id === 'string'
      && typeof page.name === 'string'
      && typeof page.blueprint_yaml === 'string'
      && page.card && typeof page.card === 'object' && !Array.isArray(page.card);
  }).map(function(page) {
    var normalized = Object.assign({}, page);
    normalized.icon = typeof page.icon === 'string' && page.icon ? page.icon : 'mdi:puzzle';
    normalized.inputs = page.inputs && typeof page.inputs === 'object' && !Array.isArray(page.inputs) ? page.inputs : {};
    return normalized;
  });
}

function hdpNormalizeCardSlots(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  var allowedSizes = ['sm', 'md', 'lg', 'wide', 'tall'];
  var result = {};
  Object.keys(value).forEach(function(slotId) {
    var slot = value[slotId];
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return;
    var normalized = {};
    if (slot.enabled === false) normalized.enabled = false;
    if (typeof slot.order === 'number' && isFinite(slot.order)) normalized.order = slot.order;
    if (allowedSizes.indexOf(slot.size) >= 0) normalized.size = slot.size;
    if (typeof slot.background_image_url === 'string') normalized.background_image_url = slot.background_image_url;
    if (slot.theme_from_image === true) normalized.theme_from_image = true;
    if (typeof slot.yaml === 'string') normalized.yaml = slot.yaml;
    result[slotId] = normalized;
  });
  return result;
}

function hdpNormalizeHDPConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return undefined;
  var normalized = Object.assign({}, config);
  var legacyHiddenAreas = hdpNormalizeStringArray(normalized.hidden_areas);
  var legacyHiddenDomains = hdpNormalizeStringArray(normalized.hidden_domains);
  var legacyHiddenDeviceTypes = hdpNormalizeStringArray(normalized.hidden_device_types);
  var legacyHiddenKeywords = hdpNormalizeStringArray(normalized.hidden_keywords || normalized.hidden_device_keywords);
  var legacyVisibleKeywords = hdpNormalizeStringArray(normalized.visible_keywords || normalized.visible_device_keywords);
  var legacyHiddenPersons = hdpNormalizeStringArray(normalized.hidden_persons);
  if ('visual' in normalized) {
    var visual = hdpNormalizeVisualConfig(normalized.visual);
    if (visual) normalized.visual = visual;
    else delete normalized.visual;
  }
  if (normalized.areas && typeof normalized.areas === 'object' && !Array.isArray(normalized.areas)) {
    normalized.areas = Object.assign({}, normalized.areas, {
      hidden_areas: hdpMergeStringArrays(normalized.areas.hidden_areas, legacyHiddenAreas),
      area_order: hdpNormalizeStringArray(normalized.areas.area_order)
    });
  } else if (legacyHiddenAreas.length) {
    normalized.areas = { hidden_areas: legacyHiddenAreas };
  }
  if (normalized.devices && typeof normalized.devices === 'object' && !Array.isArray(normalized.devices)) {
    normalized.devices = Object.assign({}, normalized.devices, {
      hidden_domains: hdpMergeStringArrays(normalized.devices.hidden_domains, legacyHiddenDomains),
      hidden_device_types: hdpMergeStringArrays(normalized.devices.hidden_device_types, legacyHiddenDeviceTypes),
      hidden_keywords: hdpMergeStringArrays(normalized.devices.hidden_keywords, legacyHiddenKeywords),
      visible_keywords: hdpMergeStringArrays(normalized.devices.visible_keywords, legacyVisibleKeywords)
    });
  } else if (legacyHiddenDomains.length || legacyHiddenDeviceTypes.length || legacyHiddenKeywords.length || legacyVisibleKeywords.length) {
    normalized.devices = {
      hidden_domains: legacyHiddenDomains,
      hidden_device_types: legacyHiddenDeviceTypes,
      hidden_keywords: legacyHiddenKeywords,
      visible_keywords: legacyVisibleKeywords
    };
  }
  delete normalized.hidden_areas;
  delete normalized.hidden_domains;
  delete normalized.hidden_device_types;
  delete normalized.hidden_keywords;
  delete normalized.hidden_device_keywords;
  delete normalized.visible_keywords;
  delete normalized.visible_device_keywords;
  if (normalized.people && typeof normalized.people === 'object' && !Array.isArray(normalized.people)) {
    normalized.people = Object.assign({}, normalized.people, {
      hidden_persons: hdpMergeStringArrays(normalized.people.hidden_persons, legacyHiddenPersons)
    });
  } else if (legacyHiddenPersons.length) {
    normalized.people = { hidden_persons: legacyHiddenPersons };
  }
  delete normalized.hidden_persons;
  if (normalized.home && typeof normalized.home === 'object' && !Array.isArray(normalized.home)) {
    normalized.home = Object.assign({}, normalized.home, {
      section_order: hdpNormalizeStringArray(normalized.home.section_order),
      hidden_sections: hdpNormalizeStringArray(normalized.home.hidden_sections),
      hidden_info_cards: hdpNormalizeStringArray(normalized.home.hidden_info_cards),
      layout_preset: hdpSanitizeHomeLayoutPreset(normalized.home.layout_preset)
    });
  }
  if (normalized.blueprints && typeof normalized.blueprints === 'object' && !Array.isArray(normalized.blueprints)) {
    normalized.blueprints = Object.assign({}, normalized.blueprints, {
      pages: hdpNormalizeBlueprints(normalized.blueprints.pages),
      replacements: normalized.blueprints.replacements && typeof normalized.blueprints.replacements === 'object' && !Array.isArray(normalized.blueprints.replacements)
        ? normalized.blueprints.replacements
        : {}
    });
  }
  if (normalized.cards && typeof normalized.cards === 'object' && !Array.isArray(normalized.cards)) {
    normalized.cards = Object.assign({}, normalized.cards, {
      slots: hdpNormalizeCardSlots(normalized.cards.slots)
    });
  }
  return normalized;
}

window.hdpShowImportReport = function() {
  var report = null;
  try { report = JSON.parse(localStorage.getItem('hdp_last_import_report') || 'null'); } catch(e) {}
  if (!report) {
    alert('暂无复刻/导入报告');
    return;
  }
  var lines = [
    '导入类型: ' + report.kind,
    '导入时间: ' + report.imported_at,
    '已映射: ' + report.mapped_count,
    '未匹配: ' + report.unmapped_count,
    ''
  ];
  if (report.matches && report.matches.length) {
    lines.push('映射明细:');
    report.matches.slice(0, 20).forEach(function(item) {
      lines.push('- ' + item.source + ' -> ' + item.target + ' (' + item.confidence + ')');
    });
  }
  if (report.unmapped && report.unmapped.length) {
    lines.push('');
    lines.push('需手动确认:');
    report.unmapped.slice(0, 20).forEach(function(id) { lines.push('- ' + id); });
  }
  alert(lines.join('\\n'));
};

window.hdpExportShareCode = function() {
  var config = hdpLoadConfig();
  var visual = {};
  try { visual = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}'); } catch(e) {}
  var blueprints = typeof hdpBlueprintLoad === 'function' ? hdpBlueprintLoad() : ((config.blueprints && config.blueprints.pages) || []);
  var source = { hdp_config: config, visual_config: visual, blueprints: blueprints };
  var bundle = {
    schema: 'hass-dashboard-pro.share.v1',
    version: 1,
    exported_at: new Date().toISOString(),
    name: config.dashboard && config.dashboard.name,
    hdp_config: config,
    visual_config: visual,
    blueprints: blueprints,
    source_entities: hdpExtractEntityIds(source)
  };
  var code = 'HDP1.' + hdpBase64UrlEncode(JSON.stringify(bundle));
  prompt('复制分享码', code);
};

window.hdpImportShareCode = function() {
  var code = prompt('粘贴分享码');
  if (!code) return;
  try {
    if (code.indexOf('HDP1.') !== 0) throw new Error('分享码格式不正确');
    var bundle = JSON.parse(hdpBase64UrlDecode(code.slice(5)));
    if (bundle.schema !== 'hass-dashboard-pro.share.v1' || bundle.version !== 1) {
      throw new Error('分享码版本不支持');
    }
    var mapping = hdpBuildEntityMapping(bundle.source_entities || hdpExtractEntityIds(bundle));
    hdpSaveImportReport('share-code', mapping);
    var config = hdpNormalizeHDPConfig(hdpApplyEntityMapping(bundle.hdp_config || {}, mapping.mapping)) || {};
    var visual = hdpNormalizeVisualConfig(bundle.visual_config) || {};
    var blueprints = hdpNormalizeBlueprints(hdpApplyEntityMapping(bundle.blueprints || [], mapping.mapping));

    hdpClearConfig();
    hdpSaveConfig(config);
    try { localStorage.setItem('hdp_visual_config', JSON.stringify(visual)); } catch(e) {}
    if (typeof hdpBlueprintSave === 'function') hdpBlueprintSave(blueprints);

    var finish = function() {
      var msg = mapping.unmapped.length
        ? '已导入，' + mapping.unmapped.length + ' 个实体需要手动确认'
        : '已导入并自动适配实体';
      if (typeof hdpShowToast === 'function') hdpShowToast(msg, 'success');
      setTimeout(function() { location.reload(); }, 900);
    };

    if (typeof hdpSaveToLovelace === 'function') {
      hdpSaveToLovelace(hdpLoadConfig()).then(finish).catch(finish);
    } else {
      finish();
    }
  } catch(err) {
    alert('导入失败: ' + (err && err.message ? err.message : err));
  }
};

window.hdpRefreshThemes = function() {
  var hasUnsaved = Boolean(window.hdpSettingsDirty || window.hdpDraftVisualDirty);
  if (hasUnsaved) {
    var ask = typeof window.confirm === 'function' ? window.confirm : (typeof confirm === 'function' ? confirm : null);
    if (!ask) {
      if (typeof hdpShowToast === 'function') hdpShowToast('请先保存或取消未保存更改', 'warning');
      return;
    }
    if (!ask('有未保存更改，刷新主题列表会放弃这些改动。继续刷新吗？')) return;
  }
  // Clear cached theme file list so it re-scans on next load
  try { localStorage.removeItem('hdp_theme_files'); } catch(e) {}
  // Try to fetch theme file list from HA www directory
  var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
  if (hass && hass.callApi) {
    hass.callApi('GET', 'hassio/ingress').catch(function() {});
  }
  location.reload();
};

window.hdpApplyDesignPlan = function(plan) {
  if (!plan || !plan.visual) return;
  var visual = plan.visual;
  var hdpVisual = {
    theme_id: plan.pack_id,
    card_style: visual.card_style || 'classic',
    colors: {
      page_bg: visual.page_bg,
      card_bg: visual.card_bg,
      primary: visual.primary,
      text_primary: visual.text_primary,
      text_secondary: visual.text_secondary,
      border: visual.border
    },
    border_radius: visual.border_radius,
    card_padding: visual.card_padding,
    card_gap: visual.card_gap,
    font_family: visual.font_family || '',
    shadows: visual.shadows !== false,
    layout_density: visual.layout_density
  };

  if (typeof window.hdpSaveVisualConfig === 'function') {
    window.hdpSaveVisualConfig(visual);
  }
  if (typeof hdpSetDraftPath === 'function') {
    hdpSetDraftPath('visual', hdpVisual);
  }
  window.hdpDraftVisualConfig = JSON.parse(JSON.stringify(visual));
  window.hdpDraftVisualDirty = true;

  if (typeof hdpShowToast === 'function') {
    hdpShowToast('方案已暂存，点击保存并应用后生效', 'success');
  }
};
`;
}

// ─── Section Builders ───────────────────────────────────────────────────────

const c = 'currentColor';

function iconDashboard(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;
}
function iconHome(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}
function iconSparkles(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/><path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z"/></svg>`;
}
function iconHeader(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="2" y="3" width="20" height="6" rx="2"/><path d="M2 13h20M2 17h12"/></svg>`;
}
function iconPeople(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function iconAreas(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
}
function iconDevices(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>`;
}
function iconBlueprint(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}
function iconShield(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
}
function iconInfo(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}
function iconReset(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
}

function toggleHTML(settingPath: string, value: boolean): string {
  const cls = value ? 'st-toggle st-toggle--on' : 'st-toggle st-toggle--off';
  return `<div class="${cls}" data-action="toggle-setting" data-setting="${escapeAttribute(settingPath)}" role="switch" aria-checked="${value ? 'true' : 'false'}" tabindex="0" onclick="var isOn = this.classList.contains('st-toggle--on'); hdpSaveSetting('${settingPath}', !isOn); this.classList.toggle('st-toggle--on', !isOn); this.classList.toggle('st-toggle--off', isOn); this.setAttribute('aria-checked', !isOn ? 'true' : 'false');" onkeydown="if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); this.click(); }">
    <div class="st-toggle-knob"></div>
  </div>`;
}

function chipHTML(action: string, path: string, value: string, label: string, active: boolean): string {
  const activeClass = active ? ' st-chip--active' : '';
  return `<button type="button" class="st-chip${activeClass}" data-action="${escapeAttribute(action)}" data-setting="${escapeAttribute(path)}" data-value="${escapeAttribute(value)}" aria-pressed="${active ? 'true' : 'false'}" title="${escapeAttribute(label)}" onclick="hdpToggleArrayItem('${escapeAttribute(path)}', ${jsArg(value)}, event)">${escapeHTML(label)}</button>`;
}

// ─── 1. Dashboard ──────────────────────────────────────────────────────────

export function buildDashboardSection(config: StrategyConfig): string {
  const name = config.hdp_config?.dashboard?.name || config.title || '智能家居';
  const avatarUrl = config.hdp_config?.dashboard?.avatar_url || '';
  const backgroundUrl = config.hdp_config?.dashboard?.background_image_url || '';
  return sectionCard('dashboard', '仪表盘', iconDashboard(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">名称</div>
        <div class="st-row-desc">仪表盘显示名称</div>
      </div>
      <input class="st-input" data-setting="dashboard.name" value="${escapeAttribute(name)}" onchange="hdpSaveSetting('dashboard.name', this.value)" />
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">用户头像</div>
        <div class="st-row-desc">支持 /local/...、https://... 或 data:image/...；留空使用用户名首字母</div>
      </div>
      <input class="st-input st-input--wide" data-setting="dashboard.avatar_url" type="url" value="${escapeAttribute(avatarUrl)}" placeholder="/local/hass-dashboard-pro/avatar.png" onchange="hdpSaveSetting('dashboard.avatar_url', this.value.trim())" />
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">背景图片</div>
        <div class="st-row-desc">支持 /local/...、https://... 或 data:image/...；用于整个仪表盘背景</div>
      </div>
      <input class="st-input st-input--wide" data-setting="dashboard.background_image_url" type="url" value="${escapeAttribute(backgroundUrl)}" placeholder="/local/hass-dashboard-pro/background.jpg" onchange="hdpSaveSetting('dashboard.background_image_url', this.value.trim())" />
    </div>
  `);
}

// ─── 2. Home ────────────────────────────────────────────────────────────────

export function buildQuickGenerateSection(hass: Hass, config: StrategyConfig): string {
  const recommended = buildDashboardDesignPlan(hass, config);
  const alternatives = buildPlanAlternatives(hass, config);
  const focus = recommended.focus.map(item => `<span class="st-plan-pill">${escapeHTML(item.label)}</span>`).join('');
  const reasons = recommended.rationale.map(reason => `<div class="st-plan-reason">- ${escapeHTML(reason)}</div>`).join('');

  const choices = alternatives.map((plan: DashboardDesignPlan) => {
    const colors = plan.visual;
    const swatch = `linear-gradient(135deg, ${colors.page_bg || '#fff'} 0%, ${colors.card_bg || '#fff'} 48%, ${colors.primary || '#4F6EF7'} 100%)`;
    return `<button type="button" class="st-plan-choice ${plan.pack_id === recommended.pack_id ? 'st-plan-choice--active' : ''}"
      data-action="apply-design-plan"
      data-plan="${escapeAttribute(plan.pack_id)}"
      onclick="hdpApplyDesignPlan(${jsValue(plan)})">
      <div class="st-plan-swatch" style="background: ${escapeAttribute(swatch)};"></div>
      <div class="st-plan-choice-name">${escapeHTML(plan.pack_label)}</div>
      <div class="st-plan-choice-desc">${escapeHTML(plan.density)} · ${plan.profile.entity_count} entities</div>
    </button>`;
  }).join('');
  return sectionCard('quick-generate', '一键生成', iconSparkles(), `
    <div class="st-plan-hero">
      <div>
        <div class="st-plan-title">${escapeHTML(recommended.headline)}</div>
        <div class="st-row-desc">根据区域、实体数量、深色模式和设备语义自动生成视觉方案。</div>
        <div class="st-plan-meta">
          <span class="st-plan-pill">${escapeHTML(recommended.pack_label)}</span>
          <span class="st-plan-pill">${escapeHTML(recommended.density)}</span>
          ${focus}
        </div>
      </div>
      <button type="button" class="st-btn st-btn--primary" data-action="apply-recommended-design" onclick="hdpApplyDesignPlan(${jsValue(recommended)})">
        应用推荐方案
      </button>
    </div>
    <div class="st-plan-reasons">${reasons}</div>
    <div class="st-section-subtitle">换一种风格</div>
    <div class="st-plan-grid">${choices}</div>
  `);
}

export function buildHomeSection(config: StrategyConfig): string {
  const hiddenSections: string[] = (config as any).hdp_config?.home?.hidden_sections || [];
  const hiddenInfoCards: string[] = (config as any).hdp_config?.home?.hidden_info_cards || [];
  const layoutPreset = sanitizeHomeLayoutPreset((config as any).hdp_config?.home?.layout_preset);
  const sectionKeys: HomeSectionKey[] = ['status_badges', 'people', 'environment', 'power_usage', 'favorites', 'summary'];
  const infoCardLabels: Record<string, string> = {
    updates: '可用更新',
    repairs: '待修复',
    entities: '实体',
    devices: '设备',
    areas: '区域',
    active: '运行中',
    automations: '自动化',
  };
  const layoutLabels: Record<HomeLayoutPreset, { label: string; desc: string }> = {
    grid: { label: '行列式布局', desc: '均衡网格，适合通用家庭总览。' },
    rows: { label: '纵向行布局', desc: '大卡片逐行展开，适合窄屏和信息阅读。' },
    l_shape: { label: 'L 型布局', desc: '左侧主视觉，右侧信息列，首屏重心稳定。' },
    l_mirror: { label: '镜像 L 型', desc: '右侧主视觉，左侧状态群，更适合右手操作区。' },
    u_shape: { label: 'U 型布局', desc: '上下横向信息包围核心卡片，适合大屏展示。' },
    custom: { label: '自定义顺序', desc: '使用手动区块顺序和卡片尺寸。' },
  };

  const chips = sectionKeys.map(key => {
    const active = !hiddenSections.includes(key);
    const label = HOME_SECTION_LABELS[key] || key;
    return chipHTML('toggle-home-section', 'home.hidden_sections', key, label, active);
  }).join('');

  const infoChips = Object.entries(infoCardLabels).map(([key, label]) => {
    const hidden = hiddenInfoCards.includes(key);
    return chipHTML('toggle-home-info-card', 'home.hidden_info_cards', key, label, hidden);
  }).join('');
  const layoutChoices = (Object.keys(layoutLabels) as HomeLayoutPreset[]).map(preset => {
    const active = preset === layoutPreset;
    const meta = layoutLabels[preset];
    return `<button type="button" class="st-layout-choice ${active ? 'st-layout-choice--active' : ''}" data-layout-preset="${escapeAttribute(preset)}" aria-pressed="${active ? 'true' : 'false'}" onclick="hdpSelectHomeLayout('${escapeAttribute(preset)}', event)">
      <span class="st-layout-choice-name">${escapeHTML(meta.label)}</span>
      <span class="st-layout-choice-desc">${escapeHTML(meta.desc)}</span>
    </button>`;
  }).join('');

  return sectionCard('home', '首页', iconHome(), `
    <div class="st-row-label">首页版式</div>
    <div class="st-row-desc">从美学构图选择首页行列关系，保存后生效</div>
    <div class="st-layout-grid">${layoutChoices}</div>
    <div class="st-section-subtitle">显示区块</div>
    <div class="st-row-label">显示区块</div>
    <div class="st-row-desc">选择首页要显示的内容区块</div>
    <div class="st-chip-list">${chips}</div>
    <div class="st-section-subtitle">系统概览项目</div>
    <div class="st-row-desc">高亮项目会从系统概览隐藏</div>
    <div class="st-chip-list">${infoChips}</div>
  `);
}

function sanitizeHomeLayoutPreset(value: unknown): HomeLayoutPreset {
  return typeof value === 'string' && ['grid', 'rows', 'l_shape', 'l_mirror', 'u_shape', 'custom'].includes(value)
    ? value as HomeLayoutPreset
    : 'grid';
}

// ─── 3. Header ──────────────────────────────────────────────────────────────

export function buildHeaderSection(config: StrategyConfig): string {
  const hdpConfig = (config as any).hdp_config;
  const showTime = hdpConfig?.header?.show_time !== false;
  const showWeather = hdpConfig?.header?.show_weather !== false;
  const showNotif = hdpConfig?.header?.show_notifications !== false;
  const weatherEntity = hdpConfig?.header?.weather_entity || config.weather_entity || '';
  const alarmEntity = hdpConfig?.header?.alarm_entity || config.alarm_entity || '';

  return sectionCard('header', '页眉', iconHeader(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">显示时间</div>
        <div class="st-row-desc">在首页显示当前时间和日期</div>
      </div>
      ${toggleHTML('header.show_time', showTime)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">显示天气</div>
        <div class="st-row-desc">在首页显示天气信息</div>
      </div>
      ${toggleHTML('header.show_weather', showWeather)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">显示通知</div>
        <div class="st-row-desc">在页眉显示通知数量</div>
      </div>
      ${toggleHTML('header.show_notifications', showNotif)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">天气实体</div>
        <div class="st-row-desc">weather.* 实体 ID（留空自动检测）</div>
      </div>
      <input class="st-input" data-setting="header.weather_entity" value="${escapeAttribute(weatherEntity)}" placeholder="自动检测" onchange="hdpSaveSetting('header.weather_entity', this.value)" />
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">报警实体</div>
        <div class="st-row-desc">alarm_control_panel.* 实体 ID</div>
      </div>
      <input class="st-input" data-setting="header.alarm_entity" value="${escapeAttribute(alarmEntity)}" placeholder="自动检测" onchange="hdpSaveSetting('header.alarm_entity', this.value)" />
    </div>
  `);
}

// ─── 4. People ──────────────────────────────────────────────────────────────

export function buildPeopleSection(hass: any, config: StrategyConfig): string {
  const hiddenPersons: string[] = getConfiguredHiddenPersons(config);

  // Find person entities
  const persons: Array<{ id: string; name: string }> = [];
  for (const [entityId, stateObj] of Object.entries(hass.states || {})) {
    if (!isVisibleRegistryEntity(hass, entityId)) continue;
    if (entityId.startsWith('person.')) {
      const name = (stateObj as any).attributes?.friendly_name || entityId.replace('person.', '');
      persons.push({ id: entityId, name });
    }
  }
  const personIds = new Set(persons.map(person => person.id));
  for (const entityId of hiddenPersons) {
    if (personIds.has(entityId)) continue;
    const stateObj = hass.states?.[entityId];
    const name = stateObj?.attributes?.friendly_name || entityId.replace('person.', '');
    persons.push({ id: entityId, name });
    personIds.add(entityId);
  }

  const chips = persons.map(p => {
    const hidden = hiddenPersons.includes(p.id);
    return chipHTML('toggle-hidden-person', 'people.hidden_persons', p.id, p.name, hidden);
  }).join('') || '<span class="st-row-desc">未找到 person 实体</span>';

  return sectionCard('people', '家庭成员', iconPeople(), `
    <div class="st-row-label">隐藏成员</div>
    <div class="st-row-desc">点击切换是否在首页显示</div>
    <div class="st-chip-list">${chips}</div>
  `);
}

// ─── 5. Areas ───────────────────────────────────────────────────────────────

export function buildAreasSection(hass: any, config: StrategyConfig): string {
  const hiddenAreas: string[] = getConfiguredHiddenAreas(config);
  const areaOrder: string[] = getConfiguredAreaOrder(config);
  const hideUnavailable = config.hdp_config?.areas?.hide_unavailable || false;

  const areaEntries = Object.entries(hass.areas || {});
  const hasUnassignedEntities = Object.keys(hass.states || {})
    .filter(entityId => isVisibleRegistryEntity(hass, entityId))
    .some(entityId => !resolveEntityAreaId(hass, entityId));
  if (hasUnassignedEntities) {
    areaEntries.push([UNASSIGNED_AREA_ID, { area_id: UNASSIGNED_AREA_ID, name: UNASSIGNED_AREA_NAME, picture: null }]);
  }
  const areaIds = new Set(areaEntries.map(([id]) => id));
  for (const id of hiddenAreas) {
    if (areaIds.has(id)) continue;
    const name = id === UNASSIGNED_AREA_ID ? UNASSIGNED_AREA_NAME : id;
    areaEntries.push([id, { area_id: id, name, picture: null }]);
    areaIds.add(id);
  }
  sortAreaEntries(areaEntries, areaOrder);

  const areaChips = areaEntries.map(([id, area]: [string, any]) => {
    const hidden = hiddenAreas.includes(id);
    return chipHTML('toggle-hidden-area', 'areas.hidden_areas', id, area.name, hidden);
  }).join('') || '<span class="st-row-desc">未找到区域</span>';

  return sectionCard('areas', '区域', iconAreas(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">隐藏区域</div>
        <div class="st-row-desc">点击切换区域是否显示（高亮=隐藏）</div>
      </div>
    </div>
    <div class="st-chip-list">${areaChips}</div>
    <div class="st-row st-row--spaced">
      <div>
        <div class="st-row-label">隐藏不可用设备</div>
        <div class="st-row-desc">不显示 unavailable 状态的设备</div>
      </div>
      ${toggleHTML('areas.hide_unavailable', hideUnavailable)}
    </div>
  `);
}

// ─── 6. Devices ─────────────────────────────────────────────────────────────

function sortAreaEntries(areaEntries: Array<[string, any]>, areaOrder: string[]): void {
  if (!areaOrder.length) return;

  const orderIndex = new Map(areaOrder.map((areaId, index) => [areaId, index]));
  areaEntries.sort((a, b) => {
    const ai = orderIndex.get(a[0]);
    const bi = orderIndex.get(b[0]);
    if (ai !== undefined || bi !== undefined) {
      return (ai ?? Number.MAX_SAFE_INTEGER) - (bi ?? Number.MAX_SAFE_INTEGER);
    }
    return 0;
  });
}

export function buildDevicesSection(config: StrategyConfig, hass?: Hass): string {
  const hiddenDomains: string[] = getConfiguredHiddenDomains(config);
  const hiddenDeviceTypes: string[] = getConfiguredHiddenDeviceTypes(config);
  const hiddenKeywords: string[] = getConfiguredHiddenKeywords(config);
  const visibleKeywords: string[] = getConfiguredVisibleKeywords(config);
  const defaultDomains = ['light', 'switch', 'climate', 'fan', 'cover', 'lock', 'sensor', 'binary_sensor', 'media_player', 'camera', 'vacuum', 'button'];
  const detectedDomains = Object.keys(hass?.states || {})
    .filter(entityId => isVisibleRegistryEntity(hass, entityId))
    .map(entityId => entityId.split('.')[0])
    .filter(domain => domain && !HIDDEN_DOMAINS.has(domain));
  const domains = Array.from(new Set([...defaultDomains, ...detectedDomains, ...hiddenDomains]))
    .filter(domain => !HIDDEN_DOMAINS.has(domain))
    .sort((a, b) => {
      const ai = defaultDomains.indexOf(a);
      const bi = defaultDomains.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });
  const domainLabels: Record<string, string> = {
    light: '灯光', switch: '开关', climate: '空调', fan: '风扇', cover: '窗帘',
    lock: '门锁', sensor: '传感器', binary_sensor: '二进传感器', media_player: '媒体',
    camera: '摄像头', vacuum: '扫地机', button: '按钮',
    input_boolean: '布尔开关', input_button: '输入按钮', number: '数字', select: '选择器',
    humidifier: '加湿器', remote: '遥控器', siren: '警报器', alarm_control_panel: '安防面板',
  };

  const chips = domains.map(d => {
    const hidden = hiddenDomains.includes(d);
    return chipHTML('toggle-hidden-domain', 'devices.hidden_domains', d, domainLabels[d] || d, hidden);
  }).join('');

  const deviceTypeHTML = buildHiddenDeviceTypeChips(hass, hiddenDomains, hiddenDeviceTypes);
  const hiddenKeywordValue = hiddenKeywords.join(', ');
  const visibleKeywordValue = visibleKeywords.join(', ');

  return sectionCard('devices', '设备类型', iconDevices(), `
    <div class="st-row-label">隐藏设备类型</div>
    <div class="st-row-desc">点击切换设备类型是否显示（高亮=隐藏）</div>
    <div class="st-chip-list">${chips}</div>
    ${deviceTypeHTML}
    <div class="st-section-subtitle">关键词过滤</div>
    <div class="st-row-desc">按实体 ID、实体名称、设备名称、区域名称匹配；多个关键词用逗号或换行分隔。</div>
    <div class="st-keyword-grid">
      <label class="st-keyword-field">
        <div class="st-row-label">隐藏关键词</div>
        <div class="st-row-desc">匹配到这些关键词的设备会从仪表盘隐藏。</div>
        <textarea class="st-input st-textarea" placeholder="例如：测试, 临时, old" data-setting="devices.hidden_keywords" oninput="hdpSaveKeywordList('devices.hidden_keywords', this.value)">${escapeHTML(hiddenKeywordValue)}</textarea>
      </label>
      <label class="st-keyword-field">
        <div class="st-row-label">仅显示关键词</div>
        <div class="st-row-desc">填写后只显示匹配这些关键词的设备；留空则显示所有未隐藏设备。</div>
        <textarea class="st-input st-textarea" placeholder="例如：客厅, 灯, living" data-setting="devices.visible_keywords" oninput="hdpSaveKeywordList('devices.visible_keywords', this.value)">${escapeHTML(visibleKeywordValue)}</textarea>
      </label>
    </div>
  `);
}

// ─── 7. Blueprints ──────────────────────────────────────────────────────────

function buildHiddenDeviceTypeChips(hass: Hass | undefined, hiddenDomains: string[], hiddenDeviceTypes: string[]): string {
  const deviceTypeLabels: Record<string, string> = {
    'sensor.temperature': '温度传感器',
    'sensor.humidity': '湿度传感器',
    'sensor.power': '功率传感器',
    'sensor.energy': '电量传感器',
    'sensor.illuminance': '照度传感器',
    'binary_sensor.motion': '人体/运动',
    'binary_sensor.door': '门磁',
    'binary_sensor.window': '窗磁',
    'binary_sensor.smoke': '烟雾',
    'binary_sensor.moisture': '漏水',
    'binary_sensor.occupancy': '占用',
    'binary_sensor.presence': '存在',
  };
  const defaultDeviceTypes = Object.keys(deviceTypeLabels);
  const detectedDeviceTypes = Object.entries(hass?.states || {})
    .filter(([entityId]) => isVisibleRegistryEntity(hass, entityId))
    .map(([entityId, stateObj]) => getEntityDeviceType(entityId, stateObj.attributes || {}))
    .filter(type => type.includes('.') && !hiddenDomains.includes(type.split('.')[0]));
  const deviceTypes = Array.from(new Set([...defaultDeviceTypes, ...detectedDeviceTypes, ...hiddenDeviceTypes]
    .filter(type => typeof type === 'string' && type.includes('.'))))
    .sort();
  if (!deviceTypes.length) return '';

  const chips = deviceTypes.map(type => {
    const hidden = hiddenDeviceTypes.includes(type);
    return chipHTML('toggle-hidden-device-type', 'devices.hidden_device_types', type, deviceTypeLabels[type] || type, hidden);
  }).join('');

  return `<div class="st-section-subtitle">传感器/设备子类型</div><div class="st-chip-list">${chips}</div>`;
}

export function buildBlueprintsSection(blueprintPages: BlueprintInstance[]): string {
  const galleryHTML = buildBlueprintGalleryHTML(blueprintPages);
  return sectionCard('blueprints', '蓝图', iconBlueprint(), galleryHTML);
}

// ─── 9. Theme Files ─────────────────────────────────────────────────────────

export function buildThemeFilesSection(): string {
  return sectionCard('themes', '主题文件', `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c.55 0 1-.45 1-1v-1.5c0-.28.22-.5.5-.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>`, `
    <div class="st-row">
      <div>
        <div class="st-row-label">自定义主题</div>
        <div class="st-row-desc">将 JSON 主题文件放到 /local/hass-dashboard-pro/themes/ 目录</div>
      </div>
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">主题目录</div>
        <div class="st-row-desc">/local/hass-dashboard-pro/themes/</div>
      </div>
      <span class="st-about-val">JSON</span>
    </div>
    <div class="st-action-row">
      <button type="button" class="st-btn" data-action="refresh-themes" onclick="hdpRefreshThemes()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        刷新主题列表
      </button>
    </div>
  `);
}

// ─── 10. Permissions ────────────────────────────────────────────────────────

export function buildPermissionsSection(config: StrategyConfig): string {
  const hdpConfig = (config as any).hdp_config;
  const restrictNonAdmin = hdpConfig?.permissions?.restrict_non_admin || false;
  const restrictSettings = hdpConfig?.permissions?.restrict_settings || false;

  return sectionCard('permissions', '权限', iconShield(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">限制非管理员</div>
        <div class="st-row-desc">非管理员用户无法修改仪表盘配置</div>
      </div>
      ${toggleHTML('permissions.restrict_non_admin', restrictNonAdmin)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">限制设置访问</div>
        <div class="st-row-desc">隐藏设置页面入口</div>
      </div>
      ${toggleHTML('permissions.restrict_settings', restrictSettings)}
    </div>
  `);
}

// ─── 11. About ──────────────────────────────────────────────────────────────

export function buildAboutSection(): string {
  return sectionCard('about', '关于', iconInfo(), `
    <div class="st-about-row">
      <span>版本</span>
      <span class="st-about-val">v4.0.0</span>
    </div>
    <div class="st-about-row">
      <span>架构</span>
      <span class="st-about-val">Monolithic Layout + Client Nav</span>
    </div>
    <div class="st-about-row">
      <span>渲染引擎</span>
      <span class="st-about-val">html-pro-card (do_not_parse)</span>
    </div>
    <div class="st-about-row">
      <span>设计语言</span>
      <span class="st-about-val">Apple HIG + Dieter Rams</span>
    </div>
    <div class="st-link-row">
      <a class="st-btn" href="https://github.com/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </a>
    </div>
  `);
}

// ─── 12. Reset/Export ───────────────────────────────────────────────────────

export function buildResetSection(): string {
  return sectionCard('reset', '重置与导出', iconReset(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">导出配置</div>
        <div class="st-row-desc">将所有设置导出为 JSON 文件</div>
      </div>
      <button type="button" class="st-btn" data-action="export-config" onclick="hdpExportConfig()">导出</button>
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">导入配置</div>
        <div class="st-row-desc">从 JSON 文件恢复设置</div>
      </div>
      <button type="button" class="st-btn" data-action="import-config" onclick="hdpImportConfig()">导入</button>
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">重置所有设置</div>
        <div class="st-row-desc">恢复到默认配置，此操作不可撤销</div>
      </div>
      <button type="button" class="st-btn st-btn--danger" data-action="reset-config" onclick="hdpResetConfig()">重置</button>
    </div>
  `);
}
