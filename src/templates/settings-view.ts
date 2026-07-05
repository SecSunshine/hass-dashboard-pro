/**
 * Template: Settings View (v2.0)
 *
 * Interactive visual configuration panel:
 * - Theme preset cards with multi-dot color preview
 * - Card style selector (classic / glass / gradient)
 * - Individual color token pickers with live preview
 * - Shape & spacing sliders with preview card
 * - Font family selector with sample text
 * - Reset / Done action buttons
 *
 * All changes save to localStorage and apply via CSS variables in real-time.
 */

import type { LovelaceCardConfig, StrategyConfig, ThemePreset, Hass } from '../types';
import { THEME_PRESETS } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens, StoredVisualConfig } from '../utils/visual-config';
import { getEffectiveStoredVisualConfig, loadStoredConfig, saveStoredConfig, clearStoredConfig } from '../utils/visual-config';
import { generatePaletteGeneratorJS, MOOD_PRESETS } from '../themes/palette-generator';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue } from '../utils/html';
import { getConfiguredHiddenAreas, resolveEntityAreaId, UNASSIGNED_AREA_ID, UNASSIGNED_AREA_NAME } from '../utils/dashboard-model';
import {
  getSettingsSectionsCSS,
  generateSettingsSectionsJS,
  buildDashboardSection,
  buildQuickGenerateSection,
  buildHomeSection,
  buildHeaderSection,
  buildPeopleSection,
  buildAreasSection,
  buildDevicesSection,
  buildBlueprintsSection,
  buildThemeFilesSection,
  buildPermissionsSection,
  buildAboutSection,
  buildResetSection,
} from './settings-sections';

function isVisibleRegistryEntity(hass: Hass | undefined, entityId: string): boolean {
  const registryEntry = hass?.entities?.[entityId];
  return !registryEntry?.disabled_by && !registryEntry?.hidden_by;
}

export function buildSettingsView(config: StrategyConfig, tokens?: ResolvedTokens, hass?: Hass): LovelaceCardConfig[] {
  const stored: StoredVisualConfig = getEffectiveStoredVisualConfig(config) || {};
  const preset = (stored.theme || config.visual?.theme || 'light') as string;

  return [
    buildSettingsHeader(tokens),
    buildThemePresetCard(preset, tokens),
    buildSeedColorCard(stored, tokens),
    buildAutoMoodCard(stored, tokens),
    buildCardStyleCard(stored, tokens),
    buildLayoutConfigCard(stored, config, tokens, hass),
    buildColorPickerCard(stored, tokens),
    buildShapeCard(stored, tokens),
    buildFontCard(stored, tokens),
    buildActionCard(tokens),
  ];
}

/**
 * Build full settings content as raw HTML string (for embedding in layout card).
 * Combines 12 settings sections + existing visual settings.
 * NOTE: No <script> tags here — they are extracted and must be included
 * in the main layout card script block (nested scripts don't execute via innerHTML).
 */
