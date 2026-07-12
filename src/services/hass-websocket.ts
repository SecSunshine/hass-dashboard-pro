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
  toast.className = 'hdp-toast hdp-toast--' + (type === 'error' || type === 'success' ? type : 'info');
  toast.style.cssText = hdpToastStyle(type);
  hdpApplyThemeVarsToOverlay(toast);
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

function hdpToastStyle(type) {
  var bg = type === 'error'
    ? 'var(--hdp-danger,var(--error-color,#ef4444))'
    : type === 'success'
      ? 'var(--hdp-success,var(--success-color,#22c55e))'
      : 'var(--hdp-surface-raised,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color))))';
  var color = type === 'info'
    ? 'var(--hdp-text,var(--primary-text-color,CanvasText))'
    : 'var(--hdp-text-inverse,var(--primary-background-color,Canvas))';
  var border = type === 'info'
    ? '1px solid var(--hdp-border,var(--divider-color,color-mix(in srgb,var(--hdp-text,CanvasText) 16%,transparent)))'
    : '1px solid color-mix(in srgb, ' + bg + ' 72%, Canvas 28%)';
  return 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' + bg +
    ';color:' + color + ';border:' + border + ';padding:12px 24px;border-radius:var(--hdp-radius,10px);' +
    'font:inherit;font-size:14px;font-weight:700;z-index:999999;box-shadow:var(--hdp-shadow-elevated,0 8px 28px color-mix(in srgb,var(--hdp-text,CanvasText) 18%,transparent));' +
    'opacity:0;transition:opacity 0.3s ease,transform 0.3s ease;max-width:min(90vw,520px);text-align:center;';
}

function hdpApplyThemeVarsToOverlay(overlay) {
  var root = document.getElementById('hdp-root');
  if (!overlay || !root || !window.getComputedStyle) return;
  var styles = window.getComputedStyle(root);
  [
    '--hdp-bg', '--hdp-card-bg', '--hdp-surface-card', '--hdp-surface-muted',
    '--hdp-surface-raised', '--hdp-control-bg', '--hdp-control-bg-hover',
    '--hdp-modal-bg', '--hdp-overlay-bg', '--hdp-text', '--hdp-text-inverse', '--hdp-text-secondary',
    '--hdp-text-muted', '--hdp-border', '--hdp-primary', '--hdp-primary-light',
    '--hdp-success', '--hdp-success-light', '--hdp-info', '--hdp-info-light',
    '--hdp-warning', '--hdp-warning-light', '--hdp-danger', '--hdp-danger-light',
    '--hdp-radius', '--hdp-radius-sm', '--hdp-radius-lg', '--hdp-radius-pill',
    '--hdp-shadow-card', '--hdp-shadow-elevated', '--hdp-card-gap', '--hdp-font',
    '--hdp-motion-fast', '--hdp-motion-base', '--hdp-motion-easing'
  ].forEach(function(name) {
    var value = styles.getPropertyValue(name);
    if (value) overlay.style.setProperty(name, value);
  });
}

function hdpCallEntityService(hass, domain, service, data, entityId, errorMessage, options) {
  options = options || {};
  function onSuccess() {
    if (options.pulse !== false) hdpPulseCard(entityId);
  }
  function onFailure(err) {
    if (options.silent) return;
    console.error('[HDP] Service call failed:', err);
    hdpShowToast(errorMessage, 'error');
  }
  try {
    var result = hass.callService(domain, service, data);
    if (result && typeof result.then === 'function') {
      result.then(onSuccess).catch(onFailure);
      return;
    }
    onSuccess();
  } catch(e) {
    onFailure(e);
  }
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
      hdpCallEntityService(hass, 'climate', service, { entity_id: entityId, hvac_mode: targetMode }, entityId, '\u7a7a\u8c03\u6a21\u5f0f\u5207\u6362\u5931\u8d25');
    } else {
      hdpCallEntityService(hass, 'climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: 'off' }, entityId, '\u7a7a\u8c03\u6a21\u5f0f\u5207\u6362\u5931\u8d25');
    }
    // Service feedback is applied after the asynchronous call succeeds.
    return;
  } else if (domain === 'button' || domain === 'input_button') {
    service = 'press';
  }
  hdpCallEntityService(hass, domain, service, { entity_id: entityId }, entityId, '\u8bbe\u5907\u63a7\u5236\u5931\u8d25');
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
  hdpCallEntityService(hass, 'climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: mode }, entityId, '\u7a7a\u8c03\u6a21\u5f0f\u5207\u6362\u5931\u8d25');
}

function hdpSetClimateTemp(entityId, delta, minTemp, maxTemp) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var stateObj = hass.states[entityId];
  if (!stateObj) return;
  var current = parseFloat(stateObj.attributes && stateObj.attributes.temperature);
  var step = parseFloat(delta);
  var min = minTemp == null ? null : parseFloat(minTemp);
  var max = maxTemp == null ? null : parseFloat(maxTemp);
  if (isNaN(current)) current = 24;
  if (isNaN(step)) step = 0;
  var newTemp = Math.round((current + step) * 2) / 2; // round to 0.5
  if (!isNaN(min) && newTemp < min) newTemp = min;
  if (!isNaN(max) && newTemp > max) newTemp = max;
  hdpCallEntityService(hass, 'climate', 'set_temperature', { entity_id: entityId, temperature: newTemp }, entityId, '\u6e29\u5ea6\u8c03\u8282\u5931\u8d25');
}

