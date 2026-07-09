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
    expect(js).toContain("var domainControl = e.target.closest('[data-action][data-entity]');");
    expect(js).toContain("if (domainControl && domainControl.closest('[data-no-toggle]'))");
    expect(js).toContain("hdpSetClimateMode(entityId, control.getAttribute('data-mode') || 'auto');");
    expect(js).toContain("hdpCoverAction(entityId, action.replace('cover-', ''));");
    expect(js).toContain("if (e.target.closest('[data-no-toggle]')) return;");
  });

  it('adds keyboard activation for declarative toggle cards', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain("document.addEventListener('keydown'");
    expect(js).toContain("e.target.closest('[data-action=\"toggle\"][data-entity]')");
    expect(js).toContain('card.click();');
  });

  it('loads 24-hour environment history through the HA websocket API', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain('function hdpShowEnvironmentHistory(metric)');
    expect(js).toContain("type: 'history/history_during_period'");
    expect(js).toContain('entity_ids: sensors.map');
    expect(js).toContain('function hdpBuildEnvironmentSeries');
    expect(js).toContain('function hdpBuildSparkline');
    expect(js).toContain('window.hdpShowEnvironmentHistory = hdpShowEnvironmentHistory;');
  });
});