export function buildSettingsHTML(config: StrategyConfig, tokens?: ResolvedTokens, hass?: Hass): string {
  const blueprintPages = config.hdp_config?.blueprints?.pages || config.blueprint_pages || [];

  // Extract visual settings HTML from existing card builders
  // Strip both <style> and <script> tags — scripts are handled separately
  const visualCards = buildSettingsView(config, tokens, hass);
  const visualStyles = visualCards.map(card => {
    const content = (card.content as string) || '';
    return (content.match(/<style>[\s\S]*?<\/style>/g) || [])
      .map(style => style.replace(/^<style>/, '').replace(/<\/style>$/, ''))
      .filter(style => !isDesignTokenStyle(style))
      .map(scopeVisualStyle)
      .join('\n');
  }).filter(Boolean).join('\n');

  const visualHTML = visualCards.map(card => {
    const content = (card.content as string) || '';
    return repairMergedVisualHTML(content
      .replace(/<style>[\s\S]*?<\/style>/g, '')
      .replace(/<script>[\s\S]*?<\/script>/g, '')
      .trim());
  }).join('\n');

  // Wrap visual settings in a collapsible section
  const visualSection = `<div class="st-section st-section--open" id="st-visual" data-component="settings-visual">
    <div class="st-section-hdr" data-action="toggle-section" data-section="st-visual" role="button" aria-expanded="true" tabindex="0" onclick="hdpToggleSection('st-visual')" onkeydown="if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); this.click(); }">
      <div class="st-section-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
      <span class="st-section-title">视觉设置</span>
      <svg class="st-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="st-section-body" id="st-visual-body">
      ${visualHTML}
    </div>
  </div>`;

  return `
<style>
${getSettingsSectionsCSS()}
  .hdp-view[data-view="settings"] .hdp-area-content,
  .hdp-view[data-view="hdp-settings"] .hdp-area-content {
    width: min(100%, 1040px);
    margin: 0 auto;
  }
${visualStyles}
  /* Visual settings card spacing & wrappers */
  #st-visual-body > div {
    padding: 16px;
    margin-bottom: 12px;
    border-radius: var(--hdp-radius, 14px);
    background: var(--hdp-card-bg, #fff);
    border: 1px solid var(--hdp-border, rgba(0,0,0,0.06));
    transition: border-color 0.2s ease;
  }
  #st-visual-body > div:last-child { margin-bottom: 0; }
  #st-visual-body > div:hover { border-color: var(--hdp-primary, #4F6EF7); }
  /* Settings header doesn't need card wrapper */
  #st-visual-body > div[data-component="settings-header"] {
    padding: 4px 0 0 0;
    margin-bottom: 16px;
    background: transparent;
    border: none;
  }
  #st-visual-body > div[data-component="settings-header"]:hover { border: none; }
  /* Action card full width */
  #st-visual-body > div[data-component="settings-actions"] {
    display: flex;
    gap: 12px;
  }
  /* Selectable items in visual cards */
  .theme-card, .mood-card, .style-card, .font-card {
    border-radius: var(--hdp-radius, 14px);
    transition: all 0.2s ease;
  }
  /* Toggle switch consistency */
  .toggle-switch {
    width: 44px; height: 24px;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }
  .toggle-switch--on { background: var(--hdp-primary, #4F6EF7); }
  .toggle-switch--off { background: var(--hdp-divider, rgba(0,0,0,0.08)); }
  .toggle-switch::after {
    content: '';
    position: absolute;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: white;
    top: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    transition: transform 0.2s ease;
  }
  .toggle-switch--on::after { transform: translateX(20px); }
  .toggle-switch--off::after { transform: translateX(2px); border: 1px solid var(--hdp-border); }

  /* Stable visual-settings layout when individual html-card bodies are merged */
  #st-visual-body,
  #st-visual-body * {
    box-sizing: border-box;
  }
  #st-visual-body .settings-section {
    width: 100%;
    box-sizing: border-box;
  }
  #st-visual-body .settings-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }
  #st-visual-body .settings-title,
  #st-visual-body .lc-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text, #1A1D26);
    margin: 0 0 10px 0;
  }
  #st-visual-body .settings-subtitle,
  #st-visual-body .lc-subtitle {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-muted, #9CA3AF);
    margin: 0 0 14px 0;
  }
  #st-visual-body .lc-sub-section {
    margin-bottom: 18px;
  }
  #st-visual-body .lc-sub-section:last-child {
    margin-bottom: 0;
  }
  #st-visual-body .theme-grid,
  #st-visual-body .mood-grid,
  #st-visual-body .style-grid,
  #st-visual-body .font-grid,
  #st-visual-body .lc-density-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
    gap: 10px;
    width: 100%;
    align-items: stretch;
  }
  #st-visual-body .mood-grid {
    grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  }
  #st-visual-body .theme-card,
  #st-visual-body .mood-card,
  #st-visual-body .style-card,
  #st-visual-body .font-card,
  #st-visual-body .lc-density-btn {
    width: 100%;
    min-width: 0;
    min-height: 104px;
    box-sizing: border-box;
    border-radius: var(--hdp-radius, 14px);
    appearance: none;
    line-height: 1.25;
  }
  #st-visual-body .theme-label,
  #st-visual-body .theme-desc,
  #st-visual-body .mood-name,
  #st-visual-body .mood-name-en,
  #st-visual-body .style-label,
  #st-visual-body .style-desc,
  #st-visual-body .font-name,
  #st-visual-body .font-desc,
  #st-visual-body .lc-density-label,
  #st-visual-body .lc-density-desc {
    display: block;
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  #st-visual-body .theme-preview,
  #st-visual-body .mood-preview,
  #st-visual-body .style-preview {
    flex-shrink: 0;
  }
  #st-visual-body .theme-preview,
  #st-visual-body .mood-preview {
    width: 100%;
  }
  #st-visual-body .theme-meta,
  #st-visual-body .mood-meta,
  #st-visual-body .style-meta,
  #st-visual-body .font-meta,
  #st-visual-body .color-info,
  #st-visual-body .seed-custom-info,
  #st-visual-body .am-toggle-info,
  #st-visual-body .am-period-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  #st-visual-body .theme-preview-text,
  #st-visual-body .color-label,
  #st-visual-body .color-desc,
  #st-visual-body .seed-custom-label,
  #st-visual-body .seed-custom-desc,
  #st-visual-body .am-toggle-label,
  #st-visual-body .am-toggle-desc,
  #st-visual-body .am-period-label,
  #st-visual-body .am-period-time {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  #st-visual-body button {
    font: inherit;
    box-sizing: border-box;
  }
  #st-visual-body svg {
    max-width: 100%;
    flex-shrink: 0;
  }
  #st-visual-body .settings-studio-btn {
    margin-top: 14px;
    min-height: 44px;
    padding: 10px 20px;
    border-radius: var(--hdp-radius, 14px);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: var(--hdp-gradient-primary, linear-gradient(135deg, var(--hdp-primary, #4F6EF7), var(--hdp-info, #38BDF8)));
    color: var(--hdp-text-inverse, #fff);
    box-shadow: 0 4px 12px var(--hdp-primary-glow, rgba(79,110,247,0.15));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: 100%;
  }
  #st-visual-body .settings-studio-btn svg {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }
  #st-visual-body .theme-card,
  #st-visual-body .mood-card,
  #st-visual-body .style-card,
  #st-visual-body .font-card,
  #st-visual-body .lc-density-btn {
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    border: 2px solid var(--hdp-border, rgba(0,0,0,0.06));
    background: var(--hdp-card-bg, #fff);
    color: var(--hdp-text, #1A1D26);
    overflow: hidden;
    position: relative;
    padding: 0;
    text-align: left;
  }
  #st-visual-body .style-card,
  #st-visual-body .font-card,
  #st-visual-body .lc-density-btn {
    padding: 12px;
  }
  #st-visual-body .theme-card--active,
  #st-visual-body .mood-card--active,
  #st-visual-body .style-card--active,
  #st-visual-body .font-card--active,
  #st-visual-body .lc-density-btn--active {
    border-color: var(--hdp-primary, #4F6EF7);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.15));
  }
  #st-visual-body .theme-preview,
  #st-visual-body .mood-preview {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #st-visual-body .theme-meta,
  #st-visual-body .mood-meta {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-top: 1px solid var(--hdp-divider, rgba(0,0,0,0.04));
  }
  #st-visual-body .theme-dot-row {
    display: flex;
    align-items: center;
  }
  #st-visual-body .theme-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
  }
  #st-visual-body .mood-icon,
  #st-visual-body .am-period-icon {
    font-size: 18px;
    line-height: 1;
  }
  #st-visual-body .theme-check,
  #st-visual-body .mood-check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--hdp-primary, #4F6EF7);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #st-visual-body .toggle-switch {
    width: 44px;
    height: 24px;
    border-radius: 999px;
    position: relative;
    cursor: pointer;
    background: var(--hdp-divider, rgba(0,0,0,0.08));
  }
  #st-visual-body .toggle-switch--on {
    background: var(--hdp-primary, #4F6EF7);
  }
  #st-visual-body .toggle-switch::after {
    display: none;
  }
  #st-visual-body .toggle-switch-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.18);
    transition: left 0.2s ease, transform 0.2s ease;
  }
  #st-visual-body .toggle-switch--on .toggle-switch-knob {
    left: 22px;
  }
  #st-visual-body .seed-color-picker,
  #st-visual-body input[type="color"] {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border: 2px solid var(--hdp-border, rgba(0,0,0,0.06));
    border-radius: 10px;
    padding: 2px;
    background: transparent;
  }
  #st-visual-body .color-input-group,
  #st-visual-body .seed-custom-input {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  #st-visual-body .color-swatch-wrap {
    position: relative;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
  }
  #st-visual-body .color-picker {
    position: absolute;
    inset: 0;
    width: 32px;
    height: 32px;
    opacity: 0;
    cursor: pointer;
    z-index: 1;
  }
  #st-visual-body .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 2px solid var(--hdp-border, rgba(0,0,0,0.06));
    pointer-events: none;
  }
  #st-visual-body .color-hex {
    font-family: 'SF Mono', 'Cascadia Code', monospace;
    font-size: 12px;
    color: var(--hdp-text-secondary, #6B7280);
    min-width: 60px;
    text-align: right;
  }
  #st-visual-body select,
  #st-visual-body input:not([type="color"]) {
    min-height: 36px;
    max-width: 100%;
    border-radius: var(--hdp-radius-sm, 6px);
    border: 1px solid var(--hdp-border, rgba(0,0,0,0.08));
    background: var(--hdp-card-bg, #fff);
    color: var(--hdp-text, #1A1D26);
    padding: 6px 10px;
    font: inherit;
    box-sizing: border-box;
  }
  #st-visual-body .color-row,
  #st-visual-body .seed-custom-row,
  #st-visual-body .seed-toggle-row,
  #st-visual-body .toggle-row,
  #st-visual-body .slider-header,
  #st-visual-body .am-period-row,
  #st-visual-body .am-toggle-row,
  #st-visual-body .lc-size-row,
  #st-visual-body .lc-skin-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  #st-visual-body .color-row,
  #st-visual-body .seed-custom-row,
  #st-visual-body .seed-toggle-row,
  #st-visual-body .toggle-row,
  #st-visual-body .slider-header,
  #st-visual-body .am-toggle-row,
  #st-visual-body .lc-size-row,
  #st-visual-body .lc-skin-row {
    justify-content: space-between;
  }
  #st-visual-body .color-info,
  #st-visual-body .seed-custom-info,
  #st-visual-body .am-period-info {
    min-width: 0;
    flex: 1 1 auto;
  }
  #st-visual-body .color-input-group,
  #st-visual-body .seed-custom-input,
  #st-visual-body .toggle-switch,
  #st-visual-body .lc-skin-select {
    flex: 0 0 auto;
  }
  @media (max-width: 720px) {
    #st-visual-body .theme-grid,
    #st-visual-body .mood-grid,
    #st-visual-body .style-grid,
    #st-visual-body .font-grid,
    #st-visual-body .lc-density-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    #st-visual-body .color-row,
    #st-visual-body .seed-custom-row,
    #st-visual-body .seed-toggle-row,
    #st-visual-body .toggle-row,
    #st-visual-body .slider-header,
    #st-visual-body .am-period-row,
    #st-visual-body .am-toggle-row,
    #st-visual-body .lc-size-row,
    #st-visual-body .lc-skin-row {
      align-items: flex-start;
      flex-wrap: wrap;
    }
  }
  @media (max-width: 420px) {
    #st-visual-body .theme-grid,
    #st-visual-body .mood-grid,
    #st-visual-body .style-grid,
    #st-visual-body .font-grid,
    #st-visual-body .lc-density-row {
      grid-template-columns: 1fr;
    }
  }
</style>
${buildDashboardSection(config)}
${hass ? buildQuickGenerateSection(hass, config) : ''}
${buildHomeSection(config)}
${buildHeaderSection(config)}
${hass ? buildPeopleSection(hass, config) : ''}
${hass ? buildAreasSection(hass, config) : ''}
${buildDevicesSection(config, hass)}
${buildBlueprintsSection(blueprintPages)}
${visualSection}
${buildThemeFilesSection()}
${buildPermissionsSection(config)}
${buildAboutSection()}
${buildResetSection()}`;
}

function isDesignTokenStyle(css: string): boolean {
  return css.includes(':host, :root') && css.includes('--hdp-primary:');
}

function scopeVisualStyle(css: string): string {
  return scopeCSSBlock(css);
}

function scopeCSSBlock(css: string): string {
  let output = '';
  let cursor = 0;

  while (cursor < css.length) {
    const open = css.indexOf('{', cursor);
    if (open === -1) {
      output += css.slice(cursor);
      break;
    }

    const selector = css.slice(cursor, open).trim();
    const close = findMatchingCSSBrace(css, open);
    if (close === -1) {
      output += css.slice(cursor);
      break;
    }

    const body = css.slice(open + 1, close);
    if (selector.startsWith('@media') || selector.startsWith('@supports') || selector.startsWith('@container')) {
      output += `${selector} {${scopeCSSBlock(body)}}`;
    } else if (selector.startsWith('@')) {
      output += `${selector} {${body}}`;
    } else if (selector) {
      output += `${scopeVisualSelectors(selector)} {${body}}`;
    }
    cursor = close + 1;
  }

  return output;
}

function findMatchingCSSBrace(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function scopeVisualSelectors(selectors: string): string {
  return selectors
    .split(',')
    .map(selector => selector.trim())
    .filter(Boolean)
    .map(scopeVisualSelector)
    .join(', ');
}

function scopeVisualSelector(selector: string): string {
  if (!selector) return selector;
  if (selector.startsWith('#st-visual-body')) return selector;
  if (selector.startsWith(':root') || selector.startsWith('html') || selector.startsWith('body')) return selector;
  if (selector.startsWith(':host')) return selector.replace(':host', '#st-visual-body');
  return `#st-visual-body ${selector}`;
}

function repairMergedVisualHTML(html: string): string {
  return html
    .replace(/([^<])\/(div|span|button|label|select|option|textarea)>/g, '$1</$2>')
    .replace(/(\saria-label="[^"]*?)\s\/>/g, '$1" />');
}

