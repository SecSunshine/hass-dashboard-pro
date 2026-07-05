import { describe, expect, it } from 'vitest';
import { buildBlueprintGalleryHTML } from './blueprint-gallery';
import { generateBlueprintModalJS } from './blueprint-gallery';

describe('blueprint gallery rendering', () => {
  it('renders stable management markup for empty and sourced blueprints', () => {
    const emptyHTML = buildBlueprintGalleryHTML([]);
    expect(emptyHTML).toContain('<span class="bp-gallery-title">蓝图页面</span>');
    expect(emptyHTML).toContain('<div class="bp-empty-list">暂无蓝图页面，点击上方按钮导入</div>');
    expect(emptyHTML).toContain('data-action="import-online-template" onclick="hdpImportOnlineTemplate()">在线库</button>');
    expect(emptyHTML).toContain('URL 导入');
    expect(emptyHTML).not.toContain('?/button>');
    expect(emptyHTML).not.toContain('?/div>');

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

  it('waits for the latest blueprint save before reloading the gallery', () => {
    const js = generateBlueprintModalJS();

    expect(js).toContain('var latestSave = window.hdpLastBlueprintSave || Promise.resolve();');
    expect(js).toContain('Promise.resolve(latestSave).finally(function()');
    expect(js).not.toContain('setTimeout(function() {\n      location.reload();\n    }, 500);');
  });
});
