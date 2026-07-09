/**
 * HA Websocket Service
 *
 * Provides access to the Home Assistant websocket connection from within
 * html-pro-card script contexts. Used for Lovelace config CRUD operations.
 *
 * IMPORTANT: This module generates <script> code strings that run client-side.
 * The functions here return JavaScript code as strings, not execute it directly.
 */

/**
 * Generate client-side JS code to discover the HA websocket connection.
 * Walks the DOM to find the home-assistant element's connection.
 */
export function generateConnectionDiscoveryJS(): string {
  return `
function hdpFindHassConnection() {
  // Method 1: Look for home-assistant custom element
  var ha = document.querySelector('home-assistant');
  if (ha && ha.hass && ha.hass.connection) {
    return ha.hass.connection;
  }
  // Method 2: Walk shadow roots
  var root = document.querySelector('home-assistant');
  if (root && root.shadowRoot) {
    var panel = root.shadowRoot.querySelector('ha-panel-lovelace');
    if (panel && panel.hass && panel.hass.connection) {
      return panel.hass.connection;
    }
  }
  // Method 3: Search all custom elements
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    if (els[i].hass && els[i].hass.connection) {
      return els[i].hass.connection;
    }
  }
  return null;
}

function hdpFindHass() {
  // Method 1: Direct lookup on home-assistant element (light DOM)
  var ha = document.querySelector('home-assistant');
  if (ha && ha.hass && typeof ha.hass.callService === 'function') return ha.hass;
  // Method 2: Walk shadow roots of home-assistant
  if (ha && ha.shadowRoot) {
    var panel = ha.shadowRoot.querySelector('ha-panel-lovelace');
    if (panel && panel.hass && typeof panel.hass.callService === 'function') return panel.hass;
    // Search deeper in shadow roots
    var deep = hdpSearchShadowRoots(ha.shadowRoot, 3);
    if (deep) return deep;
  }
  // Method 3: Search all custom elements with shadow roots
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.hass && typeof el.hass.callService === 'function') return el.hass;
    if (el.shadowRoot) {
      var found = hdpSearchShadowRoots(el.shadowRoot, 2);
      if (found) return found;
    }
  }
  return null;
}

function hdpSearchShadowRoots(root, depth) {
  if (depth <= 0 || !root) return null;
  var els = root.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.hass && typeof el.hass.callService === 'function') return el.hass;
    if (el.shadowRoot) {
      var found = hdpSearchShadowRoots(el.shadowRoot, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

function hdpShowToast(msg, type) {
  type = type || 'info';
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' +
    (type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#1a1d26') +
    ';color:white;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;z-index:999999;' +
    'box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s ease,transform 0.3s ease;' +
    'max-width:90vw;text-align:center;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(function() {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(-4px)';
  });
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(4px)';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

function hdpApplyThemeVarsToOverlay(overlay) {
  var root = document.getElementById('hdp-root');
  if (!overlay || !root || !window.getComputedStyle) return;
  var styles = window.getComputedStyle(root);
  [
    '--hdp-bg', '--hdp-card-bg', '--hdp-text', '--hdp-text-secondary',
    '--hdp-text-muted', '--hdp-border', '--hdp-primary', '--hdp-primary-light',
    '--hdp-success', '--hdp-success-light', '--hdp-info', '--hdp-info-light',
    '--hdp-warning', '--hdp-warning-light', '--hdp-danger', '--hdp-danger-light',
    '--hdp-radius', '--hdp-radius-sm', '--hdp-radius-pill', '--hdp-shadow-card',
    '--hdp-shadow-elevated'
  ].forEach(function(name) {
    var value = styles.getPropertyValue(name);
    if (value) overlay.style.setProperty(name, value);
  });
}

function hdpToggleEntity(entityId) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) {
    console.warn('[HDP] No HA connection available to toggle', entityId);
    hdpShowToast('无法连接到 Home Assistant，设备控制不可用', 'error');
    return;
  }
  var domain = entityId.split('.')[0];
  var service = 'toggle';
  // Some domains need specific services
  if (domain === 'cover') service = 'toggle';
  else if (domain === 'lock') {
    var stateObj = hass.states[entityId];
    service = stateObj && stateObj.state === 'locked' ? 'unlock' : 'lock';
  } else if (domain === 'climate') {
    // Climate: toggle between 'off' and previous HVAC mode
    var climateState = hass.states[entityId];
    if (!climateState) return;
    var currentMode = climateState.state;
    if (currentMode === 'off') {
      // Turn on — use the first available mode from attributes
      var modes = climateState.attributes && climateState.attributes.hvac_modes;
      var targetMode = (modes && modes.length > 1) ? modes[1] : 'auto';
      service = 'set_hvac_mode';
      hass.callService('climate', service, { entity_id: entityId, hvac_mode: targetMode });
    } else {
      hass.callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: 'off' });
    }
    hdpPulseCard(entityId);
    return;
  } else if (domain === 'button' || domain === 'input_button') {
    service = 'press';
  }
  try {
    hass.callService(domain, service, { entity_id: entityId });
    hdpPulseCard(entityId);
  } catch(e) {
    console.error('[HDP] Toggle failed:', e);
    hdpShowToast('设备控制失败: ' + (e.message || '未知错误'), 'error');
  }
}

function hdpPulseCard(entityId) {
  var card = document.querySelector('[data-entity="' + entityId + '"]');
  if (card) {
    card.style.opacity = '0.6';
    setTimeout(function() { card.style.opacity = '1'; }, 300);
  }
}

// ── Climate Controls ──
function hdpSetClimateMode(entityId, mode) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  try {
    hass.callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: mode });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('空调模式切换失败', 'error'); }
}

function hdpSetClimateTemp(entityId, delta, minTemp, maxTemp) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var stateObj = hass.states[entityId];
  if (!stateObj) return;
  var current = stateObj.attributes && stateObj.attributes.temperature;
  if (current == null) current = 24;
  var newTemp = Math.round((current + delta) * 2) / 2; // round to 0.5
  if (minTemp != null && newTemp < minTemp) newTemp = minTemp;
  if (maxTemp != null && newTemp > maxTemp) newTemp = maxTemp;
  try {
    hass.callService('climate', 'set_temperature', { entity_id: entityId, temperature: newTemp });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('温度调节失败', 'error'); }
}

function hdpSetClimateFanMode(entityId, fanMode) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  try {
    hass.callService('climate', 'set_fan_mode', { entity_id: entityId, fan_mode: fanMode });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('风速切换失败', 'error'); }
}

// ── Cover Controls ──
function hdpCoverAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var serviceMap = { open: 'open_cover', close: 'close_cover', stop: 'stop_cover' };
  var service = serviceMap[action] || 'stop_cover';
  try {
    hass.callService('cover', service, { entity_id: entityId });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('窗帘控制失败', 'error'); }
}

// ── Lock Controls ──
function hdpLockAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  try {
    hass.callService('lock', action, { entity_id: entityId });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('门锁控制失败', 'error'); }
}

// ── Media Player Controls ──
function hdpMediaAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var serviceMap = { play_pause: 'media_play_pause', next: 'media_next_track', previous: 'media_previous_track' };
  var service = serviceMap[action] || 'media_play_pause';
  try {
    hass.callService('media_player', service, { entity_id: entityId });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('媒体控制失败', 'error'); }
}

function hdpSetMediaVolume(entityId, volumeLevel) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) return;
  var v = parseFloat(volumeLevel);
  if (isNaN(v)) return;
  v = Math.max(0, Math.min(1, v));
  try {
    hass.callService('media_player', 'volume_set', { entity_id: entityId, volume_level: v });
  } catch(e) { /* silent — volume slider fires frequently */ }
}

// ── Vacuum Controls ──
function hdpVacuumAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var serviceMap = { start: 'start', pause: 'pause', dock: 'return_to_base' };
  var service = serviceMap[action] || 'start';
  try {
    hass.callService('vacuum', service, { entity_id: entityId });
    hdpPulseCard(entityId);
  } catch(e) { hdpShowToast('扫地机控制失败', 'error'); }
}

// ── Environment History ──
function hdpShowEnvironmentHistory(metric) {
  metric = metric === 'humidity' ? 'humidity' : 'temperature';
  var hass = hdpFindHass();
  var connection = hdpFindHassConnection();
  if (!hass || !hass.states || !connection || !connection.sendMessagePromise) {
    hdpShowToast('无法读取 Home Assistant 历史数据', 'error');
    return;
  }

  var sensors = hdpFindEnvironmentSensors(hass, metric);
  if (!sensors.length) {
    hdpShowToast(metric === 'humidity' ? '未找到湿度传感器' : '未找到温度传感器', 'error');
    return;
  }

  hdpOpenEnvironmentHistoryModal(metric, sensors, null, true);
  var end = new Date();
  var start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  connection.sendMessagePromise({
    type: 'history/history_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    entity_ids: sensors.map(function(sensor) { return sensor.entity_id; }),
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false
  }).then(function(history) {
    hdpOpenEnvironmentHistoryModal(metric, sensors, hdpBuildEnvironmentSeries(hass, sensors, history), false);
  }).catch(function(err) {
    console.warn('[HDP] Failed to load environment history', err);
    hdpShowToast('历史曲线加载失败', 'error');
    hdpOpenEnvironmentHistoryModal(metric, sensors, hdpBuildEnvironmentSeries(hass, sensors, null), false);
  });
}

window.hdpShowEnvironmentHistory = hdpShowEnvironmentHistory;

function hdpFindEnvironmentSensors(hass, metric) {
  var result = [];
  Object.keys(hass.states || {}).forEach(function(entityId) {
    if (entityId.indexOf('sensor.') !== 0) return;
    var stateObj = hass.states[entityId];
    if (!stateObj || !stateObj.attributes) return;
    var registry = hass.entities && hass.entities[entityId];
    if (registry && (registry.disabled_by || registry.hidden_by)) return;
    var attrs = stateObj.attributes;
    var deviceClass = attrs.device_class || '';
    var unit = attrs.unit_of_measurement || '';
    var lowerId = entityId.toLowerCase();
    var isMetric = metric === 'humidity'
      ? (deviceClass === 'humidity' || unit === '%' || lowerId.indexOf('humidity') >= 0 || lowerId.indexOf('humid') >= 0)
      : (deviceClass === 'temperature' || unit === '°C' || unit === '°F' || lowerId.indexOf('temperature') >= 0 || lowerId.indexOf('temp') >= 0);
    if (!isMetric) return;
    if (lowerId.indexOf('outdoor') >= 0 || lowerId.indexOf('weather') >= 0 || lowerId.indexOf('external') >= 0) return;
    var numeric = parseFloat(stateObj.state);
    if (isNaN(numeric)) return;
    var area = hdpResolveEntityArea(hass, entityId);
    result.push({
      entity_id: entityId,
      name: attrs.friendly_name || entityId.replace('sensor.', '').replace(/_/g, ' '),
      area_id: area.id,
      area_name: area.name,
      unit: unit || (metric === 'humidity' ? '%' : '°C')
    });
  });
  return result.sort(function(a, b) {
    return a.area_name.localeCompare(b.area_name) || a.name.localeCompare(b.name);
  });
}

function hdpResolveEntityArea(hass, entityId) {
  var registry = hass.entities && hass.entities[entityId];
  var areaId = registry && registry.area_id;
  if (!areaId && registry && registry.device_id && hass.devices && hass.devices[registry.device_id]) {
    areaId = hass.devices[registry.device_id].area_id;
  }
  if (!areaId && hass.states[entityId] && hass.states[entityId].attributes) {
    areaId = hass.states[entityId].attributes.area_id;
  }
  var area = areaId && hass.areas && hass.areas[areaId] ? hass.areas[areaId] : null;
  return {
    id: areaId || '__unassigned__',
    name: area && area.name ? area.name : (areaId || '未分配区域')
  };
}

function hdpBuildEnvironmentSeries(hass, sensors, history) {
  var byEntity = {};
  if (Array.isArray(history)) {
    history.forEach(function(item) {
      if (!Array.isArray(item) || !item.length) return;
      var first = item[0];
      var entityId = first && (first.entity_id || first.entityId);
      if (entityId) byEntity[entityId] = item;
    });
  } else if (history && typeof history === 'object') {
    byEntity = history;
  }

  var now = Date.now();
  var start = now - 24 * 60 * 60 * 1000;
  var buckets = [];
  for (var i = 0; i < 24; i++) {
    buckets.push({ time: start + i * 60 * 60 * 1000, values: [] });
  }

  var areas = {};
  sensors.forEach(function(sensor) {
    if (!areas[sensor.area_id]) {
      areas[sensor.area_id] = {
        area_id: sensor.area_id,
        area_name: sensor.area_name,
        unit: sensor.unit,
        buckets: buckets.map(function(bucket) { return { time: bucket.time, values: [] }; })
      };
    }
    var points = byEntity[sensor.entity_id];
    if (!Array.isArray(points) || !points.length) {
      var current = hass.states[sensor.entity_id] && parseFloat(hass.states[sensor.entity_id].state);
      if (!isNaN(current)) areas[sensor.area_id].buckets[23].values.push(current);
      return;
    }
    points.forEach(function(point) {
      var value = parseFloat(point.state != null ? point.state : point.s);
      var changed = hdpParseHistoryTimestamp(point);
      if (isNaN(value) || isNaN(changed)) return;
      var index = Math.max(0, Math.min(23, Math.floor((changed - start) / (60 * 60 * 1000))));
      areas[sensor.area_id].buckets[index].values.push(value);
    });
  });

  return Object.keys(areas).map(function(areaId) {
    var area = areas[areaId];
    var lastValue = null;
    var values = area.buckets.map(function(bucket) {
      if (bucket.values.length) {
        lastValue = bucket.values.reduce(function(sum, value) { return sum + value; }, 0) / bucket.values.length;
      }
      return lastValue;
    });
    return {
      area_id: area.area_id,
      area_name: area.area_name,
      unit: area.unit,
      values: values
    };
  }).filter(function(area) {
    return area.values.some(function(value) { return value != null; });
  }).sort(function(a, b) {
    return a.area_name.localeCompare(b.area_name);
  });
}

function hdpParseHistoryTimestamp(point) {
  var raw = point.last_changed || point.last_updated;
  if (raw == null) raw = point.lc != null ? point.lc : point.lu;
  if (raw == null) return NaN;
  if (typeof raw === 'number') return raw * 1000;
  if (typeof raw === 'string' && /^\\d+(\\.\\d+)?$/.test(raw)) return parseFloat(raw) * 1000;
  return Date.parse(raw);
}

function hdpOpenEnvironmentHistoryModal(metric, sensors, series, loading) {
  var existing = document.getElementById('hdp-env-history-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'hdp-env-history-modal';
  overlay.className = 'hdp-env-history-modal';
  hdpApplyThemeVarsToOverlay(overlay);
  var title = metric === 'humidity' ? '各区域湿度 24 小时曲线' : '各区域温度 24 小时曲线';
  var body = loading
    ? '<div class="hdp-env-history-loading">正在读取历史数据...</div>'
    : hdpRenderEnvironmentCharts(series || [], metric, sensors);
  overlay.innerHTML =
    '<div class="hdp-env-history-dialog" role="dialog" aria-modal="true" aria-label="' + title + '">' +
      '<div class="hdp-env-history-head">' +
        '<div><div class="hdp-env-history-title">' + title + '</div>' +
        '<div class="hdp-env-history-sub">按区域聚合可见传感器，展示最近 24 小时趋势</div></div>' +
        '<button type="button" class="hdp-env-history-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="hdp-env-history-body">' + body + '</div>' +
    '</div>' +
    '<style>' + hdpEnvironmentHistoryCSS() + '</style>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay || e.target.closest('.hdp-env-history-close')) overlay.remove();
  });
  document.addEventListener('keydown', hdpCloseEnvironmentHistoryOnEsc, { once: true });
  document.body.appendChild(overlay);
}

function hdpCloseEnvironmentHistoryOnEsc(e) {
  if (e.key !== 'Escape') return;
  var modal = document.getElementById('hdp-env-history-modal');
  if (modal) modal.remove();
}

function hdpRenderEnvironmentCharts(series, metric, sensors) {
  if (!series.length) {
    return '<div class="hdp-env-history-empty">暂无可用历史数据，已识别 ' + sensors.length + ' 个传感器。</div>';
  }
  return series.map(function(area) {
    var values = area.values.filter(function(value) { return value != null; });
    var min = Math.min.apply(Math, values);
    var max = Math.max.apply(Math, values);
    var latest = values.length ? values[values.length - 1] : null;
    var unit = area.unit || (metric === 'humidity' ? '%' : '°C');
    return '<section class="hdp-env-chart">' +
      '<div class="hdp-env-chart-top"><span>' + hdpEscapeText(area.area_name) + '</span><strong>' + hdpFormatEnvValue(latest, unit) + '</strong></div>' +
      hdpBuildSparkline(area.values, min, max) +
      '<div class="hdp-env-chart-meta"><span>' + hdpFormatEnvValue(min, unit) + '</span><span>24h</span><span>' + hdpFormatEnvValue(max, unit) + '</span></div>' +
    '</section>';
  }).join('');
}

function hdpBuildSparkline(values, min, max) {
  var width = 320;
  var height = 96;
  var pad = 10;
  var clean = values.map(function(value, index) { return value == null ? null : { value: value, index: index }; })
    .filter(function(point) { return point; });
  if (!clean.length) return '<div class="hdp-env-sparkline hdp-env-sparkline--empty"></div>';
  var range = Math.max(0.1, max - min);
  var points = clean.map(function(point) {
    var x = pad + (point.index / 23) * (width - pad * 2);
    var y = height - pad - ((point.value - min) / range) * (height - pad * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  var d = points.map(function(point, index) { return (index === 0 ? 'M' : 'L') + point[0] + ' ' + point[1]; }).join(' ');
  var fill = d + ' L ' + points[points.length - 1][0] + ' ' + (height - pad) + ' L ' + points[0][0] + ' ' + (height - pad) + ' Z';
  return '<svg class="hdp-env-sparkline" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">' +
    '<path class="hdp-env-sparkline-fill" d="' + fill + '"></path>' +
    '<path class="hdp-env-sparkline-line" d="' + d + '"></path>' +
  '</svg>';
}

function hdpFormatEnvValue(value, unit) {
  if (value == null || isNaN(value)) return '--';
  return (Math.round(value * 10) / 10) + unit;
}

function hdpEscapeText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function hdpEnvironmentHistoryCSS() {
  return '.hdp-env-history-modal{position:fixed;inset:0;z-index:1000000;background:rgba(8,12,22,.46);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(10px)}' +
    '.hdp-env-history-dialog{width:min(920px,96vw);max-height:min(760px,90dvh);overflow:hidden;border-radius:18px;background:var(--hdp-bg,#fff);color:var(--hdp-text,#111);border:1px solid var(--hdp-border,rgba(0,0,0,.08));box-shadow:0 24px 80px rgba(0,0,0,.28);display:flex;flex-direction:column}' +
    '.hdp-env-history-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid var(--hdp-border,rgba(0,0,0,.08))}' +
    '.hdp-env-history-title{font:inherit;font-size:18px;font-weight:800;color:var(--hdp-text,#111)}.hdp-env-history-sub{margin-top:4px;font:inherit;font-size:12px;color:var(--hdp-text-muted,#64748b)}' +
    '.hdp-env-history-close{appearance:none;width:40px;height:40px;border-radius:999px;border:1px solid var(--hdp-border,rgba(0,0,0,.08));background:var(--hdp-card-bg,#fff);color:var(--hdp-text,#111);font-size:24px;line-height:1;cursor:pointer}' +
    '.hdp-env-history-body{padding:16px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}' +
    '.hdp-env-chart{min-width:0;padding:14px;border-radius:14px;border:1px solid var(--hdp-border,rgba(0,0,0,.08));background:var(--hdp-card-bg,#fff)}' +
    '.hdp-env-chart-top,.hdp-env-chart-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.hdp-env-chart-top span{font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hdp-env-chart-top strong{font-size:18px}.hdp-env-chart-meta{font-size:11px;color:var(--hdp-text-muted,#64748b)}' +
    '.hdp-env-sparkline{width:100%;height:112px;margin:10px 0;display:block}.hdp-env-sparkline-fill{fill:var(--hdp-primary-light,rgba(79,110,247,.14))}.hdp-env-sparkline-line{fill:none;stroke:var(--hdp-primary,#4f6ef7);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}' +
    '.hdp-env-history-loading,.hdp-env-history-empty{grid-column:1/-1;padding:28px;text-align:center;color:var(--hdp-text-muted,#64748b);border:1px dashed var(--hdp-border,rgba(0,0,0,.08));border-radius:14px}';
}

function hdpOpenAutomationConfig() {
  var existing = document.getElementById('hdp-automation-config-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'hdp-automation-config-modal';
  overlay.className = 'hdp-env-history-modal hdp-automation-config-modal';
  hdpApplyThemeVarsToOverlay(overlay);
  overlay.innerHTML =
    '<div class="hdp-env-history-dialog hdp-automation-config-dialog" role="dialog" aria-modal="true" aria-label="自动化配置">' +
      '<div class="hdp-env-history-head">' +
        '<div><div class="hdp-env-history-title">自动化配置</div>' +
        '<div class="hdp-env-history-sub">在 Home Assistant 自动化页面中查看和编辑规则</div></div>' +
        '<button type="button" class="hdp-env-history-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<iframe class="hdp-automation-config-frame" src="/config/automation/dashboard" title="自动化配置"></iframe>' +
    '</div>' +
    '<style>' + hdpEnvironmentHistoryCSS() +
      '.hdp-automation-config-dialog{width:min(1120px,96vw);height:min(820px,92dvh)}' +
      '.hdp-automation-config-frame{width:100%;height:100%;border:0;background:var(--hdp-bg,#fff);color:var(--hdp-text,#111)}' +
    '</style>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay || e.target.closest('.hdp-env-history-close')) overlay.remove();
  });
  document.body.appendChild(overlay);
}

window.hdpOpenAutomationConfig = hdpOpenAutomationConfig;

function hdpOpenDeviceDomainModal(domain) {
  var hass = hdpFindHass();
  if (!hass || !hass.states) {
    hdpShowToast('无法读取 Home Assistant 设备状态', 'error');
    return;
  }
  domain = String(domain || '').split('.')[0];
  var entities = hdpCollectDomainEntities(hass, domain);
  var existing = document.getElementById('hdp-device-domain-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'hdp-device-domain-modal';
  overlay.className = 'hdp-env-history-modal hdp-device-domain-modal';
  hdpApplyThemeVarsToOverlay(overlay);
  var label = hdpDomainLabel(domain);
  overlay.innerHTML =
    '<div class="hdp-env-history-dialog hdp-device-domain-dialog" role="dialog" aria-modal="true" aria-label="' + hdpEscapeText(label) + '">' +
      '<div class="hdp-env-history-head">' +
        '<div><div class="hdp-env-history-title">' + hdpEscapeText(label) + '</div>' +
        '<div class="hdp-env-history-sub">优先显示运行中的设备，点击条目打开设备详情</div></div>' +
        '<button type="button" class="hdp-env-history-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="hdp-domain-modal-body">' + hdpRenderDomainEntityList(entities, domain) + '</div>' +
    '</div>' +
    '<style>' + hdpEnvironmentHistoryCSS() + hdpDeviceDomainModalCSS() + '</style>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay || e.target.closest('.hdp-env-history-close')) {
      overlay.remove();
      return;
    }
    var row = e.target.closest('[data-domain-modal-entity]');
    if (!row) return;
    hdpOpenMoreInfo(row.getAttribute('data-domain-modal-entity'));
  });
  document.body.appendChild(overlay);
}

window.hdpOpenDeviceDomainModal = hdpOpenDeviceDomainModal;
window.hdpShowDeviceDomain = function(domain) {
  hdpOpenDeviceDomainModal(domain);
};

function hdpCollectDomainEntities(hass, domain) {
  var rows = [];
  Object.keys(hass.states || {}).forEach(function(entityId) {
    if (entityId.split('.')[0] !== domain) return;
    var registry = hass.entities && hass.entities[entityId];
    if (registry && (registry.disabled_by || registry.hidden_by)) return;
    var stateObj = hass.states[entityId];
    var attrs = stateObj.attributes || {};
    var area = hdpResolveEntityArea(hass, entityId);
    rows.push({
      entity_id: entityId,
      name: attrs.friendly_name || entityId.replace(domain + '.', '').replace(/_/g, ' '),
      state: stateObj.state,
      area_name: area.name,
      active: hdpIsEntityRunning(stateObj.state, domain)
    });
  });
  return rows.sort(function(a, b) {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.area_name.localeCompare(b.area_name) || a.name.localeCompare(b.name);
  });
}

function hdpIsEntityRunning(state, domain) {
  if (domain === 'climate') return state !== 'off' && state !== 'unavailable' && state !== 'unknown';
  if (domain === 'cover') return state === 'open' || state === 'opening';
  if (domain === 'lock') return state === 'unlocked';
  if (domain === 'media_player') return state === 'playing' || state === 'on';
  return state === 'on';
}

function hdpRenderDomainEntityList(entities, domain) {
  if (!entities.length) return '<div class="hdp-env-history-empty">暂无可显示设备</div>';
  return entities.map(function(entity) {
    return '<button type="button" class="hdp-domain-modal-row ' + (entity.active ? 'hdp-domain-modal-row--active' : '') + '" data-domain-modal-entity="' + hdpEscapeText(entity.entity_id) + '">' +
      '<span class="hdp-domain-modal-dot"></span>' +
      '<span class="hdp-domain-modal-main"><strong>' + hdpEscapeText(entity.name) + '</strong><small>' + hdpEscapeText(entity.area_name) + '</small></span>' +
      '<span class="hdp-domain-modal-state">' + hdpEscapeText(hdpFormatDomainState(entity.state, domain)) + '</span>' +
    '</button>';
  }).join('');
}

function hdpOpenMoreInfo(entityId) {
  window.dispatchEvent(new CustomEvent('hass-more-info', {
    bubbles: true,
    composed: true,
    detail: { entityId: entityId }
  }));
}

function hdpDomainLabel(domain) {
  var labels = {
    light: '灯光', switch: '开关', climate: '空调', fan: '风扇', cover: '窗帘',
    lock: '门锁', sensor: '传感器', binary_sensor: '传感器', media_player: '媒体',
    camera: '摄像头', vacuum: '扫地机', button: '按钮'
  };
  return labels[domain] || domain;
}

function hdpFormatDomainState(state, domain) {
  var labels = {
    on: '开启', off: '关闭', open: '开启', closed: '关闭', opening: '开启中',
    closing: '关闭中', locked: '已锁', unlocked: '未锁', playing: '播放中',
    paused: '暂停', idle: '待机', unavailable: '不可用', unknown: '未知',
    heat: '制热', cool: '制冷', auto: '自动', dry: '除湿', fan_only: '送风'
  };
  return labels[state] || state;
}

function hdpDeviceDomainModalCSS() {
  return '.hdp-device-domain-dialog{width:min(860px,96vw);max-height:min(760px,90dvh)}' +
    '.hdp-domain-modal-body{padding:14px;overflow:auto;display:grid;gap:10px}' +
    '.hdp-domain-modal-row{appearance:none;width:100%;min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--hdp-border,rgba(0,0,0,.08));background:var(--hdp-card-bg,#fff);color:var(--hdp-text,#111);text-align:left;font:inherit;cursor:pointer;box-shadow:var(--hdp-shadow-card,none)}' +
    '.hdp-domain-modal-row:hover{border-color:var(--hdp-primary,#4f6ef7);transform:translateY(-1px)}' +
    '.hdp-domain-modal-dot{width:10px;height:10px;border-radius:999px;background:var(--hdp-text-muted,#94a3b8)}' +
    '.hdp-domain-modal-row--active .hdp-domain-modal-dot{background:var(--hdp-success,#22c55e);box-shadow:0 0 0 4px var(--hdp-success-light,rgba(34,197,94,.14))}' +
    '.hdp-domain-modal-main{min-width:0;display:grid;gap:2px}.hdp-domain-modal-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.hdp-domain-modal-main small{color:var(--hdp-text-muted,#64748b);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.hdp-domain-modal-state{font-size:12px;font-weight:800;color:var(--hdp-primary,#4f6ef7);background:var(--hdp-primary-light,rgba(79,110,247,.12));border-radius:999px;padding:5px 10px;white-space:nowrap}';
}

function hdpClosestFromEvent(e, selector) {
  if (e && e.target && e.target.closest) {
    var direct = e.target.closest(selector);
    if (direct) return direct;
  }
  var path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (var i = 0; i < path.length; i++) {
    var node = path[i];
    if (node && node.matches && node.matches(selector)) return node;
    if (node && node.closest) {
      var found = node.closest(selector);
      if (found) return found;
    }
  }
  return null;
}

function hdpHandleDomainControl(control) {
  if (!control || !control.getAttribute) return false;
  var action = control.getAttribute('data-action') || '';
  var owner = control.closest('[data-entity]');
  var entityId = control.getAttribute('data-entity') || (owner && owner.getAttribute('data-entity'));
  if (!entityId || !action) return false;

  if (action === 'climate-mode') {
    hdpSetClimateMode(entityId, control.getAttribute('data-mode') || 'auto');
    return true;
  }
  if (action === 'climate-temp') {
    hdpSetClimateTemp(
      entityId,
      parseFloat(control.getAttribute('data-step') || '0'),
      parseFloat(control.getAttribute('data-min-temp') || '16'),
      parseFloat(control.getAttribute('data-max-temp') || '30')
    );
    return true;
  }
  if (action === 'climate-fan') {
    hdpSetClimateFanMode(entityId, control.getAttribute('data-fan-mode') || 'auto');
    return true;
  }
  if (action.indexOf('cover-') === 0) {
    hdpCoverAction(entityId, action.replace('cover-', ''));
    return true;
  }
  if (action.indexOf('lock-') === 0) {
    hdpLockAction(entityId, action.replace('lock-', ''));
    return true;
  }
  if (action.indexOf('media-') === 0 && action !== 'media-volume') {
    hdpMediaAction(entityId, action.replace('media-', '').replace('play-pause', 'play_pause'));
    return true;
  }
  if (action.indexOf('vacuum-') === 0) {
    hdpVacuumAction(entityId, action.replace('vacuum-', ''));
    return true;
  }
  return false;
}

function hdpInitEntityClickHandlers() {
  // Event delegation on the main content area
  document.addEventListener('click', function(e) {
    var domainControl = hdpClosestFromEvent(e, '[data-action][data-entity]');
    if (domainControl && hdpClosestFromEvent(e, '[data-no-toggle]')) {
      e.preventDefault();
      e.stopPropagation();
      if (hdpHandleDomainControl(domainControl)) return;
    }
    // Domain-specific cards own their inner buttons and service calls.
    if (hdpClosestFromEvent(e, '[data-no-toggle]')) return;
    // Check if click is on an entity card or its toggle
    var card = hdpClosestFromEvent(e, '[data-entity]');
    if (!card) return;
    // Domain-specific cards (climate, cover, lock, etc.) have their own buttons
    if (card.hasAttribute('data-no-toggle')) return;
    var entityId = card.getAttribute('data-entity');
    if (!entityId) return;
    // Don't toggle sensors or binary_sensors
    var domain = entityId.split('.')[0];
    if (domain === 'sensor' || domain === 'binary_sensor' || domain === 'camera') return;
    hdpToggleEntity(entityId);
  }, true);
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (hdpClosestFromEvent(e, '[data-no-toggle]')) return;
    var card = hdpClosestFromEvent(e, '[data-action="toggle"][data-entity]');
    if (!card) return;
    e.preventDefault();
    card.click();
  });
  document.addEventListener('input', function(e) {
    var control = hdpClosestFromEvent(e, '[data-action="media-volume"][data-entity]');
    if (!control) return;
    hdpSetMediaVolume(control.getAttribute('data-entity'), Number(control.value) / 100);
  }, true);
}
`;
}

