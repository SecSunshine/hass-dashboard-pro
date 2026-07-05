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

  it('returns a promise for blueprint saves so refresh can wait for Lovelace sync', () => {
    const js = generateBlueprintJS();

    expect(js).toContain('var savePromise = Promise.resolve(pages);');
    expect(js).toContain('savePromise = hdpSaveToLovelace(hdpCfg).then(function()');
    expect(js).toContain('window.hdpLastBlueprintSave = savePromise.catch(function(err)');
    expect(js).toContain('return window.hdpLastBlueprintSave;');
    expect(js).toContain('return hdpBlueprintSave(pages);');
    expect(js).toContain('hdpBlueprintAdd(page).then(function()');
  });
});
