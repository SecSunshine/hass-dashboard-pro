import { describe, expect, it } from 'vitest';
import type { BlueprintInstance } from '../types';
import { buildBlueprintPagesHTML } from './blueprint-page';

const configuredPage: BlueprintInstance = {
  id: 'lights',
  name: 'Lights',
  icon: 'mdi:lightbulb',
  blueprint_yaml: 'card:\n  type: custom:html-pro-card',
  inputs: {},
  card: {
    type: 'custom:html-pro-card',
    content: '<div data-entity="light.kitchen">Kitchen</div>',
  },
};

describe('blueprint page renderer', () => {
  it('renders edit controls by default', () => {
    const [{ html }] = buildBlueprintPagesHTML([configuredPage]);

    expect(html).toContain('data-action="edit-blueprint"');
    expect(html).toContain('hdpShowInputEditor');
  });

  it('omits edit controls in read-only mode for configured pages', () => {
    const [{ html }] = buildBlueprintPagesHTML([configuredPage], false);

    expect(html).not.toContain('data-action="edit-blueprint"');
    expect(html).not.toContain('hdpShowInputEditor');
    expect(html).toContain('data-entity="light.kitchen"');
  });

  it('omits configure controls in read-only mode for empty pages', () => {
    const emptyPage: BlueprintInstance = { ...configuredPage, card: { type: '' } };
    delete (emptyPage.card as Record<string, unknown>).type;
    const [{ html }] = buildBlueprintPagesHTML([emptyPage], false);

    expect(html).not.toContain('data-action="edit-blueprint"');
    expect(html).not.toContain('hdpShowInputEditor');
  });
});
