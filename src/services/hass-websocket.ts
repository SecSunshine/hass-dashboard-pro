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

function hdpInitEntityClickHandlers() {
  // Event delegation on the main content area
  document.addEventListener('click', function(e) {
    // Domain-specific cards own their inner buttons and service calls.
    if (e.target.closest('[data-no-toggle]')) return;
    // Check if click is on an entity card or its toggle
    var card = e.target.closest('[data-entity]');
    if (!card) return;
    // Domain-specific cards (climate, cover, lock, etc.) have their own buttons
    if (card.hasAttribute('data-no-toggle')) return;
    var entityId = card.getAttribute('data-entity');
    if (!entityId) return;
    // Don't toggle sensors or binary_sensors
    var domain = entityId.split('.')[0];
    if (domain === 'sensor' || domain === 'binary_sensor' || domain === 'camera') return;
    hdpToggleEntity(entityId);
  });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('[data-no-toggle]')) return;
    var card = e.target.closest('[data-action="toggle"][data-entity]');
    if (!card) return;
    e.preventDefault();
    card.click();
  });
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