function hdpSetClimateFanMode(entityId, fanMode) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  hdpCallEntityService(hass, 'climate', 'set_fan_mode', { entity_id: entityId, fan_mode: fanMode }, entityId, '\u98ce\u901f\u5207\u6362\u5931\u8d25');
}

// ── Cover Controls ──
function hdpCoverAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var serviceMap = { open: 'open_cover', close: 'close_cover', stop: 'stop_cover' };
  var tiltServiceMap = { open: 'open_cover_tilt', close: 'close_cover_tilt', stop: 'stop_cover_tilt' };
  var standardService = serviceMap[action] || 'stop_cover';
  var tiltService = tiltServiceMap[action] || 'stop_cover_tilt';
  var supported = hdpCoverSupportedFeatures(hass, entityId);
  var preferTilt =
    (action === 'open' && !hdpCoverSupports(supported, 1) && hdpCoverSupports(supported, 16)) ||
    (action === 'close' && !hdpCoverSupports(supported, 2) && hdpCoverSupports(supported, 32)) ||
    (action === 'stop' && !hdpCoverSupports(supported, 8) && hdpCoverSupports(supported, 64));
  hdpCallCoverService(hass, entityId, preferTilt ? tiltService : standardService, preferTilt ? standardService : tiltService);
}

function hdpSetCoverPosition(entityId, position) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var value = Math.round(parseFloat(position));
  if (isNaN(value)) return;
  value = Math.max(0, Math.min(100, value));
  var supported = hdpCoverSupportedFeatures(hass, entityId);
  var preferTilt = !hdpCoverSupports(supported, 4) && hdpCoverSupports(supported, 128);
  hdpCallCoverService(
    hass,
    entityId,
    preferTilt ? 'set_cover_tilt_position' : 'set_cover_position',
    preferTilt ? 'set_cover_position' : 'set_cover_tilt_position',
    preferTilt ? { entity_id: entityId, tilt_position: value } : { entity_id: entityId, position: value },
    preferTilt ? { entity_id: entityId, position: value } : { entity_id: entityId, tilt_position: value }
  );
}

// Cover feature helpers: supports standard and tilt-only blinds/curtains.
function hdpCoverSupportedFeatures(hass, entityId) {
  var stateObj = hass && hass.states && hass.states[entityId];
  var raw = stateObj && stateObj.attributes && stateObj.attributes.supported_features;
  var supported = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return isNaN(supported) ? 0 : supported;
}

function hdpCoverSupports(supported, flag) {
  return (supported & flag) === flag;
}

function hdpCallCoverService(hass, entityId, service, fallbackService, data, fallbackData) {
  var payload = data || { entity_id: entityId };
  var fallbackPayload = fallbackData || { entity_id: entityId };
  try {
    var result = hass.callService('cover', service, payload);
    if (result && typeof result.catch === 'function' && fallbackService && fallbackService !== service) {
      result.catch(function() {
        return hass.callService('cover', fallbackService, fallbackPayload);
      }).then(function() {
        hdpPulseCard(entityId);
      }).catch(function() {
        hdpShowToast('窗帘控制失败', 'error');
      });
      return;
    }
    hdpPulseCard(entityId);
  } catch(e) {
    if (fallbackService && fallbackService !== service) {
      try {
        hass.callService('cover', fallbackService, fallbackPayload);
        hdpPulseCard(entityId);
        return;
      } catch(fallbackErr) {}
    }
    hdpShowToast('窗帘控制失败', 'error');
  }
}

// ── Lock Controls ──
function hdpLockAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  hdpCallEntityService(hass, 'lock', action, { entity_id: entityId }, entityId, '\u95e8\u9501\u63a7\u5236\u5931\u8d25');
}

// ── Media Player Controls ──
function hdpMediaAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var serviceMap = { play_pause: 'media_play_pause', next: 'media_next_track', previous: 'media_previous_track' };
  var service = serviceMap[action] || 'media_play_pause';
  hdpCallEntityService(hass, 'media_player', service, { entity_id: entityId }, entityId, '\u5a92\u4f53\u63a7\u5236\u5931\u8d25');
}

function hdpSetMediaVolume(entityId, volumeLevel) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) return;
  var v = parseFloat(volumeLevel);
  if (isNaN(v)) return;
  v = Math.max(0, Math.min(1, v));
  hdpCallEntityService(hass, 'media_player', 'volume_set', { entity_id: entityId, volume_level: v }, entityId, '', { pulse: false, silent: true });
}

// ── Vacuum Controls ──
function hdpVacuumAction(entityId, action) {
  var hass = hdpFindHass();
  if (!hass || !hass.callService) { hdpShowToast('无法连接到 Home Assistant', 'error'); return; }
  var serviceMap = { start: 'start', pause: 'pause', dock: 'return_to_base' };
  var service = serviceMap[action] || 'start';
  hdpCallEntityService(hass, 'vacuum', service, { entity_id: entityId }, entityId, '\u626b\u5730\u673a\u63a7\u5236\u5931\u8d25');
}

// ── Environment History ──
var hdpEnvironmentHistoryRequestId = 0;

