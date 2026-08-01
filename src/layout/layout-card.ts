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
import { getEffectiveHDPConfig } from '../utils/effective-config';

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

function getInitialFreeformCanvasHeight(config: StrategyConfig, breakpoint: 'desktop' | 'tablet'): number {
  const slots = Object.values(config.hdp_config?.cards?.slots || {});
  const bottom = slots.reduce((maximum, slot) => {
    if (slot.enabled === false) return maximum;
    const rect = slot.freeform?.[breakpoint];
    if (!rect) return maximum;
    const y = Number.isFinite(Number(rect.y)) ? Math.max(0, Number(rect.y)) : 0;
    const height = Number.isFinite(Number(rect.height)) ? Math.max(96, Number(rect.height)) : 192;
    return Math.max(maximum, y + height);
  }, 0);
  return Math.max(320, Math.ceil(bottom + 12));
}

/**
 * Build the monolithic layout card.
 */
export function buildLayoutCard(opts: LayoutCardOptions): LovelaceCardConfig {
  const { hass, config, tokens, homeHTML, areaSections, devicesHTML, devicesJS, settingsHTML,
          settingsJS, areaSummaries, blueprintPages } = opts;

  const title = config.hdp_config?.dashboard?.name || config.sidebar_title || config.title || '智能家居';
  const hiddenAreas = getConfiguredHiddenAreas(config);
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
  const cardLayoutMode = config.hdp_config?.cards?.layout?.mode || 'grid';
  const homeCanvasStyle = cardLayoutMode === 'freeform'
    ? ` style="--hdp-freeform-canvas-height:${getInitialFreeformCanvasHeight(config, 'desktop')}px;--hdp-freeform-tablet-canvas-height:${getInitialFreeformCanvasHeight(config, 'tablet')}px;"`
    : '';
  const buildCardEditBar = (label: string, includeHiddenManagement = false, allowAddCard = false) => showSettings
    ? `<div class="${includeHiddenManagement ? 'hdp-home-edit-bar hdp-card-edit-bar' : 'hdp-card-edit-bar'}" data-editing="false">
      <button type="button" data-action="enter-card-edit">${escapeHTML(label)}</button>
      ${allowAddCard ? '<button type="button" data-action="add-card">新增卡片</button>' : ''}
      ${includeHiddenManagement ? '<button type="button" data-action="manage-hidden-cards">管理隐藏</button>' : ''}
      ${allowAddCard ? '<button type="button" data-action="toggle-freeform-layout" aria-pressed="false">自由布局</button><button type="button" data-action="toggle-card-snap" aria-pressed="true">磁吸：开</button><button type="button" data-action="toggle-card-collision-push" aria-pressed="true">推开卡片：开</button><button type="button" data-action="align-card-grid">对齐网格</button><button type="button" data-action="auto-arrange-cards">自动整理</button>' : ''}
      ${allowAddCard ? `<label class="hdp-card-layout-input" title="设置磁吸距离"><span>吸附</span><input type="number" min="0" max="40" step="1" value="10" inputmode="numeric" aria-label="吸附距离（像素）" data-card-layout-input="snap-distance"><span>px</span></label>
      <div class="hdp-card-geometry-editor" data-card-geometry-editor hidden>
        <span class="hdp-card-geometry-label" data-card-geometry-label>未选择卡片</span>
        <label><span>X</span><input type="number" min="0" step="1" inputmode="numeric" aria-label="卡片 X 坐标" data-card-geometry-field="x"></label>
        <label><span>Y</span><input type="number" min="0" step="1" inputmode="numeric" aria-label="卡片 Y 坐标" data-card-geometry-field="y"></label>
        <label><span>宽</span><input type="number" min="156" step="1" inputmode="numeric" aria-label="卡片宽度" data-card-geometry-field="width"></label>
        <label><span>高</span><input type="number" min="96" step="1" inputmode="numeric" aria-label="卡片高度" data-card-geometry-field="height"></label>
      </div>` : ''}
      <button type="button" class="hdp-primary" data-action="save-card-edits">保存并应用</button>
      <button type="button" data-action="cancel-card-edits">取消</button>
      <span class="hdp-card-layout-status" aria-live="polite" aria-atomic="true"></span>
    </div>`
    : '';
  const homeEditBarHTML = buildCardEditBar('编辑首页', true, true);
  const pageEditBarHTML = buildCardEditBar('编辑此页', true);
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
      ${pageEditBarHTML}
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
  .hdp-card-edit-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    min-width: 0;
  }
  .hdp-card-layout-status {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .hdp-card-layout-input,
  .hdp-card-geometry-editor,
  .hdp-card-geometry-editor label {
    display: inline-flex;
    align-items: center;
  }
  .hdp-card-layout-input,
  .hdp-card-geometry-editor {
    gap: 6px;
    min-height: 38px;
    padding: 5px 8px;
    border: 1px solid var(--hdp-border);
    border-radius: 8px;
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text-secondary);
    font-size: 12px;
    font-weight: 700;
  }
  .hdp-card-layout-input input,
  .hdp-card-geometry-editor input {
    width: 58px;
    height: 28px;
    min-width: 0;
    padding: 3px 5px;
    border: 1px solid var(--hdp-border);
    border-radius: 6px;
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    font: inherit;
  }
  .hdp-card-geometry-editor label { gap: 3px; }
  .hdp-card-geometry-label {
    max-width: 160px;
    overflow: hidden;
    color: var(--hdp-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hdp-card-geometry-editor[hidden] { display: none; }
  .hdp-card-edit-bar[data-editing="false"] [data-action="save-card-edits"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="cancel-card-edits"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="manage-hidden-cards"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="toggle-freeform-layout"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="toggle-card-snap"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="toggle-card-collision-push"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="align-card-grid"],
  .hdp-card-edit-bar[data-editing="false"] [data-action="auto-arrange-cards"],
  .hdp-card-edit-bar[data-editing="false"] .hdp-card-layout-input,
  .hdp-card-edit-bar[data-editing="false"] .hdp-card-geometry-editor {
    display: none;
  }
  .hdp-card-edit-bar[data-editing="true"] [data-action="enter-card-edit"] {
    display: none;
  }
  @media (max-width: 639px) {
    .hdp-home-edit-bar [data-action="toggle-freeform-layout"],
    .hdp-home-edit-bar [data-action="toggle-card-snap"],
    .hdp-home-edit-bar [data-action="toggle-card-collision-push"],
    .hdp-home-edit-bar [data-action="align-card-grid"],
    .hdp-home-edit-bar [data-action="auto-arrange-cards"],
    .hdp-home-edit-bar .hdp-card-layout-input,
    .hdp-home-edit-bar .hdp-card-geometry-editor {
      display: none;
    }
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
      <div class="hdp-home-content" data-hdp-layout-mode="${escapeAttribute(cardLayoutMode)}"${homeCanvasStyle}>${homeHTML}<div class="hdp-snap-guide hdp-snap-guide--x" aria-hidden="true"></div><div class="hdp-snap-guide hdp-snap-guide--y" aria-hidden="true"></div></div>
    </div>
    <div class="hdp-view" data-view="devices" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">全部设备</span>
      </div>
      ${pageEditBarHTML}
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
