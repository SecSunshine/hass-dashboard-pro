/**
 * Layout Card — Monolithic Dashboard Shell
 *
 * Builds a single html-pro-card containing:
 *   - Desktop sidebar (areas, navigation)
 *   - Resize handle
 *   - Main content area with all views (home, areas, devices, settings)
 *   - Mobile bottom navigation
 *   - Client-side navigation script
 *
 * All views are pre-rendered as HTML sections and toggled via JS.
 */

import type { Hass, LovelaceCardConfig, StrategyConfig, AreaSummary, BlueprintInstance } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import { generateBentoCSS } from '../utils/bento-layout';
import type { ResolvedTokens } from '../utils/visual-config';
import { buildSidebarHTML, getSidebarCSS, shouldShowSettings } from './sidebar';
import { buildBottomNavHTML, getBottomNavCSS } from './bottom-nav';
import { buildNavigationScript } from './navigation';
import { generateServiceScript } from '../services/hass-websocket';
import { generateStorageJS } from '../services/storage';
import { generateBlueprintJS } from '../blueprints/blueprint-storage';
import { buildImportModalHTML, generateBlueprintModalJS } from '../blueprints/blueprint-gallery';
import { buildThemeStudioHTML, generateThemeStudioJS } from '../templates/theme-studio';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue, escapeURLAttribute } from '../utils/html';
import { safeBlueprintViewId } from '../utils/dom-id';
import { getConfiguredHiddenAreas, getDashboardFilters } from '../utils/dashboard-model';
import { generateCardSlotEditorJS, getCardSlotCSS } from '../utils/card-slots';

export interface LayoutCardOptions {
  hass: Hass;
  config: StrategyConfig;
  tokens?: ResolvedTokens;
  homeHTML: string;
  areaSections: Array<{ area_id: string; area_name: string; html: string }>;
  devicesHTML: string;
  devicesJS?: string;
  settingsHTML: string;
  settingsJS?: string;
  areaSummaries: AreaSummary[];
  blueprintPages: BlueprintInstance[];
  blueprintHTML?: Array<{ id: string; html: string }>;
  initialView?: string;
}

/**
 * Build the monolithic layout card.
 */
