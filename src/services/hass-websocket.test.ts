import { describe, expect, it } from 'vitest';
import { generateConnectionDiscoveryJS, generateLovelaceConfigJS } from './hass-websocket';

describe('hass websocket script', () => {
  it('saves Lovelace config against the dashboard path instead of the active view', () => {
    const js = generateLovelaceConfigJS();

    expect(js).toContain('function hdpFindLovelacePanel()');
    expect(js).toContain('function hdpNormalizeLovelaceUrlPath(value)');
    expect(js).toContain("if (dashboardPath === 'lovelace') return undefined;");
    expect(js).toContain('return hdpNormalizeLovelaceUrlPath(dashboardPath);');
    expect(js).toContain("hdpLovelaceMessage('lovelace/config', urlPath");
    expect(js).toContain("hdpLovelaceMessage('lovelace/config/save', urlPath");
    expect(js).not.toContain('url_path: urlPath');
    expect(js).not.toContain("return parts.length > 1 ? '/' + parts.slice(1).join('/') : path;");
  });

  it('does not delegate-toggle clicks inside domain-specific cards', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain('function hdpHandleDomainControl(control)');
    expect(js).toContain('function hdpClosestFromEvent(e, selector)');
    expect(js).toContain("typeof e.composedPath === 'function' ? e.composedPath() : []");
    expect(js).toContain("var domainControl = hdpClosestFromEvent(e, '[data-action][data-entity]');");
    expect(js).toContain("if (domainControl && hdpClosestFromEvent(e, '[data-no-toggle]'))");
    expect(js).toContain("hdpSetClimateMode(entityId, control.getAttribute('data-mode') || 'auto');");
    expect(js).toContain('var current = parseFloat(stateObj.attributes && stateObj.attributes.temperature);');
    expect(js).toContain('var step = parseFloat(delta);');
    expect(js).toContain('if (isNaN(current)) current = 24;');
    expect(js).toContain("hdpCoverAction(entityId, action.replace('cover-', ''));");
    expect(js).toContain("}, true);");
    expect(js).toContain("if (hdpClosestFromEvent(e, '[data-no-toggle]')) return;");
  });

  it('adds keyboard activation for declarative toggle cards', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain("document.addEventListener('keydown'");
    expect(js).toContain("hdpClosestFromEvent(e, '[data-action=\"toggle\"][data-entity]')");
    expect(js).toContain('card.click();');
  });

  it('loads 24-hour environment history through the HA websocket API', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain('function hdpShowEnvironmentHistory(metric)');
    expect(js).toContain("type: 'history/history_during_period'");
    expect(js).toContain('entity_ids: sensors.map');
    expect(js).toContain("unit === '°C'");
    expect(js).toContain("unit === '°F'");
    expect(js).toContain('significant_changes_only: false');
    expect(js).toContain('function hdpBuildEnvironmentSeries');
    expect(js).toContain('if (!hdpRuntimeEntityVisible(hass, entityId, filters)) return;');
    expect(js).toContain('function hdpNormalizeHistoryByEntity(history, sensors)');
    expect(js).toContain('if (!entityId && sensors[index]) entityId = sensors[index].entity_id;');
    expect(js).toContain('else if (value && Array.isArray(value.points)) byEntity[entityId] = value.points;');
    expect(js).toContain('point.state != null ? point.state : point.s');
    expect(js).toContain('function hdpParseHistoryTimestamp(point)');
    expect(js).toContain("if (typeof raw === 'number') return raw * 1000;");
    expect(js).toContain('function hdpBuildSparkline');
    expect(js).toContain('window.hdpShowEnvironmentHistory = hdpShowEnvironmentHistory;');
  });

  it('opens themed popups for status badges and automation settings', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain('function hdpToastStyle(type)');
    expect(js).toContain("toast.className = 'hdp-toast hdp-toast--'");
    expect(js.indexOf('toast.style.cssText = hdpToastStyle(type);')).toBeLessThan(js.indexOf('hdpApplyThemeVarsToOverlay(toast);'));
    expect(js).toContain('hdpApplyThemeVarsToOverlay(toast);');
    expect(js).toContain("'var(--hdp-surface-raised,var(--hdp-card-bg,#1a1d26))'");
    expect(js).toContain('function hdpApplyThemeVarsToOverlay(overlay)');
    expect(js).toContain("'--hdp-surface-card', '--hdp-surface-muted'");
    expect(js).toContain("'--hdp-modal-bg', '--hdp-overlay-bg'");
    expect(js).toContain("'--hdp-text', '--hdp-text-inverse', '--hdp-text-secondary'");
    expect(js).toContain('background:var(--hdp-modal-bg,var(--hdp-bg,#fff))');
    expect(js).toContain('background:var(--hdp-surface-card,var(--hdp-card-bg,#fff))');
    expect(js).toContain("window.hdpOpenDeviceDomainModal = hdpOpenDeviceDomainModal;");
    expect(js).toContain('window.hdpShowDeviceDomain = function(domain)');
    expect(js).toContain('hdpOpenDeviceDomainModal(domain);');
    expect(js).toContain('function hdpCollectDomainEntities(hass, domain)');
    expect(js).toContain('var filters = hdpGetRuntimeDashboardFilters();');
    expect(js).toContain('function hdpGetRuntimeDashboardFilters()');
    expect(js).toContain("root.getAttribute('data-dashboard-filters')");
    expect(js).toContain('parsed.hiddenAreas || parsed.hidden_areas');
    expect(js).toContain('parsed.hiddenDomains || parsed.hidden_domains');
    expect(js).toContain('parsed.hideUnavailable === true || parsed.hide_unavailable === true');
    expect(js).toContain('parsed.hiddenDeviceTypes || parsed.hidden_device_types');
    expect(js).toContain('parsed.hiddenKeywords || parsed.hidden_keywords');
    expect(js).toContain('parsed.visibleKeywords || parsed.visible_keywords');
    expect(js).toContain('function hdpRuntimeEntityVisible(hass, entityId, filters)');
    expect(js).toContain("id: areaId || '__unassigned'");
    expect(js).not.toContain("id: areaId || '__unassigned__'");
    expect(js).toContain('filters.hiddenDomains.indexOf(domain.toLowerCase()) >= 0');
    expect(js).toContain('filters.hiddenDeviceTypes.indexOf(deviceType.toLowerCase()) >= 0');
    expect(js).toContain("filters.hiddenAreas.indexOf(String(area.id || '').toLowerCase()) >= 0");
    expect(js).toContain('function hdpMatchesRuntimeKeywordVisibility');
    expect(js).toContain('filters.visibleKeywords.length && !filters.visibleKeywords.some');
    expect(js).toContain('filters.hiddenKeywords.some');
    expect(js).toContain('function hdpIsDomainEntityAvailable(state)');
    expect(js).toContain('if (a.available !== b.available) return a.available ? -1 : 1;');
    expect(js).toContain('hdp-domain-modal-row--unavailable');
    expect(js).toContain('@media (max-width:520px)');
    expect(js).toContain('function hdpOpenAutomationConfig()');
    expect(js).toContain("src=\"/config/automation/dashboard\"");
    expect(js).toContain("new CustomEvent('hass-more-info'");
  });
});
