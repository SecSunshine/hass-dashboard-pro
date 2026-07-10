import { describe, expect, it } from 'vitest';
import { buildBlueprintGalleryHTML, buildImportModalHTML, generateBlueprintModalJS } from './blueprint-gallery';

describe('blueprint gallery rendering', () => {
  it('renders stable management markup for empty and sourced blueprints', () => {
    const emptyHTML = buildBlueprintGalleryHTML([]);
    expect(emptyHTML).toContain('<span class="bp-gallery-title">蓝图页面</span>');
    expect(emptyHTML).toContain('<div class="bp-empty-list">暂无蓝图页面，点击上方按钮导入</div>');
    expect(emptyHTML).toContain('data-action="import-online-template" onclick="hdpImportOnlineTemplate()">在线库</button>');
    expect(emptyHTML).toContain('URL 导入');
    expect(emptyHTML).toContain('.bp-gallery-actions');
    expect(emptyHTML).toContain('flex-wrap: wrap');
    expect(emptyHTML).toContain('background: var(--hdp-control-bg, var(--hdp-card-bg, var(--ha-card-background, var(--card-background-color))));');
    expect(emptyHTML).toContain('background: var(--hdp-control-bg-hover, var(--hdp-primary-light));');
    expect(emptyHTML).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg, var(--ha-card-background, var(--card-background-color))));');
    expect(emptyHTML).toContain('color: var(--hdp-text-inverse, var(--primary-background-color, Canvas));');
    expect(emptyHTML).toContain('@media (max-width: 720px)');
    expect(emptyHTML).toContain('flex: 1 1 120px');
    expect(emptyHTML).toContain('.bp-gallery-title {');
    expect(emptyHTML).toContain('min-width: 0;\n    overflow-wrap: anywhere;');
    expect(emptyHTML).toContain('.bp-item-name {');
    expect(emptyHTML).toContain('white-space: normal;\n    overflow-wrap: anywhere;');
    expect(emptyHTML).toContain('flex: 0 1 auto;\n    min-width: 0;');
    expect(emptyHTML).toContain('flex: 0 0 34px;');
    expect(emptyHTML).not.toContain('?/button>');
    expect(emptyHTML).not.toContain('?/div>');
    expect(emptyHTML).not.toMatch(/[^<]\/(div|span|button|option|a|textarea|label|select|input)>/);

    const sourcedHTML = buildBlueprintGalleryHTML([{
      id: 'weather',
      name: '天气',
      icon: 'mdi:weather-partly-cloudy',
      inputs: { entity: 'weather.home' },
      card: { type: 'custom:html-pro-card', content: '<div></div>' },
      blueprint_yaml: '',
      source: 'https://example.com/weather.yaml',
    }]);

    expect(sourcedHTML).toContain('<span>1 个输入</span>');
    expect(sourcedHTML).toContain('title="检查更新" data-action="check-blueprint-update"');
    expect(sourcedHTML).toContain('title="编辑输入" data-action="edit-blueprint"');
    expect(sourcedHTML).toContain('title="删除" data-action="remove-blueprint"');
  });

  it('uses overflow-safe import modal layout css', () => {
    const html = buildImportModalHTML();

    expect(html).toContain('padding: 16px;');
    expect(html).toContain('background: var(--hdp-overlay-bg, color-mix(in srgb, var(--hdp-text, CanvasText) 42%, transparent));');
    expect(html).toContain('background: var(--hdp-modal-bg, var(--hdp-bg, var(--ha-card-background, var(--card-background-color))));');
    expect(html).toContain('border-radius: var(--hdp-radius-lg, var(--hdp-radius, 14px));');
    expect(html).toContain('box-shadow: var(--hdp-shadow-elevated, var(--ha-card-box-shadow, 0 20px 60px color-mix(in srgb, var(--hdp-text, CanvasText) 16%, transparent)));');
    expect(html).toContain('background: var(--hdp-surface-card, var(--hdp-card-bg, var(--ha-card-background, var(--card-background-color))));');
    expect(html).toContain('backdrop-filter: blur(18px) saturate(140%);');
    expect(html).toContain('width: min(560px, 100%)');
    expect(html).toContain('max-height: calc(100vh - 32px)');
    expect(html).toContain('overflow-x: hidden');
    expect(html).toContain('box-sizing: border-box');
    expect(html).toContain('.bp-modal-input {');
    expect(html).toContain('width: 100%;\n    max-width: 100%;\n    min-width: 0;');
    expect(html).toContain('.bp-modal-actions {\n    display: flex;\n    flex-wrap: wrap;');
    expect(html).toContain('.bp-modal-actions .bp-btn {\n    flex: 0 1 auto;');
    expect(html).toContain('@media (max-width: 480px)');
    expect(html).toContain('.bp-modal-actions .bp-btn { flex: 1 1 120px; }');
  });

  it('does not abort when blueprint modal DOM nodes are missing', () => {
    const window = {} as any;
    const document = {
      getElementById: () => null,
      querySelectorAll: () => [],
    };
    const alerts: string[] = [];
    const code = generateBlueprintModalJS() + '\nreturn window;';
    const runtime = new Function(
      'window',
      'document',
      'alert',
      'confirm',
      'location',
      'Promise',
      'hdpShowView',
      'hdpBlueprintLoad',
      'hdpBlueprintParseMeta',
      'hdpBlueprintImportURL',
      'hdpBlueprintImportYAML',
      'hdpBlueprintAdd',
      'hdpBlueprintUpdateInputs',
      'hdpBlueprintRemove',
      'hdpBlueprintCheckUpdate',
      'hdpBlueprintResolveCard',
      'hdpBlueprintSave',
      code,
    )(
      window,
      document,
      (msg: string) => alerts.push(msg),
      () => true,
      { reload: () => undefined },
      Promise,
      () => undefined,
      () => [{ id: 'weather', name: 'Weather', inputs: {}, blueprint_yaml: 'meta:\n  inputs: {}' }],
      () => ({ inputs: {} }),
      () => undefined,
      () => null,
      () => undefined,
      () => undefined,
      () => undefined,
      () => undefined,
      (page: any) => page.card || {},
      () => Promise.resolve([]),
    );

    expect(() => runtime.hdpShowImportModal('url')).not.toThrow();
    expect(() => runtime.hdpConfirmImport()).not.toThrow();
    expect(() => runtime.hdpShowInputEditor('weather')).not.toThrow();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('waits for the latest blueprint save before reloading the gallery', () => {
    const js = generateBlueprintModalJS();

    expect(js).toContain('var latestSave = window.hdpLastBlueprintSave || Promise.resolve();');
    expect(js).toContain('Promise.resolve(latestSave).finally(function()');
    expect(js).not.toContain('setTimeout(function() {\n      location.reload();\n    }, 500);');
  });
});
