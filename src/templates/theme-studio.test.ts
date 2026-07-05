import { describe, expect, it } from 'vitest';
import { buildThemeStudioHTML, generateThemeStudioJS } from './theme-studio';

describe('theme studio', () => {
  it('persists saved and reset visual settings to dashboard config', () => {
    const js = generateThemeStudioJS();

    expect(js).toContain('function saveVisualConfig(cfg)');
    expect(js).toContain('hdpSaveVisualConfig(cfg)');
    expect(js).toContain('fullConfig.visual = cfg || {}');
    expect(js).toContain('function clearVisualConfig()');
    expect(js).toContain('fullConfig.visual = {}');
    expect(js).toContain('hdpSaveToLovelace(fullConfig)');
    expect(js).toContain('saveVisualConfig(cfg).then(function()');
    expect(js).toContain('clearVisualConfig().then(function()');
  });

  it('sanitizes imported and persisted card skins', () => {
    const js = generateThemeStudioJS();

    expect(js).toContain('function sanitizeSkin(value)');
    expect(js).toContain('state.skin = sanitizeSkin(cfg.card_style);');
    expect(js).toContain('if (config.skin) state.skin = sanitizeSkin(config.skin);');
    expect(js).toContain('cfg.card_style = sanitizeSkin(state.skin);');
  });

  it('uses responsive shrink-safe studio layout css', () => {
    const html = buildThemeStudioHTML();

    expect(html).toContain('width: clamp(320px, 32vw, 380px)');
    expect(html).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(html).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(html).not.toContain('min-width: 380px');
    expect(html).not.toContain('grid-template-columns: repeat(3, 1fr)');
    expect(html).not.toContain('grid-template-columns: repeat(2, 1fr)');
  });
});
