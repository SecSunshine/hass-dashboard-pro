import { describe, expect, it } from 'vitest';
import { generateStorageJS } from './storage';

describe('storage runtime script', () => {
  it('loads local config on top of defaults', () => {
    const js = generateStorageJS();

    expect(js).toContain('var defaults = {"dashboard"');
    expect(js).toContain('return hdpDeepMerge(defaults, parsed);');
    expect(js).toContain('return defaults;');
  });
});
