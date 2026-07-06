import { describe, expect, it } from 'vitest';
import { generateLovelaceConfigJS } from './hass-websocket';

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
});
