import { describe, expect, it } from 'vitest';
import { buildThemeStudioHTML, generateThemeStudioJS } from './theme-studio';

describe('theme studio', () => {
  it('stages saved and reset visual settings through settings APIs', () => {
    const js = generateThemeStudioJS();

    expect(js).toContain('function saveVisualConfig(cfg)');
    expect(js).toContain("if (typeof hdpSaveVisualConfig === 'function')");
    expect(js).toContain('hdpSaveVisualConfig(cfg)');
    expect(js).toContain("if (typeof hdpClearVisualConfigAndReload === 'function')");
    expect(js).toContain('hdpClearVisualConfigAndReload()');
    expect(js).toContain('fullConfig.visual = cfg || {}');
    expect(js).toContain('function clearVisualConfig()');
    expect(js).toContain('fullConfig.visual = {}');
    expect(js).toContain('hdpSaveToLovelace(fullConfig)');
    expect(js).toContain('saveVisualConfig(cfg).then(function()');
    expect(js).toContain('clearVisualConfig().then(function()');
    expect(js).toContain("hdpShowToast('主题已暂存，点击保存并应用后生效', 'success')");
    expect(js).toContain("hdpShowToast('主题重置已暂存，点击保存并应用后生效', 'success')");

    const saveBlock = js.slice(
      js.indexOf('saveVisualConfig(cfg).then(function()'),
      js.indexOf('  // ── Reset ──'),
    );
    const resetBlock = js.slice(
      js.indexOf('clearVisualConfig().then(function()'),
      js.indexOf('    // Remove palette override style'),
    );
    expect(saveBlock).not.toContain('location.reload()');
    expect(resetBlock).not.toContain('location.reload()');
  });

  it('sanitizes imported and persisted card skins', () => {
    const js = generateThemeStudioJS();

    expect(js).toContain('function sanitizeSkin(value)');
    expect(js).toContain('state.skin = sanitizeSkin(cfg.card_style);');
    expect(js).toContain('if (config.skin) state.skin = sanitizeSkin(config.skin);');
    expect(js).toContain('cfg.card_style = sanitizeSkin(state.skin);');
    expect(js).toContain("'soft-data'");
  });

  it('uses responsive shrink-safe studio layout css', () => {
    const html = buildThemeStudioHTML();

    expect(html).toContain(`.hdp-studio-overlay,
  .hdp-studio-overlay *`);
    expect(html).toContain('box-sizing: border-box');
    expect(html).toContain(`.ts-action-row {
    display: flex;
    flex-wrap: wrap;`);
    expect(html).toContain(`.ts-btn {
    flex: 1 1 120px;`);
    expect(html).toContain(`max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;`);
    expect(html).toContain('width: min(480px, calc(100vw - 32px))');
    expect(html).toContain('max-height: calc(100vh - 32px)');
    expect(html).toContain(`.ts-code-actions {
    display: flex;
    flex-wrap: wrap;`);
    expect(html).toContain(`.ts-code-actions .ts-btn {
    flex: 0 1 auto;`);
    expect(html).toContain('.ts-code-actions .ts-btn { flex: 1 1 120px; }');
    expect(html).not.toContain('style="flex: none; padding: 10px 16px;');
    expect(html).toContain('width: clamp(320px, 32vw, 380px)');
    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(92px, 1fr))');
    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))');
    expect(html).toContain('.ts-skin-preview-line');
    expect(html).toContain('.ts-preview-toggle');
    expect(html).toContain('.ts-preview-progress-fill');
    expect(html).not.toContain('style="width: 40px; height: 24px;');
    expect(html).not.toContain('width: 100px;');
    expect(html).not.toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(html).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(html).not.toContain('min-width: 380px');
    expect(html).not.toContain('grid-template-columns: repeat(3, 1fr)');
    expect(html).not.toContain('grid-template-columns: repeat(2, 1fr)');
  });
});
