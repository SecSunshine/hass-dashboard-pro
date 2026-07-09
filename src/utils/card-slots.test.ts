import { describe, expect, it } from 'vitest';
import type { StrategyConfig } from '../types';
import { generateCardSlotEditorJS, getCardSlotCSS, resolveSlottedCard, sortSlottedCards } from './card-slots';

describe('card slots', () => {
  it('wraps default cards with stable slot metadata', () => {
    const card = resolveSlottedCard({ type: 'custom:hass-dashboard-pro' }, 'home.summary', '<div>Default</div>', 'md', 2);

    expect(card.slotId).toBe('home.summary');
    expect(card.size).toBe('md');
    expect(card.order).toBe(2);
    expect(card.custom).toBe(false);
    expect(card.hidden).toBe(false);
    expect(card.html).toContain('data-card-slot="home.summary"');
    expect(card.html).toContain('<div>Default</div>');
  });

  it('honors hidden, size and order slot settings', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.summary': { enabled: false, size: 'wide', order: 9 },
          },
        },
      } as any,
    };

    const card = resolveSlottedCard(config, 'home.summary', '<div>Default</div>', 'md', 2);
    expect(card.hidden).toBe(true);
    expect(card.html).toBe('');
    expect(card.size).toBe('wide');
    expect(card.order).toBe(9);
  });

  it('renders safe custom html-pro-card YAML and preserves declarative bindings', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.summary': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <section class="custom-card" data-entity="light.kitchen" data-action="toggle">Custom</section>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const card = resolveSlottedCard(config, 'home.summary', '<div>Default</div>', 'md');
    expect(card.custom).toBe(true);
    expect(card.html).toContain('data-card-custom="true"');
    expect(card.html).toContain('class="custom-card"');
    expect(card.html).toContain('data-entity="light.kitchen"');
    expect(card.html).toContain('data-action="toggle"');
    expect(card.html).not.toContain('<div>Default</div>');
  });

  it('sanitizes unsafe custom YAML content before rendering', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.summary': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <div onclick="alert(1)" style="background-image:url(javascript:alert(1))">',
                '    <script>alert(1)</script>',
                '    <img src="javascript:alert(1)" onerror="alert(1)">',
                '  </div>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const card = resolveSlottedCard(config, 'home.summary', '<div>Default</div>', 'md');
    expect(card.html).not.toContain('<script>');
    expect(card.html).not.toContain('onclick="alert');
    expect(card.html).not.toContain('onerror=');
    expect(card.html).not.toContain('javascript:');
  });

  it('falls back to the default card when custom YAML is invalid or unsupported', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.summary': {
              yaml: 'type: entities\nentities:\n  - light.kitchen',
            },
          },
        },
      } as any,
    };

    const card = resolveSlottedCard(config, 'home.summary', '<div>Default</div>', 'md');
    expect(card.custom).toBe(false);
    expect(card.html).toContain('自定义卡片解析失败');
    expect(card.html).toContain('<div>Default</div>');
  });

  it('filters unsafe background URLs and marks image theme slots', () => {
    const unsafe = resolveSlottedCard({
      type: 'custom:hass-dashboard-pro',
      hdp_config: { cards: { slots: { 'home.summary': { background_image_url: 'javascript:alert(1)' } } } } as any,
    }, 'home.summary', '<div>Default</div>', 'md');
    const safe = resolveSlottedCard({
      type: 'custom:hass-dashboard-pro',
      hdp_config: { cards: { slots: { 'home.summary': { background_image_url: '/local/bg.jpg', theme_from_image: true } } } } as any,
    }, 'home.summary', '<div>Default</div>', 'md');

    expect(unsafe.html).not.toContain('javascript:alert');
    expect(unsafe.html).not.toContain('hdp-card-slot--image');
    expect(safe.html).toContain('hdp-card-slot--image');
    expect(safe.html).toContain('hdp-card-slot--theme-image');
    expect(safe.html).toContain('--hdp-slot-bg-image: url(/local/bg.jpg)');
  });

  it('sorts visible slots by order then slot id', () => {
    const cards = sortSlottedCards([
      { slotId: 'home.c', html: '', size: 'md', order: 2, hidden: false, custom: false },
      { slotId: 'home.a', html: '', size: 'md', order: 1, hidden: false, custom: false },
      { slotId: 'home.b', html: '', size: 'md', order: 1, hidden: false, custom: false },
      { slotId: 'home.hidden', html: '', size: 'md', order: 0, hidden: true, custom: false },
    ]);

    expect(cards.map(card => card.slotId)).toEqual(['home.a', 'home.b', 'home.c']);
  });

  it('emits editor CSS and JS for draft-only editing and image theme extraction', () => {
    const css = getCardSlotCSS();
    const js = generateCardSlotEditorJS();

    expect(css).toContain('.hdp-root--card-edit .hdp-view[data-view="home"] .hdp-slot-edit-panel');
    expect(css).toContain('.hdp-bento--dragging');
    expect(css).toContain('.hdp-card-slot--draft-hidden');
    expect(css).toContain('.hdp-card-slot--theme-ready');
    expect(js).toContain('window.hdpToggleCardEditMode = function');
    expect(js).toContain('function hdpInitCardSlotDragging');
    expect(js).toContain("root.addEventListener('dragstart'");
    expect(js).toContain("root.addEventListener('drop'");
    expect(js).toContain('function hdpPersistHomeSlotDomOrder');
    expect(js).toContain('window.hdpOpenHiddenCardSlots = function');
    expect(js).toContain('window.hdpSaveCardEdits = function');
    expect(js).toContain('window.hdpCancelCardEdits = function');
    expect(js).toContain('function hdpApplyCardSlotImageThemes');
    expect(js).toContain('new Image()');
    expect(js).toContain("if (typeof window.hdpCommitSettings === 'function')");
    expect(js).toContain("if (typeof window.hdpCancelSettings === 'function')");
  });
});
