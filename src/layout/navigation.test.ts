import { describe, expect, it } from 'vitest';
import { buildNavigationScript } from './navigation';

describe('dashboard navigation script', () => {
  it('initializes without adding history and preserves a non-home native default', () => {
    const js = buildNavigationScript('devices');

    expect(js).toContain('var initialView = params.get(\'hdp_area\') || "devices";');
    expect(js).toContain('if (viewId === "devices")');
    expect(js).toContain('hdpShowView(initialView, true);');
    expect(js).toContain('window.history.pushState');
  });
});
