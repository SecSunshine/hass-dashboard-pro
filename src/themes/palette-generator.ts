/**
 * Seed Color Palette Generator (v1.0)
 *
 * Core of the "千人千面" personalization system.
 * Given a single seed color, generates a complete 12-color palette
 * using HSL color space algorithms. Supports light/dark modes and
 * 6 mood presets that bundle seed color + parameters.
 *
 * Algorithm chain:
 *   user picks seed #4F6EF7
 *     → HSL decompose: H=228° S=91% L=67%
 *     → palette generation:
 *         primary      = seed itself
 *         accent       = hue +150° (complementary analogous)
 *         page_bg      = L→96% (light) / L→7% (dark)
 *         card_bg      = L→99% (light) / L→12% (dark)
 *         text_primary = L→15% (light) / L→95% (dark)
 *         text_secondary = L→45% (light) / L→65% (dark)
 *         border       = seed @ 6% alpha
 *         semantic     = fixed hues, saturation follows seed
 *         gradient     = primary → hue+30° same lightness
 *         shadow       = seed @ 3-8% alpha (colored shadow)
 *     → 12 CSS variables written
 */

// ─── HSL Type ──────────────────────────────────────────────────────────────

interface HSL {
  h: number;  // 0-360
  s: number;  // 0-100
  l: number;  // 0-100
}

// ─── Color Conversion Utilities ────────────────────────────────────────────

/**
 * Convert hex color string to HSL.
 * Accepts #RGB, #RRGGBB, #RRGGBBAA formats.
 */
