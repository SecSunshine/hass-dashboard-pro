import { describe, expect, it } from 'vitest';
import { buildNavigationScript } from './navigation';

describe('dashboard navigation script', () => {
  it('initializes without adding history and preserves a non-home native default', () => {
    const js = buildNavigationScript('devices');

    expect(js).toContain('var initialView = params.get(\'hdp_area\') || "devices";');
    expect(js).toContain('if (viewId === "devices")');
    expect(js).toContain('window.hdpShowView(initialView, true);');
    expect(js).toContain('window.history.pushState');
  });

  it('delegates sidebar and bottom navigation actions from the dashboard root', () => {
    const rootListeners: Record<string, Array<(event: any) => void>> = {};
    const windowListeners: Record<string, Array<(event: any) => void>> = {};
    const documentListeners: Record<string, Array<(event: any) => void>> = {};
    const sheet = { style: { display: 'block' } };
    const root = {
      classList: { contains: () => false, toggle: () => {} },
      style: { setProperty: () => {} },
      setAttribute: () => {},
      getBoundingClientRect: () => ({ top: 0 }),
      contains: () => true,
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        (rootListeners[type] ||= []).push(listener);
      },
    };
    const documentStub = {
      fullscreenElement: null,
      getElementById: (id: string) => id === 'hdp-root' ? root : id === 'hdp-sheet' ? sheet : null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        (documentListeners[type] ||= []).push(listener);
      },
    };
    const windowStub: Record<string, any> = {
      innerHeight: 900,
      innerWidth: 1400,
      location: { search: '', href: 'http://localhost/dashboard' },
      history: { pushState: () => {} },
      addEventListener: (type: string, listener: (event: any) => void) => {
        (windowListeners[type] ||= []).push(listener);
      },
      dispatchEvent: () => {},
    };

    new Function(
      'window',
      'document',
      'localStorage',
      'URL',
      'URLSearchParams',
      'CustomEvent',
      buildNavigationScript(),
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      URL,
      URLSearchParams,
      function CustomEventStub() {},
    );

    const calls: string[] = [];
    windowStub.hdpShowView = (view: string) => calls.push(`view:${view}`);
    windowStub.hdpCloseSheet = () => calls.push('close-sheet');
    windowStub.hdpToggleSheet = () => calls.push('toggle-sheet');
    windowStub.hdpToggleHAMenu = () => calls.push('ha-menu');
    windowStub.hdpToggleDashboardFullscreen = () => calls.push('fullscreen');

    const click = (attributes: Record<string, string>) => {
      const control = { getAttribute: (name: string) => attributes[name] || null };
      rootListeners.click[0]({
        target: { closest: () => control },
        preventDefault: () => {},
      });
    };
    click({ 'data-action': 'show-view', 'data-view': 'living', 'data-close-sheet': 'true' });
    click({ 'data-action': 'toggle-bottom-sheet' });
    click({ 'data-action': 'toggle-ha-menu' });
    click({ 'data-action': 'toggle-dashboard-fullscreen' });

    expect(calls).toEqual(['view:living', 'close-sheet', 'toggle-sheet', 'ha-menu', 'fullscreen']);
  });

  it('enters dashboard fullscreen before browser fullscreen and exits both', async () => {
    const classes = new Set<string>();
    const documentListeners: Record<string, Array<(event: any) => void>> = {};
    const hint = { textContent: '点击全屏仪表盘' };
    const buttonAttrs: Record<string, string> = {};
    const button = {
      setAttribute: (name: string, value: string) => { buttonAttrs[name] = value; },
      querySelector: (selector: string) => selector === '.sb-profile-hint' ? hint : null,
    };
    let requestCount = 0;
    let exitCount = 0;
    let rejectFullscreenRequest = false;
    const root: any = {
      classList: {
        contains: (name: string) => classes.has(name),
        toggle: (name: string, force?: boolean) => {
          const enabled = force == null ? !classes.has(name) : force;
          if (enabled) classes.add(name); else classes.delete(name);
        },
      },
      style: { setProperty: () => {} },
      setAttribute: () => {},
      getBoundingClientRect: () => ({ top: 0 }),
      contains: () => true,
      querySelectorAll: (selector: string) => selector === '[data-action="toggle-dashboard-fullscreen"]' ? [button] : [],
      querySelector: () => null,
      addEventListener: () => {},
      requestFullscreen: () => {
        requestCount += 1;
        return rejectFullscreenRequest ? Promise.reject(new Error('fullscreen denied')) : Promise.resolve();
      },
    };
    const documentStub: any = {
      fullscreenElement: null,
      getElementById: (id: string) => id === 'hdp-root' ? root : null,
      addEventListener: (type: string, listener: (event: any) => void) => {
        (documentListeners[type] ||= []).push(listener);
      },
      exitFullscreen: () => {
        exitCount += 1;
        documentStub.fullscreenElement = null;
        return Promise.resolve();
      },
    };
    const windowStub: Record<string, any> = {
      innerHeight: 900,
      innerWidth: 1400,
      location: { search: '', href: 'http://localhost/dashboard' },
      history: { pushState: () => {} },
      addEventListener: () => {},
      dispatchEvent: () => {},
    };

    new Function(
      'window',
      'document',
      'localStorage',
      'URL',
      'URLSearchParams',
      'CustomEvent',
      buildNavigationScript(),
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      URL,
      URLSearchParams,
      function CustomEventStub() {},
    );

    windowStub.hdpToggleDashboardFullscreen();
    expect(classes.has('hdp-root--fullscreen')).toBe(true);
    expect(requestCount).toBe(0);
    expect(buttonAttrs['aria-pressed']).toBe('true');
    expect(hint.textContent).toBe('再次点击浏览器全屏');

    windowStub.hdpToggleDashboardFullscreen();
    expect(requestCount).toBe(1);
    documentStub.fullscreenElement = root;
    documentListeners.fullscreenchange[0]({});
    expect(hint.textContent).toBe('再次点击退出全屏');

    windowStub.hdpToggleDashboardFullscreen();
    await Promise.resolve();
    expect(exitCount).toBe(1);
    expect(classes.has('hdp-root--fullscreen')).toBe(false);
    expect(buttonAttrs['aria-pressed']).toBe('false');
    expect(hint.textContent).toBe('点击全屏仪表盘');

    windowStub.hdpToggleDashboardFullscreen();
    documentListeners.keydown[0]({ key: 'Escape' });
    expect(classes.has('hdp-root--fullscreen')).toBe(false);

    rejectFullscreenRequest = true;
    windowStub.hdpToggleDashboardFullscreen();
    windowStub.hdpToggleDashboardFullscreen();
    await Promise.resolve();
    await Promise.resolve();
    expect(requestCount).toBe(2);
    expect(classes.has('hdp-root--fullscreen')).toBe(true);
    expect(hint.textContent).toBe('再次点击退出全屏');

    windowStub.hdpToggleDashboardFullscreen();
    expect(requestCount).toBe(2);
    expect(classes.has('hdp-root--fullscreen')).toBe(false);
    expect(buttonAttrs['aria-pressed']).toBe('false');
  });
});
