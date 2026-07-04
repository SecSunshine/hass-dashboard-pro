/**
 * Theme Studio (v1.0) — Phase 5
 *
 * Full-screen visual editor overlay with:
 * - Canvas-drawn HSL color wheel for seed color selection
 * - 6 mood preset one-click switching
 * - 6 card skin options with live preview
 * - Real-time sliders: radius, gap, padding, density
 * - Light / Dark / Auto mode toggle
 * - Live preview area with sample dashboard cards
 * - Theme sharing code (Base64 encode/decode)
 * - Save / Reset / Close
 *
 * All changes apply in real-time via CSS variables — no page reload needed
 * until the user explicitly saves.
 */

import type { ResolvedTokens } from '../utils/visual-config';
import type { Hass, StrategyConfig } from '../types';
import { buildHomeHTML } from './home-view';
import { MOOD_PRESETS } from '../themes/palette-generator';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue } from '../utils/html';

// ─── HTML + CSS ─────────────────────────────────────────────────────────────

/**
 * Build the Theme Studio overlay HTML (no JS — JS is generated separately).
 * The overlay is hidden by default and shown via hdpOpenStudio().
 */
export function buildThemeStudioHTML(tokens?: ResolvedTokens, hass?: Hass, config?: StrategyConfig): string {
  const currentMood = (tokens?.mood_preset as string) || '';
  const currentSeedRaw = (tokens?.seed_color as string) || '#4F6EF7';
  const currentSeed = escapeAttribute(currentSeedRaw);
  const currentSeedStyle = escapeInlineStyleValue(currentSeedRaw);
  const currentSkin = escapeAttribute((tokens?.card_style as string) || 'classic');
  const currentRadius = tokens?.border_radius ?? 14;
  const currentPadding = (tokens as any)?.card_padding ?? 18;
  const currentGap = (tokens as any)?.card_gap ?? 12;
  const autoDark = tokens?.auto_dark !== false;

  // Build mood preset buttons
  const moodButtons = MOOD_PRESETS.map(m => {
    const isActive = currentMood === m.id;
    const seed = escapeInlineStyleValue(m.seed);
    return `<button class="ts-mood-btn ${isActive ? 'ts-mood-btn--active' : ''}" data-mood="${escapeAttribute(m.id)}" title="${escapeAttribute(`${m.name} ${m.name_en}`)}">
      <div class="ts-mood-color" style="background: linear-gradient(135deg, ${seed} 0%, ${seed}99 100%);">
        <span class="ts-mood-icon">${escapeHTML(m.icon)}</span>
      </div>
      <span class="ts-mood-name">${escapeHTML(m.name)}</span>
    </button>`;
  }).join('');

  // Build skin buttons
  const skins = [
    { key: 'classic', label: '经典', desc: '纯净', preview: 'background: var(--hdp-card-bg); border: 1px solid var(--hdp-border); box-shadow: 0 1px 4px rgba(0,0,0,0.06);' },
    { key: 'glass', label: '毛玻璃', desc: '半透', preview: 'background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3);' },
    { key: 'gradient', label: '渐变', desc: '层次', preview: 'background: linear-gradient(145deg, var(--hdp-card-bg) 0%, var(--hdp-primary-light) 100%); border: 1px solid var(--hdp-border);' },
    { key: 'aurora', label: '极光', desc: '光晕', preview: 'background: var(--hdp-card-bg); border: 1px solid rgba(124,110,247,0.2); box-shadow: 0 0 0 1px rgba(79,110,247,0.05), 0 4px 16px rgba(79,110,247,0.12); position: relative; overflow: hidden;' },
    { key: 'soft', label: '柔影', desc: '立体', preview: 'background: var(--hdp-bg); border: none; box-shadow: 4px 4px 8px rgba(0,0,0,0.06), -4px -4px 8px rgba(255,255,255,0.8);' },
    { key: 'neon', label: '霓虹', desc: '发光', preview: 'background: var(--hdp-card-bg); border: 1px solid var(--hdp-primary); box-shadow: 0 0 8px rgba(79,110,247,0.4), inset 0 0 8px rgba(79,110,247,0.05);' },
  ];

  const skinButtons = skins.map(s => {
    const isActive = currentSkin === s.key;
    return `<button class="ts-skin-btn ${isActive ? 'ts-skin-btn--active' : ''}" data-skin="${escapeAttribute(s.key)}">
      <div class="ts-skin-preview" style="${s.preview} border-radius: 6px;">
        <div style="width: 50%; height: 3px; border-radius: 2px; background: var(--hdp-text-muted); opacity: 0.4;"></div>
        <div style="width: 35%; height: 3px; border-radius: 2px; background: var(--hdp-text-muted); opacity: 0.25;"></div>
      </div>
      <span class="ts-skin-label">${escapeHTML(s.label)}</span>
    </button>`;
  }).join('');

  // Generate preview content — use real dashboard HTML when hass is available
  let previewHTML: string;
  if (hass && config) {
    try {
      const homeContent = buildHomeHTML(hass, config, tokens);
      previewHTML = `<div class="hdp-home-content ts-preview-real">${homeContent}</div>`;
    } catch {
      previewHTML = buildFallbackPreview(currentSkin);
    }
  } else {
    previewHTML = buildFallbackPreview(currentSkin);
  }

  return `
<style>
  /* ── Theme Studio Overlay ── */
  .hdp-studio-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 99999;
    background: var(--hdp-bg, #f4f6fa);
    display: none;
    flex-direction: row;
    overflow: hidden;
    font-family: var(--hdp-font, inherit);
    color: var(--hdp-text, #1a1d26);
  }
  .hdp-studio-overlay--open { display: flex !important; }

  /* ── Preview Area (left) ── */
  .hdp-studio-preview {
    flex: 1;
    overflow-y: auto;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .hdp-studio-preview-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .ts-preview-container {
    min-width: 0;
  }
  /* Fallback sample cards grid */
  .ts-preview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hdp-card-gap, 12px);
    max-width: 640px;
  }
  .ts-preview-grid .ts-preview-card--wide { grid-column: 1 / -1; }
  /* Real dashboard content */
  .ts-preview-real {
    max-width: 900px;
  }
  .ts-preview-real .hdp-bento {
    min-width: 0;
  }

  /* ── Control Panel (right) ── */
  .hdp-studio-panel {
    width: 380px;
    min-width: 380px;
    background: var(--hdp-card-bg, #fff);
    border-left: 1px solid var(--hdp-border, #e5e7eb);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .ts-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--hdp-divider, #f0f0f0);
    position: sticky;
    top: 0;
    background: var(--hdp-card-bg, #fff);
    z-index: 10;
  }
  .ts-panel-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--hdp-text);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ts-panel-title svg {
    width: 20px; height: 20px;
    color: var(--hdp-primary);
  }
  .ts-close-btn {
    width: 32px; height: 32px;
    border: none;
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--hdp-transition, 0.2s ease);
  }
  .ts-close-btn:hover {
    background: var(--hdp-danger-light, rgba(239,68,68,0.1));
  }
  .ts-close-btn svg {
    width: 16px; height: 16px;
    color: var(--hdp-text-secondary);
  }
  .ts-close-btn:hover svg { color: var(--hdp-danger); }

  .ts-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
  .ts-panel-section {
    margin-bottom: 24px;
  }
  .ts-section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  /* ── Color Wheel ── */
  .ts-wheel-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .ts-wheel-canvas-wrap {
    position: relative;
    width: 240px; height: 240px;
  }
  #ts-color-wheel {
    width: 240px; height: 240px;
    cursor: crosshair;
    display: block;
  }
  .ts-wheel-marker {
    position: absolute;
    width: 14px; height: 14px;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: none;
  }
  .ts-wheel-sv-marker {
    position: absolute;
    width: 12px; height: 12px;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: none;
  }
  .ts-color-display {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    justify-content: center;
  }
  .ts-color-swatch {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 2px solid var(--hdp-border);
    flex-shrink: 0;
  }
  .ts-color-hex {
    font-size: 14px;
    font-family: 'SF Mono', 'Cascadia Code', monospace;
    color: var(--hdp-text-secondary);
    background: var(--hdp-bg);
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--hdp-border);
    width: 100px;
    text-align: center;
  }

  /* ── Mood Presets ── */
  .ts-mood-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ts-mood-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 4px;
    border: 2px solid var(--hdp-border);
    border-radius: 10px;
    background: var(--hdp-card-bg);
    cursor: pointer;
    transition: var(--hdp-transition, 0.2s ease);
    position: relative;
  }
  .ts-mood-btn:hover {
    border-color: var(--hdp-primary);
    transform: translateY(-2px);
  }
  .ts-mood-btn--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.15));
  }
  .ts-mood-color {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .ts-mood-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--hdp-text);
  }

  /* ── Skin Selector ── */
  .ts-skin-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ts-skin-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px;
    border: 2px solid var(--hdp-border);
    border-radius: 10px;
    background: var(--hdp-card-bg);
    cursor: pointer;
    transition: var(--hdp-transition, 0.2s ease);
  }
  .ts-skin-btn:hover {
    border-color: var(--hdp-primary);
  }
  .ts-skin-btn--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.15));
  }
  .ts-skin-preview {
    width: 100%; height: 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .ts-skin-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--hdp-text);
  }

  /* ── Sliders ── */
  .ts-slider-row {
    margin-bottom: 14px;
  }
  .ts-slider-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .ts-slider-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--hdp-text);
  }
  .ts-slider-value {
    font-size: 12px;
    font-weight: 700;
    color: var(--hdp-primary);
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    padding: 2px 8px;
    border-radius: 10px;
    min-width: 36px;
    text-align: center;
  }
  .ts-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--hdp-divider, #e5e7eb);
    border-radius: 3px;
    outline: none;
    accent-color: var(--hdp-primary);
  }
  .ts-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: var(--hdp-primary);
    border: 3px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  .ts-slider::-moz-range-thumb {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: var(--hdp-primary);
    border: 3px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }

  /* ── Density Selector ── */
  .ts-density-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ts-density-btn {
    padding: 8px;
    border: 2px solid var(--hdp-border);
    border-radius: 10px;
    background: var(--hdp-card-bg);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text-secondary);
    transition: var(--hdp-transition, 0.2s ease);
    text-align: center;
  }
  .ts-density-btn:hover { border-color: var(--hdp-primary); }
  .ts-density-btn--active {
    border-color: var(--hdp-primary);
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    color: var(--hdp-primary);
  }

  /* ── Mode Toggle ── */
  .ts-mode-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ts-mode-btn {
    padding: 10px;
    border: 2px solid var(--hdp-border);
    border-radius: 10px;
    background: var(--hdp-card-bg);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text-secondary);
    transition: var(--hdp-transition, 0.2s ease);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .ts-mode-btn:hover { border-color: var(--hdp-primary); }
  .ts-mode-btn--active {
    border-color: var(--hdp-primary);
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    color: var(--hdp-primary);
  }
  .ts-mode-btn svg { width: 14px; height: 14px; }

  /* ── Actions ── */
  .ts-panel-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--hdp-divider, #f0f0f0);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--hdp-card-bg, #fff);
  }
  .ts-action-row {
    display: flex;
    gap: 10px;
  }
  .ts-btn {
    flex: 1;
    padding: 12px 16px;
    border-radius: var(--hdp-radius, 14px);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-family: var(--hdp-font, inherit);
    transition: var(--hdp-transition, 0.2s ease);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .ts-btn svg { width: 16px; height: 16px; }
  .ts-btn--secondary {
    background: var(--hdp-card-bg);
    color: var(--hdp-text-secondary);
    border: 1px solid var(--hdp-border);
  }
  .ts-btn--secondary:hover {
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .ts-btn--primary {
    background: var(--hdp-gradient-primary, var(--hdp-primary));
    color: white;
    box-shadow: 0 4px 12px var(--hdp-primary-glow, rgba(79,110,247,0.2));
  }
  .ts-btn--primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--hdp-primary-glow, rgba(79,110,247,0.3));
  }
  .ts-btn--ghost {
    background: transparent;
    color: var(--hdp-text-muted);
    font-size: 13px;
  }
  .ts-btn--ghost:hover { color: var(--hdp-primary); }

  /* ── Theme Code Dialog ── */
  .ts-code-dialog {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: var(--hdp-card-bg, #fff);
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.2);
    padding: 24px;
    width: 480px;
    max-width: 90vw;
    z-index: 100000;
    display: none;
    flex-direction: column;
    gap: 16px;
  }
  .ts-code-dialog--open { display: flex; }
  .ts-code-dialog-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .ts-code-textarea {
    width: 100%;
    height: 100px;
    border: 1px solid var(--hdp-border);
    border-radius: 10px;
    padding: 12px;
    font-family: 'SF Mono', 'Cascadia Code', monospace;
    font-size: 12px;
    color: var(--hdp-text);
    background: var(--hdp-bg);
    resize: vertical;
    line-height: 1.5;
  }
  .ts-code-textarea:focus {
    outline: none;
    border-color: var(--hdp-primary);
  }
  .ts-code-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .ts-code-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 99998;
    display: none;
  }
  .ts-code-backdrop--open { display: block; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .hdp-studio-overlay { flex-direction: column; }
    .hdp-studio-preview { flex: none; max-height: 40vh; padding: 16px; }
    .hdp-studio-panel {
      width: 100%;
      min-width: 0;
      height: 60vh;
      border-left: none;
      border-top: 1px solid var(--hdp-border);
    }
    .ts-preview-grid { grid-template-columns: 1fr; }
  }
</style>

<!-- Theme Studio Overlay -->
<div class="hdp-studio-overlay" id="hdp-studio-overlay">
  <!-- Preview Area -->
  <div class="hdp-studio-preview">
    <div class="hdp-studio-preview-title">实时预览</div>
    <div class="ts-preview-container" id="ts-preview-grid">
      ${previewHTML}
    </div>
  </div>

  <!-- Control Panel -->
  <div class="hdp-studio-panel">
    <div class="ts-panel-header">
      <div class="ts-panel-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        主题工作室
      </div>
      <button class="ts-close-btn" id="ts-close-btn" aria-label="关闭工作室">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="ts-panel-body">
      <!-- Seed Color Wheel -->
      <div class="ts-panel-section">
        <div class="ts-section-label">种子色</div>
        <div class="ts-wheel-container">
          <div class="ts-wheel-canvas-wrap">
            <canvas id="ts-color-wheel" width="240" height="240"></canvas>
            <div class="ts-wheel-marker" id="ts-hue-marker" style="left: 230px; top: 120px;"></div>
            <div class="ts-wheel-sv-marker" id="ts-sv-marker" style="left: 180px; top: 60px;"></div>
          </div>
          <div class="ts-color-display">
            <div class="ts-color-swatch" id="ts-color-swatch" style="background: ${currentSeedStyle};"></div>
            <input type="text" class="ts-color-hex" id="ts-color-hex" value="${currentSeed}" readonly />
          </div>
        </div>
      </div>

      <!-- Mood Presets -->
      <div class="ts-panel-section">
        <div class="ts-section-label">氛围预设</div>
        <div class="ts-mood-grid">${moodButtons}</div>
      </div>

      <!-- Card Skin -->
      <div class="ts-panel-section">
        <div class="ts-section-label">卡片材质</div>
        <div class="ts-skin-grid">${skinButtons}</div>
      </div>

      <!-- Density -->
      <div class="ts-panel-section">
        <div class="ts-section-label">布局密度</div>
        <div class="ts-density-row">
          <button class="ts-density-btn" data-density="compact">紧凑</button>
          <button class="ts-density-btn ts-density-btn--active" data-density="standard">标准</button>
          <button class="ts-density-btn" data-density="spacious">宽松</button>
        </div>
      </div>

      <!-- Sliders -->
      <div class="ts-panel-section">
        <div class="ts-section-label">细节调整</div>
        <div class="ts-slider-row">
          <div class="ts-slider-header">
            <span class="ts-slider-label">圆角大小</span>
            <span class="ts-slider-value" id="ts-radius-val">${currentRadius}px</span>
          </div>
          <input type="range" class="ts-slider" id="ts-radius-slider" min="0" max="32" value="${currentRadius}" />
        </div>
        <div class="ts-slider-row">
          <div class="ts-slider-header">
            <span class="ts-slider-label">卡片间距</span>
            <span class="ts-slider-value" id="ts-gap-val">${currentGap}px</span>
          </div>
          <input type="range" class="ts-slider" id="ts-gap-slider" min="4" max="32" value="${currentGap}" />
        </div>
        <div class="ts-slider-row">
          <div class="ts-slider-header">
            <span class="ts-slider-label">内边距</span>
            <span class="ts-slider-value" id="ts-padding-val">${currentPadding}px</span>
          </div>
          <input type="range" class="ts-slider" id="ts-padding-slider" min="8" max="40" value="${currentPadding}" />
        </div>
      </div>

      <!-- Mode -->
      <div class="ts-panel-section">
        <div class="ts-section-label">明暗模式</div>
        <div class="ts-mode-row">
          <button class="ts-mode-btn ${!autoDark ? 'ts-mode-btn--active' : ''}" data-mode="light">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            明亮
          </button>
          <button class="ts-mode-btn" data-mode="dark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            暗黑
          </button>
          <button class="ts-mode-btn ${autoDark ? 'ts-mode-btn--active' : ''}" data-mode="auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M6 8h12l-2 12H8z"/></svg>
            自动
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="ts-panel-footer">
      <div class="ts-action-row">
        <button class="ts-btn ts-btn--secondary" id="ts-export-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          导出
        </button>
        <button class="ts-btn ts-btn--secondary" id="ts-import-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          导入
        </button>
      </div>
      <div class="ts-action-row">
        <button class="ts-btn ts-btn--secondary" id="ts-reset-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          重置
        </button>
        <button class="ts-btn ts-btn--primary" id="ts-save-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          保存主题
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Theme Code Dialog -->
<div class="ts-code-backdrop" id="ts-code-backdrop"></div>
<div class="ts-code-dialog" id="ts-code-dialog">
  <div class="ts-code-dialog-title" id="ts-code-dialog-title">导出主题码</div>
  <textarea class="ts-code-textarea" id="ts-code-textarea" placeholder="粘贴主题码到这里..."></textarea>
  <div class="ts-code-actions">
    <button class="ts-btn ts-btn--secondary" id="ts-code-copy-btn" style="flex: none; padding: 10px 16px;">复制</button>
    <button class="ts-btn ts-btn--secondary" id="ts-code-close-btn" style="flex: none; padding: 10px 16px;">关闭</button>
    <button class="ts-btn ts-btn--primary" id="ts-code-apply-btn" style="flex: none; padding: 10px 16px; display: none;">应用</button>
  </div>
</div>
`;
}