function hdpShowEnvironmentHistory(metric) {
  metric = metric === 'humidity' ? 'humidity' : 'temperature';
  var hass = hdpFindHass();
  var connection = hdpFindHassConnection();
  if (!hass || !hass.states || !hdpHasHistoryTransport(hass, connection)) {
    hdpShowToast('无法读取 Home Assistant 历史数据', 'error');
    return;
  }

  var sensors = hdpFindEnvironmentSensors(hass, metric);
  if (!sensors.length) {
    hdpShowToast(metric === 'humidity' ? '未找到湿度传感器' : '未找到温度传感器', 'error');
    return;
  }

  var requestId = ++hdpEnvironmentHistoryRequestId;
  hdpOpenEnvironmentHistoryModal(metric, sensors, null, true, requestId);
  var end = new Date();
  var start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  hdpFetchEnvironmentHistory(hass, connection, hdpBuildEnvironmentHistoryRequest(start, end, sensors)).then(function(history) {
    if (!hdpIsEnvironmentHistoryRequestCurrent(requestId)) return;
    hdpOpenEnvironmentHistoryModal(metric, sensors, hdpBuildEnvironmentSeries(hass, sensors, history), false, requestId);
  }).catch(function(err) {
    if (!hdpIsEnvironmentHistoryRequestCurrent(requestId)) return;
    console.warn('[HDP] Failed to load environment history', err);
    hdpShowToast('历史曲线加载失败', 'error');
    hdpOpenEnvironmentHistoryModal(metric, sensors, hdpBuildEnvironmentSeries(hass, sensors, null), false, requestId);
  });
}

window.hdpShowEnvironmentHistory = hdpShowEnvironmentHistory;

function hdpHasHistoryTransport(hass, connection) {
  return !!((hass && typeof hass.callWS === 'function') || (connection && typeof connection.sendMessagePromise === 'function'));
}

function hdpBuildEnvironmentHistoryRequest(start, end, sensors) {
  return {
    type: 'history/history_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    entity_ids: sensors.map(function(sensor) { return sensor.entity_id; }),
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false
  };
}

function hdpFetchEnvironmentHistory(hass, connection, message) {
  if (hass && typeof hass.callWS === 'function') return hass.callWS(message);
  if (connection && typeof connection.sendMessagePromise === 'function') return connection.sendMessagePromise(message);
  return Promise.reject(new Error('No Home Assistant history transport available'));
}

function hdpFindEnvironmentSensors(hass, metric) {
  var result = [];
  var filters = hdpGetRuntimeDashboardFilters();
  Object.keys(hass.states || {}).forEach(function(entityId) {
    if (entityId.indexOf('sensor.') !== 0) return;
    if (!hdpRuntimeEntityVisible(hass, entityId, filters)) return;
    var stateObj = hass.states[entityId];
    if (!stateObj || !stateObj.attributes) return;
    var attrs = stateObj.attributes;
    var deviceClass = attrs.device_class || '';
    var unit = attrs.unit_of_measurement || '';
    var lowerId = entityId.toLowerCase();
    var isMetric = metric === 'humidity'
      ? (deviceClass === 'humidity' || unit === '%' || lowerId.indexOf('humidity') >= 0 || lowerId.indexOf('humid') >= 0)
      : (deviceClass === 'temperature' || hdpIsTemperatureUnit(unit) || lowerId.indexOf('temperature') >= 0 || lowerId.indexOf('temp') >= 0);
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
      metric: metric,
      source_unit: unit,
      unit: metric === 'humidity' ? (unit || '%') : '°C'
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
    id: areaId || '__unassigned',
    name: area && area.name ? area.name : (areaId || '未分配区域')
  };
}

function hdpGetRuntimeDashboardFilters() {
  var root = document.getElementById('hdp-root');
  var raw = root && root.getAttribute('data-dashboard-filters');
  var parsed = {};
  if (raw) {
    try { parsed = JSON.parse(raw); } catch(e) { parsed = {}; }
  }
  return {
    hiddenAreas: hdpCleanRuntimeList(parsed.hiddenAreas || parsed.hidden_areas),
    hiddenDomains: hdpCleanRuntimeList(parsed.hiddenDomains || parsed.hidden_domains),
    hideUnavailable: parsed.hideUnavailable === true || parsed.hide_unavailable === true,
    hiddenDeviceTypes: hdpCleanRuntimeList(parsed.hiddenDeviceTypes || parsed.hidden_device_types),
    hiddenKeywords: hdpCleanRuntimeList(parsed.hiddenKeywords || parsed.hidden_keywords),
    visibleKeywords: hdpCleanRuntimeList(parsed.visibleKeywords || parsed.visible_keywords)
  };
}

function hdpCleanRuntimeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(function(item) { return String(item || '').trim().toLowerCase(); })
    .filter(function(item) { return item.length > 0; });
}

function hdpRuntimeEntityVisible(hass, entityId, filters) {
  var stateObj = hass.states && hass.states[entityId];
  if (!stateObj) return false;
  var domain = entityId.split('.')[0];
  if (filters.hiddenDomains.indexOf(domain.toLowerCase()) >= 0) return false;
  var registry = hass.entities && hass.entities[entityId];
  if (registry && (registry.disabled_by || registry.hidden_by)) return false;
  var state = String(stateObj.state == null ? 'unknown' : stateObj.state);
  if (filters.hideUnavailable && !hdpIsDomainEntityAvailable(state)) return false;
  var deviceType = hdpGetRuntimeEntityDeviceType(entityId, stateObj.attributes || {});
  if (filters.hiddenDeviceTypes.indexOf(deviceType.toLowerCase()) >= 0) return false;
  var area = hdpResolveEntityArea(hass, entityId);
  if (filters.hiddenAreas.indexOf(String(area.id || '').toLowerCase()) >= 0) return false;
  return hdpMatchesRuntimeKeywordVisibility(hass, entityId, area, deviceType, filters);
}

function hdpGetRuntimeEntityDeviceType(entityId, attrs) {
  var domain = entityId.split('.')[0];
  var deviceClass = attrs && attrs.device_class;
  return typeof deviceClass === 'string' && deviceClass ? domain + '.' + deviceClass : domain;
}