export function hexToHsl(hex: string): HSL {
  // Normalize: remove #, expand shorthand
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let hue = 0;
  let sat = 0;

  if (delta !== 0) {
    sat = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      case b:
        hue = (r - g) / delta + 4;
        break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: Math.round(hue),
    s: Math.round(sat * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex string (#RRGGBB).
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert HSL to rgba string with given alpha.
 */
function hslToRgba(h: number, s: number, l: number, alpha: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const to255 = (v: number) => Math.round((v + m) * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`;
}

// ─── Generated Palette Type ────────────────────────────────────────────────

export interface GeneratedPalette {
  // Core colors
  primary: string;
  accent: string;
  page_bg: string;
  card_bg: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  border: string;

  // Semantic colors (adjusted to harmonize with seed)
  success: string;
  success_light: string;
  warning: string;
  warning_light: string;
  danger: string;
  danger_light: string;
  info: string;
  info_light: string;

  // Derived
  primary_light: string;
  gradient_primary: string;
  shadow_card: string;
  shadow_elevated: string;

  // Meta
  mode: 'light' | 'dark';
  seed: string;
}

// ─── Palette Generation ────────────────────────────────────────────────────

/**
 * Generate a complete color palette from a seed color.
 *
 * @param seedHex  Seed color in hex (e.g. "#4F6EF7")
 * @param mode     "light" or "dark"
 * @returns        Full GeneratedPalette with 18 color values
 */
export function generatePalette(seedHex: string, mode: 'light' | 'dark'): GeneratedPalette {
  const { h, s, l } = hexToHsl(seedHex);

  // Ensure minimum saturation for vibrant palettes
  const seedS = Math.max(s, 40);
  const seedL = Math.max(30, Math.min(l, 70)); // clamp seed lightness to mid-range

  // ── Primary = seed color (normalized) ──
  const primary = hslToHex(h, seedS, seedL);

  // ── Accent = hue +150° (complementary analogous) ──
  const accentHue = (h + 150) % 360;
  const accent = hslToHex(accentHue, seedS, seedL);

  if (mode === 'light') {
    // ── Light mode palette ──
    const page_bg = hslToHex(h, Math.min(seedS * 0.15, 12), 96);
    const card_bg = hslToHex(h, Math.min(seedS * 0.08, 8), 99);
    const text_primary = hslToHex(h, Math.min(seedS * 0.3, 20), 15);
    const text_secondary = hslToHex(h, Math.min(seedS * 0.2, 15), 45);
    const text_muted = hslToHex(h, Math.min(seedS * 0.15, 12), 62);
    const border = hslToRgba(h, seedS, seedL, 0.06);

    // Semantic colors: fixed hues, saturation follows seed
    const success = hslToHex(142, Math.max(seedS * 0.7, 50), 45);
    const warning = hslToHex(38, Math.max(seedS * 0.8, 60), 50);
    const danger = hslToHex(0, Math.max(seedS * 0.8, 60), 50);
    const info = hslToHex(210, Math.max(seedS * 0.7, 55), 50);

    const primary_light = hslToRgba(h, seedS, seedL, 0.10);
    const gradient_primary = `linear-gradient(135deg, ${primary} 0%, ${hslToHex((h + 30) % 360, seedS, seedL)} 100%)`;

    // Colored shadows (not pure black)
    const shadow_card = hslToRgba(h, seedS, seedL, 0.04);
    const shadow_elevated = hslToRgba(h, seedS, seedL, 0.08);

    return {
      primary,
      accent,
      page_bg,
      card_bg,
      text_primary,
      text_secondary,
      text_muted,
      border,
      success,
      success_light: hslToRgba(142, 70, 45, 0.12),
      warning,
      warning_light: hslToRgba(38, 80, 50, 0.12),
      danger,
      danger_light: hslToRgba(0, 70, 50, 0.12),
      info,
      info_light: hslToRgba(210, 70, 50, 0.12),
      primary_light,
      gradient_primary,
      shadow_card: `0 1px 3px ${shadow_card}, 0 4px 12px ${shadow_card}`,
      shadow_elevated: `0 4px 24px ${shadow_elevated}`,
      mode: 'light',
      seed: seedHex,
    };
  } else {
    // ── Dark mode palette ──
    const page_bg = hslToHex(h, Math.min(seedS * 0.2, 15), 7);
    const card_bg = hslToHex(h, Math.min(seedS * 0.15, 12), 12);
    const text_primary = hslToHex(h, Math.min(seedS * 0.15, 10), 95);
    const text_secondary = hslToHex(h, Math.min(seedS * 0.12, 10), 65);
    const text_muted = hslToHex(h, Math.min(seedS * 0.1, 8), 48);
    const border = hslToRgba(h, seedS, seedL, 0.08);

    // Semantic colors: brighter for dark mode
    const success = hslToHex(142, Math.max(seedS * 0.7, 50), 55);
    const warning = hslToHex(38, Math.max(seedS * 0.8, 60), 58);
    const danger = hslToHex(0, Math.max(seedS * 0.8, 60), 58);
    const info = hslToHex(210, Math.max(seedS * 0.7, 55), 58);

    const primary_light = hslToRgba(h, seedS, seedL, 0.15);
    const gradient_primary = `linear-gradient(135deg, ${primary} 0%, ${hslToHex((h + 30) % 360, seedS, seedL)} 100%)`;

    // Dark mode shadows: deeper
    const shadow_card = `rgba(0, 0, 0, 0.2)`;
    const shadow_elevated = `rgba(0, 0, 0, 0.3)`;

    return {
      primary,
      accent,
      page_bg,
      card_bg,
      text_primary,
      text_secondary,
      text_muted,
      border,
      success,
      success_light: hslToRgba(142, 70, 55, 0.15),
      warning,
      warning_light: hslToRgba(38, 80, 58, 0.15),
      danger,
      danger_light: hslToRgba(0, 70, 58, 0.15),
      info,
      info_light: hslToRgba(210, 70, 58, 0.15),
      primary_light,
      gradient_primary,
      shadow_card: `0 1px 3px ${shadow_card}, 0 4px 12px ${shadow_card}`,
      shadow_elevated: `0 4px 24px ${shadow_elevated}`,
      mode: 'dark',
      seed: seedHex,
    };
  }
}

// ─── Mood Presets ──────────────────────────────────────────────────────────

export interface MoodPreset {
  id: string;
  name: string;
  name_en: string;
  seed: string;
  hue_shift: number;    // degrees added to seed hue
  lightness_mode: 'light' | 'dark' | 'medium';
  radius: number;       // border radius px
  shadow_style: 'soft' | 'deep' | 'natural' | 'warm' | 'none' | 'glow';
  card_skin: string;    // classic | glass | gradient
  icon: string;         // emoji or symbol for UI
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'coral',
    name: '晨曦',
    name_en: 'Coral',
    seed: '#FF6B6B',
    hue_shift: 20,
    lightness_mode: 'light',
    radius: 16,
    shadow_style: 'soft',
    card_skin: 'glass',
    icon: '🌅',
  },
  {
    id: 'abyss',
    name: '深海',
    name_en: 'Abyss',
    seed: '#1A73E8',
    hue_shift: 0,
    lightness_mode: 'dark',
    radius: 12,
    shadow_style: 'deep',
    card_skin: 'aurora',
    icon: '🌊',
  },
  {
    id: 'forest',
    name: '森境',
    name_en: 'Forest',
    seed: '#2D7A4F',
    hue_shift: 10,
    lightness_mode: 'medium',
    radius: 14,
    shadow_style: 'natural',
    card_skin: 'classic',
    icon: '🌿',
  },
  {
    id: 'amber',
    name: '暮金',
    name_en: 'Amber',
    seed: '#C2702E',
    hue_shift: -15,
    lightness_mode: 'medium',
    radius: 18,
    shadow_style: 'warm',
    card_skin: 'gradient',
    icon: '🌇',
  },
  {
    id: 'mono',
    name: '极简',
    name_en: 'Mono',
    seed: '#6366F1',
    hue_shift: 0,
    lightness_mode: 'light',
    radius: 8,
    shadow_style: 'none',
    card_skin: 'classic',
    icon: '⚪',
  },
  {
    id: 'neon',
    name: '霓虹',
    name_en: 'Neon',
    seed: '#8B5CF6',
    hue_shift: 40,
    lightness_mode: 'dark',
    radius: 20,
    shadow_style: 'glow',
    card_skin: 'neon',
    icon: '💜',
  },
];

export function getMoodPreset(id: string): MoodPreset | undefined {
  return MOOD_PRESETS.find(m => m.id === id);
}

// ─── Auto Dark Mode Detection ──────────────────────────────────────────────

/**
 * Determine if dark mode should be used based on current time.
 * Dark mode: 20:00 - 06:00
 * Light mode: 06:00 - 20:00
 */
export function shouldUseDarkMode(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

/**
 * Resolve the effective mode: if auto, use time-based; otherwise use explicit.
 */
export function resolveMode(mode: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (mode === 'auto') return shouldUseDarkMode() ? 'dark' : 'light';
  return mode;
}

// ─── Mood-based Palette Generation ─────────────────────────────────────────

export interface MoodPaletteResult extends GeneratedPalette {
  card_style: string;
  border_radius: number;
  mood_id: string;
  mood_name: string;
}

/**
 * Generate a complete palette from a mood preset.
 * Applies the mood's hue shift and parameters.
 */
export function generateFromMood(
  moodId: string,
  autoDark: boolean = false,
): MoodPaletteResult | null {
  const mood = getMoodPreset(moodId);
  if (!mood) return null;

  // Determine mode
  const mode: 'light' | 'dark' = autoDark
    ? resolveMode('auto')
    : (mood.lightness_mode === 'dark' ? 'dark' : 'light');

  // Apply hue shift to seed
  const { h, s, l } = hexToHsl(mood.seed);
  const shiftedHue = (h + mood.hue_shift + 360) % 360;
  const adjustedSeed = hslToHex(shiftedHue, s, l);

  // Generate palette from shifted seed
  const palette = generatePalette(adjustedSeed, mode);

  return {
    ...palette,
    card_style: mood.card_skin,
    border_radius: mood.radius,
    mood_id: mood.id,
    mood_name: mood.name,
  };
}

/**
 * Generate a palette from a custom seed color with explicit mode.
 */
export function generateFromSeed(
  seedHex: string,
  mode: 'light' | 'dark' | 'auto' = 'auto',
): MoodPaletteResult {
  const resolvedMode = resolveMode(mode);
  const palette = generatePalette(seedHex, resolvedMode);

  return {
    ...palette,
    card_style: resolvedMode === 'dark' ? 'aurora' : 'glass',
    border_radius: 14,
    mood_id: 'custom',
    mood_name: '自定义',
  };
}

// ─── Palette → ResolvedTokens Bridge ───────────────────────────────────────

/**
 * Convert a generated palette into the ResolvedTokens format
 * so it can be consumed by the existing design-tokens system.
 */
export function paletteToTokens(palette: MoodPaletteResult): {
  primary?: string;
  page_bg?: string;
  card_bg?: string;
  text_primary?: string;
  text_secondary?: string;
  border?: string;
  card_style?: string;
  border_radius?: number;
  shadows?: boolean;
} {
  return {
    primary: palette.primary,
    page_bg: palette.page_bg,
    card_bg: palette.card_bg,
    text_primary: palette.text_primary,
    text_secondary: palette.text_secondary,
    border: palette.border,
    card_style: palette.card_style,
    border_radius: palette.border_radius,
  };
}

// ─── Client-side JS Generator ──────────────────────────────────────────────

/**
 * Generate client-side JS code for the palette generator.
 * This allows the settings page to generate palettes in real-time
 * without reloading.
 */
export function generatePaletteGeneratorJS(): string {
  return `
// ─── Palette Generator (client-side) ──────────────────────────
window.HDP_Palette = {
  hexToHsl: function(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substring(0,2),16)/255;
    var g = parseInt(h.substring(2,4),16)/255;
    var b = parseInt(h.substring(4,6),16)/255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var delta = max - min;
    var l = (max+min)/2;
    var hue = 0, sat = 0;
    if (delta !== 0) {
      sat = delta / (1 - Math.abs(2*l - 1));
      if (max === r) hue = ((g-b)/delta) % 6;
      else if (max === g) hue = (b-r)/delta + 2;
      else hue = (r-g)/delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    return { h: Math.round(hue), s: Math.round(sat*100), l: Math.round(l*100) };
  },

  hslToHex: function(h, s, l) {
    var sN = s/100, lN = l/100;
    var c = (1 - Math.abs(2*lN - 1)) * sN;
    var x = c * (1 - Math.abs(((h/60) % 2) - 1));
    var m = lN - c/2;
    var r=0,g=0,b=0;
    if (h<60) { r=c; g=x; b=0; }
    else if (h<120) { r=x; g=c; b=0; }
    else if (h<180) { r=0; g=c; b=x; }
    else if (h<240) { r=0; g=x; b=c; }
    else if (h<300) { r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    function toHex(v) { return Math.round((v+m)*255).toString(16).padStart(2,'0'); }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  },

  hslToRgba: function(h, s, l, a) {
    var sN = s/100, lN = l/100;
    var c = (1 - Math.abs(2*lN - 1)) * sN;
    var x = c * (1 - Math.abs(((h/60) % 2) - 1));
    var m = lN - c/2;
    var r=0,g=0,b=0;
    if (h<60) { r=c; g=x; b=0; }
    else if (h<120) { r=x; g=c; b=0; }
    else if (h<180) { r=0; g=c; b=x; }
    else if (h<240) { r=0; g=x; b=c; }
    else if (h<300) { r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    function t(v) { return Math.round((v+m)*255); }
    return 'rgba(' + t(r) + ',' + t(g) + ',' + t(b) + ',' + a + ')';
  },

  generate: function(seedHex, mode) {
    var c = this.hexToHsl(seedHex);
    var seedS = Math.max(c.s, 40);
    var seedL = Math.max(30, Math.min(c.l, 70));
    var h = c.h;
    var primary = this.hslToHex(h, seedS, seedL);
    var accentHue = (h + 150) % 360;
    var accent = this.hslToHex(accentHue, seedS, seedL);

    if (mode === 'dark') {
      return {
        primary: primary,
        accent: accent,
        page_bg: this.hslToHex(h, Math.min(seedS*0.2,15), 7),
        card_bg: this.hslToHex(h, Math.min(seedS*0.15,12), 12),
        text_primary: this.hslToHex(h, Math.min(seedS*0.15,10), 95),
        text_secondary: this.hslToHex(h, Math.min(seedS*0.12,10), 65),
        text_muted: this.hslToHex(h, Math.min(seedS*0.1,8), 48),
        border: this.hslToRgba(h, seedS, seedL, 0.08),
        success: this.hslToHex(142, Math.max(seedS*0.7,50), 55),
        warning: this.hslToHex(38, Math.max(seedS*0.8,60), 58),
        danger: this.hslToHex(0, Math.max(seedS*0.8,60), 58),
        info: this.hslToHex(210, Math.max(seedS*0.7,55), 58),
        primary_light: this.hslToRgba(h, seedS, seedL, 0.15),
        gradient_primary: 'linear-gradient(135deg,' + primary + ' 0%,' + this.hslToHex((h+30)%360, seedS, seedL) + ' 100%)'
      };
    }
    // light mode
    return {
      primary: primary,
      accent: accent,
      page_bg: this.hslToHex(h, Math.min(seedS*0.15,12), 96),
      card_bg: this.hslToHex(h, Math.min(seedS*0.08,8), 99),
      text_primary: this.hslToHex(h, Math.min(seedS*0.3,20), 15),
      text_secondary: this.hslToHex(h, Math.min(seedS*0.2,15), 45),
      text_muted: this.hslToHex(h, Math.min(seedS*0.15,12), 62),
      border: this.hslToRgba(h, seedS, seedL, 0.06),
      success: this.hslToHex(142, Math.max(seedS*0.7,50), 45),
      warning: this.hslToHex(38, Math.max(seedS*0.8,60), 50),
      danger: this.hslToHex(0, Math.max(seedS*0.8,60), 50),
      info: this.hslToHex(210, Math.max(seedS*0.7,55), 50),
      primary_light: this.hslToRgba(h, seedS, seedL, 0.10),
      gradient_primary: 'linear-gradient(135deg,' + primary + ' 0%,' + this.hslToHex((h+30)%360, seedS, seedL) + ' 100%)'
    };
  },

  shouldUseDarkMode: function() {
    var hr = new Date().getHours();
    return hr >= 20 || hr < 6;
  },

  MOOD_PRESETS: ${JSON.stringify(MOOD_PRESETS.map(m => ({ id: m.id, name: m.name, seed: m.seed, icon: m.icon, card_skin: m.card_skin, radius: m.radius })))},

  generateFromMood: function(moodId, autoDark) {
    var mood = this.MOOD_PRESETS.find(function(m){ return m.id === moodId; });
    if (!mood) return null;
    var mode = autoDark
      ? (this.shouldUseDarkMode() ? 'dark' : 'light')
      : (mood.id === 'abyss' || mood.id === 'neon' ? 'dark' : 'light');
    var c = this.hexToHsl(mood.seed);
    var shiftedHue = (c.h + 0 + 360) % 360; // hue shift already baked into presets
    var adjustedSeed = this.hslToHex(shiftedHue, c.s, c.l);
    var palette = this.generate(adjustedSeed, mode);
    palette.card_style = mood.card_skin;
    palette.border_radius = mood.radius;
    palette.mood_id = mood.id;
    palette.mood_name = mood.name;
    return palette;
  },

  applyPaletteToCSS: function(palette) {
    var root = document.documentElement;
    var styleId = 'hdp-palette-override';
    var existing = document.getElementById(styleId);
    if (existing) existing.remove();
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = ':root, :host {' +
      '--hdp-primary:' + palette.primary + ';' +
      '--hdp-accent:' + palette.accent + ';' +
      '--hdp-bg:' + palette.page_bg + ';' +
      '--hdp-card-bg:' + palette.card_bg + ';' +
      '--hdp-text:' + palette.text_primary + ';' +
      '--hdp-text-secondary:' + palette.text_secondary + ';' +
      '--hdp-text-muted:' + palette.text_muted + ';' +
      '--hdp-border:' + palette.border + ';' +
      '--hdp-success:' + palette.success + ';' +
      '--hdp-warning:' + palette.warning + ';' +
      '--hdp-danger:' + palette.danger + ';' +
      '--hdp-info:' + palette.info + ';' +
      '--hdp-primary-light:' + palette.primary_light + ';' +
      '--hdp-gradient-primary:' + palette.gradient_primary + ';' +
      (palette.card_style ? '--hdp-card-skin:' + palette.card_style + ';' : '') +
      (palette.border_radius ? '--hdp-radius:' + palette.border_radius + 'px;' : '') +
    '}';
    document.head.appendChild(style);
  },

  savePalette: function(palette) {
    var config = window.hdpLoadConfig ? hdpLoadConfig() : {};
    config = config || {};
    config.seed_color = palette.seed || palette.mood_id;
    config.mood_preset = palette.mood_id;
    config.card_style = palette.card_style;
    config.border_radius = palette.border_radius;
    config.primary = palette.primary;
    config.page_bg = palette.page_bg;
    config.card_bg = palette.card_bg;
    config.text_primary = palette.text_primary;
    config.text_secondary = palette.text_secondary;
    config.border = palette.border;
    if (window.hdpSaveConfig) hdpSaveConfig(config);
    // Also save to localStorage visual config
    try {
      var vc = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}');
      vc.primary = palette.primary;
      vc.page_bg = palette.page_bg;
      vc.card_bg = palette.card_bg;
      vc.text_primary = palette.text_primary;
      vc.text_secondary = palette.text_secondary;
      vc.border = palette.border;
      vc.card_style = palette.card_style;
      vc.border_radius = palette.border_radius;
      vc.mood_preset = palette.mood_id;
      localStorage.setItem('hdp_visual_config', JSON.stringify(vc));
    } catch(e) {}
  }
};
`;
}
