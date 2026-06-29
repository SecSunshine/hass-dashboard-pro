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
  var ha = document.querySelector('home-assistant');
  if (ha && ha.hass) return ha.hass;
  var els = document.querySelectorAll('*');
  for (var i = 0; i < els.length; i++) {
    if (els[i].hass && typeof els[i].hass.callApi === 'function') {
      return els[i].hass;
    }
  }
  return null;
}
`;
}

/**
 * Generate client-side JS for Lovelace config read/write.
 * Depends on hdpFindHassConnection() being defined first.
 */
export function generateLovelaceConfigJS(): string {
  return `
function hdpGetCurrentUrlPath() {
  var path = window.location.pathname;
  // Extract dashboard path: /lovelace/my-dashboard -> my-dashboard
  var parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? '/' + parts.slice(1).join('/') : path;
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
    // Deep merge
    var merged = Object.assign({}, existing, data);
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
  return conn.sendMessagePromise({
    type: 'lovelace/config',
    url_path: urlPath,
    force: false
  }).then(function(lovelaceConfig) {
    var strategy = lovelaceConfig.strategy || {};
    strategy.hdp_config = hdpConfig;
    return conn.sendMessagePromise({
      type: 'lovelace/config/save',
      url_path: urlPath,
      config: Object.assign({}, lovelaceConfig, { strategy: strategy })
    });
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