function hdpMatchesRuntimeKeywordVisibility(hass, entityId, area, deviceType, filters) {
  if (!filters.visibleKeywords.length && !filters.hiddenKeywords.length) return true;
  var stateObj = hass.states && hass.states[entityId];
  var registry = hass.entities && hass.entities[entityId];
  var device = registry && registry.device_id && hass.devices ? hass.devices[registry.device_id] : null;
  var values = [
    entityId,
    stateObj && stateObj.attributes && stateObj.attributes.friendly_name,
    registry && registry.name_by_user,
    registry && registry.name,
    registry && registry.original_name,
    device && device.name_by_user,
    device && device.name,
    area && area.name,
    deviceType
  ];
  var haystack = values.filter(function(value) {
    return typeof value === 'string' && value.length > 0;
  }).join(' ').toLowerCase();
  if (filters.visibleKeywords.length && !filters.visibleKeywords.some(function(keyword) { return haystack.indexOf(keyword) >= 0; })) return false;
  if (filters.hiddenKeywords.some(function(keyword) { return haystack.indexOf(keyword) >= 0; })) return false;
  return true;
}

function hdpBuildEnvironmentSeries(hass, sensors, history) {
  var byEntity = hdpNormalizeHistoryByEntity(history, sensors);

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
        sensor_ids: {},
        sample_count: 0,
        buckets: buckets.map(function(bucket) { return { time: bucket.time, values: [] }; })
      };
    }
    areas[sensor.area_id].sensor_ids[sensor.entity_id] = true;
    var points = byEntity[sensor.entity_id];
    var currentValue = hdpReadCurrentSensorValue(hass, sensor);
    if (!Array.isArray(points) || !points.length) {
      if (!isNaN(currentValue)) areas[sensor.area_id].buckets[23].values.push(currentValue);
      return;
    }
    points.forEach(function(point) {
      var value = hdpNormalizeEnvironmentValue(point.state != null ? point.state : point.s, sensor);
      var changed = hdpParseHistoryTimestamp(point);
      if (isNaN(value) || isNaN(changed)) return;
      var index = Math.max(0, Math.min(23, Math.floor((changed - start) / (60 * 60 * 1000))));
      areas[sensor.area_id].sample_count += 1;
      if (index === 23 && !isNaN(currentValue)) return;
      areas[sensor.area_id].buckets[index].values.push(value);
    });
    if (!isNaN(currentValue)) {
      areas[sensor.area_id].buckets[23].values.push(currentValue);
    }
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
      values: values,
      sensor_count: Object.keys(area.sensor_ids).length,
      sample_count: area.sample_count,
      current_only: area.sample_count === 0
    };
  }).filter(function(area) {
    return area.values.some(function(value) { return value != null; });
  }).sort(function(a, b) {
    return a.area_name.localeCompare(b.area_name);
  });
}

function hdpReadCurrentSensorValue(hass, sensor) {
  var stateObj = hass.states && hass.states[sensor.entity_id];
  return stateObj ? hdpNormalizeEnvironmentValue(stateObj.state, sensor) : NaN;
}

function hdpNormalizeEnvironmentValue(raw, sensor) {
  var value = parseFloat(raw);
  if (isNaN(value)) return NaN;
  if (!sensor || sensor.metric !== 'temperature') return value;
  if (hdpShouldConvertFahrenheit(value, sensor.source_unit)) {
    return Math.round(((value - 32) * 5 / 9) * 10) / 10;
  }
  return value;
}

function hdpShouldConvertFahrenheit(value, unit) {
  var normalizedUnit = String(unit || '').trim().toLowerCase();
  if (normalizedUnit === '°f' || normalizedUnit === 'f' || normalizedUnit === 'fahrenheit' || normalizedUnit === '℉') return true;
  if ((normalizedUnit === '°c' || normalizedUnit === 'c' || normalizedUnit === 'celsius' || normalizedUnit === '') && value > 60 && value < 140) return true;
  return false;
}

function hdpIsTemperatureUnit(unit) {
  var normalizedUnit = String(unit || '').trim().toLowerCase();
  return normalizedUnit === '°c' || normalizedUnit === 'c' || normalizedUnit === 'celsius' ||
    normalizedUnit === '°f' || normalizedUnit === 'f' || normalizedUnit === 'fahrenheit' || normalizedUnit === '℃' || normalizedUnit === '℉';
}

function hdpNormalizeHistoryByEntity(history, sensors) {
  var byEntity = {};
  history = hdpUnwrapHistoryResult(history);
  if (Array.isArray(history)) {
    history.forEach(function(item, index) {
      item = hdpUnwrapHistoryResult(item);
      if (item && !Array.isArray(item) && typeof item === 'object') {
        var entityKeys = Object.keys(item).filter(function(key) { return Array.isArray(item[key]); });
        if (entityKeys.length && !Array.isArray(item.states) && !Array.isArray(item.history) && !Array.isArray(item.points)) {
          entityKeys.forEach(function(entityId) { byEntity[entityId] = item[entityId]; });
          return;
        }
      }
      var points = Array.isArray(item) ? item : (item && (item.states || item.history || item.points));
      if (!Array.isArray(points) || !points.length) return;
      var first = points[0];
      var entityId = first && (first.entity_id || first.entityId);
      if (!entityId && item && !Array.isArray(item)) entityId = item.entity_id || item.entityId;
      if (!entityId && sensors[index]) entityId = sensors[index].entity_id;
      if (entityId) byEntity[entityId] = points;
    });
  } else if (history && typeof history === 'object') {
    Object.keys(history).forEach(function(entityId) {
      var value = history[entityId];
      if (Array.isArray(value)) byEntity[entityId] = value;
      else if (value && Array.isArray(value.states)) byEntity[entityId] = value.states;
      else if (value && Array.isArray(value.history)) byEntity[entityId] = value.history;
      else if (value && Array.isArray(value.points)) byEntity[entityId] = value.points;
    });
  }
  return byEntity;
}

