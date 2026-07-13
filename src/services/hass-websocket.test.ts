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
  hdpHasHistoryTransport: hdpHasHistoryTransport,
  hdpBuildEnvironmentHistoryRequest: hdpBuildEnvironmentHistoryRequest,
  hdpFetchEnvironmentHistory: hdpFetchEnvironmentHistory,
  hdpFindEnvironmentSensors: hdpFindEnvironmentSensors,
  hdpParseDomainScope: hdpParseDomainScope,
  hdpCollectDomainEntities: hdpCollectDomainEntities,
  hdpRenderDomainEntityList: hdpRenderDomainEntityList,
  hdpFormatDomainState: hdpFormatDomainState,
  hdpDomainLabel: hdpDomainLabel,
  hdpCoverSupportedFeatures: hdpCoverSupportedFeatures,
  hdpCoverSupports: hdpCoverSupports,
  hdpCallCoverService: hdpCallCoverService
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
    hdpHasHistoryTransport: (hass: any, connection: any) => boolean;
    hdpBuildEnvironmentHistoryRequest: (start: Date, end: Date, sensors: any[]) => Record<string, unknown>;
    hdpFetchEnvironmentHistory: (hass: any, connection: any, message: Record<string, unknown>) => Promise<unknown>;
    hdpFindEnvironmentSensors: (hass: any, metric: string) => any[];
    hdpParseDomainScope: (domainKey: string, deviceClass?: string) => { key: string; domain: string; device_class: string };
    hdpCollectDomainEntities: (hass: any, domainKey: string, deviceClass?: string) => any[];
    hdpRenderDomainEntityList: (entities: any[], domain: string) => string;
    hdpFormatDomainState: (state: string, domain: string, unit?: string, deviceClass?: string) => string;
    hdpDomainLabel: (domain: string) => string;
    hdpCoverSupportedFeatures: (hass: any, entityId: string) => number;
    hdpCoverSupports: (supported: number, flag: number) => boolean;
    hdpCallCoverService: (hass: any, entityId: string, service: string, fallbackService?: string, data?: any, fallbackData?: any) => void;
  };
}

function createRuntimeModalRuntime() {
  const elements = new Map<string, any>();
  const listeners: Record<string, Array<(event: any) => void>> = {};
  const infoModalStates: boolean[] = [];
  const hass = {
    states: {
      'light.living_room': {
        state: 'on',
        attributes: { friendly_name: 'Living Room Light' },
      },
    },
    areas: {},
    devices: {},
    entities: {},
    callService: () => {},
  };
  const homeAssistant = {
    hass,
    dispatchEvent: () => { infoModalStates.push(elements.has('hdp-device-domain-modal')); },
  };
  const createElement = () => {
    const attrs: Record<string, string> = {};
    const nodeListeners: Record<string, Array<(event: any) => void>> = {};
    const node: any = {
      id: '',
      className: '',
      innerHTML: '',
      listeners: nodeListeners,
      style: { setProperty: () => {} },
      setAttribute: (name: string, value: string) => { attrs[name] = value; },
      getAttribute: (name: string) => attrs[name] ?? null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        (nodeListeners[type] ||= []).push(listener);
      },
      remove: () => { if (node.id) elements.delete(node.id); },
    };
    return node;
  };
  const document = {
    querySelector: (selector: string) => selector === 'home-assistant' ? homeAssistant : null,
    querySelectorAll: () => [],
    getElementById: (id: string) => elements.get(id) || null,
    addEventListener: (type: string, listener: (event: any) => void) => {
      (listeners[type] ||= []).push(listener);
    },
    removeEventListener: (type: string, listener: (event: any) => void) => {
      listeners[type] = (listeners[type] || []).filter(item => item !== listener);
    },
    body: {
      appendChild: (node: any) => { if (node.id) elements.set(node.id, node); },
    },
    createElement,
  };
  const window = {
    dispatchEvent: () => { infoModalStates.push(elements.has('hdp-device-domain-modal')); },
  };
  const runtime = new Function(
    'document',
    'window',
    'requestAnimationFrame',
    'setTimeout',
    'console',
    `${generateConnectionDiscoveryJS()}
return {
  openEnvironment: hdpOpenEnvironmentHistoryModal,
  openAutomation: hdpOpenAutomationConfig,
  openDevice: hdpOpenDeviceDomainModal,
  closeModal: hdpCloseRuntimeModal,
  isEnvironmentRequestCurrent: hdpIsEnvironmentHistoryRequestCurrent
};`,
  )(
    document,
    window,
    () => {},
    () => {},
    console,
  ) as {
    openEnvironment: (metric: string, sensors: any[], series: any, loading: boolean, requestId: number) => void;
    openAutomation: () => void;
    openDevice: (domain: string) => void;
    closeModal: (node: any) => void;
    isEnvironmentRequestCurrent: (requestId: number) => boolean;
  };
  return { runtime, elements, listeners, infoModalStates };
}

