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

  it('binds entity slot placeholders to escaped render context', () => {
    const config: StrategyConfig = {
      type: 'custom:hass-dashboard-pro',
      hdp_config: {
        cards: {
          slots: {
            'entity.domain.sensor': {
              yaml: [
                'type: custom:html-pro-card',
                'content: |',
                '  <button data-entity="$entity$" data-action="more-info" aria-label="$name$" title="$area$">',
                '    $name$ · $state$ · $area$ · $domain$',
                '  </button>',
              ].join('\n'),
            },
          },
        },
      } as any,
    };

    const card = resolveSlottedCard(
      config,
      'entity.domain.sensor',
      '<div>Default</div>',
      'md',
      0,
      {
        entity: 'sensor.kitchen_temperature',
        name: '<img src=x onerror=alert(1)>',
        state: '22.2°C',
        area: 'Kitchen & Dining',
        domain: 'sensor',
      },
    );

    expect(card.html).toContain('data-entity="sensor.kitchen_temperature"');
    expect(card.html).toContain('data-action="more-info"');
    expect(card.html).toContain('aria-label="&lt;img src=x onerror=alert(1)&gt;"');
    expect(card.html).toContain('title="Kitchen &amp; Dining"');
    expect(card.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(card.html).toContain('22.2°C');
    expect(card.html).toContain('Kitchen &amp; Dining');
    expect(card.html).not.toContain('<img src=x');
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

  it('reloads the dashboard after canceling card edit drafts', () => {
    const documentStub = {
      readyState: 'loading',
      addEventListener: () => {},
    };
    const calls: string[] = [];
    const windowStub: Record<string, any> = {
      hdpCancelSettings: () => calls.push('cancel-settings'),
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
      generateCardSlotEditorJS(),
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => null,
      () => false,
      { reload: () => calls.push('reload') },
      setTimeout,
      clearTimeout,
    );

    windowStub.hdpCancelCardEdits();

    expect(calls).toEqual(['cancel-settings', 'reload']);
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
    const documentListeners: Record<string, Array<(event: any) => void>> = {};
    let focusCount = 0;
    const textarea = {
      value: '',
      addEventListener: (type: string, listener: () => void) => { textareaListeners[type] = listener; },
      focus: () => { focusCount += 1; },
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
      addEventListener: (type: string, listener: (event: any) => void) => {
        (documentListeners[type] ||= []).push(listener);
      },
      removeEventListener: (type: string, listener: (event: any) => void) => {
        documentListeners[type] = (documentListeners[type] || []).filter(item => item !== listener);
      },
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
    expect(focusCount).toBe(1);
    textareaListeners.input();
    expect(timers.size).toBe(1);
    expect(modalClick).toBeTypeOf('function');

    let prevented = false;
    documentListeners.keydown[0]({
      key: 'Escape',
      preventDefault: () => { prevented = true; },
    });

    expect(prevented).toBe(true);
    expect(removed).toBe(true);
    expect(clearedTimers).toEqual([1]);
    expect(timers.size).toBe(0);
    expect(documentListeners.keydown).toHaveLength(0);
  });

  it('rejects unsafe background drafts and accepts relative image paths', () => {
    const draft = {
      cards: {
        slots: {
          'home.summary': { background_image_url: '/local/original.jpg', theme_from_image: true },
        },
      },
    };
    const toastCalls: string[] = [];
    const promptValues = ['javascript:alert(1)', 'java\nscript:alert(1)', 'images/summary.jpg'];
    const card = {
      classList: { add: () => {}, toggle: () => {}, remove: () => {} },
      style: { setProperty: () => {}, removeProperty: () => {} },
      removeAttribute: () => {},
      matches: () => false,
      querySelectorAll: () => [],
    };
    const documentStub = {
      readyState: 'loading',
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: (selector: string) => selector.includes('data-card-slot') ? card : null,
      querySelectorAll: () => [],
    };
    const windowStub: Record<string, any> = {
      hdpGetSettingsDraft: () => draft,
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
      'hdpShowToast',
      generateCardSlotEditorJS(),
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      function ImageStub() {},
      () => promptValues.shift() ?? null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
      (message: string) => toastCalls.push(message),
    );

    windowStub.hdpEditCardSlotBackground('home.summary');
    expect(draft.cards.slots['home.summary'].background_image_url).toBe('/local/original.jpg');
    expect(draft.cards.slots['home.summary'].theme_from_image).toBe(true);
    expect(toastCalls).toEqual(['背景图片地址无效，请使用 HTTP(S)、/local/ 或相对路径']);

    windowStub.hdpEditCardSlotBackground('home.summary');
    expect(draft.cards.slots['home.summary'].background_image_url).toBe('/local/original.jpg');
    expect(toastCalls).toHaveLength(2);

    windowStub.hdpEditCardSlotBackground('home.summary');
    expect(draft.cards.slots['home.summary'].background_image_url).toBe('images/summary.jpg');
    expect(draft.cards.slots['home.summary'].theme_from_image).toBe(false);
  });

  it('ignores stale image theme callbacks and clears sampled colors', () => {
    const classes = new Set(['hdp-card-slot--theme-image']);
    const attrs = new Map<string, string>();
    const styles = new Map<string, string>();
    const images: any[] = [];
    let drawnSource = '';
    let drawCount = 0;
    function ImageStub(this: any) {
      images.push(this);
    }
    const context = {
      drawImage: (image: any) => {
        drawnSource = image.src;
        drawCount += 1;
      },
      getImageData: () => ({
        data: drawnSource.includes('second')
          ? new Uint8ClampedArray([100, 150, 200, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
          : new Uint8ClampedArray([200, 80, 40, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      }),
    };
    const card = {
      matches: (selector: string) => selector === '.hdp-card-slot--theme-image' && classes.has('hdp-card-slot--theme-image'),
      querySelectorAll: () => [],
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
      getAttribute: (name: string) => attrs.get(name) ?? null,
      setAttribute: (name: string, value: string) => attrs.set(name, value),
      removeAttribute: (name: string) => attrs.delete(name),
      style: {
        getPropertyValue: (name: string) => styles.get(name) || '',
        setProperty: (name: string, value: string) => styles.set(name, value),
        removeProperty: (name: string) => styles.delete(name),
      },
    };
    const documentStub = {
      readyState: 'loading',
      addEventListener: () => {},
      createElement: (tag: string) => tag === 'canvas'
        ? { width: 0, height: 0, getContext: () => context }
        : null,
      querySelectorAll: () => [],
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
      `${generateCardSlotEditorJS()}
window.testApplyCardSlotImageThemes = hdpApplyCardSlotImageThemes;
window.testClearCardSlotImageTheme = hdpClearCardSlotImageTheme;`,
    )(
      windowStub,
      documentStub,
      { getItem: () => null, setItem: () => {} },
      ImageStub,
      () => null,
      () => false,
      { reload: () => {} },
      setTimeout,
      clearTimeout,
    );

    styles.set('--hdp-slot-bg-image', 'url(images/first.jpg)');
    windowStub.testApplyCardSlotImageThemes(card);
    styles.set('--hdp-slot-bg-image', 'url(images/second.jpg)');
    windowStub.testApplyCardSlotImageThemes(card);
    expect(images).toHaveLength(2);

    images[0].onload();
    expect(drawCount).toBe(0);
    expect(styles.has('--hdp-primary')).toBe(false);

    images[1].onload();
    expect(drawCount).toBe(1);
    expect(styles.get('--hdp-primary')).toBe('rgb(100 150 200)');
    expect(classes.has('hdp-card-slot--theme-ready')).toBe(true);

    windowStub.testClearCardSlotImageTheme(card);
    expect(attrs.has('data-theme-sampled')).toBe(false);
    expect(styles.has('--hdp-primary')).toBe(false);
    expect(styles.has('--hdp-slot-primary')).toBe(false);
    expect(classes.has('hdp-card-slot--theme-ready')).toBe(false);
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
      '<style>@import "evil.css"; @font-face { font-family: Tracker; src: url(https://tracker.test/font.woff2) } @keyframes pulse { from { opacity:.5 } 50% { opacity:1 } to { opacity:.5 } } :host { color: red } .safe { display: grid; animation: pulse 1s ease infinite; animation-name: pulse; background-image: url(https://tracker.test/pixel) } .mask { mask-image: image-set(url(https://tracker.test/mask.png) 1x); padding: 4px } @media (max-width:600px) { .responsive-preview, :host.compact { display:flex } } .bad { width: expression(alert(1)) }</style>',
      '<section class="safe" data-entity="light.kitchen" data-action="toggle" role="button" tabindex="0" aria-label="Kitchen &amp; Dining" onclick="evil()" style="color:red;background:url(evil);padding:8px">',
      '<script>alert(1)</script>',
      '<img src="javascript:alert(1)" onerror="evil()">',
      '<a href="https://example.com/path">Safe</a>',
      '<a href="https://example.com/first" href="https://example.com/second">First link wins</a>',
      '<a href="data:image/svg+xml,%3Csvg%3E">Unsafe data link</a>',
      '<a href="https://example.com/\npath">Control link</a>',
      '<img src="images/status.png" alt="Relative">',
      '<img src="data:image/png;base64,abc" alt="Data image">',
      '<input type="range" min="0" max="100" step="5" value="45" data-action="cover-position" data-entity="cover.bed_blind" onchange="evil()">',
      '<input type="text" value="credential" data-entity="sensor.unsafe_text">',
      '<input type="file" type="range" data-entity="sensor.unsafe_file">',
      '<input type="range" type="file" value="30" data-entity="cover.safe_duplicate">',
      '<div tabindex="9">Bad focus order</div>',
      '</section>',
    ].join(''));

    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('@import');
    expect(sanitized).not.toContain('expression(');
    expect(sanitized).not.toContain('tracker.test');
    expect(sanitized).not.toContain('@font-face');
    expect(sanitized).not.toContain('background-image');
    expect(sanitized).not.toContain('mask-image');
    expect(sanitized).toContain('padding: 4px');
    expect(sanitized).toContain('@media (max-width:600px)');
    expect(sanitized).toContain('#hdp-slot-preview .bp-html-card .responsive-preview');
    expect(sanitized).toContain('#hdp-slot-preview .bp-html-card.compact');
    expect(sanitized).not.toMatch(/\{\s*\.responsive-preview\b/);
    expect(sanitized).not.toContain('.bp-html-card :host');
    expect(sanitized).toContain('@keyframes hdp-preview-pulse');
    expect(sanitized).toContain('animation: hdp-preview-pulse 1s ease infinite');
    expect(sanitized).toContain('animation-name: hdp-preview-pulse');
    expect(sanitized).not.toContain('#hdp-slot-preview .bp-html-card from');
    expect(sanitized).not.toContain('background:');
    expect(sanitized).toContain('data-entity="light.kitchen"');
    expect(sanitized).toContain('data-action="toggle"');
    expect(sanitized).toContain('aria-label="Kitchen &amp; Dining"');
    expect(sanitized).not.toContain('Kitchen &amp;amp; Dining');
    expect(sanitized).toContain('tabindex="0"');
    expect(sanitized).not.toContain('tabindex="9"');
    expect(sanitized).toContain('style="color: red; padding: 8px"');
    expect(sanitized).toContain('#hdp-slot-preview .bp-html-card .safe {');
    expect(sanitized).toContain('href="https://example.com/path"');
    expect(sanitized).toContain('<a href="https://example.com/first">First link wins</a>');
    expect(sanitized).not.toContain('https://example.com/second');
    expect(sanitized).not.toContain('href="data:image/');
    expect(sanitized).toContain('<a>Control link</a>');
    expect(sanitized).toContain('src="images/status.png"');
    expect(sanitized).toContain('src="data:image/png;base64,abc"');
    expect(sanitized).toContain('<input type="range" min="0" max="100" step="5" value="45" data-action="cover-position" data-entity="cover.bed_blind">');
    expect(sanitized.match(/<input type="range"/g)).toHaveLength(2);
    expect(sanitized).not.toContain('<input type="text"');
    expect(sanitized).not.toContain('<input type="file"');
    expect(sanitized).not.toContain('type="file"');
    expect(sanitized).not.toContain('data-entity="sensor.unsafe_text"');
    expect(sanitized).not.toContain('data-entity="sensor.unsafe_file"');
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

    const spoofedType = windowStub.testParseSafeHtmlProYaml([
      'type: entities',
      'content: |',
      '  type: custom:html-pro-card',
      '  <div>Not an html-pro card</div>',
    ].join('\n'));
    const wrappedCard = windowStub.testParseSafeHtmlProYaml([
      'card:',
      '  type: custom:html-pro-card',
      '  content: |',
      '    <div>Wrapped card</div>',
    ].join('\n'));

    expect(spoofedType).toEqual({ ok: false, error: '仅支持 type: custom:html-pro-card' });
    expect(wrappedCard).toEqual({ ok: true, content: '<div>Wrapped card</div>' });
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