function hdpUnwrapHistoryResult(value) {
  var current = value;
  for (var i = 0; i < 3; i++) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    if (current.result != null) {
      current = current.result;
      continue;
    }
    if (current.data != null) {
      current = current.data;
      continue;
    }
    return current;
  }
  return current;
}

function hdpParseHistoryTimestamp(point) {
  var raw = point.last_changed || point.last_updated || point.lastChanged || point.lastUpdated ||
    point.last_changed_ts || point.last_updated_ts || point.last_changed_timestamp || point.last_updated_timestamp ||
    point.time || point.ts || point.t;
  if (raw == null) raw = point.lc != null ? point.lc : point.lu;
  if (raw == null) return NaN;
  if (typeof raw === 'number') return raw > 1000000000000 ? raw : raw * 1000;
  if (typeof raw === 'string' && /^\\d+(\\.\\d+)?$/.test(raw)) {
    var parsed = parseFloat(raw);
    return parsed > 1000000000000 ? parsed : parsed * 1000;
  }
  return Date.parse(raw);
}

function hdpOpenEnvironmentHistoryModal(metric, sensors, series, loading, requestId) {
  hdpCloseOtherRuntimeModals('hdp-env-history-modal');
  var existing = document.getElementById('hdp-env-history-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'hdp-env-history-modal';
  overlay.className = 'hdp-env-history-modal';
  overlay.setAttribute('data-history-request', String(requestId || hdpEnvironmentHistoryRequestId));
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
    if (e.target === overlay || e.target.closest('.hdp-env-history-close')) hdpCloseRuntimeModal(overlay);
  });
  hdpBindRuntimeModalEscClose();
  document.body.appendChild(overlay);
}

function hdpRuntimeModalIds() {
  return ['hdp-env-history-modal', 'hdp-automation-config-modal', 'hdp-device-domain-modal'];
}

function hdpCloseOtherRuntimeModals(keepId) {
  hdpRuntimeModalIds().forEach(function(id) {
    if (id === keepId) return;
    var modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'hdp-env-history-modal') hdpEnvironmentHistoryRequestId++;
    modal.remove();
  });
  document.removeEventListener('keydown', hdpCloseRuntimeModalOnEsc);
}

function hdpIsEnvironmentHistoryRequestCurrent(requestId) {
  var modal = document.getElementById('hdp-env-history-modal');
  return !!(modal && Number(modal.getAttribute('data-history-request')) === Number(requestId));
}

function hdpCloseRuntimeModal(overlay) {
  if (overlay && overlay.id === 'hdp-env-history-modal') hdpEnvironmentHistoryRequestId++;
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', hdpCloseRuntimeModalOnEsc);
}

function hdpBindRuntimeModalEscClose() {
  document.removeEventListener('keydown', hdpCloseRuntimeModalOnEsc);
  document.addEventListener('keydown', hdpCloseRuntimeModalOnEsc);
}

function hdpCloseRuntimeModalOnEsc(e) {
  if (e.key !== 'Escape') return;
  var ids = hdpRuntimeModalIds();
  for (var i = 0; i < ids.length; i++) {
    var modal = document.getElementById(ids[i]);
    if (modal) {
      hdpCloseRuntimeModal(modal);
      return;
    }
  }
  document.removeEventListener('keydown', hdpCloseRuntimeModalOnEsc);
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
    var source = hdpFormatEnvironmentSource(area);
    return '<section class="hdp-env-chart">' +
      '<div class="hdp-env-chart-top"><span>' + hdpEscapeText(area.area_name) + '</span><strong>' + hdpFormatEnvValue(latest, unit) + '</strong></div>' +
      '<div class="hdp-env-chart-source">' + hdpEscapeText(source) + '</div>' +
      hdpBuildSparkline(area.values, min, max) +
      '<div class="hdp-env-chart-meta"><span>' + hdpFormatEnvValue(min, unit) + '</span><span>24h</span><span>' + hdpFormatEnvValue(max, unit) + '</span></div>' +
    '</section>';
  }).join('');
}

function hdpFormatEnvironmentSource(area) {
  var sensorCount = area.sensor_count || 0;
  var sampleCount = area.sample_count || 0;
  var sensorText = sensorCount + ' 个传感器';
  var sampleText = sampleCount > 0 ? sampleCount + ' 个历史点' : '仅当前值';
  return sensorText + ' · ' + sampleText;
}

