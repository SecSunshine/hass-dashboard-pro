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
    expect(card.html).toContain('data-card-edit-action="yaml"');
    expect(card.html).toContain('data-slot-id="home.summary"');
    expect(card.html).not.toContain('onclick=');
    expect(card.html).not.toContain('onchange=');
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
    expect(card.html).toContain('自定义卡片解析失败：仅支持 type: custom:html-pro-card');
    expect(card.html).toContain('data-card-slot-error="home.summary"');
    expect(card.html).toContain('data-card-edit-action="reset"');
    expect(card.html).toContain('data-slot-id="home.summary"');
    expect(card.html).toContain('<div>Default</div>');
  });

  it('explains missing custom content and keeps a default fallback', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'home.environment': {
              yaml: 'type: custom:html-pro-card\nname: Missing content',
            },
          },
        },
      } as any,
    };

    const card = resolveSlottedCard(config, 'home.environment', '<div>Environment</div>', 'md');
    expect(card.custom).toBe(false);
    expect(card.html).toContain('自定义卡片解析失败：需要 content: | 多行内容');
    expect(card.html).toContain('恢复默认');
    expect(card.html).toContain('<div>Environment</div>');
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

  it('delegates a single-card YAML action to the matching slot', () => {
    const listeners: Record<string, Array<(event: any) => void>> = {};
    const documentStub = {
      readyState: 'loading',
      addEventListener: (type: string, listener: (event: any) => void) => {
        (listeners[type] ||= []).push(listener);
      },
    };
    const windowStub: Record<string, any> = {};
    new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      generateCardSlotEditorJS(),
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
    );

    let openedSlot = '';
    windowStub.hdpEditCardSlotYAML = (slotId: string) => { openedSlot = slotId; };
    const control = {
      getAttribute: (name: string) => name === 'data-card-edit-action'
        ? 'yaml'
        : name === 'data-slot-id' ? 'home.environment' : null,
    };
    let prevented = false;
    let stopped = false;
    listeners.click[0]({
      target: { closest: () => control },
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
    });

    expect(openedSlot).toBe('home.environment');
    expect(prevented).toBe(true);
    expect(stopped).toBe(true);
  });

  it('delegates every home edit toolbar command without inline handlers', () => {
    const listeners: Record<string, Array<(event: any) => void>> = {};
    const documentStub = {
      readyState: 'loading',
      addEventListener: (type: string, listener: (event: any) => void) => {
        (listeners[type] ||= []).push(listener);
      },
    };
    const windowStub: Record<string, any> = {};
    new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      generateCardSlotEditorJS(),
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
    );

    const calls: string[] = [];
    windowStub.hdpToggleCardEditMode = (force: boolean) => calls.push(`edit:${force}`);
    windowStub.hdpOpenHiddenCardSlots = () => calls.push('hidden');
    windowStub.hdpSaveCardEdits = () => calls.push('save');
    windowStub.hdpCancelCardEdits = () => calls.push('cancel');

    ['enter-card-edit', 'manage-hidden-cards', 'save-card-edits', 'cancel-card-edits'].forEach(action => {
      const control = { getAttribute: (name: string) => name === 'data-action' ? action : null };
      listeners.click[0]({
        target: { closest: (selector: string) => selector.includes('hdp-home-edit-bar') ? control : null },
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    });

    expect(calls).toEqual(['edit:true', 'hidden', 'save', 'cancel']);
  });

  it('binds dragging once per dashboard root after Home Assistant rebuilds it', () => {
    const documentStub = {
      readyState: 'loading',
      addEventListener: () => {},
    };
    const windowStub: Record<string, any> = {};
    new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      `${generateCardSlotEditorJS()}\nwindow.testInitCardSlotDragging = hdpInitCardSlotDragging;`,
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
    );

    const createRoot = () => {
      const listeners: Record<string, Array<(event: any) => void>> = {};
      return {
        listeners,
        classList: { contains: () => true },
        addEventListener: (type: string, listener: (event: any) => void) => {
          (listeners[type] ||= []).push(listener);
        },
      };
    };
    const firstRoot = createRoot();
    const rebuiltRoot = createRoot();

    windowStub.testInitCardSlotDragging(firstRoot);
    windowStub.testInitCardSlotDragging(firstRoot);
    windowStub.testInitCardSlotDragging(rebuiltRoot);

    ['dragstart', 'dragover', 'drop', 'dragend', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(type => {
      expect(firstRoot.listeners[type]).toHaveLength(1);
      expect(rebuiltRoot.listeners[type]).toHaveLength(1);
    });
    expect(windowStub.hdpCardSlotDragReady).toBe(true);
  });

  it('cancels pending YAML previews when the owning editor closes', () => {
    const textareaListeners: Record<string, () => void> = {};
    const textarea = {
      value: '',
      addEventListener: (type: string, listener: () => void) => { textareaListeners[type] = listener; },
      focus: () => {},
    };
    const createOutput = () => ({
      textContent: '',
      innerHTML: '',
      disabled: false,
      setAttribute: () => {},
    });
    const error = createOutput();
    const preview = createOutput();
    const save = createOutput();
    let modalClick: ((event: any) => void) | undefined;
    let removed = false;
    const modal: any = {
      id: '',
      className: '',
      innerHTML: '',
      querySelector: (selector: string) => {
        if (selector === '#hdp-slot-yaml') return textarea;
        if (selector === '#hdp-slot-editor-error') return error;
        if (selector === '#hdp-slot-preview') return preview;
        if (selector === '[data-action="save"]') return save;
        return null;
      },
      addEventListener: (type: string, listener: (event: any) => void) => {
        if (type === 'click') modalClick = listener;
      },
      remove: () => { removed = true; },
    };
    const clearedTimers: number[] = [];
    const timers = new Map<number, () => void>();
    let nextTimer = 0;
    const setTimeoutStub = (callback: () => void) => {
      nextTimer += 1;
      timers.set(nextTimer, callback);
      return nextTimer;
    };
    const clearTimeoutStub = (timer: number | null) => {
      if (timer == null) return;
      clearedTimers.push(timer);
      timers.delete(timer);
    };
    const documentStub = {
      readyState: 'loading',
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => { throw new Error('preview escaped its modal scope'); },
      body: { appendChild: () => {} },
      createElement: () => modal,
    };
    const windowStub: Record<string, any> = {};
    new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      `${generateCardSlotEditorJS()}\nwindow.testOpenSlotEditor = hdpOpenSlotEditor;`,
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => {} },
      setTimeoutStub,
      clearTimeoutStub,
    );

    windowStub.testOpenSlotEditor('home.summary', 'invalid yaml');
    textareaListeners.input();
    expect(timers.size).toBe(1);
    expect(modalClick).toBeTypeOf('function');

    modalClick?.({ target: modal });

    expect(removed).toBe(true);
    expect(clearedTimers).toEqual([1]);
    expect(timers.size).toBe(0);
  });

  it('sanitizes custom-card previews with the production safety boundary', () => {
    const windowStub: Record<string, any> = {};
    const documentStub = {
      readyState: 'loading',
      addEventListener: () => {},
    };
    new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      `${generateCardSlotEditorJS()}\nwindow.testSanitizeSlotHTML = hdpSanitizeSlotHTML;`,
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
    );

    const sanitized = windowStub.testSanitizeSlotHTML([
      '<style>@import "evil.css"; :host { color: red } .safe { display: grid } .bad { width: expression(alert(1)) }</style>',
      '<section class="safe" data-entity="light.kitchen" data-action="toggle" aria-label="Kitchen" onclick="evil()" style="color:red;background:url(evil);padding:8px">',
      '<script>alert(1)</script>',
      '<img src="javascript:alert(1)" onerror="evil()">',
      '<a href="https://example.com/path">Safe</a>',
      '<img src="images/status.png" alt="Relative">',
      '</section>',
    ].join(''));

    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('@import');
    expect(sanitized).not.toContain('expression(');
    expect(sanitized).not.toContain('background:');
    expect(sanitized).toContain('data-entity="light.kitchen"');
    expect(sanitized).toContain('data-action="toggle"');
    expect(sanitized).toContain('aria-label="Kitchen"');
    expect(sanitized).toContain('style="color: red; padding: 8px"');
    expect(sanitized).toContain('#hdp-slot-preview .bp-html-card .safe {');
    expect(sanitized).toContain('href="https://example.com/path"');
    expect(sanitized).toContain('src="images/status.png"');
  });

  it('parses only the indented YAML content block for editor previews', () => {
    const windowStub: Record<string, any> = {};
    new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      `${generateCardSlotEditorJS()}\nwindow.testParseSafeHtmlProYaml = hdpParseSafeHtmlProYaml;`,
    )(
      windowStub,
      { readyState: 'loading', addEventListener: () => {} },
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
    );

    const parsed = windowStub.testParseSafeHtmlProYaml([
      'type: custom:html-pro-card',
      'content: |',
      '  <section class="metric">',
      '    <strong>24.6 C</strong>',
      '  </section>',
      'title: Room climate',
      'do_not_parse: true',
    ].join('\n'));

    expect(parsed).toEqual({
      ok: true,
      content: '<section class="metric">\n  <strong>24.6 C</strong>\n</section>',
    });
    expect(parsed.content).not.toContain('title:');
    expect(parsed.content).not.toContain('do_not_parse:');
  });

  it('emits editor CSS and JS for draft-only editing and image theme extraction', () => {
    const css = getCardSlotCSS();
    const js = generateCardSlotEditorJS();

    expect(css).toContain('.hdp-root--card-edit .hdp-view[data-view="home"] .hdp-slot-edit-panel');
    expect(css).toContain('.hdp-bento--dragging');
    expect(css).toContain('.hdp-card-slot--draft-hidden');
    expect(css).toContain('.hdp-card-slot--theme-ready');
    expect(css).toContain('.hdp-slot-template-bar');
    expect(css).toContain('.hdp-slot-editor-preview[data-state="error"]');
    expect(css).toContain('.hdp-slot-editor-actions button:disabled');
    expect(css).toContain('background: var(--hdp-overlay-bg');
    expect(css).toContain('background: var(--hdp-modal-bg, var(--hdp-bg))');
    expect(css).toContain('background: var(--hdp-control-bg, var(--hdp-card-bg))');
    expect(css).toContain('background: var(--hdp-control-bg-hover, var(--hdp-primary-light))');
    expect(css).toContain('[data-card-edit-action="drag"]');
    expect(css).toContain('touch-action: none;');
    expect(js).toContain('window.hdpToggleCardEditMode = function');
    expect(js).toContain("if (typeof hdpApplyThemeVarsToOverlay === 'function') hdpApplyThemeVarsToOverlay(modal);");
    expect(js).toContain('function hdpInitCardSlotEditorActions');
    expect(js).toContain("document.addEventListener('click'");
    expect(js).toContain("else if (action === 'yaml') window.hdpEditCardSlotYAML(slotId);");
    expect(js).toContain('hdpInitCardSlotEditorActions();');
    expect(js).toContain('function hdpInitCardSlotDragging');
    expect(js).toContain("root.addEventListener('dragstart'");
    expect(js).toContain("closest('[data-card-edit-action=\"drag\"]')");
    expect(js).toContain("closest('.hdp-slot-edit-panel') && !dragHandle");
    expect(js).toContain("root.addEventListener('drop'");
    expect(js).toContain("root.addEventListener('pointerdown'");
    expect(js).toContain("root.addEventListener('pointermove'");
    expect(js).toContain('document.elementFromPoint(e.clientX, e.clientY)');
    expect(js).toContain("root.addEventListener('pointercancel', finishPointerDrag)");
    expect(js).toContain('function hdpPersistHomeSlotDomOrder');
    expect(js).toContain('window.hdpOpenHiddenCardSlots = function');
    expect(js).toContain('window.hdpSaveCardEdits = function');
    expect(js).toContain('window.hdpCancelCardEdits = function');
    expect(js).toContain('function hdpApplyCardSlotImageThemes');
    expect(js).toContain('new Image()');
    expect(js).toContain('data-template="entity-control"');
    expect(js).toContain('function hdpGetSlotTemplate(template, slotId)');
    expect(js).toContain('textarea.addEventListener(\'input\', schedulePreview)');
    expect(js).toContain('function hdpFindUnsafeSlotLine(text)');
    expect(js).toContain("if (save) save.disabled = true;");
    expect(js).toContain("if (typeof window.hdpCommitSettings === 'function')");
    expect(js).toContain("if (typeof window.hdpCancelSettings === 'function')");
    expect(() => new Function(
      'window',
      'document',
      'localStorage',
      'Image',
      'prompt',
      'confirm',
      'location',
      'setTimeout',
      'clearTimeout',
      js,
    )).not.toThrow();
  });
});