/**
 * Generate all settings-related JavaScript for the main script block.
 * Includes settings sections JS + visual settings JS from all cards.
 */
export function generateSettingsJS(config: StrategyConfig, tokens?: ResolvedTokens, hass?: Hass): string {
  const visualCards = buildSettingsView(config, tokens, hass);
  const scripts = visualCards.map(card => {
    const content = (card.content as string) || '';
    const matches = content.match(/<script>([\s\S]*?)<\/script>/g);
    if (!matches) return '';
    return matches.map(m => scopeVisualScript(m.replace(/<\/?script>/g, ''))).join('\n');
  }).filter(Boolean).join('\n');

  return `
${generateSettingsSectionsJS()}
${generatePaletteGeneratorJS()}
${generateVisualConfigPersistenceJS()}
${generateVisualQueryScopeJS()}
${scripts}`;
}

function scopeVisualScript(script: string): string {
  return script.replace(/document\.querySelectorAll\(/g, 'hdpVisualQueryAll(');
}

function generateVisualQueryScopeJS(): string {
  return `
function hdpVisualQueryAll(selector) {
  var root = document.getElementById('st-visual-body');
  return (root || document).querySelectorAll(selector);
}
`;
}

function generateVisualConfigPersistenceJS(): string {
  return `
window.hdpReplaceVisualConfig = function(config) {
  var cfg = config || {};
  var current = typeof hdpLoadConfig === 'function' ? hdpLoadConfig() : {};
  current.visual = cfg;
  try {
    localStorage.setItem('hdp_config', JSON.stringify(current));
  } catch(e) {
    console.warn('[HDP] Failed to save HDP visual config', e);
  }
  return current;
};

window.hdpSaveVisualConfig = function(config) {
  var cfg = config || {};
  try {
    localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
  } catch(e) {
    console.warn('[HDP] Failed to save visual config locally', e);
  }
  var fullConfig = typeof hdpReplaceVisualConfig === 'function'
    ? hdpReplaceVisualConfig(cfg)
    : (typeof hdpSaveConfig === 'function' ? hdpSaveConfig({ visual: cfg }) : null);
  if (typeof hdpSaveToLovelace === 'function' && fullConfig) {
    return hdpSaveToLovelace(fullConfig).catch(function(err) {
      console.warn('[HDP] Lovelace visual sync failed, saved locally only', err);
      return cfg;
    });
  }
  return Promise.resolve(cfg);
};

window.hdpSaveVisualConfigAndReload = function(config, delay) {
  var wait = delay == null ? 0 : delay;
  var reload = function() {
    setTimeout(function() { location.reload(); }, wait);
  };
  return hdpSaveVisualConfig(config).then(reload).catch(reload);
};

window.hdpClearVisualConfigAndReload = function(delay) {
  var wait = delay == null ? 0 : delay;
  var reload = function() {
    setTimeout(function() { location.reload(); }, wait);
  };
  try {
    localStorage.removeItem('hdp_visual_config');
  } catch(e) {}
  if (typeof hdpReplaceVisualConfig === 'function') {
    hdpReplaceVisualConfig({});
  }
  var fullConfig = typeof hdpLoadConfig === 'function' ? hdpLoadConfig() : null;
  if (typeof hdpSaveToLovelace === 'function' && fullConfig) {
    return hdpSaveToLovelace(fullConfig).then(reload).catch(function(err) {
      console.warn('[HDP] Lovelace visual reset sync failed, cleared locally only', err);
      reload();
    });
  }
  reload();
  return Promise.resolve();
};
`;
}

// ─── Settings Header ──────────────────────────────────────────────────────

function buildSettingsHeader(tokens?: ResolvedTokens): LovelaceCardConfig {
  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-header {
    padding: 4px 0 0 0;
  }
  .settings-header-title {
    font-size: 22px; font-weight: 700; color: var(--hdp-text);
    letter-spacing: -0.3px; margin-bottom: 4px;
  }
  .settings-header-sub {
    font-size: 13px; color: var(--hdp-text-secondary);
  }
</style>
<div class="settings-header" data-component="settings-header">
  <div class="settings-header-title">视觉设置</div>
  <div class="settings-header-sub">自定义仪表盘外观，所有更改实时生效</div>
  <button class="settings-studio-btn" id="settings-studio-btn" data-component="studio-entry">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    主题工作室
  </button>
</div>
<style>
  .settings-studio-btn {
    margin-top: 14px;
    padding: 10px 20px;
    border-radius: var(--hdp-radius);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--hdp-font);
    border: none;
    background: var(--hdp-gradient-primary);
    color: white;
    box-shadow: 0 4px 12px var(--hdp-primary-glow);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: var(--hdp-transition);
  }
  .settings-studio-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--hdp-primary-glow);
  }
  .settings-studio-btn svg {
    width: 18px;
    height: 18px;
  }
</style>
<script>
  (function() {
    var btn = document.getElementById('settings-studio-btn');
    if (btn) {
      btn.addEventListener('click', function() {
        if (typeof window.hdpOpenStudio === 'function') {
          window.hdpOpenStudio();
        }
      });
    }
  })();
</script>`,
  };
}

// ─── Theme Preset Card ────────────────────────────────────────────────────

function buildThemePresetCard(current: string, tokens?: ResolvedTokens): LovelaceCardConfig {
  const presets: {
    key: ThemePreset;
    label: string;
    desc: string;
    dots: string[];
    textColor: string;
  }[] = [
    {
      key: 'light',
      label: '浅色',
      desc: '清新明亮',
      dots: ['#F4F6FA', '#FFFFFF', '#4F6EF7', '#7C6EF7'],
      textColor: '#1A1D26',
    },
    {
      key: 'dark',
      label: '深色',
      desc: '沉浸暗色',
      dots: ['#0C0E14', '#161922', '#6B85F9', '#9DA5FF'],
      textColor: '#F1F3F8',
    },
    {
      key: 'warm',
      label: '暖色',
      desc: '温馨家居',
      dots: ['#FBF8F3', '#FFFFFF', '#C2702E', '#B8860B'],
      textColor: '#2C1810',
    },
    {
      key: 'forest',
      label: '森林',
      desc: '自然清新',
      dots: ['#F0F7F2', '#FFFFFF', '#2D7A4F', '#3D9A65'],
      textColor: '#1A2E22',
    },
  ];

  const cards = presets
    .map((p) => {
      const isActive = current === p.key;
      const dots = p.dots
        .map(
          (color, i) =>
            `<span class="theme-dot" style="background: ${color}; ${i > 0 ? 'margin-left: -4px;' : ''} border: 2px solid ${p.dots[1]};"></span>`,
        )
        .join('');

      return `<button class="theme-card ${isActive ? 'theme-card--active' : ''}" data-preset="${p.key}" data-component="theme-card">
        <div class="theme-preview" style="background: ${p.dots[0]};">
          <div class="theme-dot-row">${dots}</div>
          <div class="theme-preview-text" style="color: ${p.textColor}; font-size: 11px; margin-top: 6px; font-weight: 600;">Aa</div>
        </div>
        <div class="theme-meta">
          <span class="theme-label">${p.label}</span>
          <span class="theme-desc">${p.desc}</span>
        </div>
        ${isActive ? '<div class="theme-check"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/></svg></div>' : ''}
      </button>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 14px;
  }
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  @media (max-width: 480px) {
    .theme-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .theme-card {
    display: flex; flex-direction: column;
    border: 2px solid var(--hdp-border);
    border-radius: var(--hdp-radius);
    overflow: hidden; cursor: pointer;
    background: var(--hdp-card-bg);
    position: relative;
    transition: var(--hdp-transition);
    padding: 0;
  }
  .theme-card:hover { border-color: var(--hdp-primary); }
  .theme-card--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow);
  }
  .theme-preview {
    height: 56px; display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  .theme-dot-row {
    display: flex; align-items: center;
  }
  .theme-dot {
    width: 14px; height: 14px;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
  }
  .theme-meta {
    padding: 8px 10px;
    display: flex; flex-direction: column; gap: 2px;
    border-top: 1px solid var(--hdp-divider);
  }
  .theme-label {
    font-size: 13px; font-weight: 600; color: var(--hdp-text);
    text-align: left;
  }
  .theme-desc {
    font-size: 11px; color: var(--hdp-text-muted);
    text-align: left;
  }
  .theme-check {
    position: absolute;
    top: 6px; right: 6px;
    width: 20px; height: 20px;
    background: var(--hdp-primary);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
</style>
<div class="settings-section" data-component="theme-presets">
  <div class="settings-title">主题预设</div>
  <div class="theme-grid">${cards}</div>
</div>
<script>
  (function() {
    document.querySelectorAll('.theme-card').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var preset = this.getAttribute('data-preset');
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.theme = preset;
        hdpSaveVisualConfigAndReload(cfg);
      });
    });
  })();