function hdpBuildSparkline(values, min, max) {
  var width = 320;
  var height = 96;
  var pad = 10;
  var clean = values.map(function(value, index) { return value == null ? null : { value: value, index: index }; })
    .filter(function(point) { return point; });
  if (!clean.length) return '<div class="hdp-env-sparkline hdp-env-sparkline--empty"></div>';
  if (clean.length === 1) {
    var singleX = pad + (clean[0].index / 23) * (width - pad * 2);
    var singleY = height / 2;
    return '<svg class="hdp-env-sparkline hdp-env-sparkline--single" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">' +
      '<path class="hdp-env-sparkline-guide" d="M' + pad + ' ' + singleY + ' L ' + (width - pad) + ' ' + singleY + '"></path>' +
      '<circle class="hdp-env-sparkline-point" cx="' + (Math.round(singleX * 10) / 10) + '" cy="' + singleY + '" r="5"></circle>' +
    '</svg>';
  }
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
  return '.hdp-env-history-modal{position:fixed;inset:0;z-index:1000000;background:var(--hdp-overlay-bg,color-mix(in srgb,var(--hdp-text,CanvasText) 46%,transparent));color:var(--hdp-text,var(--primary-text-color,CanvasText));font-family:var(--hdp-font,inherit);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}' +
    '.hdp-env-history-modal *{box-sizing:border-box}' +
    '.hdp-env-history-dialog{width:min(920px,96vw);max-height:min(760px,90dvh);overflow:hidden;border-radius:var(--hdp-radius-lg,18px);background:var(--hdp-modal-bg,var(--hdp-bg,var(--ha-card-background,var(--card-background-color))));color:var(--hdp-text,var(--primary-text-color,CanvasText));border:1px solid var(--hdp-border,var(--divider-color,color-mix(in srgb,var(--hdp-text,CanvasText) 8%,transparent)));box-shadow:var(--hdp-shadow-elevated,0 24px 80px color-mix(in srgb,var(--hdp-text,CanvasText) 28%,transparent));display:flex;flex-direction:column;backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%)}' +
    '.hdp-env-history-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid var(--hdp-border,color-mix(in srgb,var(--hdp-text,CanvasText) 8%,transparent));min-width:0}.hdp-env-history-head>div{min-width:0}' +
    '.hdp-env-history-title{font:inherit;font-size:18px;font-weight:800;color:var(--hdp-text,var(--primary-text-color,CanvasText));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hdp-env-history-sub{margin-top:4px;font:inherit;font-size:12px;color:var(--hdp-text-muted,var(--disabled-text-color,var(--secondary-text-color,CanvasText)));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.hdp-env-history-close{appearance:none;width:40px;height:40px;flex:0 0 auto;border-radius:999px;border:1px solid var(--hdp-border,color-mix(in srgb,var(--hdp-text,CanvasText) 8%,transparent));background:var(--hdp-control-bg,var(--hdp-surface-card,var(--hdp-card-bg)));color:var(--hdp-text,var(--primary-text-color,CanvasText));font-size:24px;line-height:1;cursor:pointer}' +
    '.hdp-env-history-close:hover{background:var(--hdp-control-bg-hover,var(--hdp-primary-light,rgba(79,110,247,.12)));border-color:var(--hdp-primary,#4f6ef7)}.hdp-env-history-close:focus-visible{outline:2px solid var(--hdp-primary,#4f6ef7);outline-offset:2px}' +
    '.hdp-env-history-body{padding:16px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}' +
    '.hdp-env-chart{min-width:0;padding:14px;border-radius:var(--hdp-radius,14px);border:1px solid var(--hdp-border,color-mix(in srgb,var(--hdp-text,CanvasText) 8%,transparent));background:var(--hdp-surface-card,var(--hdp-card-bg));box-shadow:var(--hdp-shadow-card,none)}' +
    '.hdp-env-chart-top,.hdp-env-chart-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.hdp-env-chart-top span{font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hdp-env-chart-top strong{font-size:18px}.hdp-env-chart-source{margin-top:4px;font-size:11px;color:var(--hdp-text-muted,var(--disabled-text-color,var(--secondary-text-color,CanvasText)));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hdp-env-chart-meta{font-size:11px;color:var(--hdp-text-muted,var(--disabled-text-color,var(--secondary-text-color,CanvasText)))}' +
    '.hdp-env-sparkline{width:100%;height:112px;margin:10px 0;display:block}.hdp-env-sparkline-fill{fill:var(--hdp-primary-light,color-mix(in srgb,var(--hdp-primary,#4f6ef7) 14%,transparent))}.hdp-env-sparkline-line{fill:none;stroke:var(--hdp-primary,#4f6ef7);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.hdp-env-sparkline-guide{fill:none;stroke:var(--hdp-border,color-mix(in srgb,var(--hdp-text,CanvasText) 10%,transparent));stroke-width:2;stroke-dasharray:5 6}.hdp-env-sparkline-point{fill:var(--hdp-primary,#4f6ef7);stroke:var(--hdp-surface-card,var(--hdp-card-bg));stroke-width:3}' +
    '.hdp-env-history-loading,.hdp-env-history-empty{grid-column:1/-1;padding:28px;text-align:center;color:var(--hdp-text-muted,var(--disabled-text-color,var(--secondary-text-color,CanvasText)));border:1px dashed var(--hdp-border,color-mix(in srgb,var(--hdp-text,CanvasText) 8%,transparent));border-radius:var(--hdp-radius,14px);background:var(--hdp-surface-muted,transparent)}' +
    '@media (max-width:520px){.hdp-env-history-modal{padding:10px;align-items:stretch}.hdp-env-history-dialog{width:100%;max-height:calc(100dvh - 20px)}.hdp-env-history-head{padding:14px 16px}.hdp-env-history-body{grid-template-columns:1fr;padding:12px}}';
}

function hdpOpenAutomationConfig() {
  hdpCloseOtherRuntimeModals('hdp-automation-config-modal');
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
      '.hdp-automation-config-frame{width:100%;height:100%;border:0;background:var(--hdp-bg,var(--primary-background-color,Canvas));color:var(--hdp-text,var(--primary-text-color,CanvasText))}' +
    '</style>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay || e.target.closest('.hdp-env-history-close')) hdpCloseRuntimeModal(overlay);
  });
  hdpBindRuntimeModalEscClose();
  document.body.appendChild(overlay);
}

