import { describe, expect, it } from 'vitest';
import { generateThemeStudioJS } from './theme-studio';

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
});
