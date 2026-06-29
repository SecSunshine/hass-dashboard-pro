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

  // Load all blueprint instances
  window.hdpBlueprintLoad = function() {
    try {
      var raw = localStorage.getItem(BP_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  };

  // Save blueprint list
  window.hdpBlueprintSave = function(pages) {
    try {
      localStorage.setItem(BP_KEY, JSON.stringify(pages));
    } catch(e) {
      console.error('[HDP Blueprint] Save failed:', e);
    }
    // Also persist to Lovelace config via websocket
    if (window.hdpSaveLovelaceConfig) {
      window.hdpSaveLovelaceConfig('blueprints.pages', pages);
    }
  };

  // Add a new blueprint instance
  window.hdpBlueprintAdd = function(page) {
    var pages = hdpBlueprintLoad();
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

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (trimmed === '' || trimmed.indexOf('#') === 0) continue;

      if (trimmed === 'meta:') { section = 'meta'; continue; }
      if (trimmed === 'card:') { section = 'card'; break; }
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
    }

    return result;
  };

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