window.hdpOpenAutomationConfig = hdpOpenAutomationConfig;

function hdpOpenDeviceDomainModal(domain) {
  var hass = hdpFindHass();
  if (!hass || !hass.states) {
    hdpShowToast('无法读取 Home Assistant 设备状态', 'error');
    return;
  }
  var scope = hdpParseDomainScope(domain);
  var entities = hdpCollectDomainEntities(hass, scope.key);
  hdpCloseOtherRuntimeModals('hdp-device-domain-modal');
  var existing = document.getElementById('hdp-device-domain-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'hdp-device-domain-modal';
  overlay.className = 'hdp-env-history-modal hdp-device-domain-modal';
  hdpApplyThemeVarsToOverlay(overlay);
  var label = hdpDomainLabel(scope.key);
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
      hdpCloseRuntimeModal(overlay);
      return;
    }
    var row = e.target.closest('[data-domain-modal-entity]');
    if (!row) return;
    hdpOpenMoreInfo(row.getAttribute('data-domain-modal-entity'));
  });
  hdpBindRuntimeModalEscClose();
  document.body.appendChild(overlay);
}

window.hdpOpenDeviceDomainModal = hdpOpenDeviceDomainModal;
window.hdpShowDeviceDomain = function(domain) {
  hdpOpenDeviceDomainModal(domain);
};

function hdpParseDomainScope(domainKey, deviceClass) {
  var raw = String(domainKey || '').toLowerCase();
  var parts = raw.split('.');
  var domain = parts[0] || '';
  var scopedDeviceClass = deviceClass || (domain === 'binary_sensor' && parts.length > 1 ? parts.slice(1).join('.') : '');
  return {
    key: scopedDeviceClass ? domain + '.' + scopedDeviceClass : domain,
    domain: domain,
    device_class: scopedDeviceClass
  };
}

function hdpCollectDomainEntities(hass, domainKey, deviceClass) {
  var scope = hdpParseDomainScope(domainKey, deviceClass);
  var rows = [];
  var filters = hdpGetRuntimeDashboardFilters();
  Object.keys(hass.states || {}).forEach(function(entityId) {
    if (entityId.split('.')[0] !== scope.domain) return;
    if (!hdpRuntimeEntityVisible(hass, entityId, filters)) return;
    var stateObj = hass.states[entityId];
    var attrs = stateObj.attributes || {};
    if (scope.device_class && String(attrs.device_class || '').toLowerCase() !== scope.device_class) return;
    var area = hdpResolveEntityArea(hass, entityId);
    var state = String(stateObj.state == null ? 'unknown' : stateObj.state);
    rows.push({
      entity_id: entityId,
      name: String(attrs.friendly_name || entityId.replace(scope.domain + '.', '').replace(/_/g, ' ')),
      state: state,
      unit: attrs.unit_of_measurement == null ? '' : String(attrs.unit_of_measurement),
      device_class: attrs.device_class == null ? '' : String(attrs.device_class),
      area_name: String(area.name || '未分配区域'),
      active: hdpIsEntityRunning(state, scope.domain),
      available: hdpIsDomainEntityAvailable(state)
    });
  });
  return rows.sort(function(a, b) {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.area_name.localeCompare(b.area_name) || a.name.localeCompare(b.name);
  });
}

function hdpIsDomainEntityAvailable(state) {
  return state !== 'unavailable' && state !== 'unknown';
}

function hdpIsEntityRunning(state, domain) {
  if (!hdpIsDomainEntityAvailable(state)) return false;
  if (domain === 'climate') return state !== 'off' && state !== 'unavailable' && state !== 'unknown';
  if (domain === 'cover') return state === 'open' || state === 'opening';
  if (domain === 'lock') return state === 'unlocked';
  if (domain === 'media_player') return state === 'playing' || state === 'on';
  return state === 'on';
}

function hdpRenderDomainEntityList(entities, domain) {
  if (!entities.length) return '<div class="hdp-env-history-empty">暂无可显示设备</div>';
  return entities.map(function(entity) {
    var rowClass = 'hdp-domain-modal-row ' +
      (entity.active ? 'hdp-domain-modal-row--active ' : '') +
      (!entity.available ? 'hdp-domain-modal-row--unavailable' : '');
    return '<button type="button" class="' + rowClass.trim() + '" data-domain-modal-entity="' + hdpEscapeText(entity.entity_id) + '">' +
      '<span class="hdp-domain-modal-dot"></span>' +
      '<span class="hdp-domain-modal-main"><strong>' + hdpEscapeText(entity.name) + '</strong><small>' + hdpEscapeText(entity.area_name) + '</small></span>' +
      '<span class="hdp-domain-modal-state">' + hdpEscapeText(hdpFormatDomainState(entity.state, domain, entity.unit, entity.device_class)) + '</span>' +
    '</button>';
  }).join('');
}

function hdpOpenMoreInfo(entityId) {
  var event = new CustomEvent('hass-more-info', {
    bubbles: true,
    composed: true,
    detail: { entityId: entityId }
  });
  var target = document.querySelector('home-assistant') || document.querySelector('hui-root') || document.body;
  if (target && target.dispatchEvent) target.dispatchEvent(event);
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
    camera: '摄像头', vacuum: '扫地机', button: '按钮',
    'binary_sensor.window': '窗户', 'binary_sensor.door': '门',
    'binary_sensor.motion': '人体感应', 'binary_sensor.smoke': '烟雾',
    'binary_sensor.moisture': '漏水'
  };
  return labels[domain] || domain;
}

