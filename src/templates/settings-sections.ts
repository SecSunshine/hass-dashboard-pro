/**
 * Settings Sections (v4.0)
 *
 * Expanded settings panel with 12 sections:
 *   1. Dashboard — name, icon
 *   2. Home — section order, hidden sections
 *   3. Header — time, weather, notifications toggles
 *   4. People — hidden persons
 *   5. Areas — hidden areas, ordering, unavailable toggle
 *   6. Devices — hidden domains, device types
 *   7. Blueprints — gallery + import
 *   8. Visual — (existing visual settings from settings-view.ts)
 *   9. Theme Files — JSON theme switching
 *   10. Permissions — admin/restrict toggles
 *   11. About — version, links
 *   12. Reset — reset config, export/import
 *
 * All sections generate HTML strings for embedding in the layout card.
 * Settings are saved via client-side hdpSaveConfig() (from storage.ts).
 */

import type { Hass, StrategyConfig, BlueprintInstance, HomeSectionKey } from '../types';
import { HOME_SECTION_LABELS } from '../types';
import { buildBlueprintGalleryHTML } from '../blueprints/blueprint-gallery';
import { buildDashboardDesignPlan, buildPlanAlternatives, type DashboardDesignPlan } from '../utils/design-plan';
import { escapeAttribute, escapeHTML } from '../utils/html';
import { getEntityDeviceType } from '../utils/area-entities';

function jsArg(value: unknown): string {
  return escapeAttribute(JSON.stringify(String(value ?? '')));
}

function jsValue(value: unknown): string {
  return escapeAttribute(JSON.stringify(value ?? null));
}

// ─── Section Container ──────────────────────────────────────────────────────

function sectionCard(id: string, title: string, icon: string, content: string): string {
  return `<div class="st-section" id="st-${id}" data-component="settings-${id}">
    <div class="st-section-hdr" onclick="hdpToggleSection('st-${id}')">
      <div class="st-section-icon">${icon}</div>
      <span class="st-section-title">${title}</span>
      <svg class="st-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="st-section-body" id="st-${id}-body">
      ${content}
    </div>
  </div>`;
}

// ─── Shared CSS (injected once) ─────────────────────────────────────────────

