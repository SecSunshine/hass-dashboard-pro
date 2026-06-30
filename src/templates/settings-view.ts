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
import { loadStoredConfig, saveStoredConfig, clearStoredConfig } from '../utils/visual-config';
import { generatePaletteGeneratorJS, MOOD_PRESETS } from '../themes/palette-generator';
import {
  getSettingsSectionsCSS,
  generateSettingsSectionsJS,
  buildDashboardSection,
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

export function buildSettingsView(config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const stored: StoredVisualConfig = loadStoredConfig() || {};
  const preset = (config.visual?.theme || 'light') as string;

  return [
    buildSettingsHeader(tokens),
    buildThemePresetCard(preset, tokens),
    buildSeedColorCard(stored, tokens),
    buildCardStyleCard(stored, tokens),
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
  const visualCards = buildSettingsView(config, tokens);
  const visualHTML = visualCards.map(card => {
    const content = (card.content as string) || '';
    return content
      .replace(/<style>[\s\S]*?<\/style>/g, '')
      .replace(/<script>[\s\S]*?<\/script>/g, '')
      .trim();
  }).join('\n');

  // Wrap visual settings in a collapsible section
  const visualSection = `<div class="st-section st-section--open" id="st-visual" data-component="settings-visual">
    <div class="st-section-hdr" onclick="hdpToggleSection('st-visual')">
      <div class="st-section-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
      <span class="st-section-title">视觉设置</span>
      <svg class="st-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="st-section-body" id="st-visual-body">
      ${visualHTML}
    </div>
  </div>`;

  return `
<style>${getSettingsSectionsCSS()}</style>
${buildDashboardSection(config)}
${buildHomeSection(config)}
${buildHeaderSection(config)}
${hass ? buildPeopleSection(hass, config) : ''}
${hass ? buildAreasSection(hass, config) : ''}
${buildDevicesSection(config)}
${buildBlueprintsSection(blueprintPages)}
${visualSection}
${buildThemeFilesSection()}
${buildPermissionsSection(config)}
${buildAboutSection()}
${buildResetSection()}`;
}

/**
 * Generate all settings-related JavaScript for the main script block.
 * Includes settings sections JS + visual settings JS from all cards.
 */
export function generateSettingsJS(config: StrategyConfig, tokens?: ResolvedTokens): string {
  const visualCards = buildSettingsView(config, tokens);
  const scripts = visualCards.map(card => {
    const content = (card.content as string) || '';
    const matches = content.match(/<script>([\s\S]*?)<\/script>/g);
    if (!matches) return '';
    return matches.map(m => m.replace(/<\/?script>/g, '')).join('\n');
  }).filter(Boolean).join('\n');

  return `
${generateSettingsSectionsJS()}
${generatePaletteGeneratorJS()}
${scripts}`;
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
</div>`,
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
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  @media (max-width: 480px) {
    .theme-grid { grid-template-columns: repeat(2, 1fr); }
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        location.reload();
      });
    });
  })();
</script>`,
  };
}

// ─── Seed Color Engine Card ───────────────────────────────────────────────

function buildSeedColorCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const currentMood = (stored.mood_preset as string) || '';
  const currentSeed = (stored.seed_color as string) || '';
  const autoDark = stored.auto_dark !== false;

  const moodCards = MOOD_PRESETS.map(m => {
    const isActive = currentMood === m.id;
    return `<button class="mood-card ${isActive ? 'mood-card--active' : ''}" data-mood="${m.id}" data-component="mood-card">
      <div class="mood-preview" style="background: linear-gradient(135deg, ${m.seed} 0%, ${m.seed}99 100%);">
        <span class="mood-icon">${m.icon}</span>
      </div>
      <div class="mood-meta">
        <span class="mood-name">${m.name}</span>
        <span class="mood-name-en">${m.name_en}</span>
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
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }
  @media (max-width: 480px) {
    .mood-grid { grid-template-columns: repeat(2, 1fr); }
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
      <input type="color" class="seed-color-picker" id="seed-color-input" value="${currentSeed || '#4F6EF7'}" aria-label="自定义种子色" />
      <span class="seed-hex" id="seed-color-hex">${currentSeed || '#4F6EF7'}</span>
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        location.reload();
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
        palette.card_style = 'glass';
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
        cfg.card_style = 'glass';
        cfg.border_radius = 14;
        cfg.primary = palette.primary;
        cfg.page_bg = palette.page_bg;
        cfg.card_bg = palette.card_bg;
        cfg.text_primary = palette.text_primary;
        cfg.text_secondary = palette.text_secondary;
        cfg.border = palette.border;
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        location.reload();
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        location.reload();
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        location.reload();
      });
    }
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
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  @media (max-width: 480px) {
    .style-grid { grid-template-columns: 1fr; }
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        location.reload();
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
      const val = (stored[f.id] as string) || f.defaultVal;
      return `<div class="color-row" data-component="color-row">
        <div class="color-info">
          <span class="color-label">${f.label}</span>
          <span class="color-desc">${f.desc}</span>
        </div>
        <div class="color-input-group">
          <div class="color-swatch-wrap">
            <input type="color" class="color-picker" data-key="${f.id}" value="${val}" aria-label="${f.label}颜色选择" />
            <div class="color-swatch" style="background: ${val};"></div>
          </div>
          <span class="color-hex">${val}</span>
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
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
      localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
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
      localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
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
    grid-template-columns: repeat(2, 1fr);
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
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        document.documentElement.style.setProperty('--hdp-font', font);
        location.reload();
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
        localStorage.removeItem('hdp_visual_config');
        location.reload();
      }
    });
    document.getElementById('done-btn').addEventListener('click', function() {
      history.back();
    });
  })();
</script>`,
  };
}