</script>`,
  };
}

// ─── Seed Color Engine Card ───────────────────────────────────────────────

function buildSeedColorCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const currentMood = (stored.mood_preset as string) || '';
  const currentSeed = escapeAttribute((stored.seed_color as string) || '');
  const currentSeedValue = currentSeed || '#4F6EF7';
  const autoDark = stored.auto_dark !== false;

  const moodCards = MOOD_PRESETS.map(m => {
    const isActive = currentMood === m.id;
    const seed = escapeInlineStyleValue(m.seed);
    return `<button class="mood-card ${isActive ? 'mood-card--active' : ''}" data-mood="${escapeAttribute(m.id)}" data-component="mood-card">
      <div class="mood-preview" style="background: linear-gradient(135deg, ${seed} 0%, ${seed}99 100%);">
        <span class="mood-icon">${escapeHTML(m.icon)}</span>
      </div>
      <div class="mood-meta">
        <span class="mood-name">${escapeHTML(m.name)}</span>
        <span class="mood-name-en">${escapeHTML(m.name_en)}</span>
      </div>
      ${isActive ? '<div class="mood-check"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/></svg></div>' : ''}
    </button>`;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 6px;
  }
  .settings-subtitle {
    font-size: 12px; color: var(--hdp-text-muted);
    margin-bottom: 14px;
  }
  .mood-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }
  @media (max-width: 480px) {
    .mood-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .mood-card {
    display: flex; flex-direction: column;
    border: 2px solid var(--hdp-border);
    border-radius: var(--hdp-radius);
    overflow: hidden; cursor: pointer;
    background: var(--hdp-card-bg);
    position: relative;
    transition: var(--hdp-transition);
    padding: 0;
  }
  .mood-card:hover { border-color: var(--hdp-primary); transform: translateY(-2px); }
  .mood-card--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow);
  }
  .mood-preview {
    height: 48px; display: flex;
    align-items: center; justify-content: center;
    font-size: 22px;
  }
  .mood-meta {
    padding: 8px 10px;
    display: flex; flex-direction: column; gap: 2px;
    border-top: 1px solid var(--hdp-divider);
  }
  .mood-name {
    font-size: 13px; font-weight: 600; color: var(--hdp-text);
    text-align: left;
  }
  .mood-name-en {
    font-size: 10px; color: var(--hdp-text-muted);
    text-align: left;
  }
  .mood-check {
    position: absolute;
    top: 6px; right: 6px;
    width: 18px; height: 18px;
    background: var(--hdp-primary);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .seed-custom-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-top: 1px solid var(--hdp-divider);
  }
  .seed-custom-info {
    display: flex; flex-direction: column; gap: 2px;
  }
  .seed-custom-label {
    font-size: 14px; font-weight: 500; color: var(--hdp-text);
  }
  .seed-custom-desc {
    font-size: 11px; color: var(--hdp-text-muted);
  }
  .seed-custom-input {
    display: flex; align-items: center; gap: 10px;
  }
  .seed-color-picker {
    width: 36px; height: 36px;
    border: 2px solid var(--hdp-border);
    border-radius: 10px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background: none;
    padding: 0;
  }
  .seed-color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
  }
  .seed-color-picker::-webkit-color-swatch {
    border: none;
    border-radius: 8px;
  }
  .seed-hex {
    font-size: 12px; font-family: 'SF Mono', 'Cascadia Code', monospace;
    color: var(--hdp-text-secondary); min-width: 70px;
  }
  .seed-toggle-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-top: 1px solid var(--hdp-divider);
  }
  .seed-clear-row {
    margin-top: 10px;
    text-align: center;
  }
  .seed-clear-btn {
    font-size: 12px; color: var(--hdp-text-muted);
    background: none; border: none; cursor: pointer;
    text-decoration: underline;
    transition: color 0.2s;
  }
  .seed-clear-btn:hover { color: var(--hdp-danger); }
</style>
<div class="settings-section" data-component="seed-color-engine">
  <div class="settings-title">一色生万象</div>
  <div class="settings-subtitle">选择一个氛围或自定义种子色，自动生成完整色板</div>
  <div class="mood-grid">${moodCards}</div>
  <div class="seed-custom-row">
    <div class="seed-custom-info">
      <span class="seed-custom-label">自定义种子色</span>
      <span class="seed-custom-desc">从任意颜色生成主题</span>
    </div>
    <div class="seed-custom-input">
      <input type="color" class="seed-color-picker" id="seed-color-input" value="${escapeAttribute(currentSeed || '#4F6EF7')}" aria-label="自定义种子色" />
      <span class="seed-hex" id="seed-color-hex">${escapeHTML(currentSeedValue)}</span>
    </div>
  </div>
  <div class="seed-toggle-row">
    <div class="seed-custom-info">
      <span class="seed-custom-label">自动明暗模式</span>
      <span class="seed-custom-desc">20:00-06:00 自动切换暗色色板</span>
    </div>
    <div class="toggle-switch ${autoDark ? 'toggle-switch--on' : 'toggle-switch--off'}" id="auto-dark-toggle" data-component="auto-dark-toggle">
      <div class="toggle-switch-knob"></div>
    </div>
  </div>
  ${(currentMood || currentSeed) ? '<div class="seed-clear-row"><button class="seed-clear-btn" id="seed-clear-btn">清除种子色，恢复主题预设</button></div>' : ''}
</div>
<script>
  (function() {
    // Mood preset selection
    document.querySelectorAll('.mood-card').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var moodId = this.getAttribute('data-mood');
        var autoDark = document.getElementById('auto-dark-toggle');
        var isAutoDark = autoDark ? autoDark.className.indexOf('toggle-switch--on') !== -1 : true;
        var palette = window.HDP_Palette.generateFromMood(moodId, isAutoDark);
        if (!palette) return;
        window.HDP_Palette.applyPaletteToCSS(palette);
        palette.mood_id = moodId;
        palette.seed = this.querySelector('.mood-preview') ? undefined : palette.seed;
        // Save to localStorage
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.mood_preset = moodId;
        cfg.seed_color = undefined;
        delete cfg.seed_color;
        cfg.card_style = palette.card_style;
        cfg.border_radius = palette.border_radius;
        cfg.primary = palette.primary;
        cfg.page_bg = palette.page_bg;
        cfg.card_bg = palette.card_bg;
        cfg.text_primary = palette.text_primary;
        cfg.text_secondary = palette.text_secondary;
        cfg.border = palette.border;
        cfg.auto_dark = isAutoDark;
        hdpSaveVisualConfigAndReload(cfg);
      });
    });

    // Custom seed color picker
    var seedInput = document.getElementById('seed-color-input');
    var seedHex = document.getElementById('seed-color-hex');
    if (seedInput) {
      seedInput.addEventListener('input', function() {
        var val = this.value;
        if (seedHex) seedHex.textContent = val;
        var autoDarkEl = document.getElementById('auto-dark-toggle');
        var isAutoDark = autoDarkEl ? autoDarkEl.className.indexOf('toggle-switch--on') !== -1 : true;
        var mode = isAutoDark ? 'auto' : 'light';
        var palette = window.HDP_Palette.generate(val, mode);
        var isDark = isAutoDark && window.HDP_Palette.shouldUseDarkMode();
        palette.card_style = isDark ? 'aurora' : 'glass';
        palette.border_radius = 14;
        palette.mood_id = 'custom';
        palette.mood_name = '自定义';
        palette.seed = val;
        window.HDP_Palette.applyPaletteToCSS(palette);
      });
      seedInput.addEventListener('change', function() {
        var val = this.value;
        var autoDarkEl = document.getElementById('auto-dark-toggle');
        var isAutoDark = autoDarkEl ? autoDarkEl.className.indexOf('toggle-switch--on') !== -1 : true;
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.seed_color = val;
        cfg.mood_preset = 'custom';
        cfg.auto_dark = isAutoDark;
        // Generate and save all palette colors
        var mode = isAutoDark ? 'auto' : 'light';
        var palette = window.HDP_Palette.generate(val, mode);
        var isDark = isAutoDark && window.HDP_Palette.shouldUseDarkMode();
        cfg.card_style = isDark ? 'aurora' : 'glass';
        cfg.border_radius = 14;
        cfg.primary = palette.primary;
        cfg.page_bg = palette.page_bg;
        cfg.card_bg = palette.card_bg;
        cfg.text_primary = palette.text_primary;
        cfg.text_secondary = palette.text_secondary;
        cfg.border = palette.border;
        hdpSaveVisualConfigAndReload(cfg);
      });
    }

    // Auto dark mode toggle
    var darkToggle = document.getElementById('auto-dark-toggle');
    if (darkToggle) {
      darkToggle.addEventListener('click', function() {
        var isOn = this.className.indexOf('toggle-switch--on') !== -1;
        this.className = 'toggle-switch ' + (isOn ? 'toggle-switch--off' : 'toggle-switch--on');
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.auto_dark = !isOn;
        hdpSaveVisualConfigAndReload(cfg);
      });
    }

    // Clear seed color
    var clearBtn = document.getElementById('seed-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        delete cfg.mood_preset;
        delete cfg.seed_color;
        delete cfg.auto_dark;
        // Clear palette-generated colors too
        delete cfg.primary;
        delete cfg.page_bg;
        delete cfg.card_bg;
        delete cfg.text_primary;
        delete cfg.text_secondary;
        delete cfg.border;
        delete cfg.card_style;
        delete cfg.border_radius;
        hdpSaveVisualConfigAndReload(cfg);
      });
    }
  })();
</script>`,
  };
}