export function getSettingsSectionsCSS(): string {
  return `
  .st-section {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    overflow: hidden;
    margin-bottom: 12px;
  }
  .st-section-hdr {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    cursor: pointer;
    transition: background 0.15s ease;
    min-height: 44px;
  }
  .st-section-hdr:hover {
    background: var(--hdp-divider, rgba(0,0,0,0.03));
  }
  .st-section-icon {
    width: 32px; height: 32px;
    border-radius: var(--hdp-radius-sm, 8px);
    display: flex; align-items: center; justify-content: center;
    background: var(--hdp-primary-light, rgba(79,110,247,0.08));
    color: var(--hdp-primary);
    flex-shrink: 0;
  }
  .st-section-icon svg { width: 16px; height: 16px; }
  .st-section-title {
    flex: 1;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .st-chevron {
    width: 18px; height: 18px;
    color: var(--hdp-text-muted);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .st-section--open .st-chevron {
    transform: rotate(180deg);
  }
  .st-section-body {
    display: none;
    padding: 0 18px 18px 18px;
  }
  .st-section--open .st-section-body {
    display: block;
  }
  .st-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--hdp-divider, rgba(0,0,0,0.04));
    min-height: 44px;
  }
  .st-row:last-child { border-bottom: none; }
  .st-row-label {
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--hdp-text);
  }
  .st-row-desc {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-muted);
    margin-top: 2px;
  }
  .st-input {
    font: inherit;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-bg);
    color: var(--hdp-text);
    outline: none;
    min-width: 140px;
    max-width: 240px;
    min-height: 36px;
  }
  .st-input:focus {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.12));
  }
  .st-toggle {
    width: 44px; height: 24px;
    border-radius: 12px;
    display: flex; align-items: center;
    padding: 2px;
    transition: background 0.2s ease;
    cursor: pointer;
    flex-shrink: 0;
  }
  .st-toggle--on { background: var(--hdp-primary); justify-content: flex-end; }
  .st-toggle--off { background: var(--hdp-divider, #ddd); justify-content: flex-start; }
  .st-toggle-knob {
    width: 20px; height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .st-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .st-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: var(--hdp-radius-pill, 20px);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 32px;
  }
  .st-chip--active {
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
  }
  .st-chip:hover { transform: translateY(-1px); }
  .st-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--hdp-radius-sm, 8px);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
  }
  .st-btn:hover { transform: translateY(-2px); border-color: var(--hdp-primary); }
  .st-btn--primary {
    background: var(--hdp-primary);
    color: white;
    border-color: var(--hdp-primary);
  }
  .st-btn--danger {
    color: var(--hdp-danger, #EF4444);
    border-color: var(--hdp-danger, #EF4444);
  }
  .st-btn--danger:hover {
    background: var(--hdp-danger-light, rgba(239,68,68,0.1));
  }
  .st-about-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font: inherit;
    font-size: 13px;
    color: var(--hdp-text-secondary);
  }
  .st-about-val {
    font-weight: 600;
    color: var(--hdp-text);
  }
  .st-section-subtitle {
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--hdp-text-muted);
    margin: 16px 0 8px 0;
  }
  .st-plan-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 14px;
    align-items: center;
    padding: 14px;
    border-radius: var(--hdp-radius, 14px);
    background: var(--hdp-primary-light, rgba(79,110,247,0.08));
    border: 1px solid var(--hdp-border);
  }
  .st-plan-title {
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    color: var(--hdp-text);
    margin-bottom: 4px;
  }
  .st-plan-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .st-plan-pill {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 3px 9px;
    border-radius: var(--hdp-radius-pill, 20px);
    background: var(--hdp-card-bg);
    border: 1px solid var(--hdp-border);
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 11px;
    font-weight: 700;
  }
  .st-plan-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
  }
  .st-plan-choice {
    min-height: 92px;
    text-align: left;
    border-radius: var(--hdp-radius, 14px);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    font: inherit;
  }
  .st-plan-choice:hover {
    transform: translateY(-2px);
    border-color: var(--hdp-primary);
  }
  .st-plan-choice--active {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.12));
  }
  .st-plan-swatch {
    height: 28px;
    border-radius: 8px;
    margin-bottom: 8px;
    border: 1px solid var(--hdp-border);
  }
  .st-plan-choice-name {
    font-size: 12px;
    font-weight: 800;
    color: var(--hdp-text);
  }
  .st-plan-choice-desc {
    font-size: 10px;
    color: var(--hdp-text-muted);
    margin-top: 2px;
  }
  .st-plan-reasons {
    margin-top: 12px;
    display: grid;
    gap: 6px;
  }
  .st-plan-reason {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
  }
  @media (max-width: 720px) {
    .st-plan-hero { grid-template-columns: 1fr; }
    .st-plan-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  `;
}

// ─── Client-Side JS ─────────────────────────────────────────────────────────

