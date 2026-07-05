/**
 * Blueprint Storage — Client-Side JS Generators
 *
 * Generates <script> functions for managing blueprint pages at runtime:
 *   - hdpBlueprintLoad() — load blueprint instances from localStorage
 *   - hdpBlueprintSave(pages) — save updated blueprint list
 *   - hdpBlueprintAdd(page) — add a new blueprint instance
 *   - hdpBlueprintRemove(id) — remove a blueprint by ID
 *   - hdpBlueprintUpdateInputs(id, inputs) — update input values
 *   - hdpBlueprintImportURL(url) — fetch YAML from URL and parse
 *   - hdpBlueprintImportYAML(yaml) — parse pasted YAML
 *
 * These functions are embedded in the layout card's <script> block.
 */

/**
 * Generate all blueprint client-side JS functions.
 */
export function generateBlueprintJS(): string {
  return `
// ─── Blueprint Storage ───────────────────────────────────────────────────

(function() {
  var BP_KEY = 'hdp_blueprints';

  function hdpNormalizeBlueprintPages(pages) {
    if (!Array.isArray(pages)) return [];
    var seen = {};
    var normalized = [];
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];
      if (!page || typeof page !== 'object') continue;
      if (typeof page.id !== 'string' || typeof page.name !== 'string' || typeof page.blueprint_yaml !== 'string') continue;
      if (seen[page.id]) {
        for (var j = 0; j < normalized.length; j++) {
          if (normalized[j].id === page.id) normalized[j] = page;
        }
      } else {
        seen[page.id] = true;
        normalized.push(page);
      }
      page.icon = typeof page.icon === 'string' && page.icon ? page.icon : 'mdi:puzzle';
      page.inputs = page.inputs && typeof page.inputs === 'object' && !Array.isArray(page.inputs) ? page.inputs : {};
      page.card = page.card && typeof page.card === 'object' ? page.card : {};
    }
    return normalized;
  }

  // Load all blueprint instances
  window.hdpBlueprintLoad = function() {
    try {
      var raw = localStorage.getItem(BP_KEY);
      if (raw) return hdpNormalizeBlueprintPages(JSON.parse(raw));
    } catch(e) {}
    return [];
  };

  // Save blueprint list
  window.hdpBlueprintSave = function(pages) {
    pages = hdpNormalizeBlueprintPages(pages);
    try {
      localStorage.setItem(BP_KEY, JSON.stringify(pages));
    } catch(e) {
      console.error('[HDP Blueprint] Save failed:', e);
    }
    // Persist into hdp_config so strategies can read it on next generate()
    if (typeof hdpSaveConfig === 'function') {
      hdpSaveConfig({ blueprints: { pages: pages, replacements: {} } });
    }
    // Sync to HA Lovelace config (survives cache clear, cross-device)
    if (typeof hdpSaveToLovelace === 'function') {
      var hdpCfg = (typeof hdpLoadConfig === 'function') ? hdpLoadConfig() : null;
      if (hdpCfg) hdpSaveToLovelace(hdpCfg);
    }
  };

  // Add a new blueprint instance
  window.hdpBlueprintAdd = function(page) {
    var pages = hdpBlueprintLoad();
    pages = pages.filter(function(p) { return p.id !== page.id; });
    pages.push(page);
    hdpBlueprintSave(pages);
    return pages;
  };

  // Remove a blueprint by ID
  window.hdpBlueprintRemove = function(id) {
    var pages = hdpBlueprintLoad();
    pages = pages.filter(function(p) { return p.id !== id; });
    hdpBlueprintSave(pages);
    return pages;
  };

  // Update input values for a blueprint
  window.hdpBlueprintUpdateInputs = function(id, inputs) {
    var pages = hdpBlueprintLoad();
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].id === id) {
        pages[i].inputs = Object.assign(pages[i].inputs || {}, inputs);
        // Re-resolve card config
        pages[i].card = hdpBlueprintResolveCard(pages[i]);
        break;
      }
    }
    hdpBlueprintSave(pages);
    return pages;
  };

  // Resolve placeholders in a card template
  window.hdpBlueprintResolveCard = function(page) {
    try {
      var meta = hdpBlueprintParseMeta(page.blueprint_yaml);
      var cardStr = JSON.stringify(meta.card || {});
      var inputs = page.inputs || {};
      for (var key in inputs) {
        if (inputs.hasOwnProperty(key)) {
          var placeholder = '$' + key + '$';
          cardStr = cardStr.split(placeholder).join(String(inputs[key]));
        }
      }
      return JSON.parse(cardStr);
    } catch(e) {
      console.error('[HDP Blueprint] Resolve failed:', e);
      return {};
    }
  };

  // Parse meta from YAML (simplified client-side parser)
  window.hdpBlueprintParseMeta = function(yaml) {
    var result = {
      name: '',
      description: '',
      version: '1.0.0',
      inputs: {},
      card: {}
    };

    var lines = yaml.split('\\n');
    var section = '';
    var currentInput = '';
    var cardLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (trimmed === '' || trimmed.indexOf('#') === 0) continue;

      if (trimmed === 'meta:') { section = 'meta'; continue; }
      if (trimmed === 'card:') { section = 'card'; continue; }
      if (trimmed === 'inputs:') { section = 'inputs'; continue; }

      if (section === 'meta') {
        var kv = hdpParseKV(trimmed);
        if (kv) {
          if (kv[0] === 'name') result.name = kv[1];
          else if (kv[0] === 'description') result.description = kv[1];
          else if (kv[0] === 'version') result.version = kv[1];
        }
      }

      if (section === 'inputs') {
        var indent = line.length - line.replace(/^\\s+/, '').length;
        if (indent === 4 && trimmed.charAt(trimmed.length - 1) === ':' && trimmed.indexOf(':') === trimmed.length - 1) {
          currentInput = trimmed.replace(/:$/, '');
          result.inputs[currentInput] = { name: currentInput, type: 'text-field' };
        } else if (indent >= 6 && currentInput) {
          var kv2 = hdpParseKV(trimmed);
          if (kv2) {
            result.inputs[currentInput][kv2[0]] = kv2[1];
          }
        }
      }

      // Collect card section lines for later parsing
      if (section === 'card') {
        cardLines.push(line);
      }
    }

    // Parse the collected card lines into an object
    result.card = hdpParseCardObject(cardLines);

    return result;
  };

  // Parse card YAML lines into a config object (client-side)
  function hdpParseCardObject(lines) {
    var result = {};
    var stack = [{ obj: result, indent: -1 }];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim() || line.trim().indexOf('#') === 0) continue;

      var indent = line.length - line.replace(/^\\s+/, '').length;
      var trimmed = line.trim();

      // Pop stack to find parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      var parent = stack[stack.length - 1].obj;

      // Multi-line block string (| literal or > folded)
      if (trimmed.charAt(trimmed.length - 1) === '|' || trimmed.charAt(trimmed.length - 1) === '>') {
        var key = trimmed.replace(/[|>]\\s*$/, '').replace(/:$/, '').trim();
        var isFolded = trimmed.charAt(trimmed.length - 1) === '>';
        var blockLines = [];
        var blockIndent = -1;

        while (i + 1 < lines.length) {
          var nextLine = lines[i + 1];
          if (!nextLine.trim()) { blockLines.push(''); i++; continue; }
          var nextIndent = nextLine.length - nextLine.replace(/^\\s+/, '').length;
          if (blockIndent === -1) blockIndent = nextIndent;
          if (nextIndent < blockIndent) break;
          blockLines.push(nextLine.substring(blockIndent));
          i++;
        }

        parent[key] = isFolded
          ? blockLines.join(' ').replace(/\\s+/g, ' ').trim()
          : blockLines.join('\\n');
        continue;
      }

      // Key-value or nested object
      var colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      var key = trimmed.substring(0, colonIdx).trim();
      var val = trimmed.substring(colonIdx + 1).trim();

      if (val === '' || val === undefined) {
        // Nested object
        var child = {};
        parent[key] = child;
        stack.push({ obj: child, indent: indent });
      } else {
        // Parse value: strip quotes, handle bool/null/number
        val = val.replace(/^["']|["']$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (val === 'null' || val === '~') val = null;
        else if (/^-?\\d+$/.test(val)) val = parseInt(val, 10);
        else if (/^-?\\d+\\.\\d+$/.test(val)) val = parseFloat(val);
        parent[key] = val;
      }
    }

    return result;
  }

  function hdpParseKV(line) {
    var idx = line.indexOf(':');
    if (idx === -1) return null;
    var key = line.substring(0, idx).trim();
    var val = line.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
    return [key, val];
  }

  // Import blueprint from URL (fetch YAML)
  window.hdpBlueprintImportURL = function(url, callback) {
    fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(yaml) {
        var page = hdpBlueprintImportYAML(yaml);
        if (page) {
          page.source = url;
          hdpBlueprintAdd(page);
        }
        if (callback) callback(page);
      })
      .catch(function(e) {
        console.error('[HDP Blueprint] Import failed:', e);
        if (callback) callback(null, e.message);
      });
  };

  // Import blueprint from pasted YAML
  window.hdpBlueprintImportYAML = function(yaml) {
    try {
      var meta = hdpBlueprintParseMeta(yaml);
      if (!meta.name) {
        alert('无法解析蓝图：未找到 name 字段');
        return null;
      }

      var id = 'bp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      var inputs = {};

      // Set defaults for all inputs
      for (var key in meta.inputs) {
        if (meta.inputs.hasOwnProperty(key)) {
          var inp = meta.inputs[key];
          inputs[key] = inp['default'] !== undefined ? inp['default'] : '';
        }
      }

      var page = {
        id: id,
        name: meta.name,
        icon: 'mdi:puzzle',
        blueprint_yaml: yaml,
        inputs: inputs,
        card: {}
      };

      // Resolve card
      page.card = hdpBlueprintResolveCard(page);
      return page;
    } catch(e) {
      console.error('[HDP Blueprint] Parse failed:', e);
      alert('蓝图解析失败: ' + e.message);
      return null;
    }
  };

  window.hdpImportBuiltInTemplate = function() {
    var yaml = [
      'meta:',
      '  name: Family Overview',
      '  description: Built-in html-card-pro overview template',
      '  version: 1.0.0',
      'inputs:',
      '    main_light:',
      '      name: Main Light',
      '      type: entity-picker',
      '      domain: light',
      '      default: light.living_room',
      '    temp_sensor:',
      '      name: Temperature Sensor',
      '      type: entity-picker',
      '      domain: sensor',
      '      default: sensor.living_temperature',
      'card:',
      '  type: custom:html-pro-card',
      '  title: Family Overview',
      '  do_not_parse: true',
      '  content: |',
      '    <section class="hdp-imported-template" data-view="template-family-overview">',
      '      <button data-entity="$main_light$" data-action="toggle">Main light</button>',
      '      <div data-entity="$temp_sensor$">Temperature</div>',
      '    </section>'
    ].join('\\n');

    var page = hdpBlueprintImportYAML(yaml);
    if (!page) return;

    if (typeof hdpBuildEntityMapping === 'function' && typeof hdpApplyEntityMapping === 'function') {
      var sourceEntities = ['light.living_room', 'sensor.living_temperature'];
      var result = hdpBuildEntityMapping(sourceEntities);
      if (typeof hdpSaveImportReport === 'function') hdpSaveImportReport('built-in-template', result);
      page.inputs = hdpApplyEntityMapping(page.inputs || {}, result.mapping);
      page.card = hdpBlueprintResolveCard(page);
    }

    hdpBlueprintAdd(page);
    if (typeof hdpShowToast === 'function') hdpShowToast('内置模板已导入并尝试自动适配实体', 'success');
    if (typeof hdpRefreshBlueprintGallery === 'function') hdpRefreshBlueprintGallery();
  };

  window.hdpImportOnlineTemplate = function() {
    var catalogUrl = prompt('输入模板库 JSON URL', '/local/hass-dashboard-pro/templates/catalog.json');
    if (!catalogUrl) return;
    fetch(catalogUrl)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(catalog) {
        var templates = Array.isArray(catalog) ? catalog : (catalog.templates || []);
        templates = templates.filter(function(item) { return item && item.name && item.url; });
        if (!templates.length) throw new Error('模板库为空或格式不正确');

        var menu = templates.map(function(item, index) {
          return (index + 1) + '. ' + item.name + (item.description ? ' - ' + item.description : '');
        }).join('\\n');
        var choice = prompt('选择要导入的模板编号:\\n' + menu, '1');
        var idx = parseInt(choice || '1', 10) - 1;
        if (idx < 0 || idx >= templates.length) return;

        return fetch(templates[idx].url).then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        }).then(function(yaml) {
          var page = hdpBlueprintImportYAML(yaml);
          if (!page) return;
          page.source = templates[idx].url;

          if (typeof hdpBuildEntityMapping === 'function' && typeof hdpApplyEntityMapping === 'function') {
            var refs = [];
            var re = /\\b([a-z_]+\\.[a-z0-9_]+)\\b/g;
            var match;
            while ((match = re.exec(yaml))) refs.push(match[1]);
            var result = hdpBuildEntityMapping(refs);
            if (typeof hdpSaveImportReport === 'function') hdpSaveImportReport('online-template', result);
            page.inputs = hdpApplyEntityMapping(page.inputs || {}, result.mapping);
            page.card = hdpBlueprintResolveCard(page);
          }

          hdpBlueprintAdd(page);
          if (typeof hdpShowToast === 'function') hdpShowToast('在线模板已导入并尝试自动适配实体', 'success');
          if (typeof hdpRefreshBlueprintGallery === 'function') hdpRefreshBlueprintGallery();
        });
      })
      .catch(function(err) {
        alert('在线模板库导入失败: ' + (err && err.message ? err.message : err));
      });
  };

  function hdpSanitizeImageUrl(url) {
    url = String(url || '').trim();
    if (!url) return '';
    try {
      var parsed = new URL(url, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
      if (parsed.protocol === 'data:' && url.indexOf('data:image/') === 0) return url;
    } catch(e) {
      if (url.indexOf('/') === 0 || url.indexOf('./') === 0 || url.indexOf('../') === 0) return url;
    }
    return '';
  }

  function hdpFirstEntityByDomain(domain) {
    var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
    var states = hass && hass.states ? hass.states : {};
    var ids = Object.keys(states).filter(function(id) { return id.split('.')[0] === domain; });
    return ids[0] || '';
  }

  window.hdpImportScreenshotDraft = function() {
    var rawUrl = prompt('粘贴截图 URL 或 /local 图片路径');
    var imageUrl = hdpSanitizeImageUrl(rawUrl);
    if (!imageUrl) {
      alert('截图地址无效，仅支持 http(s)、data:image 或相对路径');
      return;
    }

    var detectedLight = hdpFirstEntityByDomain('light');
    var detectedSensor = hdpFirstEntityByDomain('sensor');
    var mainLight = detectedLight || 'light.living_room';
    var tempSensor = detectedSensor || 'sensor.living_temperature';
    var safeImage = imageUrl.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    var yaml = [
      'meta:',
      '  name: Screenshot Replication Draft',
      '  description: Screenshot-guided replication draft',
      '  version: 1.0.0',
      'inputs:',
      '    screenshot_url:',
      '      name: Screenshot URL',
      '      type: text-field',
      '      default: "' + safeImage + '"',
      '    main_light:',
      '      name: Main Light',
      '      type: entity-picker',
      '      domain: light',
      '      default: ' + mainLight,
      '    temp_sensor:',
      '      name: Temperature Sensor',
      '      type: entity-picker',
      '      domain: sensor',
      '      default: ' + tempSensor,
      'card:',
      '  type: custom:html-pro-card',
      '  title: Screenshot Draft',
      '  do_not_parse: true',
      '  content: |',
      '    <section class="hdp-screenshot-draft" data-view="screenshot-replication">',
      '      <div style="border-radius:16px; overflow:hidden; border:1px solid var(--hdp-border); margin-bottom:12px;">',
      '        <img src="$screenshot_url$" alt="dashboard reference" style="width:100%; display:block;" />',
      '      </div>',
      '      <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;">',
      '        <button data-entity="$main_light$" data-action="toggle" style="min-height:72px; border-radius:14px; border:1px solid var(--hdp-border); background:var(--hdp-card-bg); color:var(--hdp-text);">Main light</button>',
      '        <div data-entity="$temp_sensor$" style="min-height:72px; border-radius:14px; border:1px solid var(--hdp-border); background:var(--hdp-card-bg); color:var(--hdp-text); display:flex; align-items:center; justify-content:center;">Temperature</div>',
      '      </div>',
      '    </section>'
    ].join('\\n');

    var page = hdpBlueprintImportYAML(yaml);
    if (!page) return;
    if (typeof hdpSaveImportReport === 'function') {
      hdpSaveImportReport('screenshot-draft', {
        mapping: {
          'light.living_room': mainLight,
          'sensor.living_temperature': tempSensor
        },
        matches: [
          { source: 'light.living_room', target: mainLight, score: detectedLight ? 999 : 0, confidence: detectedLight ? 'exact' : 'low' },
          { source: 'sensor.living_temperature', target: tempSensor, score: detectedSensor ? 999 : 0, confidence: detectedSensor ? 'exact' : 'low' }
        ].filter(function(item) { return item.score > 0; }),
        unmapped: [
          detectedLight ? '' : 'light.living_room',
          detectedSensor ? '' : 'sensor.living_temperature'
        ].filter(Boolean)
      });
    }
    hdpBlueprintAdd(page);
    if (typeof hdpShowToast === 'function') hdpShowToast('截图复刻草稿已生成', 'success');
    if (typeof hdpRefreshBlueprintGallery === 'function') hdpRefreshBlueprintGallery();
  };

  // Check for blueprint updates (compare version with remote)
  window.hdpBlueprintCheckUpdate = function(page, callback) {
    if (!page.source) {
      if (callback) callback(null, 'No source URL');
      return;
    }

    fetch(page.source)
      .then(function(r) { return r.text(); })
      .then(function(yaml) {
        var remoteMeta = hdpBlueprintParseMeta(yaml);
        var localMeta = hdpBlueprintParseMeta(page.blueprint_yaml);
        var hasUpdate = hdpCompareVersions(remoteMeta.version, localMeta.version) > 0;
        if (callback) callback({
          hasUpdate: hasUpdate,
          remoteVersion: remoteMeta.version,
          localVersion: localMeta.version,
          remoteYaml: yaml
        });
      })
      .catch(function(e) {
        if (callback) callback(null, e.message);
      });
  };

  // Compare semver versions: -1, 0, 1
  window.hdpCompareVersions = function(a, b) {
    var pa = (a || '0.0.0').split('.').map(Number);
    var pb = (b || '0.0.0').split('.').map(Number);
    for (var i = 0; i < 3; i++) {
      if ((pa[i]||0) > (pb[i]||0)) return 1;
      if ((pa[i]||0) < (pb[i]||0)) return -1;
    }
    return 0;
  };

  // Render blueprint page content into the layout card
  window.hdpBlueprintRenderPage = function(page) {
    if (!page || !page.card) return '<div class="bp-empty">蓝图配置为空</div>';

    if (page.card.type === 'custom:html-pro-card' && page.card.content) {
      return page.card.content;
    }

    return '<div class="bp-native-hint">' +
      '<span>卡片类型: ' + page.card.type + '</span>' +
      '<span>此卡片需要在 Home Assistant 中渲染</span>' +
      '</div>';
  };

})();
`;
}
