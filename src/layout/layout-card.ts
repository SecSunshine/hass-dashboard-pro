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
import { buildSidebarHTML, getSidebarCSS } from './sidebar';
import { buildBottomNavHTML, getBottomNavCSS } from './bottom-nav';
import { buildNavigationScript } from './navigation';
import { generateServiceScript } from '../services/hass-websocket';
import { generateStorageJS } from '../services/storage';
import { generateBlueprintJS } from '../blueprints/blueprint-storage';
import { buildImportModalHTML, generateBlueprintModalJS } from '../blueprints/blueprint-gallery';
import { buildThemeStudioHTML, generateThemeStudioJS } from '../templates/theme-studio';

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
}

/**
 * Build the monolithic layout card.
 */
export function buildLayoutCard(opts: LayoutCardOptions): LovelaceCardConfig {
  const { hass, config, tokens, homeHTML, areaSections, devicesHTML, devicesJS, settingsHTML,
          settingsJS, areaSummaries, blueprintPages } = opts;

  const title = config.title || '智能家居';
  const hiddenAreas = config.hidden_areas || [];

  // Build sidebar
  const sidebarHTML = buildSidebarHTML({
    title,
    areas: areaSummaries,
    hass,
    config,
    hiddenAreas,
  });

  // Build bottom nav
  const bottomNavHTML = buildBottomNavHTML({ blueprintPages });

  // Build area view sections
  const areaViewSections = areaSections.map(a =>
    `<div class="hdp-view" data-view="${a.area_id}" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">${a.area_name}</span>
      </div>
      <div class="hdp-area-content">${a.html}</div>
    </div>`
  ).join('');

  // Build blueprint view sections
  const blueprintSections = (opts.blueprintHTML || []).map(bp =>
    `<div class="hdp-view" data-view="bp-${bp.id}" style="display:none">
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
    min-height: 100vh;
    background: var(--hdp-bg);
    font: inherit;
    color: var(--hdp-text);
  }
  ${getSidebarCSS()}
  ${getBottomNavCSS()}
  .hdp-main {
    flex: 1;
    min-width: 0;
    padding: var(--hdp-content-padding, 20px);
    overflow-y: auto;
  }
  .hdp-view {
    animation: hdpFadeIn 0.2s ease;
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
<div class="hdp-root" id="hdp-root">
  <aside class="hdp-sidebar">${sidebarHTML}</aside>
  <div class="hdp-resize-handle"></div>
  <main class="hdp-main">
    <div class="hdp-view" data-view="home">
      <div class="hdp-home-content">${homeHTML}</div>
    </div>
    <div class="hdp-view" data-view="devices" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">全部设备</span>
      </div>
      <div class="hdp-area-content">${devicesHTML}</div>
    </div>
    ${areaViewSections}
    ${blueprintSections}
    <div class="hdp-view" data-view="settings" style="display:none">
      <div class="hdp-area-header-bar">
        <span class="hdp-area-title">设置</span>
      </div>
      <div class="hdp-area-content">${settingsHTML}</div>
    </div>
  </main>
  ${bottomNavHTML}
  ${buildImportModalHTML()}
  ${buildThemeStudioHTML(tokens, hass, config)}
</div>
<script>
${generateServiceScript()}
${generateStorageJS()}
${generateBlueprintJS()}
${generateBlueprintModalJS()}
${devicesJS || ''}
${settingsJS || ''}
${generateThemeStudioJS()}
${buildNavigationScript()}
</script>`;

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content,
  };
}