/**
 * Build fallback preview cards when real dashboard data is unavailable.
 * Uses the same card skin as the current theme.
 */
function buildFallbackPreview(skin: string): string {
  const skinCls = `hdp-card hdp-card--${skin}`;
  return `<div class="ts-preview-grid">
    <div class="ts-preview-card ts-preview-card--wide ${skinCls}" style="padding: 20px; border-radius: var(--hdp-radius, 14px);">
      <div style="font-size: 20px; font-weight: 700; color: var(--hdp-text); margin-bottom: 4px;">你好，上午好</div>
      <div style="font-size: 13px; color: var(--hdp-text-secondary);">今天有 3 个设备需要关注</div>
    </div>
    <div class="ts-preview-card ${skinCls}" style="padding: 16px; border-radius: var(--hdp-radius, 14px);">
      <div style="font-size: 12px; color: var(--hdp-text-muted); margin-bottom: 8px;">客厅温度</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--hdp-primary);">23.5°</div>
      <div style="font-size: 11px; color: var(--hdp-text-secondary); margin-top: 4px;">湿度 45%</div>
    </div>
    <div class="ts-preview-card ${skinCls}" style="padding: 16px; border-radius: var(--hdp-radius, 14px); display: flex; flex-direction: column; gap: 10px;">
      <div style="font-size: 12px; color: var(--hdp-text-muted);">客厅灯</div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 14px; font-weight: 600; color: var(--hdp-text);">已开启</span>
        <div style="width: 40px; height: 24px; border-radius: 12px; background: var(--hdp-primary); position: relative;">
          <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: white; top: 2px; right: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
        </div>
      </div>
    </div>
    <div class="ts-preview-card ${skinCls}" style="padding: 16px; border-radius: var(--hdp-radius, 14px);">
      <div style="font-size: 12px; color: var(--hdp-text-muted); margin-bottom: 8px;">实时功率</div>
      <div style="font-size: 24px; font-weight: 700; color: var(--hdp-text);">1.2 kW</div>
      <div style="height: 4px; border-radius: 2px; background: var(--hdp-divider); margin-top: 8px; overflow: hidden;">
        <div style="width: 60%; height: 100%; border-radius: 2px; background: var(--hdp-gradient-primary, var(--hdp-primary));"></div>
      </div>
    </div>
    <div class="ts-preview-card ${skinCls}" style="padding: 16px; border-radius: var(--hdp-radius, 14px);">
      <div style="font-size: 12px; color: var(--hdp-text-muted); margin-bottom: 10px;">设备概览</div>
      <div style="display: flex; justify-content: space-around; text-align: center;">
        <div>
          <div style="font-size: 20px; font-weight: 700; color: var(--hdp-success);">12</div>
          <div style="font-size: 10px; color: var(--hdp-text-muted);">在线</div>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 700; color: var(--hdp-warning);">2</div>
          <div style="font-size: 10px; color: var(--hdp-text-muted);">离线</div>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 700; color: var(--hdp-info);">5</div>
          <div style="font-size: 10px; color: var(--hdp-text-muted);">区域</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Client-Side JS ─────────────────────────────────────────────────────────

/**
 * Generate all client-side JavaScript for the Theme Studio.
 * Includes: color wheel canvas, real-time CSS variable binding,
 * mood/skin/density/mode selection, theme code export/import, save/reset.
 */
export function generateThemeStudioJS(): string {
  return `
// ── Theme Studio (client-side) ──────────────────────────────
(function() {
  var overlay = document.getElementById('hdp-studio-overlay');
  if (!overlay) return;

  // ── State ──
  var state = {
    seed: '#4F6EF7',
    mood: '',
    skin: 'classic',
    radius: 14,
    gap: 12,
    padding: 18,
    density: 'standard',
    mode: 'auto',  // 'light' | 'dark' | 'auto'
    hsv: { h: 228, s: 91, v: 97 }  // HSV for the color wheel
  };

  // Load current config from localStorage
  function loadState() {
    try {
      var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
      state.seed = cfg.seed_color || '#4F6EF7';
      state.mood = cfg.mood_preset || '';
      state.skin = cfg.card_style || 'classic';
      state.radius = cfg.border_radius != null ? cfg.border_radius : 14;
      state.gap = cfg.card_gap != null ? cfg.card_gap : 12;
      state.padding = cfg.card_padding != null ? cfg.card_padding : 18;
      state.mode = cfg.auto_dark === false ? 'light' : 'auto';
      state.density = cfg.layout_density || 'standard';
      // If mood is set and not custom, get seed from mood
      if (state.mood && state.mood !== 'custom') {
        var mood = window.HDP_Palette.MOOD_PRESETS.find(function(m){ return m.id === state.mood; });
        if (mood) state.seed = mood.seed;
      }
      // Convert seed hex to HSV for wheel position
      state.hsv = hexToHsv(state.seed);
    } catch(e) {}
  }

  function saveVisualConfig(cfg) {
    if (typeof hdpSaveVisualConfig === 'function') {
      return hdpSaveVisualConfig(cfg);
    }
    try {
      localStorage.setItem('hdp_visual_config', JSON.stringify(cfg || {}));
    } catch(e) {}
    var fullConfig = typeof hdpLoadConfig === 'function' ? hdpLoadConfig() : {};
    fullConfig.visual = cfg || {};
    try {
      localStorage.setItem('hdp_config', JSON.stringify(fullConfig));
    } catch(e) {}
    if (typeof hdpSaveToLovelace === 'function') {
      return hdpSaveToLovelace(fullConfig).catch(function(err) {
        console.warn('[HDP] Lovelace visual sync failed, saved locally only', err);
        return cfg;
      });
    }
    return Promise.resolve(cfg);
  }

  function clearVisualConfig() {
    try {
      localStorage.removeItem('hdp_visual_config');
    } catch(e) {}
    var fullConfig = typeof hdpLoadConfig === 'function' ? hdpLoadConfig() : {};
    fullConfig.visual = {};
    try {
      localStorage.setItem('hdp_config', JSON.stringify(fullConfig));
    } catch(e) {}
    if (typeof hdpSaveToLovelace === 'function') {
      return hdpSaveToLovelace(fullConfig).catch(function(err) {
        console.warn('[HDP] Lovelace visual reset sync failed, cleared locally only', err);
      });
    }
    return Promise.resolve();
  }

  // ── Color Conversions ──
  function hexToRgb(hex) {
    var h = hex.replace('#','');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return {
      r: parseInt(h.substring(0,2),16),
      g: parseInt(h.substring(2,4),16),
      b: parseInt(h.substring(4,6),16)
    };
  }

  function rgbToHex(r, g, b) {
    function toHex(v) { var s = Math.round(v).toString(16); return s.length < 2 ? '0'+s : s; }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function hexToHsv(hex) {
    var rgb = hexToRgb(hex);
    var r = rgb.r/255, g = rgb.g/255, b = rgb.b/255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var delta = max - min;
    var h = 0, s = 0, v = max;
    if (delta !== 0) {
      s = delta / max;
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s*100), v: Math.round(v*100) };
  }

  function hsvToHex(h, s, v) {
    s = s/100; v = v/100;
    var c = v * s;
    var x = c * (1 - Math.abs(((h/60) % 2) - 1));
    var m = v - c;
    var r=0, g=0, b=0;
    if (h<60) { r=c; g=x; b=0; }
    else if (h<120) { r=x; g=c; b=0; }
    else if (h<180) { r=0; g=c; b=x; }
    else if (h<240) { r=0; g=x; b=c; }
    else if (h<300) { r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    return rgbToHex((r+m)*255, (g+m)*255, (b+m)*255);
  }

  // ── Color Wheel Canvas ──
  var canvas = document.getElementById('ts-color-wheel');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var hueMarker = document.getElementById('ts-hue-marker');
  var svMarker = document.getElementById('ts-sv-marker');
  var CW_SIZE = 240;
  var CW_CENTER = CW_SIZE / 2;
  var CW_OUTER_R = 118;
  var CW_RING_W = 26;
  var CW_INNER_R = CW_OUTER_R - CW_RING_W;  // 92
  var CW_SV_SIZE = 120;  // S-V square side
  var CW_SV_HALF = CW_SV_SIZE / 2;  // 60

  function drawWheel() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CW_SIZE, CW_SIZE);

    // Draw hue ring
    for (var angle = 0; angle < 360; angle += 1) {
      var startA = (angle - 90 - 0.5) * Math.PI / 180;
      var endA = (angle - 90 + 1.5) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(CW_CENTER, CW_CENTER, CW_OUTER_R, startA, endA);
      ctx.arc(CW_CENTER, CW_CENTER, CW_INNER_R, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = hsvToHex(angle, 100, 100);
      ctx.fill();
    }

    // Draw S-V square inside the ring
    var sx = CW_CENTER - CW_SV_HALF;
    var sy = CW_CENTER - CW_SV_HALF;

    // Base: pure hue
    ctx.fillStyle = hsvToHex(state.hsv.h, 100, 100);
    ctx.fillRect(sx, sy, CW_SV_SIZE, CW_SV_SIZE);

    // White gradient (left → right = saturation 0→100)
    var wg = ctx.createLinearGradient(sx, 0, sx + CW_SV_SIZE, 0);
    wg.addColorStop(0, 'rgba(255,255,255,1)');
    wg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wg;
    ctx.fillRect(sx, sy, CW_SV_SIZE, CW_SV_SIZE);

    // Black gradient (top → bottom = value 100→0)
    var bg = ctx.createLinearGradient(0, sy, 0, sy + CW_SV_SIZE);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(sx, sy, CW_SV_SIZE, CW_SV_SIZE);

    // Update markers
    updateMarkers();
  }

  function updateMarkers() {
    // Hue marker position on the ring
    var angleRad = (state.hsv.h - 90) * Math.PI / 180;
    var markerR = (CW_OUTER_R + CW_INNER_R) / 2;  // middle of ring
    var hx = CW_CENTER + markerR * Math.cos(angleRad);
    var hy = CW_CENTER + markerR * Math.sin(angleRad);
    if (hueMarker) {
      hueMarker.style.left = hx + 'px';
      hueMarker.style.top = hy + 'px';
      hueMarker.style.background = hsvToHex(state.hsv.h, 100, 100);
    }

    // S-V marker position inside the square
    var svX = CW_CENTER - CW_SV_HALF + (state.hsv.s / 100) * CW_SV_SIZE;
    var svY = CW_CENTER - CW_SV_HALF + (1 - state.hsv.v / 100) * CW_SV_SIZE;
    if (svMarker) {
      svMarker.style.left = svX + 'px';
      svMarker.style.top = svY + 'px';
      svMarker.style.background = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);
    }
  }

  // ── Color Wheel Interaction ──
  var isDragging = false;
  var dragTarget = null;  // 'hue' | 'sv'

  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = CW_SIZE / rect.width;
    var scaleY = CW_SIZE / rect.height;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function handleWheelInteraction(e) {
    if (!isDragging) return;
    e.preventDefault();
    var pos = getCanvasPos(e);
    var dx = pos.x - CW_CENTER;
    var dy = pos.y - CW_CENTER;
    var dist = Math.sqrt(dx*dx + dy*dy);

    if (dragTarget === 'hue') {
      // Hue ring: angle from center
      var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      state.hsv.h = Math.round(angle);
    } else if (dragTarget === 'sv') {
      // S-V square: clamp to square bounds
      var sx = CW_CENTER - CW_SV_HALF;
      var sy = CW_CENTER - CW_SV_HALF;
      var svX = Math.max(0, Math.min(CW_SV_SIZE, pos.x - sx));
      var svY = Math.max(0, Math.min(CW_SV_SIZE, pos.y - sy));
      state.hsv.s = Math.round((svX / CW_SV_SIZE) * 100);
      state.hsv.v = Math.round((1 - svY / CW_SV_SIZE) * 100);
    }

    // Generate new seed color
    state.seed = hsvToHex(state.hsv.h, state.hsv.s, state.hsv.v);
    state.mood = 'custom';  // custom seed color
    updateColorDisplay();
    drawWheel();
    applyRealTime();
  }

  function onCanvasDown(e) {
    var pos = getCanvasPos(e);
    var dx = pos.x - CW_CENTER;
    var dy = pos.y - CW_CENTER;
    var dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > CW_INNER_R && dist <= CW_OUTER_R) {
      // Clicked on hue ring
      dragTarget = 'hue';
      isDragging = true;
      handleWheelInteraction(e);
    } else if (dist <= CW_INNER_R) {
      // Clicked inside S-V square
      dragTarget = 'sv';
      isDragging = true;
      handleWheelInteraction(e);
    }
  }

  if (canvas) {
    canvas.addEventListener('mousedown', onCanvasDown);
    canvas.addEventListener('touchstart', onCanvasDown, { passive: false });
    document.addEventListener('mousemove', handleWheelInteraction);
    document.addEventListener('touchmove', handleWheelInteraction, { passive: false });
    document.addEventListener('mouseup', function() { isDragging = false; dragTarget = null; });
    document.addEventListener('touchend', function() { isDragging = false; dragTarget = null; });
  }

  // ── Update Color Display ──
  function updateColorDisplay() {
    var swatch = document.getElementById('ts-color-swatch');
    var hexEl = document.getElementById('ts-color-hex');
    if (swatch) swatch.style.background = state.seed;
    if (hexEl) hexEl.value = state.seed;

    // Update mood buttons active state
    document.querySelectorAll('.ts-mood-btn').forEach(function(btn) {
      var moodId = btn.getAttribute('data-mood');
      btn.className = 'ts-mood-btn' + (state.mood === moodId ? ' ts-mood-btn--active' : '');
    });
  }

  // ── Real-time Apply ──
  function applyRealTime() {
    if (!window.HDP_Palette) return;

    var mode = state.mode;
    var resolvedMode = mode === 'auto' ? (window.HDP_Palette.shouldUseDarkMode() ? 'dark' : 'light') : mode;
    var palette = window.HDP_Palette.generate(state.seed, resolvedMode);
    palette.card_style = state.skin;
    palette.border_radius = state.radius;
    palette.mood_id = state.mood || 'custom';
    palette.mood_name = '自定义';
    palette.seed = state.seed;
    window.HDP_Palette.applyPaletteToCSS(palette);

    // Apply radius, gap, padding
    var root = document.documentElement;
    root.style.setProperty('--hdp-radius', state.radius + 'px');
    root.style.setProperty('--hdp-card-gap', state.gap + 'px');
    root.style.setProperty('--hdp-card-padding', state.padding + 'px');

    // Apply density CSS variables
    var densityMap = {
      compact:  { gap: 8,  padding: 12, rowHeight: 100, entityPadding: 10 },
      standard: { gap: 14, padding: 18, rowHeight: 120, entityPadding: 14 },
      spacious: { gap: 20, padding: 24, rowHeight: 140, entityPadding: 18 }
    };
    var dp = densityMap[state.density] || densityMap.standard;
    root.style.setProperty('--hdp-density', state.density);
    root.style.setProperty('--hdp-density-gap', dp.gap + 'px');
    root.style.setProperty('--hdp-density-padding', dp.padding + 'px');
    root.style.setProperty('--hdp-density-row-height', dp.rowHeight + 'px');
    root.style.setProperty('--hdp-density-entity-padding', dp.entityPadding + 'px');

    // Update preview card skins (both fallback sample cards and real content)
    var previewContainer = document.getElementById('ts-preview-grid');
    if (previewContainer) {
      previewContainer.querySelectorAll('.hdp-card').forEach(function(card) {
        card.className = card.className.replace(/hdp-card--\\S+/g, '').trim();
        card.classList.add('hdp-card');
        card.classList.add('hdp-card--' + state.skin);
      });
    }

    // Update slider value displays
    var rEl = document.getElementById('ts-radius-val');
    var gEl = document.getElementById('ts-gap-val');
    var pEl = document.getElementById('ts-padding-val');
    if (rEl) rEl.textContent = state.radius + 'px';
    if (gEl) gEl.textContent = state.gap + 'px';
    if (pEl) pEl.textContent = state.padding + 'px';

    // Update skin buttons
    document.querySelectorAll('.ts-skin-btn').forEach(function(btn) {
      var skin = btn.getAttribute('data-skin');
      btn.className = 'ts-skin-btn' + (state.skin === skin ? ' ts-skin-btn--active' : '');
    });

    // Update mode buttons
    document.querySelectorAll('.ts-mode-btn').forEach(function(btn) {
      var m = btn.getAttribute('data-mode');
      btn.className = 'ts-mode-btn' + (state.mode === m ? ' ts-mode-btn--active' : '');
    });
  }

  // ── Mood Preset Selection ──
  document.querySelectorAll('.ts-mood-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var moodId = this.getAttribute('data-mood');
      var mood = window.HDP_Palette.MOOD_PRESETS.find(function(m){ return m.id === moodId; });
      if (!mood) return;
      state.mood = moodId;
      state.seed = mood.seed;
      state.skin = mood.card_skin;
      state.radius = mood.radius;
      state.hsv = hexToHsv(state.seed);

      // Update density slider values to match mood
      var slider = document.getElementById('ts-radius-slider');
      if (slider) slider.value = state.radius;

      drawWheel();
      updateColorDisplay();
      applyRealTime();
    });
  });

  // ── Skin Selection ──
  document.querySelectorAll('.ts-skin-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.skin = this.getAttribute('data-skin');
      applyRealTime();
    });
  });

  // ── Density Selection ──
  document.querySelectorAll('.ts-density-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var density = this.getAttribute('data-density');
      state.density = density;
      if (density === 'compact') { state.gap = 8; state.padding = 12; }
      else if (density === 'standard') { state.gap = 12; state.padding = 18; }
      else if (density === 'spacious') { state.gap = 20; state.padding = 24; }
      // Update sliders
      var gs = document.getElementById('ts-gap-slider');
      var ps = document.getElementById('ts-padding-slider');
      if (gs) gs.value = state.gap;
      if (ps) ps.value = state.padding;
      // Update active state
      document.querySelectorAll('.ts-density-btn').forEach(function(b) {
        b.className = 'ts-density-btn' + (b.getAttribute('data-density') === density ? ' ts-density-btn--active' : '');
      });
      applyRealTime();
    });
  });

  // ── Sliders ──
  var radiusSlider = document.getElementById('ts-radius-slider');
  if (radiusSlider) {
    radiusSlider.addEventListener('input', function() {
      state.radius = Number(this.value);
      applyRealTime();
    });
  }
  var gapSlider = document.getElementById('ts-gap-slider');
  if (gapSlider) {
    gapSlider.addEventListener('input', function() {
      state.gap = Number(this.value);
      // Update density active state
      var density = state.gap <= 8 ? 'compact' : (state.gap >= 20 ? 'spacious' : 'standard');
      state.density = density;
      document.querySelectorAll('.ts-density-btn').forEach(function(b) {
        b.className = 'ts-density-btn' + (b.getAttribute('data-density') === density ? ' ts-density-btn--active' : '');
      });
      applyRealTime();
    });
  }
  var paddingSlider = document.getElementById('ts-padding-slider');
  if (paddingSlider) {
    paddingSlider.addEventListener('input', function() {
      state.padding = Number(this.value);
      applyRealTime();
    });
  }

  // ── Mode Toggle ──
  document.querySelectorAll('.ts-mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.mode = this.getAttribute('data-mode');
      applyRealTime();
    });
  });

  // ── Theme Code Export/Import ──
  function encodeTheme() {
    var config = {
      seed: state.seed,
      mood: state.mood,
      skin: state.skin,
      radius: state.radius,
      gap: state.gap,
      padding: state.padding,
      density: state.density,
      mode: state.mode
    };
    var json = JSON.stringify(config);
    var b64;
    try {
      b64 = btoa(unescape(encodeURIComponent(json)));
    } catch(e) {
      b64 = btoa(json);
    }
    return 'HDP-THEME-v1:' + b64;
  }

  function decodeTheme(code) {
    code = code.trim();
    var prefix = 'HDP-THEME-v1:';
    if (code.indexOf(prefix) !== 0) return null;
    var b64 = code.substring(prefix.length);
    var json;
    try {
      json = decodeURIComponent(escape(atob(b64)));
    } catch(e) {
      json = atob(b64);
    }
    return JSON.parse(json);
  }

  // Export dialog
  var codeDialog = document.getElementById('ts-code-dialog');
  var codeBackdrop = document.getElementById('ts-code-backdrop');
  var codeTitle = document.getElementById('ts-code-dialog-title');
  var codeTextarea = document.getElementById('ts-code-textarea');
  var codeApplyBtn = document.getElementById('ts-code-apply-btn');
  var codeCopyBtn = document.getElementById('ts-code-copy-btn');

  function openExportDialog() {
    if (codeTitle) codeTitle.textContent = '导出主题码';
    if (codeTextarea) codeTextarea.value = encodeTheme();
    if (codeTextarea) codeTextarea.readOnly = true;
    if (codeApplyBtn) codeApplyBtn.style.display = 'none';
    if (codeCopyBtn) codeCopyBtn.style.display = '';
    if (codeDialog) codeDialog.classList.add('ts-code-dialog--open');
    if (codeBackdrop) codeBackdrop.classList.add('ts-code-backdrop--open');
  }

  function openImportDialog() {
    if (codeTitle) codeTitle.textContent = '导入主题码';
    if (codeTextarea) codeTextarea.value = '';
    if (codeTextarea) codeTextarea.readOnly = false;
    if (codeTextarea) codeTextarea.placeholder = '粘贴 HDP-THEME-v1:... 主题码到这里';
    if (codeApplyBtn) codeApplyBtn.style.display = '';
    if (codeCopyBtn) codeCopyBtn.style.display = 'none';
    if (codeDialog) codeDialog.classList.add('ts-code-dialog--open');
    if (codeBackdrop) codeBackdrop.classList.add('ts-code-backdrop--open');
    if (codeTextarea) codeTextarea.focus();
  }

  function closeCodeDialog() {
    if (codeDialog) codeDialog.classList.remove('ts-code-dialog--open');
    if (codeBackdrop) codeBackdrop.classList.remove('ts-code-backdrop--open');
  }

  function applyThemeCode() {
    var code = codeTextarea ? codeTextarea.value : '';
    var config = decodeTheme(code);
    if (!config) {
      alert('无效的主题码，请检查格式');
      return;
    }
    // Apply decoded config
    if (config.seed) { state.seed = config.seed; state.hsv = hexToHsv(config.seed); }
    if (config.mood) state.mood = config.mood;
    if (config.skin) state.skin = config.skin;
    if (config.radius != null) state.radius = config.radius;
    if (config.gap != null) state.gap = config.gap;
    if (config.padding != null) state.padding = config.padding;
    if (config.density) state.density = config.density;
    if (config.mode) state.mode = config.mode;

    // Sync UI
    var rs = document.getElementById('ts-radius-slider');
    if (rs) rs.value = state.radius;
    var gs = document.getElementById('ts-gap-slider');
    if (gs) gs.value = state.gap;
    var ps = document.getElementById('ts-padding-slider');
    if (ps) ps.value = state.padding;

    document.querySelectorAll('.ts-density-btn').forEach(function(b) {
      b.className = 'ts-density-btn' + (b.getAttribute('data-density') === state.density ? ' ts-density-btn--active' : '');
    });

    drawWheel();
    updateColorDisplay();
    applyRealTime();
    closeCodeDialog();
  }

  var exportBtn = document.getElementById('ts-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', openExportDialog);
  var importBtn = document.getElementById('ts-import-btn');
  if (importBtn) importBtn.addEventListener('click', openImportDialog);
  var codeCloseBtn = document.getElementById('ts-code-close-btn');
  if (codeCloseBtn) codeCloseBtn.addEventListener('click', closeCodeDialog);
  if (codeBackdrop) codeBackdrop.addEventListener('click', closeCodeDialog);
  if (codeApplyBtn) codeApplyBtn.addEventListener('click', applyThemeCode);
  if (codeCopyBtn) codeCopyBtn.addEventListener('click', function() {
    if (codeTextarea) codeTextarea.select();
    try { document.execCommand('copy'); } catch(e) {}
    if (codeCopyBtn) codeCopyBtn.textContent = '已复制';
    setTimeout(function() { if (codeCopyBtn) codeCopyBtn.textContent = '复制'; }, 1500);
  });

  // ── Save ──
  var saveBtn = document.getElementById('ts-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', function() {
    var cfg = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
    cfg.seed_color = state.seed;
    cfg.mood_preset = state.mood || 'custom';
    cfg.card_style = state.skin;
    cfg.border_radius = state.radius;
    cfg.card_gap = state.gap;
    cfg.card_padding = state.padding;
    cfg.auto_dark = state.mode !== 'light';  // true for 'auto' and 'dark'
    cfg.layout_density = state.density;

    // Generate and save palette colors
    var resolvedMode = state.mode === 'auto' ? (window.HDP_Palette.shouldUseDarkMode() ? 'dark' : 'light') : state.mode;
    var palette = window.HDP_Palette.generate(state.seed, resolvedMode);
    cfg.primary = palette.primary;
    cfg.page_bg = palette.page_bg;
    cfg.card_bg = palette.card_bg;
    cfg.text_primary = palette.text_primary;
    cfg.text_secondary = palette.text_secondary;
    cfg.border = palette.border;

    saveVisualConfig(cfg).then(function() {
      closeStudio();
      location.reload();
    }).catch(function() {
      closeStudio();
      location.reload();
    });
  });

  // ── Reset ──
  var resetBtn = document.getElementById('ts-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', function() {
    if (!confirm('确定重置为默认主题吗？所有视觉设置将被清除。')) return;
    clearVisualConfig().then(function() {
      closeStudio();
      location.reload();
    }).catch(function() {
      closeStudio();
      location.reload();
    });
    // Remove palette override style
    var existing = document.getElementById('hdp-palette-override');
    if (existing) existing.remove();
  });

  // ── Open / Close ──
  function openStudio() {
    loadState();
    // Sync UI controls
    var rs = document.getElementById('ts-radius-slider');
    if (rs) rs.value = state.radius;
    var gs = document.getElementById('ts-gap-slider');
    if (gs) gs.value = state.gap;
    var ps = document.getElementById('ts-padding-slider');
    if (ps) ps.value = state.padding;

    // Update density active state
    document.querySelectorAll('.ts-density-btn').forEach(function(b) {
      b.className = 'ts-density-btn' + (b.getAttribute('data-density') === state.density ? ' ts-density-btn--active' : '');
    });

    drawWheel();
    updateColorDisplay();
    applyRealTime();
    overlay.classList.add('hdp-studio-overlay--open');
  }

  function closeStudio() {
    overlay.classList.remove('hdp-studio-overlay--open');
    // Remove palette override (will be re-applied on reload if saved)
    var existing = document.getElementById('hdp-palette-override');
    if (existing) existing.remove();
    // Reset inline CSS variable overrides
    document.documentElement.style.removeProperty('--hdp-radius');
    document.documentElement.style.removeProperty('--hdp-card-gap');
    document.documentElement.style.removeProperty('--hdp-card-padding');
  }

  // Expose globally
  window.hdpOpenStudio = openStudio;
  window.hdpCloseStudio = closeStudio;

  var closeBtn = document.getElementById('ts-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeStudio);

  // ESC to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('hdp-studio-overlay--open')) {
      if (codeDialog && codeDialog.classList.contains('ts-code-dialog--open')) {
        closeCodeDialog();
      } else {
        closeStudio();
      }
    }
  });

  // Initial draw (in case studio is opened without loadState)
  loadState();
  drawWheel();
})();
`;
}