// ─── Auto Mood Card (Phase 6) ─────────────────────────────────────────────

function buildAutoMoodCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const autoMood = stored.auto_mood === true;
  const timeMoods = stored.time_moods || {};

  const periods = [
    { key: 'dawn', label: '晨间', time: '06:00 - 10:00', icon: '🌅', default: 'coral' },
    { key: 'day', label: '日间', time: '10:00 - 17:00', icon: '☀️', default: 'mono' },
    { key: 'dusk', label: '傍晚', time: '17:00 - 20:00', icon: '🌇', default: 'amber' },
    { key: 'night', label: '夜间', time: '20:00 - 23:00', icon: '🌙', default: 'abyss' },
    { key: 'midnight', label: '深夜', time: '23:00 - 06:00', icon: '✨', default: 'mono' },
  ];

  // Determine current time period for highlight
  const hour = new Date().getHours();
  let currentPeriod = 'day';
  if (hour >= 6 && hour < 10) currentPeriod = 'dawn';
  else if (hour >= 10 && hour < 17) currentPeriod = 'day';
  else if (hour >= 17 && hour < 20) currentPeriod = 'dusk';
  else if (hour >= 20 && hour < 23) currentPeriod = 'night';
  else currentPeriod = 'midnight';

  const moodOptions = MOOD_PRESETS.map(m =>
    `<option value="${escapeAttribute(m.id)}">${escapeHTML(m.name)} ${escapeHTML(m.name_en)}</option>`
  ).join('');

  const periodRows = periods.map(p => {
    const currentMood = (timeMoods as any)[p.key] || p.default;
    const isCurrent = p.key === currentPeriod;
    const options = MOOD_PRESETS.map(m =>
      `<option value="${escapeAttribute(m.id)}" ${m.id === currentMood ? 'selected' : ''}>${escapeHTML(m.name)} ${escapeHTML(m.name_en)}</option>`
    ).join('');
    return `<div class="am-period-row ${isCurrent ? 'am-period-row--current' : ''}" data-period="${escapeAttribute(p.key)}">
      <div class="am-period-info">
        <span class="am-period-icon">${escapeHTML(p.icon)}</span>
        <div class="am-period-text">
          <span class="am-period-label">${p.label} ${isCurrent ? '<span class="am-now-badge">当前</span>' : ''}</span>
          <span class="am-period-time">${escapeHTML(p.time)}</span>
        </div>
      </div>
      <select class="am-mood-select" data-period="${escapeAttribute(p.key)}" ${autoMood ? '' : 'disabled'}>
        ${options}
      </select>
    </div>`;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 6px;
  }
  .settings-subtitle {
    font-size: 12px; color: var(--hdp-text-muted);
    margin-bottom: 14px;
  }
  .am-toggle-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--hdp-divider);
    margin-bottom: 10px;
  }
  .am-toggle-info {
    display: flex; flex-direction: column; gap: 2px;
  }
  .am-toggle-label {
    font-size: 14px; font-weight: 500; color: var(--hdp-text);
  }
  .am-toggle-desc {
    font-size: 11px; color: var(--hdp-text-muted);
  }
  .toggle-switch {
    width: 44px; height: 26px;
    border-radius: 13px;
    position: relative;
    cursor: pointer;
    transition: background var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .toggle-switch--on { background: var(--hdp-primary); }
  .toggle-switch--off { background: var(--hdp-divider); }
  .toggle-switch-knob {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    position: absolute;
    top: 2px;
    transition: left var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .toggle-switch--on .toggle-switch-knob { left: 20px; }
  .toggle-switch--off .toggle-switch-knob { left: 2px; }
  .am-periods {
    display: flex; flex-direction: column;
    gap: 4px;
    transition: opacity 0.3s ease;
  }
  .am-periods--disabled {
    opacity: 0.4; pointer-events: none;
  }
  .am-period-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: var(--hdp-radius);
    transition: background 0.2s ease;
  }
  .am-period-row--current {
    background: var(--hdp-primary-light);
    border: 1px solid color-mix(in srgb, var(--hdp-primary) 20%, transparent);
  }
  .am-period-info {
    display: flex; align-items: center; gap: 10px;
  }
  .am-period-icon {
    font-size: 18px;
  }
  .am-period-text {
    display: flex; flex-direction: column; gap: 2px;
  }
  .am-period-label {
    font-size: 13px; font-weight: 600; color: var(--hdp-text);
    display: flex; align-items: center; gap: 6px;
  }
  .am-now-badge {
    font-size: 9px; font-weight: 700;
    color: white;
    background: var(--hdp-primary);
    padding: 1px 6px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .am-period-time {
    font-size: 11px; color: var(--hdp-text-muted);
    font-family: 'SF Mono', 'Cascadia Code', monospace;
  }
  .am-mood-select {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .am-mood-select:hover { border-color: var(--hdp-primary); }
  .am-mood-select:focus { border-color: var(--hdp-primary); }
  .am-mood-select:disabled { cursor: not-allowed; }
</style>
<div class="settings-section" data-component="auto-mood">
  <div class="settings-title">上下文自适应</div>
  <div class="settings-subtitle">主题随时间自动切换氛围，区域各有性格</div>
  <div class="am-toggle-row">
    <div class="am-toggle-info">
      <span class="am-toggle-label">自动氛围切换</span>
      <span class="am-toggle-desc">每 5 分钟检测时间段，自动切换氛围预设</span>
    </div>
    <div class="toggle-switch ${autoMood ? 'toggle-switch--on' : 'toggle-switch--off'}" id="auto-mood-toggle" data-component="auto-mood-toggle">
      <div class="toggle-switch-knob"></div>
    </div>
  </div>
  <div class="am-periods ${autoMood ? '' : 'am-periods--disabled'}" id="am-periods">
    ${periodRows}
  </div>
</div>
<script>
  (function() {
    // Auto mood toggle
    var moodToggle = document.getElementById('auto-mood-toggle');
    var periodsEl = document.getElementById('am-periods');
    if (moodToggle) {
      moodToggle.addEventListener('click', function() {
        var isOn = this.className.indexOf('toggle-switch--on') !== -1;
        this.className = 'toggle-switch ' + (isOn ? 'toggle-switch--off' : 'toggle-switch--on');
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.auto_mood = !isOn;
        if (periodsEl) {
          periodsEl.className = 'am-periods' + (!isOn ? '' : ' am-periods--disabled');
        }
        // Enable/disable selects
        document.querySelectorAll('.am-mood-select').forEach(function(sel) {
          sel.disabled = isOn;
        });
        hdpSaveVisualConfigAndReload(cfg);
      });
    }

    // Time period mood selectors
    document.querySelectorAll('.am-mood-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var period = this.getAttribute('data-period');
        var mood = this.value;
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        if (!cfg.time_moods) cfg.time_moods = {};
        cfg.time_moods[period] = mood;
        hdpSaveVisualConfigAndReload(cfg);
      });
    });
  })();
</script>`,
  };
}

// ─── Card Style Card ──────────────────────────────────────────────────────

function buildCardStyleCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const currentStyle = (stored.card_style as string) || 'classic';

  const styles = [
    {
      key: 'classic',
      label: '经典',
      desc: '纯色卡片 · 细微投影',
      preview: 'background: var(--hdp-card-bg); border: 1px solid var(--hdp-border); box-shadow: 0 1px 4px rgba(0,0,0,0.06);',
    },
    {
      key: 'glass',
      label: '毛玻璃',
      desc: '半透明 · 磨砂模糊',
      preview: 'background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3);',
    },
    {
      key: 'gradient',
      label: '渐变',
      desc: '渐变底纹 · 视觉层次',
      preview: 'background: linear-gradient(145deg, var(--hdp-card-bg) 0%, var(--hdp-primary-light) 100%); border: 1px solid var(--hdp-border);',
    },
    {
      key: 'aurora',
      label: '极光',
      desc: '径向光晕 · 暗色推荐',
      preview: 'background: var(--hdp-card-bg); border: 1px solid rgba(124,110,247,0.2); box-shadow: 0 0 0 1px rgba(79,110,247,0.05), 0 4px 16px rgba(79,110,247,0.12); position: relative; overflow: hidden;',
    },
    {
      key: 'soft',
      label: '柔影',
      desc: '双面投影 · 立体质感',
      preview: 'background: var(--hdp-bg); border: none; box-shadow: 4px 4px 8px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.8);',
    },
    {
      key: 'neon',
      label: '霓虹',
      desc: '发光边框 · 赛博风格',
      preview: 'background: var(--hdp-card-bg); border: 1px solid var(--hdp-primary); box-shadow: 0 0 8px rgba(79,110,247,0.4), inset 0 0 8px rgba(79,110,247,0.05);',
    },
  ];

  const cards = styles
    .map((s) => {
      const isActive = currentStyle === s.key;
      return `<button class="style-card ${isActive ? 'style-card--active' : ''}" data-style="${s.key}" data-component="style-card">
        <div class="style-preview-box" style="${s.preview} border-radius: 8px;">
          <div class="style-preview-line" style="width: 60%; height: 4px; border-radius: 2px; background: var(--hdp-text-muted); opacity: 0.4;"></div>
          <div class="style-preview-line" style="width: 40%; height: 4px; border-radius: 2px; background: var(--hdp-text-muted); opacity: 0.25;"></div>
        </div>
        <div class="style-meta">
          <span class="style-label">${s.label}</span>
          <span class="style-desc">${s.desc}</span>
        </div>
      </button>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 14px;
  }
  .style-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  @media (max-width: 480px) {
    .style-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .style-card {
    display: flex; flex-direction: column; gap: 10px;
    padding: 14px; border: 2px solid var(--hdp-border);
    border-radius: var(--hdp-radius);
    cursor: pointer; background: var(--hdp-card-bg);
    transition: var(--hdp-transition);
  }
  .style-card:hover { border-color: var(--hdp-primary); }
  .style-card--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow);
  }
  .style-preview-box {
    height: 44px; padding: 10px;
    display: flex; flex-direction: column;
    justify-content: center; gap: 6px;
  }
  .style-meta {
    display: flex; flex-direction: column; gap: 2px;
  }
  .style-label {
    font-size: 13px; font-weight: 600; color: var(--hdp-text);
    text-align: left;
  }
  .style-desc {
    font-size: 11px; color: var(--hdp-text-muted);
    text-align: left;
  }
