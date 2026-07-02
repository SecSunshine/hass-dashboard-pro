import { describe, expect, it } from 'vitest';
import { safeBlueprintViewId, safeDomIdSegment } from './dom-id';
import { generateBlueprintModalJS } from '../blueprints/blueprint-gallery';

describe('dom id helpers', () => {
  it('normalizes unsafe page ids consistently', () => {
    expect(safeDomIdSegment('Living Room/<script>alert(1)</script>')).toBe('Living-Room-script-alert-1-script-');
    expect(safeBlueprintViewId('Living Room/<script>alert(1)</script>')).toBe('bp-Living-Room-script-alert-1-script-');
  });

  it('uses the same blueprint view helper in runtime import flows', () => {
    const js = generateBlueprintModalJS();
    expect(js).toContain("return 'bp-' + hdpSafeDomIdSegment(id);");
    expect(js).toContain('hdpShowBlueprintView(page.id)');
    expect(js).toContain('hdpEscapeHTML(inp.name || key)');
    expect(js).toContain('hdpEscapeAttribute(val)');
  });
});