export function buildLayoutCard(opts: LayoutCardOptions): LovelaceCardConfig {
  const { hass, config, tokens, homeHTML, areaSections, devicesHTML, devicesJS, settingsHTML,
          settingsJS, areaSummaries, blueprintPages } = opts;

  const title = config.hdp_config?.dashboard?.name || config.sidebar_title || config.title || '智能家居';
  const hiddenAreas = getConfiguredHiddenAreas(config);
  const homeLayoutPreset = sanitizeHomeLayoutPreset(config.hdp_config?.home?.layout_preset);
  const dashboardBackground = escapeURLAttribute(config.hdp_config?.dashboard?.background_image_url || '');
  const dashboardStyle = dashboardBackground
    ? ` style="--hdp-dashboard-bg-image: url(${escapeInlineStyleValue(dashboardBackground)});"`
    : '';
  const dashboardBgClass = dashboardBackground ? ' hdp-root--image-bg' : '';
  const runtimeFilters = escapeAttribute(JSON.stringify(getDashboardFilters(config)));
  const showSettings = shouldShowSettings(hass, config);
  const settingsViewHTML = showSettings
    ? `<div class="hdp-view" data-view="settings" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">设置</span>
      </div>
      <div class="hdp-area-content">${settingsHTML}</div>
    </div>`
    : '';
  const settingsScript = showSettings ? settingsJS || '' : '';
  const cardSlotEditorScript = showSettings ? generateCardSlotEditorJS() : '';
  const homeEditBarHTML = showSettings
    ? `<div class="hdp-home-edit-bar" data-editing="false">
      <button type="button" data-action="enter-card-edit">编辑首页</button>
      <button type="button" data-action="manage-hidden-cards">管理隐藏</button>
      <button type="button" class="hdp-primary" data-action="save-card-edits">保存并应用</button>
      <button type="button" data-action="cancel-card-edits">取消</button>
    </div>`
    : '';
  const themeStudioHTML = showSettings ? buildThemeStudioHTML(tokens, hass, config) : '';
  const themeStudioJS = showSettings ? generateThemeStudioJS() : '';
  const blueprintAdminHTML = showSettings ? buildImportModalHTML() : '';
  const blueprintAdminJS = showSettings
    ? `${generateBlueprintJS()}\n${generateBlueprintModalJS()}`
    : '';

  // Build sidebar
  const sidebarHTML = buildSidebarHTML({
    title,
    areas: areaSummaries,
    hass,
    config,
    hiddenAreas,
  });

  // Build bottom nav
  const bottomNavHTML = buildBottomNavHTML({ blueprintPages, showSettings });

  // Build area view sections
  const areaViewSections = areaSections.map(a =>
    `<div class="hdp-view" data-view="${escapeAttribute(a.area_id)}" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">${escapeHTML(a.area_name)}</span>
      </div>
      <div class="hdp-area-content">${a.html}</div>
    </div>`
  ).join('');

  // Build blueprint view sections
  const blueprintSections = (opts.blueprintHTML || []).map(bp =>
    `<div class="hdp-view" data-view="${escapeAttribute(safeBlueprintViewId(bp.id))}" style="display:none">
      <div class="hdp-area-content">${bp.html}</div>
    </div>`
  ).join('');

  // Assemble full content
  const content = `
${generateDesignTokenCSS(tokens)}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .hdp-root {
    display: flex;
    height: var(--hdp-available-height, 100dvh);
    min-height: var(--hdp-available-height, 100dvh);
    max-height: var(--hdp-available-height, 100dvh);
    overflow: hidden;
    background: var(--hdp-bg);
    font: inherit;
    color: var(--hdp-text);
    position: relative;
  }
  .hdp-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--hdp-dashboard-bg-image, none);
    background-size: cover;
    background-position: center;
    opacity: 0;
    pointer-events: none;
  }
  .hdp-root--image-bg::before {
    opacity: 1;
  }
  .hdp-root--image-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, color-mix(in srgb, var(--hdp-bg) 88%, transparent), color-mix(in srgb, var(--hdp-bg) 70%, transparent));
    pointer-events: none;
  }
  .hdp-root > * {
    position: relative;
    z-index: 1;
  }
  .hdp-root--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    width: 100vw;
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
  }
  .hdp-root--fullscreen .hdp-sidebar {
    height: 100dvh;
    max-height: 100dvh;
    position: relative;
    top: 0;
  }
  .hdp-root--fullscreen .hdp-main {
    max-height: 100dvh;
  }
  ${getSidebarCSS()}
  ${getBottomNavCSS()}
  ${getCardSlotCSS()}
  .hdp-main {
    flex: 1;
    min-width: 0;
    max-height: var(--hdp-available-height, 100dvh);
    padding: var(--hdp-content-padding, 20px);
    overflow-y: auto;
  }
  .hdp-view {
    animation: hdpFadeIn 0.2s ease;
  }
  .hdp-home-edit-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    min-width: 0;
  }
  .hdp-home-edit-bar[data-editing="false"] [data-action="save-card-edits"],
  .hdp-home-edit-bar[data-editing="false"] [data-action="cancel-card-edits"],
  .hdp-home-edit-bar[data-editing="false"] [data-action="manage-hidden-cards"] {
    display: none;
  }
  .hdp-home-edit-bar[data-editing="true"] [data-action="enter-card-edit"] {
    display: none;
  }
  @keyframes hdpFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .hdp-area-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--hdp-border);
  }
  .hdp-area-title {
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  ${generateBentoCSS()}
</style>
<div class="hdp-root${dashboardBgClass}" id="hdp-root" data-dashboard-filters="${runtimeFilters}"${dashboardStyle}>
  <aside class="hdp-sidebar">${sidebarHTML}</aside>
  <div class="hdp-resize-handle"></div>
  <main class="hdp-main">
    <div class="hdp-view" data-view="home">
      ${homeEditBarHTML}
      <div class="hdp-home-content hdp-home-content--${escapeAttribute(homeLayoutPreset)}" data-layout-preset="${escapeAttribute(homeLayoutPreset)}">${homeHTML}</div>
    </div>
    <div class="hdp-view" data-view="devices" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">全部设备</span>
      </div>
      <div class="hdp-area-content">${devicesHTML}</div>
    </div>
    ${areaViewSections}
    ${blueprintSections}
    ${settingsViewHTML}
  </main>
  ${bottomNavHTML}
  ${blueprintAdminHTML}
  ${themeStudioHTML}
</div>
<script>
${generateServiceScript()}
${generateStorageJS()}
${blueprintAdminJS}
${devicesJS || ''}
${settingsScript}
${cardSlotEditorScript}
${themeStudioJS}
${buildNavigationScript(opts.initialView || 'home')}
</script>`;

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content,
  };
}

function sanitizeHomeLayoutPreset(value: unknown): string {
  return typeof value === 'string' && ['grid', 'rows', 'l_shape', 'l_mirror', 'u_shape', 'custom'].includes(value)
    ? value
    : 'grid';
}