</style>
<div class="settings-section" data-component="card-style">
  <div class="settings-title">卡片风格</div>
  <div class="style-grid">${cards}</div>
</div>
<script>
  (function() {
    document.querySelectorAll('.style-card').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var style = this.getAttribute('data-style');
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.card_style = style;
        hdpSaveVisualConfigAndReload(cfg);
      });
    });
  })();
</script>`,
  };
}

// ─── Layout Config Card (card_sizes + density + area_skins) ────────────────

function buildLayoutConfigCard(stored: StoredVisualConfig, config: StrategyConfig, tokens?: ResolvedTokens, hass?: Hass): LovelaceCardConfig {
  const cardSizes = (stored.card_sizes || {}) as Record<string, string>;
  const currentDensity = stored.layout_density || 'standard';
  const areaSkins = (stored.area_skins || {}) as Record<string, string>;

  // Home view card definitions
  const homeCards = [
    { id: 'home_welcome', label: '欢迎横幅', default: 'lg' },
    { id: 'home_status_badges', label: '状态徽章', default: 'wide' },
    { id: 'home_people', label: '家庭成员', default: 'md' },
    { id: 'home_environment', label: '家居环境', default: 'md' },
    { id: 'home_power', label: '全屋功率', default: 'md' },
    { id: 'home_favorites', label: '收藏设备', default: 'wide' },
    { id: 'home_summary', label: '系统概览', default: 'md' },
  ];

  const sizeOptions = [
    { val: 'sm', label: '小', hint: '1×1' },
    { val: 'md', label: '中', hint: '2×1' },
    { val: 'lg', label: '大', hint: '2×2' },
    { val: 'wide', label: '通栏', hint: '4×1' },
    { val: 'tall', label: '高', hint: '1×2' },
  ];

  const sizeRows = homeCards.map(c => {
    const current = cardSizes[c.id] || c.default;
    const options = sizeOptions.map(o =>
      `<option value="${escapeAttribute(o.val)}" ${o.val === current ? 'selected' : ''}>${escapeHTML(o.label)} (${escapeHTML(o.hint)})</option>`
    ).join('');
    return `<div class="lc-size-row">
      <span class="lc-size-label">${escapeHTML(c.label)}</span>
      <select class="lc-size-select" data-card-id="${escapeAttribute(c.id)}" data-default="${escapeAttribute(c.default)}">
        ${options}
      </select>
    </div>`;
  }).join('');

  // Density buttons
  const densities = [
    { val: 'compact', label: '紧凑', desc: '更小间距' },
    { val: 'standard', label: '标准', desc: '平衡舒适' },
    { val: 'spacious', label: '宽松', desc: '更多留白' },
  ];
  const densityBtns = densities.map(d =>
    `<button class="lc-density-btn ${d.val === currentDensity ? 'lc-density-btn--active' : ''}" data-density="${escapeAttribute(d.val)}">
      <span class="lc-density-label">${escapeHTML(d.label)}</span>
      <span class="lc-density-desc">${escapeHTML(d.desc)}</span>
    </button>`
  ).join('');

  // Area skins (only if hass is available)
  let areaSkinsHTML = '';
  if (hass && hass.areas) {
    const skinOptions = [
      { val: '', label: '自动' },
      { val: 'classic', label: '经典' },
      { val: 'glass', label: '毛玻璃' },
      { val: 'gradient', label: '渐变' },
      { val: 'aurora', label: '极光' },
      { val: 'soft', label: '柔影' },
      { val: 'neon', label: '霓虹' },
    ];
    const hiddenAreas = new Set(getConfiguredHiddenAreas(config));
    const areas = Object.entries(hass.areas)
      .filter(([, a]) => a && a.name)
      .filter(([areaId]) => !hiddenAreas.has(areaId))
      .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''))
      .slice(0, 12); // limit to 12 areas
    const hasUnassignedEntities = Object.keys(hass.states || {})
      .filter(entityId => isVisibleRegistryEntity(hass, entityId))
      .some(entityId => !resolveEntityAreaId(hass, entityId));
    if (hasUnassignedEntities && !hiddenAreas.has(UNASSIGNED_AREA_ID)) {
      areas.push([UNASSIGNED_AREA_ID, { area_id: UNASSIGNED_AREA_ID, name: UNASSIGNED_AREA_NAME, picture: null }]);
    }

    const areaRows = areas.map(([areaId, area]) => {
      const current = areaSkins[areaId] || '';
      const opts = skinOptions.map(o =>
        `<option value="${escapeAttribute(o.val)}" ${o.val === current ? 'selected' : ''}>${escapeHTML(o.label)}</option>`
      ).join('');
      return `<div class="lc-skin-row">
        <span class="lc-skin-label">${escapeHTML(area.name)}</span>
        <select class="lc-skin-select" data-area-id="${escapeAttribute(areaId)}">
          ${opts}
        </select>
      </div>`;
    }).join('');
    areaSkinsHTML = `
    <div class="lc-sub-section">
      <div class="lc-sub-title">区域皮肤</div>
      <div class="lc-skin-list">${areaRows || '<div class="lc-empty">暂无区域</div>'}</div>
    </div>`;
  }

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .lc-card { padding: 0; }
  .lc-title {
    font: inherit; font-size: 15px; font-weight: 700; color: var(--hdp-text);
    margin-bottom: 4px;
  }
  .lc-subtitle {
    font: inherit; font-size: 12px; color: var(--hdp-text-secondary);
    margin-bottom: 16px;
  }
  .lc-sub-section { margin-bottom: 20px; }
  .lc-sub-section:last-child { margin-bottom: 0; }
  .lc-sub-title {
    font: inherit; font-size: 13px; font-weight: 600; color: var(--hdp-text);
    margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
  }
  .lc-sub-title svg { width: 16px; height: 16px; color: var(--hdp-primary); }

  /* Size rows */
  .lc-size-list { display: flex; flex-direction: column; gap: 8px; }
  .lc-size-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-radius: var(--hdp-radius);
    background: var(--hdp-card-bg); border: 1px solid var(--hdp-border);
    transition: all 0.2s ease;
  }
  .lc-size-row:hover { border-color: var(--hdp-primary); }
  .lc-size-label {
    font: inherit; font-size: 13px; font-weight: 500; color: var(--hdp-text);
  }
  .lc-size-select {
    font-family: var(--hdp-font); font-size: 12px; font-weight: 600;
    padding: 6px 12px; border-radius: var(--hdp-radius-sm);
    border: 1px solid var(--hdp-border); background: var(--hdp-bg);
    color: var(--hdp-text); cursor: pointer; outline: none;
    transition: border-color 0.2s ease;
  }
  .lc-size-select:focus { border-color: var(--hdp-primary); }
  .lc-size-select option { font-size: 12px; }

  /* Density buttons */
  .lc-density-row {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
  }
  .lc-density-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 12px 8px; border-radius: var(--hdp-radius);
    border: 2px solid var(--hdp-border); background: var(--hdp-card-bg);
    cursor: pointer; transition: all 0.2s ease;
    font-family: var(--hdp-font);
  }
  .lc-density-btn:hover { border-color: var(--hdp-primary); }
  .lc-density-btn--active {
    border-color: var(--hdp-primary);
    background: var(--hdp-primary-light);
  }
  .lc-density-label { font-size: 13px; font-weight: 700; color: var(--hdp-text); }
  .lc-density-btn--active .lc-density-label { color: var(--hdp-primary); }
  .lc-density-desc { font-size: 10px; color: var(--hdp-text-muted); }

  /* Area skin rows */
  .lc-skin-list { display: flex; flex-direction: column; gap: 8px; }
  .lc-skin-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-radius: var(--hdp-radius);
    background: var(--hdp-card-bg); border: 1px solid var(--hdp-border);
  }
  .lc-skin-label {
    font: inherit; font-size: 13px; font-weight: 500; color: var(--hdp-text);
  }
  .lc-skin-select {
    font-family: var(--hdp-font); font-size: 12px; font-weight: 600;
    padding: 6px 12px; border-radius: var(--hdp-radius-sm);
    border: 1px solid var(--hdp-border); background: var(--hdp-bg);
    color: var(--hdp-text); cursor: pointer; outline: none;
  }
  .lc-skin-select:focus { border-color: var(--hdp-primary); }
  .lc-empty {
    font: inherit; font-size: 13px; color: var(--hdp-text-muted);
    text-align: center; padding: 16px;
  }
</style>
<div class="lc-card">
  <div class="lc-title">布局配置</div>
  <div class="lc-subtitle">调整卡片尺寸、布局密度和区域皮肤</div>

  <div class="lc-sub-section">
    <div class="lc-sub-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      卡片尺寸
    </div>
    <div class="lc-size-list">${sizeRows}</div>
  </div>

  <div class="lc-sub-section">
    <div class="lc-sub-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      布局密度
    </div>
    <div class="lc-density-row">${densityBtns}</div>
  </div>

  ${areaSkinsHTML}
</div>
<script>
  (function() {
    // Card size selects
    document.querySelectorAll('.lc-size-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var cardId = this.getAttribute('data-card-id');
        var size = this.value;
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        if (!cfg.card_sizes) cfg.card_sizes = {};
        if (size === this.getAttribute('data-default')) {
          delete cfg.card_sizes[cardId];
        } else {
          cfg.card_sizes[cardId] = size;
        }
        if (typeof hdpShowToast === 'function') hdpShowToast('卡片尺寸已保存', 'success');
        hdpSaveVisualConfigAndReload(cfg, 600);
      });
    });

    // Density buttons
    document.querySelectorAll('.lc-density-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var density = this.getAttribute('data-density');
        document.querySelectorAll('.lc-density-btn').forEach(function(b) {
          b.className = 'lc-density-btn' + (b.getAttribute('data-density') === density ? ' lc-density-btn--active' : '');
        });
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.layout_density = density;
        // Also set gap/padding defaults for the density
        var dmap = { compact: [8,12], standard: [14,18], spacious: [20,24] };
        var dp = dmap[density] || dmap.standard;
        cfg.card_gap = dp[0];
        cfg.card_padding = dp[1];
        hdpSaveVisualConfig(cfg);
        // Apply density CSS vars in real-time
        var root = document.documentElement;
        var dcss = { compact: [8,12,100,10], standard: [14,18,120,14], spacious: [20,24,140,18] };
        var dc = dcss[density] || dcss.standard;
        root.style.setProperty('--hdp-density', density);
        root.style.setProperty('--hdp-density-gap', dc[0] + 'px');
        root.style.setProperty('--hdp-density-padding', dc[1] + 'px');
        root.style.setProperty('--hdp-density-row-height', dc[2] + 'px');
        root.style.setProperty('--hdp-density-entity-padding', dc[3] + 'px');
        root.style.setProperty('--hdp-card-gap', dc[0] + 'px');
        root.style.setProperty('--hdp-card-padding', dc[1] + 'px');
        if (typeof hdpShowToast === 'function') hdpShowToast('布局密度: ' + ({compact:'紧凑',standard:'标准',spacious:'宽松'})[density], 'success');
      });
    });

    // Area skin selects
    document.querySelectorAll('.lc-skin-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var areaId = this.getAttribute('data-area-id');
        var skin = this.value;
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        if (!cfg.area_skins) cfg.area_skins = {};
        if (skin) {
          cfg.area_skins[areaId] = skin;
        } else {
          delete cfg.area_skins[areaId];
        }
        if (typeof hdpShowToast === 'function') hdpShowToast('区域皮肤已保存', 'success');
        hdpSaveVisualConfigAndReload(cfg, 600);
      });
    });
  })();
</script>`,
  };
}