export function generateSettingsSectionsJS(): string {
  return `
// ─── Settings Sections JS ────────────────────────────────────────────────

window.hdpToggleSection = function(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('st-section--open');
};

window.hdpSaveSetting = function(path, value) {
  var parts = path.split('.');
  var obj = {};
  var current = obj;
  for (var i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  hdpSaveConfig(obj);
  // Persist to Lovelace config (async, non-blocking)
  if (typeof hdpSaveToLovelace === 'function') {
    hdpSaveToLovelace(hdpLoadConfig()).catch(function(err) {
      console.warn('[HDP] Lovelace sync failed, saved to localStorage only', err);
    });
  }
};

window.hdpToggleArrayItem = function(path, item) {
  var config = hdpLoadConfig();
  var parts = path.split('.');
  var current = config;
  for (var i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object' || Array.isArray(current[parts[i]])) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  var key = parts[parts.length - 1];
  var arr = current[key];
  if (!Array.isArray(arr)) arr = [];
  var idx = arr.indexOf(item);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(item);
  current[key] = arr;
  hdpSaveConfig(config);
  // Re-render chip state
  var evt = arguments.length > 2 ? arguments[2] : window.event;
  var chip = evt && evt.target && evt.target.closest ? evt.target.closest('.st-chip') : null;
  if (chip) chip.classList.toggle('st-chip--active');
  // Persist to Lovelace and reload so entity filtering takes effect
  if (typeof hdpSaveToLovelace === 'function') {
    hdpShowToast('正在保存设置...', 'info');
    hdpSaveToLovelace(hdpLoadConfig()).then(function() {
      hdpShowToast('设置已保存，正在刷新...', 'success');
      setTimeout(function() { location.reload(); }, 800);
    }).catch(function() {
      hdpShowToast('已保存到本地，正在刷新...', 'info');
      setTimeout(function() { location.reload(); }, 1200);
    });
  } else {
    hdpShowToast('已保存，正在刷新...', 'success');
    setTimeout(function() { location.reload(); }, 800);
  }
};

window.hdpResetConfig = function() {
  if (!confirm('确定重置所有设置？此操作不可撤销。')) return;
  hdpClearConfig();
  location.reload();
};

window.hdpExportConfig = function() {
  var config = hdpLoadConfig();
  var json = JSON.stringify(config, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'hdp-config.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.hdpImportConfig = function() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var config = JSON.parse(ev.target.result);
        localStorage.setItem('hdp_config', JSON.stringify(config));
        alert('配置已导入，页面将刷新');
        location.reload();
      } catch(err) {
        alert('导入失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

function hdpBase64UrlEncode(value) {
  return btoa(unescape(encodeURIComponent(value))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
}

function hdpBase64UrlDecode(value) {
  var normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  return decodeURIComponent(escape(atob(normalized)));
}

function hdpExtractEntityIds(value) {
  var found = {};
  var re = /\\b([a-z_]+\\.[a-z0-9_]+)\\b/g;
  function walk(item) {
    if (typeof item === 'string') {
      var match;
      while ((match = re.exec(item))) found[match[1]] = true;
      re.lastIndex = 0;
    } else if (Array.isArray(item)) {
      item.forEach(walk);
    } else if (item && typeof item === 'object') {
      Object.keys(item).forEach(function(key) { walk(item[key]); });
    }
  }
  walk(value);
  return Object.keys(found).sort();
}

function hdpApplyEntityMapping(value, mapping) {
  if (typeof value === 'string') {
    var result = value;
    Object.keys(mapping).forEach(function(from) {
      result = result.split(from).join(mapping[from]);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map(function(item) { return hdpApplyEntityMapping(item, mapping); });
  if (value && typeof value === 'object') {
    var mapped = {};
    Object.keys(value).forEach(function(key) { mapped[key] = hdpApplyEntityMapping(value[key], mapping); });
    return mapped;
  }
  return value;
}

function hdpBuildEntityMapping(sourceEntities) {
  var hass = hdpFindHass && hdpFindHass();
  var states = hass && hass.states ? hass.states : {};
  var mapping = {};
  var matches = [];
  var unmapped = [];
  var used = {};

  function tokens(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').split(/[_\\s]+/).filter(function(t) { return t.length > 1; });
  }
  function score(source, target) {
    var sourceTokens = tokens(source);
    var targetTokens = tokens(target);
    var targetSet = {};
    targetTokens.forEach(function(t) { targetSet[t] = true; });
    return sourceTokens.reduce(function(total, t) { return total + (targetSet[t] ? t.length : 0); }, 0);
  }

  sourceEntities.forEach(function(sourceId) {
    if (states[sourceId] && !used[sourceId]) {
      mapping[sourceId] = sourceId;
      matches.push({ source: sourceId, target: sourceId, score: 999, confidence: 'exact' });
      used[sourceId] = true;
      return;
    }
    var domain = sourceId.split('.')[0];
    var best = null;
    Object.keys(states).forEach(function(entityId) {
      if (used[entityId] || entityId.split('.')[0] !== domain) return;
      var friendly = states[entityId].attributes && states[entityId].attributes.friendly_name || '';
      var s = score(sourceId, entityId + ' ' + friendly);
      if (!best || s > best.score) best = { id: entityId, score: s };
    });
    if (best && best.score > 0) {
      mapping[sourceId] = best.id;
      matches.push({
        source: sourceId,
        target: best.id,
        score: best.score,
        confidence: best.score >= 12 ? 'high' : (best.score >= 6 ? 'medium' : 'low')
      });
      used[best.id] = true;
    } else {
      unmapped.push(sourceId);
    }
  });

  return { mapping: mapping, matches: matches, unmapped: unmapped };
}

function hdpSaveImportReport(kind, mapping) {
  var report = {
    kind: kind,
    imported_at: new Date().toISOString(),
    mapped_count: mapping && mapping.matches ? mapping.matches.length : 0,
    unmapped_count: mapping && mapping.unmapped ? mapping.unmapped.length : 0,
    matches: mapping && mapping.matches ? mapping.matches : [],
    unmapped: mapping && mapping.unmapped ? mapping.unmapped : []
  };
  try { localStorage.setItem('hdp_last_import_report', JSON.stringify(report)); } catch(e) {}
  return report;
}

window.hdpShowImportReport = function() {
  var report = null;
  try { report = JSON.parse(localStorage.getItem('hdp_last_import_report') || 'null'); } catch(e) {}
  if (!report) {
    alert('暂无复刻/导入报告');
    return;
  }
  var lines = [
    '导入类型: ' + report.kind,
    '导入时间: ' + report.imported_at,
    '已映射: ' + report.mapped_count,
    '未匹配: ' + report.unmapped_count,
    ''
  ];
  if (report.matches && report.matches.length) {
    lines.push('映射明细:');
    report.matches.slice(0, 20).forEach(function(item) {
      lines.push('- ' + item.source + ' -> ' + item.target + ' (' + item.confidence + ')');
    });
  }
  if (report.unmapped && report.unmapped.length) {
    lines.push('');
    lines.push('需手动确认:');
    report.unmapped.slice(0, 20).forEach(function(id) { lines.push('- ' + id); });
  }
  alert(lines.join('\\n'));
};

window.hdpExportShareCode = function() {
  var config = hdpLoadConfig();
  var visual = {};
  try { visual = JSON.parse(localStorage.getItem('hdp_visual_config') || '{}'); } catch(e) {}
  var blueprints = typeof hdpBlueprintLoad === 'function' ? hdpBlueprintLoad() : ((config.blueprints && config.blueprints.pages) || []);
  var source = { hdp_config: config, visual_config: visual, blueprints: blueprints };
  var bundle = {
    schema: 'hass-dashboard-pro.share.v1',
    version: 1,
    exported_at: new Date().toISOString(),
    name: config.dashboard && config.dashboard.name,
    hdp_config: config,
    visual_config: visual,
    blueprints: blueprints,
    source_entities: hdpExtractEntityIds(source)
  };
  var code = 'HDP1.' + hdpBase64UrlEncode(JSON.stringify(bundle));
  prompt('复制分享码', code);
};

window.hdpImportShareCode = function() {
  var code = prompt('粘贴分享码');
  if (!code) return;
  try {
    if (code.indexOf('HDP1.') !== 0) throw new Error('分享码格式不正确');
    var bundle = JSON.parse(hdpBase64UrlDecode(code.slice(5)));
    if (bundle.schema !== 'hass-dashboard-pro.share.v1' || bundle.version !== 1) {
      throw new Error('分享码版本不支持');
    }
    var mapping = hdpBuildEntityMapping(bundle.source_entities || hdpExtractEntityIds(bundle));
    hdpSaveImportReport('share-code', mapping);
    var config = hdpApplyEntityMapping(bundle.hdp_config || {}, mapping.mapping);
    var visual = bundle.visual_config || {};
    var blueprints = hdpApplyEntityMapping(bundle.blueprints || [], mapping.mapping);

    hdpSaveConfig(config);
    try { localStorage.setItem('hdp_visual_config', JSON.stringify(visual)); } catch(e) {}
    if (typeof hdpBlueprintSave === 'function') hdpBlueprintSave(blueprints);

    var finish = function() {
      var msg = mapping.unmapped.length
        ? '已导入，' + mapping.unmapped.length + ' 个实体需要手动确认'
        : '已导入并自动适配实体';
      if (typeof hdpShowToast === 'function') hdpShowToast(msg, 'success');
      setTimeout(function() { location.reload(); }, 900);
    };

    if (typeof hdpSaveToLovelace === 'function') {
      hdpSaveToLovelace(hdpLoadConfig()).then(finish).catch(finish);
    } else {
      finish();
    }
  } catch(err) {
    alert('导入失败: ' + (err && err.message ? err.message : err));
  }
};

window.hdpRefreshThemes = function() {
  // Clear cached theme file list so it re-scans on next load
  try { localStorage.removeItem('hdp_theme_files'); } catch(e) {}
  // Try to fetch theme file list from HA www directory
  var hass = hdpFindHass();
  if (hass && hass.callApi) {
    hass.callApi('GET', 'hassio/ingress').catch(function() {});
  }
  location.reload();
};

window.hdpApplyDesignPlan = function(plan) {
  if (!plan || !plan.visual) return;
  var visual = plan.visual;
  var hdpVisual = {
    theme_id: plan.pack_id,
    card_style: visual.card_style || 'classic',
    colors: {
      page_bg: visual.page_bg,
      card_bg: visual.card_bg,
      primary: visual.primary,
      text_primary: visual.text_primary,
      text_secondary: visual.text_secondary,
      border: visual.border
    },
    border_radius: visual.border_radius,
    card_padding: visual.card_padding,
    card_gap: visual.card_gap,
    font_family: visual.font_family || '',
    shadows: visual.shadows !== false,
    layout_density: visual.layout_density
  };

  try {
    localStorage.setItem('hdp_visual_config', JSON.stringify(visual));
  } catch(e) {}

  hdpSaveConfig({ visual: hdpVisual });

  if (typeof hdpShowToast === 'function') {
    hdpShowToast('正在应用自动生成方案...', 'info');
  }

  if (typeof hdpSaveToLovelace === 'function') {
    hdpSaveToLovelace(hdpLoadConfig()).then(function() {
      if (typeof hdpShowToast === 'function') hdpShowToast('方案已应用，正在刷新...', 'success');
      setTimeout(function() { location.reload(); }, 600);
    }).catch(function(err) {
      console.warn('[HDP] Lovelace sync failed, saved locally only', err);
      if (typeof hdpShowToast === 'function') hdpShowToast('已保存到本地，正在刷新...', 'success');
      setTimeout(function() { location.reload(); }, 900);
    });
  } else {
    setTimeout(function() { location.reload(); }, 600);
  }
};
`;
}

