import { describe, expect, it } from 'vitest';
import { generateBlueprintJS } from './blueprint-storage';

describe('blueprint storage runtime', () => {
  it('normalizes stored blueprint pages and replaces duplicates by id', () => {
    const js = generateBlueprintJS();

    expect(js).toContain('function hdpNormalizeBlueprintPages(pages)');
    expect(js).toContain('if (!Array.isArray(pages)) return [];');
    expect(js).toContain("typeof page.id !== 'string'");
    expect(js).toContain('pages = hdpNormalizeBlueprintPages(pages);');
    expect(js).toContain('pages = pages.filter(function(p) { return p.id !== page.id; });');
  });
});
