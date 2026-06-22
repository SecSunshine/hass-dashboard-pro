/**
 * Template: Settings View
 *
 * Interactive visual configuration panel for customizing:
 * - Theme presets (light, dark, warm, forest)
 * - Individual color tokens (primary, background, cards, text)
 * - Border radius / Card padding
 * - Font family
 * - Shadows toggle
 *
 * All changes are saved to localStorage and applied immediately via CSS variables.
 */

import type { LovelaceCardConfig, StrategyConfig, ThemePreset } from '../types';
import { THEME_PRESETS } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens, StoredVisualConfig } from '../utils/visual-config';
import { loadStoredConfig, saveStoredConfig, clearStoredConfig } from '../utils/visual-config';

export function buildSettingsView(config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const stored: StoredVisualConfig = loadStoredConfig() || {};
  const preset = config.visual?.theme || 'light';

  return [
    buildThemePresetCard(preset, tokens),
    buildColorPickerCard(stored, tokens),
    buildShapeCard(stored, tokens),
    buildFontCard(stored, tokens),
    buildActionCard(tokens),
  ];
}

// ─── Theme Preset Card ────────────────────────────────────────────────────

function buildThemePresetCard(current: string, tokens?: ResolvedTokens): LovelaceCardConfig {
  const presets: { key: ThemePreset; label: string; preview: string }[] = [
    { key: 'light', label: '浅色', preview: '#F8FAFC' },
    { key: 'dark', label: '深色', preview: '#0F172A' },
    { key: 'warm', label: '暖色', preview: '#FFFBEB' },
    { key: 'forest', label: '森林', preview: '#ECFDF5' },
  ];

  const buttons = presets
    .map((p) => {
      const isActive = current === p.key;
      return `<button class="preset-btn ${isActive ? 'preset-btn--active' : ''}"
        data-preset="${p.key}"
        style="background: ${p.preview};">
        <span class="preset-label" style="color: ${isActive ? '#1E40AF' : '#64748B'};">${p.label}</span>
      </button>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    margin-bottom: 16px;
  }
  .settings-title {
    font-size: 16px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 12px;
  }
  .preset-grid { display: flex; gap: 10px; }
  .preset-btn {
    flex: 1; height: 64px; border: 2px solid var(--hdp-border);
    border-radius: var(--hdp-radius);
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; transition: all 0.2s ease;
    font-family: var(--hdp-font);
  }
  .preset-btn:hover { border-color: var(--hdp-primary); }
  .preset-btn--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px rgba(30,64,175,0.15);
  }
  .preset-label { font-size: 14px; font-weight: 600; }
</style>
<div class="settings-section">
  <div class="settings-title">主题预设</div>
  <div class="preset-grid">${buttons}</div>
</div>
<script>
  (function() {
    document.querySelectorAll('.preset-btn').forEach(function(btn) {
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

// ─── Color Picker Card ────────────────────────────────────────────────────

function buildColorPickerCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const colorFields = [
    { id: 'primary', label: '主色', defaultVal: '#1E40AF' },
    { id: 'page_bg', label: '页面背景', defaultVal: '#F8FAFC' },
    { id: 'card_bg', label: '卡片背景', defaultVal: '#FFFFFF' },
    { id: 'text_primary', label: '主文字', defaultVal: '#1E293B' },
    { id: 'text_secondary', label: '副文字', defaultVal: '#64748B' },
    { id: 'border', label: '边框色', defaultVal: '#DBEAFE' },
  ];

  const rows = colorFields
    .map((f) => {
      const val = (stored[f.id] as string) || f.defaultVal;
      return `<div class="color-row">
        <label class="color-label">${f.label}</label>
        <div class="color-input-group">
          <input type="color" class="color-picker" data-key="${f.id}" value="${val}" />
          <span class="color-hex">${val}</span>
        </div>
      </div>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    margin-bottom: 16px;
  }
  .settings-title {
    font-size: 16px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 12px;
  }
  .color-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 8px 0; border-bottom: 1px solid var(--hdp-divider);
  }
  .color-row:last-child { border-bottom: none; }
  .color-label { font-size: 13px; color: var(--hdp-text-secondary); }
  .color-input-group { display: flex; align-items: center; gap: 8px; }
  .color-picker {
    width: 32px; height: 32px; border: 2px solid var(--hdp-border);
    border-radius: 6px; cursor: pointer; padding: 2px;
  }
  .color-hex {
    font-size: 12px; font-family: monospace;
    color: var(--hdp-text-secondary); min-width: 56px;
  }
</style>
<div class="settings-section">
  <div class="settings-title">颜色</div>
  ${rows}
</div>
<script>
  (function() {
    document.querySelectorAll('.color-picker').forEach(function(picker) {
      picker.addEventListener('input', function() {
        var key = this.getAttribute('data-key');
        var val = this.value;
        this.parentElement.querySelector('.color-hex').textContent = val;
        var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
        cfg[key] = val;
        localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
        // Live update CSS variable
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
  const radius = stored.border_radius ?? 10;
  const padding = stored.card_padding ?? 16;

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    margin-bottom: 16px;
  }
  .settings-title {
    font-size: 16px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 12px;
  }
  .slider-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 8px 0; border-bottom: 1px solid var(--hdp-divider);
  }
  .slider-row:last-child { border-bottom: none; }
  .slider-label { font-size: 13px; color: var(--hdp-text-secondary); min-width: 80px; }
  .slider-group { display: flex; align-items: center; gap: 10px; flex: 1; }
  .slider-input {
    flex: 1; height: 4px; -webkit-appearance: none;
    background: var(--hdp-divider); border-radius: 2px;
    accent-color: var(--hdp-primary);
  }
  .slider-value {
    font-size: 13px; font-weight: 600;
    color: var(--hdp-primary); min-width: 36px; text-align: right;
  }
  .preview-card {
    margin-top: 12px; padding: var(--hdp-card-padding);
    background: var(--hdp-bg); border-radius: var(--hdp-radius);
    text-align: center; font-size: 12px;
    color: var(--hdp-text-secondary);
    transition: border-radius 0.2s ease, padding 0.2s ease;
  }
</style>
<div class="settings-section">
  <div class="settings-title">形状与间距</div>
  <div class="slider-row">
    <span class="slider-label">圆角</span>
    <div class="slider-group">
      <input type="range" class="slider-input" id="radius-slider"
        min="0" max="32" value="${radius}" data-key="border_radius" />
      <span class="slider-value" id="radius-val">${radius}px</span>
    </div>
  </div>
  <div class="slider-row">
    <span class="slider-label">卡片内边距</span>
    <div class="slider-group">
      <input type="range" class="slider-input" id="padding-slider"
        min="8" max="40" value="${padding}" data-key="card_padding" />
      <span class="slider-value" id="padding-val">${padding}px</span>
    </div>
  </div>
  <div class="slider-row">
    <span class="slider-label">阴影</span>
    <div class="slider-group">
      <label class="toggle-label">
        <input type="checkbox" id="shadow-toggle" ${stored.shadows !== false ? 'checked' : ''} data-key="shadows" />
        <span class="toggle-text">启用卡片投影</span>
      </label>
    </div>
  </div>
  <div class="preview-card" id="shape-preview">
    实时预览 — 圆角 ${radius}px · 内边距 ${padding}px
  </div>
</div>
<script>
  (function() {
    function updateShapePreview() {
      var r = document.getElementById('radius-slider').value;
      var p = document.getElementById('padding-slider').value;
      document.getElementById('radius-val').textContent = r + 'px';
      document.getElementById('padding-val').textContent = p + 'px';
      var preview = document.getElementById('shape-preview');
      preview.style.borderRadius = r + 'px';
      preview.style.padding = p + 'px';
      preview.textContent = '实时预览 — 圆角 ' + r + 'px · 内边距 ' + p + 'px';
      document.documentElement.style.setProperty('--hdp-radius', r + 'px');
      document.documentElement.style.setProperty('--hdp-card-padding', p + 'px');
    }
    function saveSlider(key, val) {
      var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
      cfg[key] = key === 'shadows' ? val : Number(val);
      localStorage.setItem('hdp_visual_config', JSON.stringify(cfg));
      updateShapePreview();
    }
    document.querySelectorAll('.slider-input').forEach(function(slider) {
      slider.addEventListener('input', function() {
        var key = this.getAttribute('data-key');
        saveSlider(key, this.value);
      });
    });
    document.getElementById('shadow-toggle').addEventListener('change', function() {
      saveSlider('shadows', this.checked);
      document.documentElement.style.setProperty('--hdp-shadow-card',
        this.checked ? '0 2px 8px rgba(0,0,0,0.06)' : 'none');
    });
  })();
</script>`,
  };
}

// ─── Font Card ────────────────────────────────────────────────────────────

function buildFontCard(stored: StoredVisualConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const currentFont = (stored.font_family as string) || 'Inter, -apple-system, sans-serif';

  const fontOptions = [
    { label: 'Inter', value: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", preview: 'Inter — 现代清晰' },
    { label: '系统字体', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", preview: 'System — 原生体验' },
    { label: '衬线字体', value: "Georgia, 'Noto Serif SC', serif", preview: 'Serif — 优雅温润' },
    { label: '等宽字体', value: "'JetBrains Mono', 'Fira Code', monospace", preview: 'Mono — 极客风格' },
  ];

  const selects = fontOptions
    .map((f) => {
      const selected = currentFont === f.value;
      return `<button class="font-option ${selected ? 'font-option--active' : ''}"
        data-font="${f.value.replace(/"/g, '&quot;')}">
        <span class="font-name">${f.label}</span>
        <span class="font-desc">${f.preview}</span>
      </button>`;
    })
    .join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .settings-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: var(--hdp-card-padding);
    box-shadow: var(--hdp-shadow-card);
    margin-bottom: 16px;
  }
  .settings-title {
    font-size: 16px; font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 12px;
  }
  .font-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .font-option {
    display: flex; flex-direction: column; gap: 4px;
    padding: 12px; border: 2px solid var(--hdp-divider);
    border-radius: var(--hdp-radius); cursor: pointer;
    background: var(--hdp-card-bg); text-align: left;
    transition: all 0.2s ease;
  }
  .font-option:hover { border-color: var(--hdp-primary); }
  .font-option--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px rgba(30,64,175,0.1);
  }
  .font-name { font-size: 14px; font-weight: 600; color: var(--hdp-text); }
  .font-desc { font-size: 11px; color: var(--hdp-text-muted); }
</style>
<div class="settings-section">
  <div class="settings-title">字体</div>
  <div class="font-grid">${selects}</div>
</div>
<script>
  (function() {
    document.querySelectorAll('.font-option').forEach(function(btn) {
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
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .action-section { display: flex; gap: 12px; justify-content: flex-end; }
  .action-btn {
    padding: 10px 20px; border-radius: var(--hdp-radius);
    font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: var(--hdp-font); border: none;
    transition: all 0.2s ease;
  }
  .action-btn--reset {
    background: var(--hdp-divider);
    color: var(--hdp-text-secondary);
  }
  .action-btn--reset:hover { background: #fee2e2; color: #dc2626; }
  .action-btn--done {
    background: var(--hdp-primary);
    color: white;
  }
  .action-btn--done:hover { opacity: 0.9; }
</style>
<div class="action-section">
  <button class="action-btn action-btn--reset" id="reset-btn">恢复默认</button>
  <button class="action-btn action-btn--done" id="done-btn">完成配置</button>
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