function hdpFormatDomainState(state, domain, unit, deviceClass) {
  if ((domain === 'sensor' || domain === 'number') && hdpIsDomainEntityAvailable(state)) {
    if (deviceClass === 'temperature' || hdpIsTemperatureUnit(unit)) {
      var celsius = hdpNormalizeEnvironmentValue(state, { metric: 'temperature', source_unit: unit });
      if (!isNaN(celsius)) return celsius + ' °C';
    }
    if (!unit) return state;
    return state + ' ' + unit;
  }
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
    '.hdp-domain-modal-row{appearance:none;width:100%;min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--hdp-radius,14px);border:1px solid var(--hdp-border,color-mix(in srgb,var(--hdp-text,CanvasText) 8%,transparent));background:var(--hdp-surface-card,var(--hdp-card-bg));color:var(--hdp-text,var(--primary-text-color,CanvasText));text-align:left;font:inherit;cursor:pointer;box-shadow:var(--hdp-shadow-card,none);transition:all .2s ease}' +
    '.hdp-domain-modal-row:hover{background:var(--hdp-surface-raised,var(--hdp-card-bg));border-color:var(--hdp-primary,#4f6ef7);transform:translateY(-1px)}.hdp-domain-modal-row:focus-visible{outline:2px solid var(--hdp-primary,#4f6ef7);outline-offset:2px}' +
    '.hdp-domain-modal-dot{width:10px;height:10px;border-radius:999px;background:var(--hdp-text-muted,#94a3b8)}' +
    '.hdp-domain-modal-row--active .hdp-domain-modal-dot{background:var(--hdp-success,#22c55e);box-shadow:0 0 0 4px var(--hdp-success-light,rgba(34,197,94,.14))}' +
    '.hdp-domain-modal-row--unavailable{opacity:.62}.hdp-domain-modal-row--unavailable .hdp-domain-modal-dot{background:var(--hdp-danger,#ef4444)}' +
    '.hdp-domain-modal-main{min-width:0;display:grid;gap:2px}.hdp-domain-modal-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.hdp-domain-modal-main small{color:var(--hdp-text-muted,#64748b);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.hdp-domain-modal-state{font-size:12px;font-weight:800;color:var(--hdp-primary,#4f6ef7);background:var(--hdp-primary-light,rgba(79,110,247,.12));border-radius:999px;padding:5px 10px;white-space:nowrap;max-width:min(180px,38vw);overflow:hidden;text-overflow:ellipsis}' +
    '@media (max-width:520px){.hdp-device-domain-dialog{width:100%}.hdp-domain-modal-row{grid-template-columns:auto minmax(0,1fr);align-items:start}.hdp-domain-modal-state{grid-column:2;justify-self:start;max-width:100%}}';
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

  if (action === 'more-info') {
    hdpOpenMoreInfo(entityId);
    return true;
  }
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
  if (action === 'cover-position' || action === 'media-volume') return false;
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

function hdpHandleDashboardAction(control) {
  if (!control || !control.getAttribute) return false;
  var action = control.getAttribute('data-action') || '';
  if (action === 'show-device-domain') {
    var domain = control.getAttribute('data-domain') || '';
    if (!domain || typeof window.hdpShowDeviceDomain !== 'function') return false;
    window.hdpShowDeviceDomain(domain);
    return true;
  }
  if (action === 'scroll-domain') {
    var targetDomain = control.getAttribute('data-domain') || '';
    if (!targetDomain || typeof window.hdpScrollToDomain !== 'function') return false;
    window.hdpScrollToDomain(targetDomain);
    return true;
  }
  if (action === 'show-environment-history') {
    if (typeof window.hdpShowEnvironmentHistory !== 'function') return false;
    window.hdpShowEnvironmentHistory(control.getAttribute('data-metric') || 'temperature');
    return true;
  }
  if (action === 'open-automation-config') {
    if (typeof window.hdpOpenAutomationConfig !== 'function') return false;
    window.hdpOpenAutomationConfig();
    return true;
  }
  return false;
}

function hdpInitEntityClickHandlers() {
  if (window.hdpEntityClickHandlersInitialized) return;
  window.hdpEntityClickHandlersInitialized = true;

  // Event delegation on the main content area
  document.addEventListener('click', function(e) {
    var dashboardControl = hdpClosestFromEvent(e, '[data-action]');
    if (hdpHandleDashboardAction(dashboardControl)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    var domainControl = hdpClosestFromEvent(e, '[data-action][data-entity]');
    if (domainControl && hdpHandleDomainControl(domainControl)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (domainControl) {
      var deferredAction = domainControl.getAttribute('data-action') || '';
      if (deferredAction === 'cover-position' || deferredAction === 'media-volume') {
        e.stopPropagation();
        return;
      }
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
  document.addEventListener('change', function(e) {
    var control = hdpClosestFromEvent(e, '[data-action="cover-position"][data-entity]');
    if (!control) return;
    hdpSetCoverPosition(control.getAttribute('data-entity'), control.value);
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

function hdpSaveHDPConfig(data, pendingSync) {
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
    localStorage.setItem('hdp_config_pending_sync', pendingSync ? 'true' : 'false');
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
    return hdpSaveHDPConfig(hdpConfig, true).then(function() {
      throw new Error('No Home Assistant connection');
    });
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
    return hdpSaveHDPConfig(hdpConfig, false);
  }).catch(function(err) {
    console.error('[HDP] Lovelace save failed:', err);
    return hdpSaveHDPConfig(hdpConfig, true).then(function() {
      throw err;
    });
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