describe('hass websocket script', () => {
  it('generates parseable runtime JavaScript with readable control errors', () => {
    const js = generateConnectionDiscoveryJS();

    expect(() => new Function('document', 'window', 'requestAnimationFrame', 'setTimeout', 'console', js)).not.toThrow();
    expect(js).toContain("hdpShowToast('窗帘控制失败', 'error');");
    expect(js).not.toContain('绐楀笜鎺у埗澶辫触');
  });

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

  it('marks local fallbacks pending and propagates Lovelace save failures', () => {
    const js = generateLovelaceConfigJS();

    expect(js).toContain("localStorage.setItem('hdp_config_pending_sync', pendingSync ? 'true' : 'false');");
    expect(js).toContain('return hdpSaveHDPConfig(hdpConfig, false);');
    expect(js).toContain("throw new Error('No Home Assistant connection');");
    expect(js).toContain('return hdpSaveHDPConfig(hdpConfig, true).then(function() {');
    expect(js).toContain('throw err;');
  });

  it('does not delegate-toggle clicks inside domain-specific cards', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain('function hdpHandleDomainControl(control)');
    expect(js).toContain('function hdpEntityIdFromControl(control)');
    expect(js).toContain('function hdpClosestFromEvent(e, selector)');
    expect(js).toContain("typeof e.composedPath === 'function' ? e.composedPath() : []");
    expect(js).toContain('var domainControl = dashboardControl;');
    expect(js).toContain('if (domainControl && hdpHandleDomainControl(domainControl))');
    expect(js).toContain("if (action === 'more-info')");
    expect(js).toContain("hdpSetClimateMode(entityId, control.getAttribute('data-mode') || 'auto');");
    expect(js).toContain('var current = parseFloat(stateObj.attributes && stateObj.attributes.temperature);');
    expect(js).toContain('var step = parseFloat(delta);');
    expect(js).toContain('if (isNaN(current)) current = 24;');
    expect(js).toContain('function hdpSetCoverPosition(entityId, position)');
    expect(js).toContain("preferTilt ? 'set_cover_tilt_position' : 'set_cover_position'");
    expect(js).toContain("open_cover_tilt");
    expect(js).toContain("set_cover_tilt_position");
    expect(js).toContain("function hdpCoverSupportedFeatures(hass, entityId)");
    expect(js).toContain("function hdpCoverSupports(supported, flag)");
    expect(js).toContain("function hdpCallCoverService(hass, entityId, service, fallbackService, data, fallbackData)");
    expect(js).toContain("supported_features");
    expect(js).toContain("tilt_position: value");
    expect(js).toContain("if (action === 'cover-position' || action === 'media-volume') return false;");
    expect(js).toContain('hdpCoverAction(entityId, domainAction);');
    expect(js).toContain("hdpDomainActionAllowed('cover', domainAction)");
    expect(js).toContain("hdpDomainActionAllowed('lock', domainAction)");
    expect(js).toContain("hdpDomainActionAllowed('media', domainAction)");
    expect(js).toContain("hdpDomainActionAllowed('vacuum', domainAction)");
    expect(js).toContain("document.addEventListener('change'");
    expect(js).toContain("hdpClosestFromEvent(e, '[data-action=\"cover-position\"]')");
    expect(js).toContain("}, true);");
    expect(js).toContain("if (hdpClosestFromEvent(e, '[data-no-toggle]')) return;");
    expect(js).toContain('if (window.hdpEntityClickHandlersInitialized) return;');
    expect(js).toContain('if (domainControl && hdpHandleDomainControl(domainControl)) {');
    expect(js).toContain('function hdpCallEntityService(');
    expect(js).toContain('result.then(onSuccess).catch(onFailure);');
  });

  it('adds keyboard activation for declarative toggle cards', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain("document.addEventListener('keydown'");
    expect(js).toContain("hdpClosestFromEvent(e, '[data-action]')");
    expect(js).toContain('function hdpIsNativeInteractiveControl(control)');
    expect(js).toContain('if (!card || !hdpEntityIdFromControl(card) || hdpIsNativeInteractiveControl(card)) return;');
    expect(js).toContain('card.click();');
  });

  it('delegates declarative dashboard actions without inline handlers', () => {
    const listeners: Record<string, Array<(event: any) => void>> = {};
    const documentStub = {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        (listeners[type] ||= []).push(listener);
      },
      removeEventListener: () => {},
      body: { appendChild: () => {} },
      createElement: () => ({ style: { setProperty: () => {} }, addEventListener: () => {}, remove: () => {} }),
    };
    const windowStub: Record<string, any> = {};
    new Function(
      'document',
      'window',
      'requestAnimationFrame',
      'setTimeout',
      'console',
      `${generateConnectionDiscoveryJS()}\nwindow.testInitEntityClickHandlers = hdpInitEntityClickHandlers;`,
    )(documentStub, windowStub, () => {}, () => {}, console);
    windowStub.testInitEntityClickHandlers();

    const calls: string[] = [];
    windowStub.hdpShowDeviceDomain = (domain: string) => calls.push(`domain:${domain}`);
    windowStub.hdpScrollToDomain = (domain: string) => calls.push(`scroll:${domain}`);
    windowStub.hdpShowEnvironmentHistory = (metric: string) => calls.push(`history:${metric}`);
    windowStub.hdpOpenAutomationConfig = () => calls.push('automation');
    const click = (attributes: Record<string, string>) => {
      const control = { getAttribute: (name: string) => attributes[name] || null };
      listeners.click[0]({
        target: { closest: (selector: string) => selector === '[data-action]' ? control : null },
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    };
    click({ 'data-action': 'show-device-domain', 'data-domain': 'light' });
    click({ 'data-action': 'scroll-domain', 'data-domain': 'climate' });
    click({ 'data-action': 'show-environment-history', 'data-metric': 'humidity' });
    click({ 'data-action': 'open-automation-config' });

    expect(calls).toEqual(['domain:light', 'scroll:climate', 'history:humidity', 'automation']);
  });

  it('runs custom-card entity actions without requiring an internal card wrapper', () => {
    const listeners: Record<string, Array<(event: any) => void>> = {};
    const serviceCalls: Array<{ domain: string; service: string; data: Record<string, unknown> }> = [];
    const infoEvents: any[] = [];
    const homeAssistant = {
      hass: {
        states: {
          'cover.bed_blind': { attributes: { supported_features: 1 } },
        },
        callService: (domain: string, service: string, data: Record<string, unknown>) => {
          serviceCalls.push({ domain, service, data });
        },
      },
      dispatchEvent: (event: any) => { infoEvents.push(event); },
    };
    const documentStub = {
      querySelector: (selector: string) => selector === 'home-assistant' ? homeAssistant : null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        (listeners[type] ||= []).push(listener);
      },
      removeEventListener: () => {},
      body: { appendChild: () => {}, dispatchEvent: (event: any) => { infoEvents.push(event); } },
      createElement: () => ({ style: { setProperty: () => {} }, addEventListener: () => {}, remove: () => {} }),
    };
    const windowStub: Record<string, any> = {
      dispatchEvent: (event: any) => { infoEvents.push(event); },
    };
    function CustomEventStub(this: any, type: string, options: any) {
      this.type = type;
      this.detail = options.detail;
    }
    new Function(
      'document',
      'window',
      'requestAnimationFrame',
      'setTimeout',
      'console',
      'CustomEvent',
      `${generateConnectionDiscoveryJS()}\nwindow.testInitEntityClickHandlers = hdpInitEntityClickHandlers;`,
    )(documentStub, windowStub, () => {}, () => {}, console, CustomEventStub);
    windowStub.testInitEntityClickHandlers();

    const click = (attributes: Record<string, string>, ownerEntityId = '') => {
      const owner = ownerEntityId ? {
        getAttribute: (name: string) => name === 'data-entity' ? ownerEntityId : null,
        hasAttribute: () => false,
      } : null;
      const control = {
        getAttribute: (name: string) => attributes[name] || null,
        closest: (selector: string) => selector === '[data-entity]' ? (owner || control) : null,
        hasAttribute: () => false,
      };
      let prevented = false;
      let stopped = false;
      listeners.click[0]({
        target: {
          closest: (selector: string) => {
            if (selector === '[data-no-toggle]') return null;
            if (selector === '[data-action]') return control;
            if (selector === '[data-action][data-entity]') return attributes['data-entity'] ? control : null;
            if (selector === '[data-entity]') return owner || control;
            return null;
          },
        },
        preventDefault: () => { prevented = true; },
        stopPropagation: () => { stopped = true; },
      });
      return { prevented, stopped };
    };

    const moreInfo = click({ 'data-action': 'more-info', 'data-entity': 'sensor.kitchen_temperature' });
    const cover = click({ 'data-action': 'cover-open', 'data-entity': 'cover.bed_blind' });
    const nestedCover = click({ 'data-action': 'cover-close' }, 'cover.bed_blind');
    const lock = click({ 'data-action': 'lock-lock', 'data-entity': 'lock.front_door' });
    const media = click({ 'data-action': 'media-next', 'data-entity': 'media_player.living_room' });
    const vacuum = click({ 'data-action': 'vacuum-dock', 'data-entity': 'vacuum.downstairs' });
    const unsupportedActions = [
      click({ 'data-action': 'cover-delete', 'data-entity': 'cover.bed_blind' }),
      click({ 'data-action': 'lock-open', 'data-entity': 'lock.front_door' }),
      click({ 'data-action': 'media-shuffle', 'data-entity': 'media_player.living_room' }),
      click({ 'data-action': 'vacuum-clean', 'data-entity': 'vacuum.downstairs' }),
    ];
    const useRange = (action: string, entityId: string, value: string, eventType: 'change' | 'input', nested = false) => {
      const actionSelector = `[data-action="${action}"]`;
      const combinedSelector = `${actionSelector}[data-entity]`;
      const owner = nested ? {
        getAttribute: (name: string) => name === 'data-entity' ? entityId : null,
      } : null;
      const rangeControl = {
        value,
        getAttribute: (name: string) => ({
          'data-action': action,
          'data-entity': nested ? '' : entityId,
        })[name] || null,
        closest: (selector: string) => (
          selector === '[data-action]' ||
          selector === actionSelector
        ) ? rangeControl : selector === '[data-entity]'
          ? (owner || rangeControl)
          : selector === combinedSelector && !nested
            ? rangeControl
            : null,
        hasAttribute: () => false,
      };
      let prevented = false;
      let stopped = false;
      listeners.click[0]({
        target: rangeControl,
        preventDefault: () => { prevented = true; },
        stopPropagation: () => { stopped = true; },
      });
      listeners[eventType][0]({ target: rangeControl });
      return { prevented, stopped };
    };
    const coverRange = useRange('cover-position', 'cover.bed_blind', '64', 'change', true);
    const volumeRange = useRange('media-volume', 'media_player.living_room', '35', 'input', true);
    const keyboardOwner = {
      getAttribute: (name: string) => name === 'data-entity' ? 'sensor.kitchen_temperature' : null,
    };
    let keyboardClicks = 0;
    const keyboardControl = {
      tagName: 'DIV',
      getAttribute: (name: string) => name === 'data-action' ? 'more-info' : null,
      closest: (selector: string) => selector === '[data-entity]' ? keyboardOwner : null,
      click: () => {
        keyboardClicks += 1;
        click({ 'data-action': 'more-info' }, 'sensor.kitchen_temperature');
      },
    };
    let keyboardPrevented = false;
    listeners.keydown[0]({
      key: 'Enter',
      target: {
        closest: (selector: string) => {
          if (selector === '[data-no-toggle]') return null;
          if (selector === '[data-action]') return keyboardControl;
          return null;
        },
      },
      preventDefault: () => { keyboardPrevented = true; },
    });
    let nativeClicks = 0;
    const nativeControl = {
      tagName: 'BUTTON',
      getAttribute: (name: string) => name === 'data-action' ? 'more-info' : name === 'data-entity' ? 'sensor.kitchen_temperature' : null,
      closest: () => nativeControl,
      click: () => { nativeClicks += 1; },
    };
    listeners.keydown[0]({
      key: ' ',
      target: { closest: (selector: string) => selector === '[data-action]' ? nativeControl : null },
      preventDefault: () => {},
    });

    expect(moreInfo).toEqual({ prevented: true, stopped: true });
    expect(infoEvents).toHaveLength(2);
    expect(infoEvents.every(event => event.type === 'hass-more-info')).toBe(true);
    expect(infoEvents.every(event => event.detail.entityId === 'sensor.kitchen_temperature')).toBe(true);
    expect(cover).toEqual({ prevented: true, stopped: true });
    expect(nestedCover).toEqual({ prevented: true, stopped: true });
    expect([lock, media, vacuum]).toEqual(Array.from({ length: 3 }, () => ({ prevented: true, stopped: true })));
    expect(unsupportedActions).toEqual(Array.from({ length: 4 }, () => ({ prevented: true, stopped: true })));
    expect(serviceCalls).toEqual([{
      domain: 'cover',
      service: 'open_cover',
      data: { entity_id: 'cover.bed_blind' },
    }, {
      domain: 'cover',
      service: 'close_cover',
      data: { entity_id: 'cover.bed_blind' },
    }, {
      domain: 'lock',
      service: 'lock',
      data: { entity_id: 'lock.front_door' },
    }, {
      domain: 'media_player',
      service: 'media_next_track',
      data: { entity_id: 'media_player.living_room' },
    }, {
      domain: 'vacuum',
      service: 'return_to_base',
      data: { entity_id: 'vacuum.downstairs' },
    }, {
      domain: 'cover',
      service: 'set_cover_position',
      data: { entity_id: 'cover.bed_blind', position: 64 },
    }, {
      domain: 'media_player',
      service: 'volume_set',
      data: { entity_id: 'media_player.living_room', volume_level: 0.35 },
    }]);
    expect(coverRange).toEqual({ prevented: false, stopped: true });
    expect(volumeRange).toEqual({ prevented: false, stopped: true });
    expect({ keyboardClicks, keyboardPrevented, nativeClicks }).toEqual({
      keyboardClicks: 1,
      keyboardPrevented: true,
      nativeClicks: 0,
    });
  });

  it('supports tilt-only cover feature detection and fallback service calls', () => {
    const runtime = createHistoryRuntime();
    const hass = {
      states: {
        'cover.bed_blind': {
          attributes: { supported_features: 16 | 32 | 64 | 128 },
        },
      },
      callService: () => undefined,
    };

    const supported = runtime.hdpCoverSupportedFeatures(hass, 'cover.bed_blind');
    expect(runtime.hdpCoverSupports(supported, 1)).toBe(false);
    expect(runtime.hdpCoverSupports(supported, 16)).toBe(true);
    expect(runtime.hdpCoverSupports(supported, 128)).toBe(true);

    const calls: any[] = [];
    const fallbackHass = {
      callService: (domain: string, service: string, payload: Record<string, unknown>) => {
        calls.push({ domain, service, payload });
        if (service === 'set_cover_position') throw new Error('unsupported');
      },
    };
    runtime.hdpCallCoverService(
      fallbackHass,
      'cover.bed_blind',
      'set_cover_position',
      'set_cover_tilt_position',
      { entity_id: 'cover.bed_blind', position: 45 },
      { entity_id: 'cover.bed_blind', tilt_position: 45 },
    );

    expect(calls).toEqual([
      { domain: 'cover', service: 'set_cover_position', payload: { entity_id: 'cover.bed_blind', position: 45 } },
      { domain: 'cover', service: 'set_cover_tilt_position', payload: { entity_id: 'cover.bed_blind', tilt_position: 45 } },
    ]);
  });

  it('loads 24-hour environment history through the HA websocket API', () => {
    const js = generateConnectionDiscoveryJS();

    expect(js).toContain('function hdpShowEnvironmentHistory(metric)');
    expect(js).toContain("type: 'history/history_during_period'");
    expect(js).toContain('entity_ids: sensors.map');
    expect(js).toContain('significant_changes_only: false');
    expect(js).toContain('function hdpHasHistoryTransport(hass, connection)');
    expect(js).toContain("typeof hass.callWS === 'function'");
    expect(js).toContain("typeof connection.sendMessagePromise === 'function'");
    expect(js).toContain('function hdpBuildEnvironmentHistoryRequest(start, end, sensors)');
    expect(js).toContain('function hdpFetchEnvironmentHistory(hass, connection, message)');
    expect(js).toContain('if (hass && typeof hass.callWS ===');
    expect(js).toContain('return hass.callWS(message);');
    expect(js).toContain('return connection.sendMessagePromise(message);');
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

  it('prefers hass.callWS when loading environment history', async () => {
    const runtime = createHistoryRuntime();
    const start = new Date('2026-07-10T00:00:00.000Z');
    const end = new Date('2026-07-10T01:00:00.000Z');
    const sensors = [{ entity_id: 'sensor.living_temperature' }];
    const message = runtime.hdpBuildEnvironmentHistoryRequest(start, end, sensors);
    const calls: unknown[] = [];
    const hass = {
      callWS: (payload: unknown) => {
        calls.push(payload);
        return Promise.resolve({ result: 'from-callws' });
      },
    };
    const connection = {
      sendMessagePromise: () => Promise.resolve({ result: 'from-connection' }),
    };

    expect(runtime.hdpHasHistoryTransport(hass, null)).toBe(true);
    expect(message).toMatchObject({
      type: 'history/history_during_period',
      start_time: '2026-07-10T00:00:00.000Z',
      end_time: '2026-07-10T01:00:00.000Z',
      entity_ids: ['sensor.living_temperature'],
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
    await expect(runtime.hdpFetchEnvironmentHistory(hass, connection, message)).resolves.toEqual({ result: 'from-callws' });
    expect(calls).toEqual([message]);
  });

  it('falls back to connection.sendMessagePromise for environment history', async () => {
    const runtime = createHistoryRuntime();
    const message = runtime.hdpBuildEnvironmentHistoryRequest(
      new Date('2026-07-10T00:00:00.000Z'),
      new Date('2026-07-10T01:00:00.000Z'),
      [{ entity_id: 'sensor.bedroom_humidity' }],
    );
    const calls: unknown[] = [];
    const connection = {
      sendMessagePromise: (payload: unknown) => {
        calls.push(payload);
        return Promise.resolve({ result: 'from-connection' });
      },
    };

    expect(runtime.hdpHasHistoryTransport({}, connection)).toBe(true);
    await expect(runtime.hdpFetchEnvironmentHistory({}, connection, message)).resolves.toEqual({ result: 'from-connection' });
    expect(calls).toEqual([message]);
  });

  it('keeps temporarily unavailable environment sensors eligible for history', () => {
    const runtime = createHistoryRuntime();
    const hass = {
      states: {
        'sensor.living_temperature': {
          state: 'unavailable',
          attributes: { friendly_name: 'Living Temperature', device_class: 'temperature', unit_of_measurement: '°C' },
        },
        'sensor.bedroom_humidity': {
          state: 'unknown',
          attributes: { friendly_name: 'Bedroom Humidity', device_class: 'humidity', unit_of_measurement: '%' },
        },
        'sensor.energy_total': {
          state: 'unavailable',
          attributes: { friendly_name: 'Energy Total', device_class: 'energy', unit_of_measurement: 'kWh' },
        },
        'sensor.living_temperature_battery': {
          state: '55',
          attributes: { friendly_name: 'Living Temperature Battery', device_class: 'battery', unit_of_measurement: '%' },
        },
        'sensor.legacy_environment': {
          state: '48',
          attributes: { friendly_name: '客厅湿度', unit_of_measurement: '%' },
        },
      },
      areas: {},
      devices: {},
      entities: {},
    };

    expect(runtime.hdpFindEnvironmentSensors(hass, 'temperature').map(sensor => sensor.entity_id)).toEqual([
      'sensor.living_temperature',
    ]);
    expect(runtime.hdpFindEnvironmentSensors(hass, 'humidity').map(sensor => sensor.entity_id).sort()).toEqual([
      'sensor.bedroom_humidity',
      'sensor.legacy_environment',
    ]);
  });

  it('builds environment series from wrapped HA history responses', () => {
    const runtime = createHistoryRuntime();
    const timestampSeconds = Math.floor((Date.now() - 90 * 60 * 1000) / 1000);
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

  it('normalizes flat and entity-wrapped history point collections', () => {
    const runtime = createHistoryRuntime();
    const earlier = Math.floor((Date.now() - 3 * 60 * 60 * 1000) / 1000);
    const later = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);
    const sensors = [{ entity_id: 'sensor.living_temperature' }];
    const flat = [
      { entity_id: 'sensor.living_temperature', state: '20.5', last_updated: earlier },
      { s: '21.5', lu: later },
    ];
    const wrapped = {
      result: {
        entity_id: 'sensor.living_temperature',
        states: flat,
      },
    };

    expect(runtime.hdpNormalizeHistoryByEntity(flat, sensors)).toEqual({
      'sensor.living_temperature': flat,
    });
    expect(runtime.hdpNormalizeHistoryByEntity(wrapped, sensors)).toEqual({
      'sensor.living_temperature': flat,
    });
  });

  it('ignores history points outside the rolling 24-hour window', () => {
    const runtime = createHistoryRuntime();
    const now = Date.now();
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
      result: [[
        { entity_id: 'sensor.living_temperature', s: '10', lu: now - 25 * 60 * 60 * 1000 },
        { entity_id: 'sensor.living_temperature', s: '21.5', lu: now - 2 * 60 * 60 * 1000 },
        { entity_id: 'sensor.living_temperature', s: '99', lu: now + 60 * 60 * 1000 },
      ]],
    };

    const series = runtime.hdpBuildEnvironmentSeries(hass, sensors, history);

    expect(series).toHaveLength(1);
    expect(series[0].sample_count).toBe(1);
    expect(series[0].values).toContain(21.5);
    expect(series[0].values).not.toContain(10);
    expect(series[0].values).not.toContain(99);
    expect(series[0].values[23]).toBe(22.8);
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
    expect(js).toContain("'var(--hdp-surface-raised,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color))))'");
    expect(js).toContain('function hdpApplyThemeVarsToOverlay(overlay)');
    expect(js).toContain("'--hdp-surface-card', '--hdp-surface-muted'");
    expect(js).toContain("'--hdp-modal-bg', '--hdp-overlay-bg'");
    expect(js).toContain("'--hdp-text', '--hdp-text-inverse', '--hdp-text-secondary'");
    expect(js).toContain("'--hdp-radius', '--hdp-radius-sm', '--hdp-radius-lg', '--hdp-radius-pill'");
    expect(js).toContain("'--hdp-shadow-card', '--hdp-shadow-elevated', '--hdp-card-gap', '--hdp-font'");
    expect(js).toContain("'--hdp-motion-fast', '--hdp-motion-base', '--hdp-motion-easing'");
    expect(js).toContain('font-family:var(--hdp-font,inherit)');
    expect(js).toContain('.hdp-env-history-modal *{box-sizing:border-box}');
    expect(js).toContain('background:var(--hdp-modal-bg,var(--hdp-bg,var(--ha-card-background,var(--card-background-color))))');
    expect(js).toContain('backdrop-filter:blur(18px) saturate(140%)');
    expect(js).toContain('-webkit-backdrop-filter:blur(18px) saturate(140%)');
    expect(js).toContain('background:var(--hdp-surface-card,var(--hdp-card-bg))');
    expect(js).toContain('.hdp-env-history-head>div{min-width:0}');
    expect(js).toContain('.hdp-env-history-title{font:inherit;font-size:18px;font-weight:800;color:var(--hdp-text,var(--primary-text-color,CanvasText));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}');
    expect(js).toContain('.hdp-env-history-close:focus-visible{outline:2px solid var(--hdp-primary,#4f6ef7);outline-offset:2px}');
    expect(js).toContain('.hdp-domain-modal-row:focus-visible{outline:2px solid var(--hdp-primary,#4f6ef7);outline-offset:2px}');
    expect(js).toContain('background:var(--hdp-surface-raised,var(--hdp-card-bg));border-color:var(--hdp-primary,#4f6ef7);transform:translateY(-1px)');
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
    expect(js).toContain('background:var(--hdp-bg,var(--primary-background-color,Canvas));color:var(--hdp-text,var(--primary-text-color,CanvasText))');
    expect(js).toContain('function hdpCloseRuntimeModal(overlay)');
    expect(js).toContain('function hdpBindRuntimeModalEscClose()');
    expect(js).toContain('document.removeEventListener(\'keydown\', hdpCloseRuntimeModalOnEsc);');
    expect(js).toContain('document.addEventListener(\'keydown\', hdpCloseRuntimeModalOnEsc);');
    expect(js).toContain('function hdpCloseRuntimeModalOnEsc(e)');
    expect(js).toContain("if (e.key !== 'Escape') return;");
    expect(js).toContain('function hdpRuntimeModalIds()');
    expect(js).toContain("return ['hdp-env-history-modal', 'hdp-automation-config-modal', 'hdp-device-domain-modal'];");
    expect(js).toContain("hdpCloseOtherRuntimeModals('hdp-automation-config-modal');");
    expect(js).toContain("hdpCloseOtherRuntimeModals('hdp-device-domain-modal');");
    expect(js).toContain('if (!hdpIsEnvironmentHistoryRequestCurrent(requestId)) return;');
    expect(js).not.toContain("document.addEventListener('keydown', hdpCloseEnvironmentHistoryOnEsc, { once: true })");
    expect(js).toContain('hdpBindRuntimeModalEscClose();');
    expect(js).toContain("new CustomEvent('hass-more-info'");
    expect(js).toContain('if (window.dispatchEvent) window.dispatchEvent(event);');
  });

  it('keeps runtime modals mutually exclusive and invalidates closed history requests', () => {
    const { runtime, elements, listeners } = createRuntimeModalRuntime();

    runtime.openEnvironment('temperature', [], null, true, 41);
    expect(elements.has('hdp-env-history-modal')).toBe(true);
    expect(runtime.isEnvironmentRequestCurrent(41)).toBe(true);

    runtime.openAutomation();
    expect(elements.has('hdp-env-history-modal')).toBe(false);
    expect(elements.has('hdp-automation-config-modal')).toBe(true);
    expect(runtime.isEnvironmentRequestCurrent(41)).toBe(false);

    runtime.openEnvironment('humidity', [], [], false, 42);
    expect(elements.has('hdp-automation-config-modal')).toBe(false);
    expect(elements.has('hdp-env-history-modal')).toBe(true);
    expect(runtime.isEnvironmentRequestCurrent(42)).toBe(true);

    listeners.keydown[0]({ key: 'Escape' });
    expect(elements.has('hdp-env-history-modal')).toBe(false);
    expect(runtime.isEnvironmentRequestCurrent(42)).toBe(false);
  });

  it('closes the status popup before opening an entity detail dialog', () => {
    const { runtime, elements, infoModalStates } = createRuntimeModalRuntime();

    runtime.openDevice('light');
    const overlay = elements.get('hdp-device-domain-modal');
    const row = {
      getAttribute: (name: string) => name === 'data-domain-modal-entity' ? 'light.living_room' : null,
    };
    overlay.listeners.click[0]({
      target: {
        closest: (selector: string) => selector === '[data-domain-modal-entity]' ? row : null,
      },
    });

    expect(elements.has('hdp-device-domain-modal')).toBe(false);
    expect(infoModalStates).toEqual([false]);
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