// ─── Color Picker Card ────────────────────────────────────────────────────

function buildColorPickerCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const colorFields = [
    { id: 'primary', label: '主色', defaultVal: '#4F6EF7', desc: '按钮 · 高亮 · 交互' },
    { id: 'page_bg', label: '页面背景', defaultVal: '#F4F6FA', desc: '整体底色' },
    { id: 'card_bg', label: '卡片背景', defaultVal: '#FFFFFF', desc: '卡片 · 面板' },
    { id: 'text_primary', label: '主文字', defaultVal: '#1A1D26', desc: '标题 · 正文' },
    { id: 'text_secondary', label: '副文字', defaultVal: '#6B7280', desc: '说明 · 辅助' },
    { id: 'border', label: '边框', defaultVal: '#E5E7EB', desc: '分割 · 描边' },
  ];

  const rows = colorFields
    .map((f) => {
      const val = escapeAttribute((stored[f.id] as string) || f.defaultVal);
      const safeValStyle = escapeInlineStyleValue(val);
      return `<div class="color-row" data-component="color-row">
        <div class="color-info">
          <span class="color-label">${escapeHTML(f.label)}</span>
          <span class="color-desc">${escapeHTML(f.desc)}</span>
        </div>
        <div class="color-input-group">
          <div class="color-swatch-wrap">
            <input type="color" class="color-picker" data-key="${escapeAttribute(f.id)}" value="${escapeAttribute(val)}" aria-label="${escapeAttribute(`${f.label}颜色选择`)}" />
            <div class="color-swatch" style="background: ${safeValStyle};"></div>
          </div>
          <span class="color-hex">${escapeHTML(val)}</span>
        </div>
      </div>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 14px;
  }
  .color-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--hdp-divider);
  }
  .color-row:last-child { border-bottom: none; }
  .color-info {
    display: flex; flex-direction: column; gap: 2px;
  }
  .color-label {
    font-size: 14px; font-weight: 500; color: var(--hdp-text);
  }
  .color-desc {
    font-size: 11px; color: var(--hdp-text-muted);
  }
  .color-input-group {
    display: flex; align-items: center; gap: 10px;
  }
  .color-swatch-wrap {
    position: relative; width: 32px; height: 32px;
  }
  .color-picker {
    position: absolute; top: 0; left: 0;
    width: 32px; height: 32px;
    opacity: 0; cursor: pointer;
  }
  .color-swatch {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 2px solid var(--hdp-border);
    pointer-events: none;
    transition: var(--hdp-transition);
  }
  .color-hex {
    font-size: 12px; font-family: 'SF Mono', 'Cascadia Code', monospace;
    color: var(--hdp-text-secondary); min-width: 60px;
    text-align: right;
  }
</style>
<div class="settings-section" data-component="color-pickers">
  <div class="settings-title">颜色调整</div>
  ${rows}
</div>
<script>
  (function() {
    document.querySelectorAll('.color-picker').forEach(function(picker) {
      picker.addEventListener('input', function() {
        var key = this.getAttribute('data-key');
        var val = this.value;
        var swatch = this.parentElement.querySelector('.color-swatch');
        if (swatch) swatch.style.background = val;
        var hexEl = this.parentElement.parentElement.querySelector('.color-hex');
        if (hexEl) hexEl.textContent = val;
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg[key] = val;
        hdpSaveVisualConfig(cfg);
        var cssKey = '--hdp-' + (key === 'primary' ? 'primary' : key === 'page_bg' ? 'bg' :
          key === 'card_bg' ? 'card-bg' : key === 'text_primary' ? 'text' :
          key === 'text_secondary' ? 'text-secondary' : key);
        document.documentElement.style.setProperty(cssKey, val);
      });
    });
  })();
</script>`,
  };
}

// ─── Shape & Spacing Card ─────────────────────────────────────────────────

function buildShapeCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const radius = stored.border_radius ?? 14;
  const padding = stored.card_padding ?? 18;

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 14px;
  }
  .slider-row {
    padding: 10px 0;
    border-bottom: 1px solid var(--hdp-divider);
  }
  .slider-row:last-of-type { border-bottom: none; }
  .slider-header {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .slider-label {
    font-size: 14px; font-weight: 500; color: var(--hdp-text);
  }
  .slider-value {
    font-size: 13px; font-weight: 700;
    color: var(--hdp-primary);
    background: var(--hdp-primary-light);
    padding: 2px 10px; border-radius: 10px;
    min-width: 40px; text-align: center;
  }
  .slider-input {
    width: 100%; height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--hdp-divider);
    border-radius: 3px;
    outline: none;
    accent-color: var(--hdp-primary);
  }
  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: var(--hdp-primary);
    border: 3px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  .toggle-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 12px 0 4px 0;
  }
  .toggle-label-text {
    font-size: 14px; font-weight: 500; color: var(--hdp-text);
  }
  .toggle-switch {
    width: 44px; height: 26px;
    border-radius: 13px;
    position: relative;
    cursor: pointer;
    transition: background var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .toggle-switch--on { background: var(--hdp-primary); }
  .toggle-switch--off { background: var(--hdp-divider); }
  .toggle-switch-knob {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    position: absolute;
    top: 2px;
    transition: left var(--hdp-motion-base) var(--hdp-motion-easing);
  }
  .toggle-switch--on .toggle-switch-knob { left: 20px; }
  .toggle-switch--off .toggle-switch-knob { left: 2px; }
  .shape-preview {
    margin-top: 14px;
    padding: var(--hdp-card-padding);
    background: var(--hdp-bg);
    border: 1px solid var(--hdp-border);
    display: flex; align-items: center; justify-content: center;
    gap: 12px;
    transition: border-radius 0.2s ease, padding 0.2s ease;
  }
  .preview-block {
    width: 40px; height: 40px;
    background: var(--hdp-primary-light);
    border-radius: inherit;
    display: flex; align-items: center; justify-content: center;
  }
  .preview-block svg { width: 20px; height: 20px; color: var(--hdp-primary); }
  .preview-text {
    font-size: 12px; color: var(--hdp-text-secondary);
    text-align: center;
  }
</style>
<div class="settings-section" data-component="shape-spacing">
  <div class="settings-title">形状与间距</div>
  <div class="slider-row">
    <div class="slider-header">
      <span class="slider-label">圆角大小</span>
      <span class="slider-value" id="radius-val">${radius}px</span>
    </div>
    <input type="range" class="slider-input" id="radius-slider"
      min="0" max="32" value="${radius}" data-key="border_radius" aria-label="圆角大小" />
  </div>
  <div class="slider-row">
    <div class="slider-header">
      <span class="slider-label">卡片内边距</span>
      <span class="slider-value" id="padding-val">${padding}px</span>
    </div>
    <input type="range" class="slider-input" id="padding-slider"
      min="8" max="40" value="${padding}" data-key="card_padding" aria-label="卡片内边距" />
  </div>
  <div class="toggle-row">
    <span class="toggle-label-text">卡片投影</span>
    <div class="toggle-switch ${stored.shadows !== false ? 'toggle-switch--on' : 'toggle-switch--off'}" id="shadow-toggle" data-component="shadow-toggle">
      <div class="toggle-switch-knob"></div>
    </div>
  </div>
  <div class="shape-preview" id="shape-preview" style="border-radius: ${radius}px;">
    <div class="preview-block" style="border-radius: ${Math.max(4, radius - 6)}px;">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>
    </div>
    <span class="preview-text">圆角 ${radius}px · 内边距 ${padding}px</span>
  </div>
</div>
<script>
  (function() {
    var shadowOn = ${stored.shadows !== false ? 'true' : 'false'};
    function updatePreview() {
      var r = document.getElementById('radius-slider').value;
      var p = document.getElementById('padding-slider').value;
      document.getElementById('radius-val').textContent = r + 'px';
      document.getElementById('padding-val').textContent = p + 'px';
      var preview = document.getElementById('shape-preview');
      preview.style.borderRadius = r + 'px';
      preview.style.padding = p + 'px';
      var blocks = preview.querySelectorAll('.preview-block');
      if (blocks.length) blocks[0].style.borderRadius = Math.max(4, r - 6) + 'px';
      var text = preview.querySelector('.preview-text');
      if (text) text.textContent = '圆角 ' + r + 'px · 内边距 ' + p + 'px';
      document.documentElement.style.setProperty('--hdp-radius', r + 'px');
      document.documentElement.style.setProperty('--hdp-card-padding', p + 'px');
    }
    function saveSlider(key, val) {
      var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
      cfg[key] = Number(val);
      hdpSaveVisualConfig(cfg);
      updatePreview();
    }
    document.querySelectorAll('.slider-input').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var key = this.getAttribute('data-key');
        saveSlider(key, this.value);
      });
    });
    document.getElementById('shadow-toggle').addEventListener('click', function() {
      shadowOn = !shadowOn;
      this.className = 'toggle-switch ' + (shadowOn ? 'toggle-switch--on' : 'toggle-switch--off');
      var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
      cfg.shadows = shadowOn;
      hdpSaveVisualConfig(cfg);
      document.documentElement.style.setProperty('--hdp-shadow-card',
        shadowOn ? '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' : 'none');
    });
  })();
</script>`,
  };
}

// ─── Font Card ────────────────────────────────────────────────────────────

function buildFontCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const currentFont = (stored.font_family as string) || "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

  const fontOptions = [
    {
      label: 'Inter',
      value: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      sample: '智能生活',
      desc: '现代 · 清晰',
    },
    {
      label: '系统字体',
      value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      sample: '原生体验',
      desc: '原生 · 快速',
    },
    {
      label: '衬线体',
      value: "Georgia, 'Noto Serif SC', serif",
      sample: '优雅温润',
      desc: '经典 · 优雅',
    },
    {
      label: '等宽体',
      value: "'JetBrains Mono', 'Fira Code', monospace",
      sample: 'Code_123',
      desc: '极客 · 等宽',
    },
  ];

  const cards = fontOptions
    .map((f) => {
      const selected = currentFont === f.value;
      return `<button class="font-card ${selected ? 'font-card--active' : ''}"
        data-font="${f.value.replace(/"/g, '&quot;')}" data-component="font-card">
        <div class="font-sample" style="font-family: ${f.value};">${f.sample}</div>
        <div class="font-meta">
          <span class="font-name">${f.label}</span>
          <span class="font-desc">${f.desc}</span>
        </div>
        ${selected ? '<div class="font-check"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/></svg></div>' : ''}
      </button>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    border: 1px solid var(--hdp-border);
  }
  .settings-title {
    font-size: 15px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 14px;
  }
  .font-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  @media (max-width: 480px) {
    .font-grid { grid-template-columns: 1fr; }
  }
  .font-card {
    display: flex; flex-direction: column; gap: 8px;
    padding: 14px; border: 2px solid var(--hdp-border);
    border-radius: var(--hdp-radius); cursor: pointer;
    background: var(--hdp-card-bg); text-align: left;
    position: relative;
    transition: var(--hdp-transition);
  }
  .font-card:hover { border-color: var(--hdp-primary); }
  .font-card--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow);
  }
  .font-sample {
    font-size: 20px; font-weight: 600;
    color: var(--hdp-text);
    line-height: 1.2;
  }
  .font-meta {
    display: flex; flex-direction: column; gap: 2px;
  }
  .font-name {
    font-size: 13px; font-weight: 600; color: var(--hdp-text);
  }
  .font-desc {
    font-size: 11px; color: var(--hdp-text-muted);
  }
  .font-check {
    position: absolute;
    top: 8px; right: 8px;
    width: 18px; height: 18px;
    background: var(--hdp-primary);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
</style>
<div class="settings-section" data-component="font-selector">
  <div class="settings-title">字体选择</div>
  <div class="font-grid">${cards}</div>
</div>
<script>
  (function() {
    document.querySelectorAll('.font-card').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var font = this.getAttribute('data-font').replace(/&quot;/g, '"');
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg.font_family = font;
        document.documentElement.style.setProperty('--hdp-font', font);
        hdpSaveVisualConfigAndReload(cfg);
      });
    });
  })();
</script>`,
  };
}

// ─── Action Card (Reset + Done) ───────────────────────────────────────────

function buildActionCard(tokens?: ResolvedTokens): LovelaceCardConfig {
  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .action-section {
    display: flex; gap: 12px; justify-content: flex-end;
    padding: 8px 0;
  }
  .action-btn {
    padding: 12px 24px; border-radius: var(--hdp-radius);
    font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: var(--hdp-font); border: none;
    transition: var(--hdp-transition);
    display: flex; align-items: center; gap: 6px;
  }
  .action-btn--reset {
    background: var(--hdp-card-bg);
    color: var(--hdp-text-secondary);
    border: 1px solid var(--hdp-border);
  }
  .action-btn--reset:hover {
    background: var(--hdp-danger-light);
    color: var(--hdp-danger);
    border-color: var(--hdp-danger);
  }
  .action-btn--reset svg {
    width: 16px; height: 16px;
  }
  .action-btn--done {
    background: var(--hdp-gradient-primary);
    color: white;
    box-shadow: 0 4px 12px var(--hdp-primary-glow);
  }
  .action-btn--done:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--hdp-primary-glow);
  }
  .action-btn--done svg {
    width: 16px; height: 16px;
  }
</style>
<div class="action-section" data-component="settings-actions">
  <button class="action-btn action-btn--reset" id="reset-btn">
    <svg viewBox="0 0 24 24" fill="none"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/></svg>
    恢复默认
  </button>
  <button class="action-btn action-btn--done" id="done-btn">
    <svg viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>
    完成配置
  </button>
</div>
<script>
  (function() {
    document.getElementById('reset-btn').addEventListener('click', function() {
      if (confirm('确定恢复默认视觉设置吗？')) {
        hdpClearVisualConfigAndReload();
      }
    });
    document.getElementById('done-btn').addEventListener('click', function() {
      history.back();
    });
  })();
</script>`,
  };
}