// ─── Section Builders ───────────────────────────────────────────────────────

const c = 'currentColor';

function iconDashboard(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;
}
function iconHome(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}
function iconSparkles(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/><path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z"/></svg>`;
}
function iconHeader(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="2" y="3" width="20" height="6" rx="2"/><path d="M2 13h20M2 17h12"/></svg>`;
}
function iconPeople(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function iconAreas(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
}
function iconDevices(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>`;
}
function iconBlueprint(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}
function iconShield(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
}
function iconInfo(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}
function iconReset(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
}

function toggleHTML(settingPath: string, value: boolean): string {
  const cls = value ? 'st-toggle st-toggle--on' : 'st-toggle st-toggle--off';
  return `<div class="${cls}" onclick="hdpSaveSetting('${settingPath}', ${!value}); this.classList.toggle('st-toggle--on'); this.classList.toggle('st-toggle--off');">
    <div class="st-toggle-knob"></div>
  </div>`;
}

// ─── 1. Dashboard ──────────────────────────────────────────────────────────

export function buildDashboardSection(config: StrategyConfig): string {
  const name = config.title || '智能家居';
  return sectionCard('dashboard', '仪表盘', iconDashboard(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">名称</div>
        <div class="st-row-desc">仪表盘显示名称</div>
      </div>
      <input class="st-input" value="${name}" onchange="hdpSaveSetting('dashboard.name', this.value)" />
    </div>
  `);
}

// ─── 2. Home ────────────────────────────────────────────────────────────────

export function buildQuickGenerateSection(hass: Hass, config: StrategyConfig): string {
  const recommended = buildDashboardDesignPlan(hass, config);
  const alternatives = buildPlanAlternatives(hass, config);
  const focus = recommended.focus.map(item => `<span class="st-plan-pill">${escapeHTML(item.label)}</span>`).join('');
  const reasons = recommended.rationale.map(reason => `<div class="st-plan-reason">- ${escapeHTML(reason)}</div>`).join('');

  const choices = alternatives.map((plan: DashboardDesignPlan) => {
    const colors = plan.visual;
    const swatch = `linear-gradient(135deg, ${colors.page_bg || '#fff'} 0%, ${colors.card_bg || '#fff'} 48%, ${colors.primary || '#4F6EF7'} 100%)`;
    return `<button class="st-plan-choice ${plan.pack_id === recommended.pack_id ? 'st-plan-choice--active' : ''}"
      data-action="apply-design-plan"
      data-plan="${escapeAttribute(plan.pack_id)}"
      onclick="hdpApplyDesignPlan(${jsValue(plan)})">
      <div class="st-plan-swatch" style="background: ${escapeAttribute(swatch)};"></div>
      <div class="st-plan-choice-name">${escapeHTML(plan.pack_label)}</div>
      <div class="st-plan-choice-desc">${escapeHTML(plan.density)} · ${plan.profile.entity_count} entities</div>
    </button>`;
  }).join('');
  return sectionCard('quick-generate', '一键生成', iconSparkles(), `
    <div class="st-plan-hero">
      <div>
        <div class="st-plan-title">${escapeHTML(recommended.headline)}</div>
        <div class="st-row-desc">根据区域、实体数量、深色模式和设备语义自动生成视觉方案。</div>
        <div class="st-plan-meta">
          <span class="st-plan-pill">${escapeHTML(recommended.pack_label)}</span>
          <span class="st-plan-pill">${escapeHTML(recommended.density)}</span>
          ${focus}
        </div>
      </div>
      <button class="st-btn st-btn--primary" data-action="apply-recommended-design" onclick="hdpApplyDesignPlan(${jsValue(recommended)})">
        应用推荐方案
      </button>
    </div>
    <div class="st-plan-reasons">${reasons}</div>
    <div class="st-section-subtitle">换一种风格</div>
    <div class="st-plan-grid">${choices}</div>
  `);
}

export function buildHomeSection(config: StrategyConfig): string {
  const hiddenSections: string[] = (config as any).hdp_config?.home?.hidden_sections || [];
  const sectionKeys: HomeSectionKey[] = ['status_badges', 'people', 'environment', 'power_usage', 'favorites', 'summary'];

  const chips = sectionKeys.map(key => {
    const active = !hiddenSections.includes(key);
    const label = HOME_SECTION_LABELS[key] || key;
    return `<div class="st-chip ${active ? 'st-chip--active' : ''}" data-action="toggle-home-section" onclick="hdpToggleArrayItem('home.hidden_sections', ${jsArg(key)}, event)">${escapeHTML(label)}</div>`;
  }).join('');

  return sectionCard('home', '首页', iconHome(), `
    <div class="st-row-label">显示区块</div>
    <div class="st-row-desc">选择首页要显示的内容区块</div>
    <div class="st-chip-list">${chips}</div>
  `);
}

// ─── 3. Header ──────────────────────────────────────────────────────────────

export function buildHeaderSection(config: StrategyConfig): string {
  const hdpConfig = (config as any).hdp_config;
  const showTime = hdpConfig?.header?.show_time !== false;
  const showWeather = hdpConfig?.header?.show_weather !== false;
  const showNotif = hdpConfig?.header?.show_notifications !== false;
  const weatherEntity = hdpConfig?.header?.weather_entity || config.weather_entity || '';
  const alarmEntity = hdpConfig?.header?.alarm_entity || config.alarm_entity || '';

  return sectionCard('header', '页眉', iconHeader(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">显示时间</div>
        <div class="st-row-desc">在首页显示当前时间和日期</div>
      </div>
      ${toggleHTML('header.show_time', showTime)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">显示天气</div>
        <div class="st-row-desc">在首页显示天气信息</div>
      </div>
      ${toggleHTML('header.show_weather', showWeather)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">显示通知</div>
        <div class="st-row-desc">在页眉显示通知数量</div>
      </div>
      ${toggleHTML('header.show_notifications', showNotif)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">天气实体</div>
        <div class="st-row-desc">weather.* 实体 ID（留空自动检测）</div>
      </div>
      <input class="st-input" value="${escapeAttribute(weatherEntity)}" placeholder="自动检测" onchange="hdpSaveSetting('header.weather_entity', this.value)" />
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">报警实体</div>
        <div class="st-row-desc">alarm_control_panel.* 实体 ID</div>
      </div>
      <input class="st-input" value="${escapeAttribute(alarmEntity)}" placeholder="自动检测" onchange="hdpSaveSetting('header.alarm_entity', this.value)" />
    </div>
  `);
}

// ─── 4. People ──────────────────────────────────────────────────────────────

export function buildPeopleSection(hass: any, config: StrategyConfig): string {
  const hiddenPersons: string[] = (config as any).hdp_config?.people?.hidden_persons || config.hidden_persons || [];

  // Find person entities
  const persons: Array<{ id: string; name: string }> = [];
  for (const [entityId, stateObj] of Object.entries(hass.states || {})) {
    if (entityId.startsWith('person.')) {
      const name = (stateObj as any).attributes?.friendly_name || entityId.replace('person.', '');
      persons.push({ id: entityId, name });
    }
  }

  const chips = persons.map(p => {
    const hidden = hiddenPersons.includes(p.id);
    return `<div class="st-chip ${hidden ? 'st-chip--active' : ''}" data-action="toggle-hidden-person" onclick="hdpToggleArrayItem('people.hidden_persons', ${jsArg(p.id)}, event)">${escapeHTML(p.name)}</div>`;
  }).join('') || '<span class="st-row-desc">未找到 person 实体</span>';

  return sectionCard('people', '家庭成员', iconPeople(), `
    <div class="st-row-label">隐藏成员</div>
    <div class="st-row-desc">点击切换是否在首页显示</div>
    <div class="st-chip-list">${chips}</div>
  `);
}

// ─── 5. Areas ───────────────────────────────────────────────────────────────

export function buildAreasSection(hass: any, config: StrategyConfig): string {
  const hiddenAreas: string[] = config.hdp_config?.areas?.hidden_areas || config.hidden_areas || [];
  const hideUnavailable = config.hdp_config?.areas?.hide_unavailable || false;

  const areaChips = Object.entries(hass.areas || {}).map(([id, area]: [string, any]) => {
    const hidden = hiddenAreas.includes(id);
    return `<div class="st-chip ${hidden ? 'st-chip--active' : ''}" data-action="toggle-hidden-area" onclick="hdpToggleArrayItem('areas.hidden_areas', ${jsArg(id)}, event)">${escapeHTML(area.name)}</div>`;
  }).join('') || '<span class="st-row-desc">未找到区域</span>';

  return sectionCard('areas', '区域', iconAreas(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">隐藏区域</div>
        <div class="st-row-desc">点击切换区域是否显示（高亮=隐藏）</div>
      </div>
    </div>
    <div class="st-chip-list">${areaChips}</div>
    <div class="st-row" style="margin-top: 12px;">
      <div>
        <div class="st-row-label">隐藏不可用设备</div>
        <div class="st-row-desc">不显示 unavailable 状态的设备</div>
      </div>
      ${toggleHTML('areas.hide_unavailable', hideUnavailable)}
    </div>
  `);
}

// ─── 6. Devices ─────────────────────────────────────────────────────────────

export function buildDevicesSection(config: StrategyConfig, hass?: Hass): string {
  const hiddenDomains: string[] = config.hdp_config?.devices?.hidden_domains || config.hidden_domains || [];
  const hiddenDeviceTypes: string[] = config.hdp_config?.devices?.hidden_device_types || [];
  const domains = ['light', 'switch', 'climate', 'fan', 'cover', 'lock', 'sensor', 'binary_sensor', 'media_player', 'camera', 'vacuum', 'button'];
  const domainLabels: Record<string, string> = {
    light: '灯光', switch: '开关', climate: '空调', fan: '风扇', cover: '窗帘',
    lock: '门锁', sensor: '传感器', binary_sensor: '二进传感器', media_player: '媒体',
    camera: '摄像头', vacuum: '扫地机', button: '按钮',
  };

  const chips = domains.map(d => {
    const hidden = hiddenDomains.includes(d);
    return `<div class="st-chip ${hidden ? 'st-chip--active' : ''}" data-action="toggle-hidden-domain" onclick="hdpToggleArrayItem('devices.hidden_domains', ${jsArg(d)}, event)">${escapeHTML(domainLabels[d] || d)}</div>`;
  }).join('');

  const deviceTypeHTML = buildHiddenDeviceTypeChips(hass, hiddenDomains, hiddenDeviceTypes);

  return sectionCard('devices', '设备类型', iconDevices(), `
    <div class="st-row-label">隐藏设备类型</div>
    <div class="st-row-desc">点击切换设备类型是否显示（高亮=隐藏）</div>
    <div class="st-chip-list">${chips}</div>
    ${deviceTypeHTML}
  `);
}

// ─── 7. Blueprints ──────────────────────────────────────────────────────────

function buildHiddenDeviceTypeChips(hass: Hass | undefined, hiddenDomains: string[], hiddenDeviceTypes: string[]): string {
  const deviceTypeLabels: Record<string, string> = {
    'sensor.temperature': '温度传感器',
    'sensor.humidity': '湿度传感器',
    'sensor.power': '功率传感器',
    'sensor.energy': '电量传感器',
    'sensor.illuminance': '照度传感器',
    'binary_sensor.motion': '人体/运动',
    'binary_sensor.door': '门磁',
    'binary_sensor.window': '窗磁',
    'binary_sensor.smoke': '烟雾',
    'binary_sensor.moisture': '漏水',
    'binary_sensor.occupancy': '占用',
    'binary_sensor.presence': '存在',
  };
  const deviceTypes = Array.from(new Set(Object.entries(hass?.states || {})
    .map(([entityId, stateObj]) => getEntityDeviceType(entityId, stateObj.attributes || {}))
    .filter(type => type.includes('.') && !hiddenDomains.includes(type.split('.')[0]))))
    .sort();
  if (!deviceTypes.length) return '';

  const chips = deviceTypes.map(type => {
    const hidden = hiddenDeviceTypes.includes(type);
    return `<div class="st-chip ${hidden ? 'st-chip--active' : ''}" data-action="toggle-hidden-device-type" onclick="hdpToggleArrayItem('devices.hidden_device_types', ${jsArg(type)}, event)">${escapeHTML(deviceTypeLabels[type] || type)}</div>`;
  }).join('');

  return `<div class="st-section-subtitle">传感器/设备子类型</div><div class="st-chip-list">${chips}</div>`;
}

export function buildBlueprintsSection(blueprintPages: BlueprintInstance[]): string {
  const galleryHTML = buildBlueprintGalleryHTML(blueprintPages);
  return sectionCard('blueprints', '蓝图', iconBlueprint(), galleryHTML);
}

// ─── 9. Theme Files ─────────────────────────────────────────────────────────

export function buildThemeFilesSection(): string {
  return sectionCard('themes', '主题文件', `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c.55 0 1-.45 1-1v-1.5c0-.28.22-.5.5-.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>`, `
    <div class="st-row">
      <div>
        <div class="st-row-label">自定义主题</div>
        <div class="st-row-desc">将 JSON 主题文件放到 /local/hass-dashboard-pro/themes/ 目录</div>
      </div>
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">主题目录</div>
        <div class="st-row-desc">/local/hass-dashboard-pro/themes/</div>
      </div>
      <span class="st-about-val">JSON</span>
    </div>
    <div style="margin-top: 12px;">
      <button class="st-btn" onclick="hdpRefreshThemes()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        刷新主题列表
      </button>
    </div>
  `);
}

// ─── 10. Permissions ────────────────────────────────────────────────────────

export function buildPermissionsSection(config: StrategyConfig): string {
  const hdpConfig = (config as any).hdp_config;
  const restrictNonAdmin = hdpConfig?.permissions?.restrict_non_admin || false;
  const restrictSettings = hdpConfig?.permissions?.restrict_settings || false;

  return sectionCard('permissions', '权限', iconShield(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">限制非管理员</div>
        <div class="st-row-desc">非管理员用户无法修改仪表盘配置</div>
      </div>
      ${toggleHTML('permissions.restrict_non_admin', restrictNonAdmin)}
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">限制设置访问</div>
        <div class="st-row-desc">隐藏设置页面入口</div>
      </div>
      ${toggleHTML('permissions.restrict_settings', restrictSettings)}
    </div>
  `);
}

// ─── 11. About ──────────────────────────────────────────────────────────────

export function buildAboutSection(): string {
  return sectionCard('about', '关于', iconInfo(), `
    <div class="st-about-row">
      <span>版本</span>
      <span class="st-about-val">v4.0.0</span>
    </div>
    <div class="st-about-row">
      <span>架构</span>
      <span class="st-about-val">Monolithic Layout + Client Nav</span>
    </div>
    <div class="st-about-row">
      <span>渲染引擎</span>
      <span class="st-about-val">html-pro-card (do_not_parse)</span>
    </div>
    <div class="st-about-row">
      <span>设计语言</span>
      <span class="st-about-val">Apple HIG + Dieter Rams</span>
    </div>
    <div style="margin-top: 12px; display: flex; gap: 8px;">
      <a class="st-btn" href="https://github.com/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </a>
    </div>
  `);
}

// ─── 12. Reset/Export ───────────────────────────────────────────────────────

export function buildResetSection(): string {
  return sectionCard('reset', '重置与导出', iconReset(), `
    <div class="st-row">
      <div>
        <div class="st-row-label">导出配置</div>
        <div class="st-row-desc">将所有设置导出为 JSON 文件</div>
      </div>
      <button class="st-btn" onclick="hdpExportConfig()">导出</button>
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">导入配置</div>
        <div class="st-row-desc">从 JSON 文件恢复设置</div>
      </div>
      <button class="st-btn" onclick="hdpImportConfig()">导入</button>
    </div>
    <div class="st-row">
      <div>
        <div class="st-row-label">重置所有设置</div>
        <div class="st-row-desc">恢复到默认配置，此操作不可撤销</div>
      </div>
      <button class="st-btn st-btn--danger" onclick="hdpResetConfig()">重置</button>
    </div>
  `);
}
