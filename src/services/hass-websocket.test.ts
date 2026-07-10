import { describe, expect, it } from 'vitest';
import { generateConnectionDiscoveryJS, generateLovelaceConfigJS } from './hass-websocket';

function createHistoryRuntime() {
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild: () => {} },
    createElement: () => ({
      style: { setProperty: () => {} },
      addEventListener: () => {},
      remove: () => {},
    }),
  };
  const window = {};
  return new Function(
    'document',
    'window',
    'requestAnimationFrame',
    'setTimeout',
    'console',
    `${generateConnectionDiscoveryJS()}
return {
  hdpBuildEnvironmentSeries: hdpBuildEnvironmentSeries,
  hdpRenderEnvironmentCharts: hdpRenderEnvironmentCharts,
  hdpFormatEnvironmentSource: hdpFormatEnvironmentSource,
  hdpBuildSparkline: hdpBuildSparkline,
  hdpNormalizeEnvironmentValue: hdpNormalizeEnvironmentValue,
  hdpShouldConvertFahrenheit: hdpShouldConvertFahrenheit,
  hdpIsTemperatureUnit: hdpIsTemperatureUnit,
  hdpNormalizeHistoryByEntity: hdpNormalizeHistoryByEntity,
  hdpParseHistoryTimestamp: hdpParseHistoryTimestamp,
  hdpParseDomainScope: hdpParseDomainScope,
  hdpCollectDomainEntities: hdpCollectDomainEntities,
  hdpRenderDomainEntityList: hdpRenderDomainEntityList,
  hdpFormatDomainState: hdpFormatDomainState,
  hdpDomainLabel: hdpDomainLabel
};`,
  )(
    document,
    window,
    () => {},
    () => {},
    console,
  ) as {
    hdpBuildEnvironmentSeries: (hass: any, sensors: any[], history: any) => any[];
    hdpRenderEnvironmentCharts: (series: any[], metric: string, sensors: any[]) => string;
    hdpFormatEnvironmentSource: (area: Record<string, unknown>) => string;
    hdpBuildSparkline: (values: Array<number | null>, min: number, max: number) => string;
    hdpNormalizeEnvironmentValue: (raw: unknown, sensor: Record<string, unknown>) => number;
    hdpShouldConvertFahrenheit: (value: number, unit: string) => boolean;
    hdpIsTemperatureUnit: (unit: string) => boolean;
    hdpNormalizeHistoryByEntity: (history: any, sensors: any[]) => Record<string, any[]>;
    hdpParseHistoryTimestamp: (point: Record<string, unknown>) => number;
    hdpParseDomainScope: (domainKey: string, deviceClass?: string) => { key: string; domain: string; device_class: string };
    hdpCollectDomainEntities: (hass: any, domainKey: string, deviceClass?: string) => any[];
    hdpRenderDomainEntityList: (entities: any[], domain: string) => string;
    hdpFormatDomainState: (state: string, domain: string, unit?: string, deviceClass?: string) => string;
    hdpDomainLabel: (domain: string) => string;
  };
}

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
    expect(js).toContain('function hdpSetCoverPosition(entityId, position)');
    expect(js).toContain("hass.callService('cover', 'set_cover_position', { entity_id: entityId, position: value });");
    expect(js).toContain("if (action === 'cover-position')");
    expect(js).toContain("hdpCoverAction(entityId, action.replace('cover-', ''));");
    expect(js).toContain("document.addEventListener('change'");
    expect(js).toContain("hdpClosestFromEvent(e, '[data-action=\"cover-position\"][data-entity]')");
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
    expect(js).toContain('significant_changes_only: false');
    expect(js).toContain('function hdpBuildEnvironmentSeries');
    expect(js).toContain('if (!hdpRuntimeEntityVisible(hass, entityId, filters)) return;');
    expect(js).toContain('function hdpNormalizeEnvironmentValue(raw, sensor)');
    expect(js).toContain('function hdpShouldConvertFahrenheit(value, unit)');
    expect(js).toContain('function hdpIsTemperatureUnit(unit)');
    expect(js).toContain("unit: metric === 'humidity' ? (unit || '%') : '°C'");
    expect(js).toContain('hdpIsTemperatureUnit(unit)');
    expect(js).toContain('function hdpNormalizeHistoryByEntity(history, sensors)');
    expect(js).toContain('history = hdpUnwrapHistoryResult(history);');
    expect(js).toContain('function hdpUnwrapHistoryResult(value)');
    expect(js).toContain('if (!entityId && sensors[index]) entityId = sensors[index].entity_id;');
    expect(js).toContain('else if (value && Array.isArray(value.points)) byEntity[entityId] = value.points;');
    expect(js).toContain('point.state != null ? point.state : point.s');
    expect(js).toContain('function hdpParseHistoryTimestamp(point)');
    expect(js).toContain("point.last_changed || point.last_updated || point.lastChanged || point.lastUpdated");
    expect(js).toContain("if (typeof raw === 'number') return raw > 1000000000000 ? raw : raw * 1000;");
    expect(js).toContain('function hdpReadCurrentSensorValue(hass, sensor)');
    expect(js).toContain('if (index === 23 && !isNaN(currentValue)) return;');
    expect(js).toContain('function hdpFormatEnvironmentSource(area)');
    expect(js).toContain('hdp-env-chart-source');
    expect(js).toContain('function hdpBuildSparkline');
    expect(js).toContain('hdp-env-sparkline--single');
    expect(js).toContain('hdp-env-sparkline-guide');
    expect(js).toContain('hdp-env-sparkline-point');
    expect(js).toContain('window.hdpShowEnvironmentHistory = hdpShowEnvironmentHistory;');
  });

  it('builds environment series from wrapped HA history responses', () => {
    const runtime = createHistoryRuntime();
    const timestampSeconds = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
    const hass = {
      states: {
        'sensor.living_temperature': { state: '22.8', attributes: {} },
      },
    };
    const sensors = [{
      entity_id: 'sensor.living_temperature',
      area_id: 'living',
      area_name: 'Living',
      unit: 'C',
    }];
    const history = {
      success: true,
      result: [[{ entity_id: 'sensor.living_temperature', s: '21.5', lu: timestampSeconds }]],
    };

    const normalized = runtime.hdpNormalizeHistoryByEntity(history, sensors);
    expect(normalized['sensor.living_temperature']).toHaveLength(1);

    const series = runtime.hdpBuildEnvironmentSeries(hass, sensors, history);
    expect(series).toHaveLength(1);
    expect(series[0].area_name).toBe('Living');
    expect(series[0].values.some((value: number | null) => value === 21.5)).toBe(true);
  });

  it('falls back to current sensor state when history points are unusable', () => {
    const runtime = createHistoryRuntime();
    const hass = {
      states: {
        'sensor.bedroom_humidity': { state: '48', attributes: {} },
      },
    };
    const sensors = [{
      entity_id: 'sensor.bedroom_humidity',
      area_id: 'bedroom',
      area_name: 'Bedroom',
      unit: '%',
    }];

    const series = runtime.hdpBuildEnvironmentSeries(hass, sensors, {
      result: [[{ entity_id: 'sensor.bedroom_humidity', s: 'unknown', lu: null }]],
    });

    expect(series).toHaveLength(1);
    expect(series[0].values[23]).toBe(48);
  });

  it('uses current sensor state as the latest bucket anchor', () => {
    const runtime = createHistoryRuntime();
    const timestampSeconds = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
    const hass = {
      states: {
        'sensor.living_temperature': { state: '22.8', attributes: {} },
      },
    };
    const sensors = [{
      entity_id: 'sensor.living_temperature',
      area_id: 'living',
      area_name: 'Living',
      unit: 'C',
    }];

    const series = runtime.hdpBuildEnvironmentSeries(hass, sensors, {
      result: [[{ entity_id: 'sensor.living_temperature', s: '19.1', lu: timestampSeconds }]],
    });

    expect(series).toHaveLength(1);
    expect(series[0].values[23]).toBe(22.8);
    expect(series[0].values).not.toContain(19.1);
  });

  it('normalizes Fahrenheit temperature sensors to Celsius', () => {
    const runtime = createHistoryRuntime();
    const timestampSeconds = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);
    const hass = {
      states: {
        'sensor.living_temperature': { state: '72', attributes: {} },
      },
    };
    const sensors = [{
      entity_id: 'sensor.living_temperature',
      area_id: 'living',
      area_name: 'Living',
      metric: 'temperature',
      source_unit: '°F',
      unit: '°C',
    }];

    const series = runtime.hdpBuildEnvironmentSeries(hass, sensors, {
      result: [[{ entity_id: 'sensor.living_temperature', s: '68', lu: timestampSeconds }]],
    });

    expect(series).toHaveLength(1);
    expect(series[0].unit).toBe('°C');
    expect(series[0].values).toContain(20);
    expect(series[0].values[23]).toBe(22.2);

    const html = runtime.hdpRenderEnvironmentCharts(series, 'temperature', sensors);
    expect(html).toContain('22.2°C');
    expect(html).not.toContain('72°C');
  });

  it('corrects obvious Fahrenheit values mislabeled as Celsius', () => {
    const runtime = createHistoryRuntime();
    const sensor = { metric: 'temperature', source_unit: '°C' };

    expect(runtime.hdpShouldConvertFahrenheit(72, '°C')).toBe(true);
    expect(runtime.hdpNormalizeEnvironmentValue('72', sensor)).toBe(22.2);
    expect(runtime.hdpNormalizeEnvironmentValue('22', sensor)).toBe(22);
    expect(runtime.hdpIsTemperatureUnit('fahrenheit')).toBe(true);
    expect(runtime.hdpIsTemperatureUnit('F')).toBe(true);
  });

  it('reports environment chart source metadata for grouped sensors', () => {
    const runtime = createHistoryRuntime();
    const nowSeconds = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);
    const hass = {
      states: {
        'sensor.living_temperature_a': { state: '22.8', attributes: {} },
        'sensor.living_temperature_b': { state: '23.2', attributes: {} },
      },
    };
    const sensors = [
      { entity_id: 'sensor.living_temperature_a', area_id: 'living', area_name: 'Living', unit: 'C' },
      { entity_id: 'sensor.living_temperature_b', area_id: 'living', area_name: 'Living', unit: 'C' },
    ];
    const history = {
      result: [
        [{ entity_id: 'sensor.living_temperature_a', s: '21.5', lu: nowSeconds }],
        [{ entity_id: 'sensor.living_temperature_b', s: '22.5', lu: nowSeconds }],
      ],
    };

    const series = runtime.hdpBuildEnvironmentSeries(hass, sensors, history);
    expect(series).toHaveLength(1);
    expect(series[0].sensor_count).toBe(2);
    expect(series[0].sample_count).toBe(2);
    expect(series[0].current_only).toBe(false);
    expect(runtime.hdpFormatEnvironmentSource(series[0])).toBe('2 个传感器 · 2 个历史点');

    const html = runtime.hdpRenderEnvironmentCharts(series, 'temperature', sensors);
    expect(html).toContain('hdp-env-chart-source');
    expect(html).toContain('2 个传感器 · 2 个历史点');
  });

  it('labels current-only environment charts', () => {
    const runtime = createHistoryRuntime();
    const area = { sensor_count: 1, sample_count: 0, current_only: true };

    expect(runtime.hdpFormatEnvironmentSource(area)).toBe('1 个传感器 · 仅当前值');
  });

  it('renders single-point environment charts as a point marker', () => {
    const runtime = createHistoryRuntime();
    const values: Array<number | null> = [...Array.from({ length: 23 }, () => null), 48];
    const sparkline = runtime.hdpBuildSparkline(values, 48, 48);

    expect(sparkline).toContain('hdp-env-sparkline--single');
    expect(sparkline).toContain('hdp-env-sparkline-guide');
    expect(sparkline).toContain('hdp-env-sparkline-point');
    expect(sparkline).toContain('<circle');
    expect(sparkline).not.toContain('hdp-env-sparkline-fill');
  });

  it('parses both second and millisecond history timestamps', () => {
    const runtime = createHistoryRuntime();
    const milliseconds = Date.now() - 30 * 60 * 1000;
    const seconds = Math.floor(milliseconds / 1000);

    expect(runtime.hdpParseHistoryTimestamp({ lu: seconds })).toBe(seconds * 1000);
    expect(runtime.hdpParseHistoryTimestamp({ last_changed_ts: milliseconds })).toBe(milliseconds);
    expect(runtime.hdpParseHistoryTimestamp({ lastChanged: String(seconds) })).toBe(seconds * 1000);
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
    expect(js).toContain("'--hdp-radius', '--hdp-radius-sm', '--hdp-radius-lg', '--hdp-radius-pill'");
    expect(js).toContain("'--hdp-shadow-card', '--hdp-shadow-elevated', '--hdp-card-gap', '--hdp-font'");
    expect(js).toContain("'--hdp-motion-fast', '--hdp-motion-base', '--hdp-motion-easing'");
    expect(js).toContain('font-family:var(--hdp-font,inherit)');
    expect(js).toContain('.hdp-env-history-modal *{box-sizing:border-box}');
    expect(js).toContain('background:var(--hdp-modal-bg,var(--hdp-bg,#fff))');
    expect(js).toContain('background:var(--hdp-surface-card,var(--hdp-card-bg,#fff))');
    expect(js).toContain('.hdp-env-history-head>div{min-width:0}');
    expect(js).toContain('.hdp-env-history-title{font:inherit;font-size:18px;font-weight:800;color:var(--hdp-text,#111);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}');
    expect(js).toContain('.hdp-env-history-close:focus-visible{outline:2px solid var(--hdp-primary,#4f6ef7);outline-offset:2px}');
    expect(js).toContain('.hdp-domain-modal-row:focus-visible{outline:2px solid var(--hdp-primary,#4f6ef7);outline-offset:2px}');
    expect(js).toContain('max-width:min(180px,38vw);overflow:hidden;text-overflow:ellipsis');
    expect(js).toContain('.hdp-domain-modal-state{grid-column:2;justify-self:start;max-width:100%}');
    expect(js).toContain("window.hdpOpenDeviceDomainModal = hdpOpenDeviceDomainModal;");
    expect(js).toContain('window.hdpShowDeviceDomain = function(domain)');
    expect(js).toContain('hdpOpenDeviceDomainModal(domain);');
    expect(js).toContain('function hdpParseDomainScope(domainKey, deviceClass)');
    expect(js).toContain('function hdpCollectDomainEntities(hass, domainKey, deviceClass)');
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
    expect(js).toContain('unit: attrs.unit_of_measurement == null ?');
    expect(js).toContain('device_class: attrs.device_class == null ?');
    expect(js).toContain("function hdpFormatDomainState(state, domain, unit, deviceClass)");
    expect(js).toContain("if (deviceClass === 'temperature' || hdpIsTemperatureUnit(unit))");
    expect(js).toContain("return celsius + ' °C';");
    expect(js).toContain("if (scope.device_class && String(attrs.device_class || '').toLowerCase() !== scope.device_class) return;");
    expect(js).toContain('if (a.available !== b.available) return a.available ? -1 : 1;');
    expect(js).toContain('hdp-domain-modal-row--unavailable');
    expect(js).toContain('@media (max-width:520px)');
    expect(js).toContain('function hdpOpenAutomationConfig()');
    expect(js).toContain("src=\"/config/automation/dashboard\"");
    expect(js).toContain('function hdpCloseRuntimeModal(overlay)');
    expect(js).toContain('function hdpBindRuntimeModalEscClose()');
    expect(js).toContain('document.removeEventListener(\'keydown\', hdpCloseRuntimeModalOnEsc);');
    expect(js).toContain('document.addEventListener(\'keydown\', hdpCloseRuntimeModalOnEsc);');
    expect(js).toContain('function hdpCloseRuntimeModalOnEsc(e)');
    expect(js).toContain("if (e.key !== 'Escape') return;");
    expect(js).toContain("'hdp-env-history-modal', 'hdp-automation-config-modal', 'hdp-device-domain-modal'");
    expect(js).not.toContain("document.addEventListener('keydown', hdpCloseEnvironmentHistoryOnEsc, { once: true })");
    expect(js).toContain('hdpBindRuntimeModalEscClose();');
    expect(js).toContain("new CustomEvent('hass-more-info'");
  });

  it('keeps binary sensor status badge popups scoped to their device class', () => {
    const runtime = createHistoryRuntime();
    const hass = {
      states: {
        'binary_sensor.living_motion': {
          state: 'on',
          attributes: { friendly_name: 'Living Motion', device_class: 'motion' },
        },
        'binary_sensor.front_door': {
          state: 'on',
          attributes: { friendly_name: 'Front Door', device_class: 'door' },
        },
        'binary_sensor.bedroom_motion': {
          state: 'off',
          attributes: { friendly_name: 'Bedroom Motion', device_class: 'motion' },
        },
      },
      areas: {},
      devices: {},
      entities: {},
    };

    const scope = runtime.hdpParseDomainScope('binary_sensor.motion');
    const rows = runtime.hdpCollectDomainEntities(hass, 'binary_sensor.motion');

    expect(scope).toEqual({ key: 'binary_sensor.motion', domain: 'binary_sensor', device_class: 'motion' });
    expect(runtime.hdpDomainLabel('binary_sensor.motion')).toBe('人体感应');
    expect(rows.map(row => row.entity_id)).toEqual(['binary_sensor.living_motion', 'binary_sensor.bedroom_motion']);
    expect(rows.some(row => row.entity_id === 'binary_sensor.front_door')).toBe(false);
  });

  it('shows sensor units in status badge popup rows', () => {
    const runtime = createHistoryRuntime();
    const hass = {
      states: {
        'sensor.living_temperature': {
          state: '22.5',
          attributes: { friendly_name: 'Living Temperature', device_class: 'temperature', unit_of_measurement: '°C' },
        },
        'sensor.bedroom_temperature': {
          state: '72',
          attributes: { friendly_name: 'Bedroom Temperature', device_class: 'temperature', unit_of_measurement: '°F' },
        },
        'sensor.study_temperature': {
          state: '86',
          attributes: { friendly_name: 'Study Temperature', device_class: 'temperature' },
        },
        'sensor.plain_counter': {
          state: '12',
          attributes: { friendly_name: 'Plain Counter' },
        },
      },
      areas: {},
      devices: {},
      entities: {},
    };

    const rows = runtime.hdpCollectDomainEntities(hass, 'sensor');
    const html = runtime.hdpRenderDomainEntityList(rows, 'sensor');
    const living = rows.find(row => row.entity_id === 'sensor.living_temperature');
    const bedroom = rows.find(row => row.entity_id === 'sensor.bedroom_temperature');

    expect(living.unit).toBe('°C');
    expect(bedroom.unit).toBe('°F');
    expect(runtime.hdpFormatDomainState('22.5', 'sensor', '°C', 'temperature')).toBe('22.5 °C');
    expect(runtime.hdpFormatDomainState('72', 'sensor', '°F', 'temperature')).toBe('22.2 °C');
    expect(runtime.hdpFormatDomainState('86', 'sensor', '', 'temperature')).toBe('30 °C');
    expect(runtime.hdpFormatDomainState('12', 'sensor', '')).toBe('12');
    expect(html).toContain('22.5 °C');
    expect(html).toContain('22.2 °C');
    expect(html).toContain('30 °C');
    expect(html).not.toContain('72 °F');
  });
});