/**
 * Generate client-side JS for Lovelace config read/write.
 * Depends on hdpFindHassConnection() being defined first.
 */
export function generateLovelaceConfigJS(): string {
  return `
function hdpFindLovelacePanel() {
  var ha = document.querySelector('home-assistant');
  if (ha && ha.shadowRoot) {
    var panel = ha.shadowRoot.querySelector('ha-panel-lovelace');
    if (panel) return panel;
  }
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    if (els[i].tagName && String(els[i].tagName).toLowerCase() === 'ha-panel-lovelace') return els[i];
    if (els[i].shadowRoot) {
      var nested = els[i].shadowRoot.querySelector && els[i].shadowRoot.querySelector('ha-panel-lovelace');
      if (nested) return nested;
    }
  }
  return null;
}

function hdpNormalizeLovelaceUrlPath(value) {
  if (typeof value !== 'string') return undefined;
  var cleaned = value.replace(/^\\/+|\\/+$/g, '');
  if (!cleaned || cleaned === 'lovelace') return undefined;
  return cleaned;
}

function hdpGetCurrentUrlPath() {
  var panel = hdpFindLovelacePanel();
  var panelPath = hdpNormalizeLovelaceUrlPath(
    panel && (panel.urlPath || panel.url_path || (panel.lovelace && panel.lovelace.urlPath) || (panel.lovelace && panel.lovelace.url_path))
  );
  if (panelPath) return panelPath;

  var path = window.location.pathname.replace(/^\\/+|\\/+$/g, '');
  var parts = path.split('/').filter(Boolean);
  if (!parts.length) return undefined;

  var dashboardPath = parts[0];
  if (dashboardPath === 'lovelace') return undefined;
  return hdpNormalizeLovelaceUrlPath(dashboardPath);
}

function hdpLovelaceMessage(type, urlPath, extra) {
  var msg = Object.assign({ type: type }, extra || {});
  if (urlPath) msg.url_path = urlPath;
  return msg;
}

function hdpLoadHDPConfig() {
  return new Promise(function(resolve) {
    // Try localStorage first (fast, works offline)
    try {
      var cached = localStorage.getItem('hdp_config');
      if (cached) {
        resolve(JSON.parse(cached));
        return;
      }
    } catch(e) {}
    resolve(null);
  });
}

function hdpSaveHDPConfig(data) {
  try {
    var existing = {};
    try {
      var cached = localStorage.getItem('hdp_config');
      if (cached) existing = JSON.parse(cached);
    } catch(e) {}
    var merged = typeof hdpDeepMerge === 'function'
      ? hdpDeepMerge(existing, data)
      : Object.assign({}, existing, data);
    localStorage.setItem('hdp_config', JSON.stringify(merged));
    return Promise.resolve(merged);
  } catch(e) {
    console.error('[HDP] Failed to save config:', e);
    return Promise.reject(e);
  }
}

function hdpSaveToLovelace(hdpConfig) {
  var conn = hdpFindHassConnection();
  if (!conn) {
    console.warn('[HDP] No HA connection, config saved to localStorage only');
    return hdpSaveHDPConfig(hdpConfig);
  }
  var urlPath = hdpGetCurrentUrlPath();
  return conn.sendMessagePromise(hdpLovelaceMessage('lovelace/config', urlPath, {
    force: false
  })).then(function(lovelaceConfig) {
    var strategy = lovelaceConfig.strategy || {};
    strategy.hdp_config = hdpConfig;
    return conn.sendMessagePromise(hdpLovelaceMessage('lovelace/config/save', urlPath, {
      config: Object.assign({}, lovelaceConfig, { strategy: strategy })
    }));
  }).then(function() {
    return hdpSaveHDPConfig(hdpConfig);
  }).catch(function(err) {
    console.error('[HDP] Lovelace save failed:', err);
    return hdpSaveHDPConfig(hdpConfig);
  });
}
`;
}

/**
 * Generate the complete client-side service script.
 * Includes connection discovery + config CRUD.
 */
export function generateServiceScript(): string {
  return generateConnectionDiscoveryJS() + generateLovelaceConfigJS();
}
