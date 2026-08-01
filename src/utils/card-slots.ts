import type { CardFreeformRect, CardSlotConfig, StrategyConfig } from '../types';
import { cardConfigToHTML, parseCardYAML } from '../blueprints/blueprint-parser';
import { resolveBentoGridSpan, sanitizeBentoSize, type BentoGridSpan, type BentoSize } from './bento-layout';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue, escapeURLAttribute } from './html';

export interface SlottedCard {
  slotId: string;
  html: string;
  size: BentoSize;
  order: number;
  hidden: boolean;
  custom: boolean;
  gridSpan?: BentoGridSpan;
  freeform?: { desktop?: CardFreeformRect; tablet?: CardFreeformRect };
}

interface CustomSlotRenderResult {
  html: string;
  error?: string;
}

export interface CardSlotContext {
  entity?: string;
  name?: string;
  state?: string;
  area?: string;
  domain?: string;
}

export function resolveSlottedCard(
  config: StrategyConfig,
  slotId: string,
  defaultHTML: string,
  defaultSize: BentoSize,
  defaultOrder = 0,
  context?: CardSlotContext,
): SlottedCard {
  const slot = getCardSlot(config, slotId);
  const hidden = slot?.enabled === false;
  const size = sanitizeBentoSize(slot?.size, defaultSize);
  const hasGridSpan = slot?.grid_columns != null || slot?.grid_rows != null;
  const gridSpan = hasGridSpan ? resolveBentoGridSpan(slot?.grid_columns, slot?.grid_rows, size) : undefined;
  const order = typeof slot?.order === 'number' && Number.isFinite(slot.order) ? slot.order : defaultOrder;
  const freeform = slot?.freeform;
  if (hidden) return { slotId, html: '', size, order, hidden: true, custom: false, gridSpan, freeform };

  const custom = renderCustomSlotHTML(slotId, slot, context);
  const content = custom.html || defaultHTML;
  const error = custom.error ? buildSlotErrorHTML(slotId, custom.error) : '';
  return {
    slotId,
    html: wrapSlotHTML(slotId, `${error}${content}`, slot, Boolean(custom.html), size),
    size,
    order,
    hidden: false,
    custom: Boolean(custom.html),
    gridSpan,
    freeform,
  };
}

/**
 * Prefer a card's stable entity slot while preserving existing domain-wide
 * customizations for users who configured them before entity-level editing.
 */
export function resolveSlottedCardWithFallback(
  config: StrategyConfig,
  slotId: string,
  fallbackSlotId: string,
  defaultHTML: string,
  defaultSize: BentoSize,
  defaultOrder = 0,
  context?: CardSlotContext,
): SlottedCard {
  const resolvedSlotId = getCardSlot(config, slotId) || !getCardSlot(config, fallbackSlotId)
    ? slotId
    : fallbackSlotId;
  return resolveSlottedCard(config, resolvedSlotId, defaultHTML, defaultSize, defaultOrder, context);
}

export function getCardSlot(config: StrategyConfig, slotId: string): CardSlotConfig | undefined {
  const slot = config.hdp_config?.cards?.slots?.[slotId];
  return slot && typeof slot === 'object' && !Array.isArray(slot) ? slot : undefined;
}

export function sortSlottedCards(cards: SlottedCard[]): SlottedCard[] {
  return [...cards]
    .filter(card => !card.hidden)
    .sort((a, b) => a.order - b.order || a.slotId.localeCompare(b.slotId));
}

export function getCardSlotCSS(): string {
  return /* css */ `
  .hdp-card-slot {
    position: relative;
    min-width: 0;
    height: 100%;
    border-radius: var(--hdp-radius);
    overflow: hidden;
  }
  .hdp-card-slot::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image: var(--hdp-slot-bg-image, none);
    background-size: cover;
    background-position: center;
    opacity: var(--hdp-slot-bg-opacity, 0);
    pointer-events: none;
  }
  .hdp-card-slot::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    background: var(--hdp-slot-bg-scrim, transparent);
    pointer-events: none;
  }
  .hdp-card-slot > * {
    position: relative;
    z-index: 1;
  }
  .hdp-card-slot--custom > .bp-html-card {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    box-sizing: border-box;
  }
  .hdp-root--card-edit .hdp-view .hdp-card-slot {
    outline: 2px dashed color-mix(in srgb, var(--hdp-primary) 60%, transparent);
    outline-offset: -4px;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content > .hdp-bento {
    cursor: grab;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content > .hdp-bento:active {
    cursor: grabbing;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content {
    grid-auto-rows: var(--hdp-density-row-height, 120px);
    align-items: start;
  }
  .hdp-bento--dragging {
    opacity: 0.42;
  }
  .hdp-bento--drag-over > .hdp-card-slot {
    outline-color: var(--hdp-primary);
    box-shadow: 0 0 0 4px var(--hdp-primary-light);
  }
  .hdp-slot-edit-panel {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 22;
    display: none;
    align-items: center;
    gap: 5px;
    max-width: calc(100% - 20px);
    padding: 6px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--hdp-card-bg) 96%, var(--hdp-primary) 4%);
    border: 1px solid color-mix(in srgb, var(--hdp-border) 76%, var(--hdp-primary) 24%);
    box-shadow: var(--hdp-shadow-elevated, var(--hdp-shadow-card));
    backdrop-filter: blur(14px) saturate(135%);
    box-sizing: border-box;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-slot-edit-panel,
  .hdp-root--card-edit .hdp-view .hdp-slot-edit-panel {
    display: flex;
    flex-wrap: nowrap;
    opacity: 0;
    pointer-events: none;
  }
  .hdp-bento--selected > .hdp-card-slot {
    outline-style: solid !important;
    outline-color: var(--hdp-primary) !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--hdp-primary) 18%, transparent);
  }
  .hdp-root--card-edit .hdp-view .hdp-card-slot:hover > .hdp-slot-edit-panel,
  .hdp-root--card-edit .hdp-view .hdp-card-slot:focus-within > .hdp-slot-edit-panel {
    display: flex;
    flex-wrap: nowrap;
    opacity: 1;
    pointer-events: auto;
  }
  .hdp-slot-edit-panel button,
  .hdp-slot-edit-panel select {
    appearance: none;
    min-width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .hdp-slot-edit-panel button:hover,
  .hdp-slot-edit-panel select:hover {
    border-color: var(--hdp-primary);
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light));
  }
  .hdp-slot-edit-panel select {
    width: 68px;
    padding: 0 6px;
  }
  .hdp-slot-grid-input {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 32px;
    padding: 0 5px;
    border: 1px solid var(--hdp-border);
    border-radius: 8px;
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text-muted);
    font: 700 10px/1 inherit;
  }
  .hdp-slot-grid-input input {
    width: 44px;
    accent-color: var(--hdp-primary);
    cursor: pointer;
  }
  .hdp-slot-edit-panel [data-card-edit-action="drag"] {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .hdp-slot-edit-panel [data-card-edit-action="drag"]:active {
    cursor: grabbing;
  }
  .hdp-slot-resize-handle {
    position: absolute;
    z-index: 21;
    display: none;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--hdp-primary);
    font: 0/1 sans-serif;
    touch-action: none;
    user-select: none;
  }
  .hdp-slot-resize-handle::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-color: currentColor;
    opacity: 0.82;
  }
  .hdp-slot-resize-handle[data-resize-edge="n"] { top: 0; left: calc(50% - 24px); width: 48px; height: 12px; cursor: ns-resize; }
  .hdp-slot-resize-handle[data-resize-edge="s"] { bottom: 0; left: calc(50% - 24px); width: 48px; height: 12px; cursor: ns-resize; }
  .hdp-slot-resize-handle[data-resize-edge="e"] { right: 0; top: calc(50% - 24px); width: 12px; height: 48px; cursor: ew-resize; }
  .hdp-slot-resize-handle[data-resize-edge="w"] { left: 0; top: calc(50% - 24px); width: 12px; height: 48px; cursor: ew-resize; }
  .hdp-slot-resize-handle[data-resize-edge="nw"] { left: 1px; top: 1px; cursor: nwse-resize; }
  .hdp-slot-resize-handle[data-resize-edge="ne"] { right: 1px; top: 1px; cursor: nesw-resize; }
  .hdp-slot-resize-handle[data-resize-edge="sw"] { left: 1px; bottom: 1px; cursor: nesw-resize; }
  .hdp-slot-resize-handle[data-resize-edge="se"] { right: 1px; bottom: 1px; cursor: nwse-resize; }
  .hdp-slot-resize-handle[data-resize-edge="nw"]::after { border-left: 2px solid; border-top: 2px solid; }
  .hdp-slot-resize-handle[data-resize-edge="ne"]::after { border-right: 2px solid; border-top: 2px solid; }
  .hdp-slot-resize-handle[data-resize-edge="sw"]::after { border-left: 2px solid; border-bottom: 2px solid; }
  .hdp-slot-resize-handle[data-resize-edge="se"]::after { border-right: 2px solid; border-bottom: 2px solid; }
  .hdp-slot-resize-handle[data-resize-edge="n"]::after,
  .hdp-slot-resize-handle[data-resize-edge="s"]::after { inset: 5px 8px; border-top: 2px solid; }
  .hdp-slot-resize-handle[data-resize-edge="e"]::after,
  .hdp-slot-resize-handle[data-resize-edge="w"]::after { inset: 8px 5px; border-left: 2px solid; }
  .hdp-slot-resize-handle:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
    background: var(--hdp-control-bg, var(--hdp-card-bg));
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content[data-hdp-layout-mode="freeform"] .hdp-card-slot > .hdp-slot-resize-handle,
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content:not([data-hdp-layout-mode="freeform"]) .hdp-card-slot > .hdp-slot-resize-handle[data-resize-edge="se"] {
    display: block;
    opacity: 0;
    pointer-events: none;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content[data-hdp-layout-mode="freeform"] .hdp-card-slot:hover > .hdp-slot-resize-handle,
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content[data-hdp-layout-mode="freeform"] .hdp-card-slot:focus-within > .hdp-slot-resize-handle,
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content:not([data-hdp-layout-mode="freeform"]) .hdp-card-slot:hover > .hdp-slot-resize-handle[data-resize-edge="se"],
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content:not([data-hdp-layout-mode="freeform"]) .hdp-card-slot:focus-within > .hdp-slot-resize-handle[data-resize-edge="se"] {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }
  .hdp-card-slot--draft-hidden > :not(.hdp-slot-edit-panel):not(.hdp-slot-hidden-note) {
    opacity: 0.28;
    filter: grayscale(0.4);
    pointer-events: none;
  }
  .hdp-slot-hidden-note {
    position: absolute;
    inset: auto 12px 12px 12px;
    z-index: 18;
    display: none;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--hdp-card-bg) 94%, transparent);
    border: 1px solid var(--hdp-border);
    color: var(--hdp-text);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    box-shadow: var(--hdp-shadow-card);
  }
  .hdp-card-slot--draft-hidden .hdp-slot-hidden-note {
    display: block;
  }
  .hdp-slot-editor-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483000 !important;
    display: grid !important;
    place-items: center !important;
    box-sizing: border-box !important;
    isolation: isolate;
    overflow: auto !important;
    padding: 18px !important;
    background: var(--hdp-overlay-bg, rgba(8,12,22,0.46)) !important;
    backdrop-filter: blur(10px);
  }
  .hdp-slot-editor-modal *,
  .hdp-slot-editor-modal *::before,
  .hdp-slot-editor-modal *::after { box-sizing: border-box; }
  .hdp-slot-editor-dialog {
    position: relative !important;
    z-index: 1;
    align-self: center;
    width: min(860px, calc(100vw - 36px)) !important;
    max-height: min(90dvh, calc(100vh - 36px));
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    overflow: auto !important;
    padding: 18px !important;
    border-radius: var(--hdp-radius-lg, 18px);
    background: var(--hdp-modal-bg, var(--hdp-bg)) !important;
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-elevated, 0 24px 80px rgba(0,0,0,0.28));
    color: var(--hdp-text) !important;
    font: 14px/1.45 var(--hdp-font, system-ui, sans-serif) !important;
  }
  .hdp-slot-editor-head,
  .hdp-slot-editor-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .hdp-slot-editor-title {
    font: inherit;
    font-size: 16px;
    font-weight: 800;
    color: var(--hdp-text);
  }
  .hdp-slot-editor-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
    min-height: 0;
  }
  .hdp-slot-template-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hdp-slot-template-bar button {
    appearance: none;
    min-height: 34px;
    padding: 7px 11px;
    border-radius: 999px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  .hdp-slot-template-bar button:hover {
    border-color: var(--hdp-primary);
    color: var(--hdp-primary);
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light));
  }
  .hdp-slot-editor-body textarea {
    width: 100%;
    min-width: 0;
    min-height: 280px;
    resize: vertical;
    border-radius: 12px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    color: var(--hdp-text);
    font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
    padding: 12px;
  }
  .hdp-slot-editor-preview {
    min-height: 280px;
    overflow: auto;
    padding: 12px;
    border-radius: 12px;
    border: 1px dashed var(--hdp-border);
    background: var(--hdp-surface-muted, var(--hdp-card-bg));
  }
  .hdp-slot-editor-preview[data-state="error"] {
    border-color: var(--hdp-danger, #ef4444);
    background: var(--hdp-danger-light, rgba(239,68,68,0.08));
  }
  .hdp-slot-editor-preview[data-state="ok"] {
    border-color: var(--hdp-success, #22c55e);
  }
  .hdp-slot-editor-error {
    min-height: 18px;
    color: var(--hdp-danger, #ef4444);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }
  .hdp-slot-editor-error[data-state="ok"] {
    color: var(--hdp-success, #22c55e);
  }
  .hdp-slot-editor-actions button,
  .hdp-home-edit-bar button {
    appearance: none;
    min-height: 38px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-control-bg, var(--hdp-card-bg));
    color: var(--hdp-text);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .hdp-slot-editor-actions button:hover,
  .hdp-home-edit-bar button:hover {
    border-color: var(--hdp-primary);
    background: var(--hdp-control-bg-hover, var(--hdp-primary-light));
    transform: translateY(-1px);
  }
  .hdp-slot-editor-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
  .hdp-slot-editor-actions .hdp-primary,
  .hdp-home-edit-bar .hdp-primary {
    background: var(--hdp-primary);
    color: var(--hdp-text-inverse, white);
    border-color: var(--hdp-primary);
  }
  .hdp-slot-editor-actions .hdp-primary:hover,
  .hdp-home-edit-bar .hdp-primary:hover {
    background: var(--hdp-primary);
    color: var(--hdp-text-inverse, white);
  }
  .hdp-add-card-dialog {
    width: min(520px, calc(100vw - 36px)) !important;
    min-height: 0;
  }
  .hdp-add-card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .hdp-add-card-field {
    display: grid;
    gap: 6px;
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }
  .hdp-add-card-field select,
  .hdp-add-card-field input {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--hdp-border);
    border-radius: var(--hdp-radius-sm, 8px);
    background: var(--hdp-surface-card, var(--hdp-card-bg));
    color: var(--hdp-text);
    font: inherit;
  }
  .hdp-add-card-help {
    padding: 10px 12px;
    border-left: 3px solid var(--hdp-primary);
    background: var(--hdp-primary-light);
    color: var(--hdp-text-secondary);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
  }
  .hdp-card-slot--image {
    --hdp-slot-bg-opacity: 1;
    --hdp-slot-bg-scrim: linear-gradient(
      135deg,
      color-mix(in srgb, var(--hdp-card-bg) 88%, transparent),
      color-mix(in srgb, var(--hdp-card-bg) 64%, transparent)
    );
    background: color-mix(in srgb, var(--hdp-card-bg) 82%, transparent);
  }
  .hdp-card-slot--theme-ready {
    --hdp-primary: var(--hdp-slot-primary);
    --hdp-primary-light: var(--hdp-slot-primary-light);
  }
  .hdp-card-slot-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
    padding: 10px 12px;
    border-radius: var(--hdp-radius-sm, 8px);
    border: 1px solid var(--hdp-danger, #ef4444);
    background: var(--hdp-danger-light, rgba(239,68,68,0.1));
    color: var(--hdp-danger, #ef4444);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }
  .hdp-card-slot-error span {
    min-width: 0;
  }
  .hdp-card-slot-error button {
    appearance: none;
    flex: 0 0 auto;
    min-height: 30px;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid currentColor;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  .hdp-hidden-slot-list {
    display: grid;
    gap: 8px;
  }
  .hdp-hidden-slot-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
  }
  @media (max-width: 720px) {
    .hdp-slot-editor-body {
      grid-template-columns: 1fr;
    }
    .hdp-add-card-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  `;
}

function renderCustomSlotHTML(slotId: string, slot?: CardSlotConfig, context?: CardSlotContext): CustomSlotRenderResult {
  const yaml = slot?.yaml?.trim();
  if (!yaml) return { html: '' };
  try {
    const card = parseCardYAML(yaml);
    if (card.type !== 'custom:html-pro-card') {
      return { html: '', error: '仅支持 type: custom:html-pro-card' };
    }
    if (typeof card.content !== 'string' || !card.content.trim()) {
      return { html: '', error: '需要 content: | 多行内容' };
    }
    return {
      html: cardConfigToHTML({
        ...card,
        content: applyCardSlotContext(card.content, context),
      }, slotId),
    };
  } catch (err) {
    const message = err instanceof Error && err.message ? `YAML 解析失败：${err.message}` : 'YAML 解析失败';
    return { html: '', error: message };
  }
}

function applyCardSlotContext(content: string, context?: CardSlotContext): string {
  if (!context) return content;
  const replacements: Record<string, string> = {
    entity: escapeHTML(context.entity || ''),
    name: escapeHTML(context.name || ''),
    state: escapeHTML(context.state || ''),
    area: escapeHTML(context.area || ''),
    domain: escapeHTML(context.domain || ''),
  };
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.split(`$${key}$`).join(value),
    content,
  );
}

function wrapSlotHTML(
  slotId: string,
  html: string,
  slot: CardSlotConfig | undefined,
  custom: boolean,
  size: BentoSize,
): string {
  const bg = escapeURLAttribute(slot?.background_image_url || '');
  const style = bg
    ? ` style="--hdp-slot-bg-image: url(${escapeInlineStyleValue(bg)});"`
    : '';
  const classes = [
    'hdp-card-slot',
    bg ? 'hdp-card-slot--image' : '',
    bg && slot?.theme_from_image ? 'hdp-card-slot--theme-image' : '',
    custom ? 'hdp-card-slot--custom' : 'hdp-card-slot--default',
  ].filter(Boolean).join(' ');
  return `<div class="${classes}" data-card-slot="${escapeAttribute(slotId)}" data-card-custom="${custom ? 'true' : 'false'}" data-card-slot-size="${size}"${style}>
    ${buildSlotEditPanel(slotId, slot, size)}
    <div class="hdp-slot-hidden-note">已隐藏，保存后生效。点击恢复默认可撤销。</div>
    ${html}
  </div>`;
}

function buildSlotErrorHTML(slotId: string, reason: string): string {
  const slotAttr = escapeAttribute(slotId);
  return `<div class="hdp-card-slot-error" data-card-slot-error="${escapeAttribute(slotId)}">
    <span>${escapeHTML(`自定义卡片解析失败：${reason}。已显示默认卡片。`)}</span>
    <button type="button" data-card-edit-action="reset" data-slot-id="${slotAttr}">恢复默认</button>
  </div>`;
}

function buildSlotEditPanel(slotId: string, slot?: CardSlotConfig, defaultSize: BentoSize = 'md'): string {
  const slotAttr = escapeAttribute(slotId);
  const size = sanitizeBentoSize(slot?.size, defaultSize);
  const sizeOptions = ['sm', 'md', 'lg', 'wide', 'tall']
    .map(value => `<option value="${value}"${value === size ? ' selected' : ''}>${value}</option>`)
    .join('');
  const resetButton = slotId.startsWith('home.custom.')
    ? `<button type="button" title="删除新增卡片" aria-label="删除新增卡片" data-card-edit-action="reset" data-slot-id="${slotAttr}">删</button>`
    : `<button type="button" title="恢复默认" aria-label="恢复默认卡片" data-card-edit-action="reset" data-slot-id="${slotAttr}">↺</button>`;
  return `<div class="hdp-slot-edit-panel" data-slot-edit-panel="${escapeAttribute(slotId)}">
    <select name="hdp_card_size_${slotAttr}" aria-label="卡片大小" title="预设尺寸" data-card-edit-action="size" data-slot-id="${slotAttr}">
      ${sizeOptions}
    </select>
    <button type="button" title="拖动调整位置" aria-label="拖动调整位置" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" data-card-edit-action="drag" data-slot-id="${slotAttr}">拖</button>
    <button type="button" title="编辑 YAML" data-card-edit-action="yaml" data-slot-id="${slotAttr}">YAML</button>
    <button type="button" title="背景图" aria-label="设置卡片背景图" data-card-edit-action="background" data-slot-id="${slotAttr}">图</button>
    <button type="button" title="隐藏" aria-label="隐藏卡片" data-card-edit-action="hide" data-slot-id="${slotAttr}">藏</button>
    ${resetButton}
  </div>${buildSlotResizeHandles(slotAttr)}`;
}

function buildSlotResizeHandles(slotAttr: string): string {
  return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
    .map(edge => `<button type="button" class="hdp-slot-resize-handle" title="拖动调整卡片大小" aria-label="从${edge}方向调整卡片大小" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" data-card-edit-action="resize" data-resize-edge="${edge}" data-slot-id="${slotAttr}"></button>`)
    .join('');
}

export function generateCardSlotEditorJS(): string {
  return `
var HDP_HOME_CARD_SLOTS = [
  { id: 'home.welcome', label: '欢迎卡片' },
  { id: 'home.welcome.weather', label: '天气信息' },
  { id: 'home.welcome.alarm', label: '安防状态' },
  { id: 'home.status_badges', label: '状态徽章' },
  { id: 'home.status_badges.light', label: '灯光徽章' },
  { id: 'home.status_badges.switch', label: '开关徽章' },
  { id: 'home.status_badges.fan', label: '风扇徽章' },
  { id: 'home.status_badges.cover', label: '窗帘徽章' },
  { id: 'home.status_badges.lock', label: '门锁徽章' },
  { id: 'home.status_badges.climate', label: '空调徽章' },
  { id: 'home.status_badges.media_player', label: '媒体徽章' },
  { id: 'home.status_badges.vacuum', label: '扫地机徽章' },
  { id: 'home.status_badges.camera', label: '摄像头徽章' },
  { id: 'home.status_badges.binary_sensor.window', label: '窗户徽章' },
  { id: 'home.status_badges.binary_sensor.door', label: '门徽章' },
  { id: 'home.status_badges.binary_sensor.motion', label: '人体感应徽章' },
  { id: 'home.status_badges.binary_sensor.smoke', label: '烟雾徽章' },
  { id: 'home.status_badges.binary_sensor.moisture', label: '漏水徽章' },
  { id: 'home.people', label: '家庭成员' },
  { id: 'home.environment', label: '家居环境' },
  { id: 'home.environment.temperature', label: '室内温度' },
  { id: 'home.environment.humidity', label: '室内湿度' },
  { id: 'home.environment.security', label: '安防状态' },
  { id: 'home.environment.automations', label: '自动化运行' },
  { id: 'home.power_usage', label: '全屋功率' },
  { id: 'home.favorites', label: '收藏设备' },
  { id: 'home.summary', label: '系统概览' },
  { id: 'home.summary.updates', label: '可用更新' },
  { id: 'home.summary.repairs', label: '待维修' },
  { id: 'home.summary.entities', label: '实体统计' },
  { id: 'home.summary.devices', label: '设备统计' },
  { id: 'home.summary.areas', label: '区域统计' },
  { id: 'home.summary.active', label: '运行中统计' },
  { id: 'home.summary.automations', label: '自动化统计' }
];
var hdpSelectedCardSlotId = null;

function hdpGetCardEditDraft() {
  if (typeof window.hdpGetSettingsDraft === 'function') return window.hdpGetSettingsDraft();
  if (!window.hdpCardEditDraft) {
    try { window.hdpCardEditDraft = JSON.parse(localStorage.getItem('hdp_config') || '{}') || {}; }
    catch(e) { window.hdpCardEditDraft = {}; }
  }
  return window.hdpCardEditDraft;
}

function hdpEnsureCardSlot(slotId) {
  var draft = hdpGetCardEditDraft();
  if (!draft.cards || typeof draft.cards !== 'object' || Array.isArray(draft.cards)) draft.cards = {};
  if (!draft.cards.slots || typeof draft.cards.slots !== 'object' || Array.isArray(draft.cards.slots)) draft.cards.slots = {};
  if (!draft.cards.slots[slotId] || typeof draft.cards.slots[slotId] !== 'object' || Array.isArray(draft.cards.slots[slotId])) {
    draft.cards.slots[slotId] = {};
  }
  return draft.cards.slots[slotId];
}

function hdpEnsureCardLayout() {
  var draft = hdpGetCardEditDraft();
  if (!draft.cards || typeof draft.cards !== 'object' || Array.isArray(draft.cards)) draft.cards = {};
  if (!draft.cards.layout || typeof draft.cards.layout !== 'object' || Array.isArray(draft.cards.layout)) {
    draft.cards.layout = {};
  }
  var layout = draft.cards.layout;
  if (layout.mode !== 'freeform' && layout.mode !== 'grid') layout.mode = 'grid';
  if (typeof layout.snap_enabled !== 'boolean') layout.snap_enabled = true;
  layout.snap_distance = hdpNormalizeSnapDistance(layout.snap_distance);
  if (typeof layout.collision_push !== 'boolean') layout.collision_push = true;
  return layout;
}

function hdpNormalizeSnapDistance(value) {
  var distance = Number(value);
  return isFinite(distance) ? Math.max(0, Math.min(40, Math.round(distance))) : 10;
}

function hdpMarkCardDraftDirty() {
  if (typeof hdpMarkSettingsDirty === 'function') hdpMarkSettingsDirty();
  var root = document.getElementById('hdp-root');
  if (root) root.setAttribute('data-card-dirty', 'true');
}

function hdpClosestCardEditControl(e) {
  if (e && e.target && e.target.closest) {
    var direct = e.target.closest('[data-card-edit-action]');
    if (direct) return direct;
  }
  var path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (var i = 0; i < path.length; i++) {
    if (path[i] && path[i].matches && path[i].matches('[data-card-edit-action]')) return path[i];
  }
  return null;
}

function hdpClosestHomeEditControl(e) {
  if (e && e.target && e.target.closest) {
    var direct = e.target.closest('.hdp-home-edit-bar [data-action], .hdp-card-edit-bar [data-action]');
    if (direct) return direct;
  }
  var path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (var i = 0; i < path.length; i++) {
    if (path[i] && path[i].matches && path[i].matches('.hdp-home-edit-bar [data-action], .hdp-card-edit-bar [data-action]')) return path[i];
  }
  return null;
}

function hdpInitCardSlotEditorActions() {
  if (window.hdpCardSlotEditorActionsReady) return;
  window.hdpCardSlotEditorActionsReady = true;
  document.addEventListener('click', function(e) {
    var toolbarControl = hdpClosestHomeEditControl(e);
    var toolbarAction = toolbarControl && toolbarControl.getAttribute('data-action');
    if (toolbarAction === 'enter-card-edit' || toolbarAction === 'add-card' || toolbarAction === 'manage-hidden-cards' ||
        toolbarAction === 'toggle-freeform-layout' || toolbarAction === 'toggle-card-snap' || toolbarAction === 'toggle-card-collision-push' || toolbarAction === 'align-card-grid' || toolbarAction === 'auto-arrange-cards' ||
        toolbarAction === 'save-card-edits' || toolbarAction === 'cancel-card-edits') {
      e.preventDefault();
      e.stopPropagation();
      if (toolbarAction === 'enter-card-edit') window.hdpToggleCardEditMode(true);
      else if (toolbarAction === 'add-card') window.hdpOpenAddCard();
      else if (toolbarAction === 'manage-hidden-cards') window.hdpOpenHiddenCardSlots();
      else if (toolbarAction === 'toggle-freeform-layout') window.hdpToggleFreeformLayout();
      else if (toolbarAction === 'toggle-card-snap') window.hdpToggleCardSnap();
      else if (toolbarAction === 'toggle-card-collision-push') window.hdpToggleCardCollisionPush();
      else if (toolbarAction === 'align-card-grid') window.hdpAlignCardsToGrid();
      else if (toolbarAction === 'auto-arrange-cards') window.hdpAutoArrangeCards();
      else if (toolbarAction === 'save-card-edits') window.hdpSaveCardEdits();
      else window.hdpCancelCardEdits();
      return;
    }
    var control = hdpClosestCardEditControl(e);
    if (!control) return;
    var action = control.getAttribute('data-card-edit-action');
    if (action === 'drag' || action === 'resize' || action === 'size' || action === 'grid-columns' || action === 'grid-rows') return;
    var slotId = control.getAttribute('data-slot-id');
    if (!slotId) return;
    e.preventDefault();
    e.stopPropagation();
    if (action === 'move') window.hdpMoveCardSlot(slotId, Number(control.getAttribute('data-delta') || 0));
    else if (action === 'yaml') window.hdpEditCardSlotYAML(slotId);
    else if (action === 'background') window.hdpEditCardSlotBackground(slotId);
    else if (action === 'hide') window.hdpHideCardSlot(slotId);
    else if (action === 'reset') window.hdpResetCardSlot(slotId);
  }, true);
  document.addEventListener('change', function(e) {
    var layoutInput = e.target && e.target.closest && e.target.closest('[data-card-layout-input]');
    if (layoutInput && layoutInput.getAttribute('data-card-layout-input') === 'snap-distance') {
      window.hdpSetCardSnapDistance(layoutInput.value);
      return;
    }
    var geometryInput = e.target && e.target.closest && e.target.closest('[data-card-geometry-field]');
    if (geometryInput) {
      window.hdpUpdateSelectedCardGeometry();
      return;
    }
    var control = hdpClosestCardEditControl(e);
    if (!control) return;
    var action = control.getAttribute('data-card-edit-action');
    if (action !== 'size' && action !== 'grid-columns' && action !== 'grid-rows') return;
    var slotId = control.getAttribute('data-slot-id');
    if (!slotId) return;
    if (action === 'size') window.hdpSetCardSlotSize(slotId, control.value);
    else window.hdpSetCardSlotGridSpan(slotId, action === 'grid-columns' ? control.value : null, action === 'grid-rows' ? control.value : null);
  }, true);
}

window.hdpToggleCardEditMode = function(force) {
  var root = document.getElementById('hdp-root');
  if (!root) return;
  var editing = typeof force === 'boolean' ? force : !root.classList.contains('hdp-root--card-edit');
  root.classList.toggle('hdp-root--card-edit', editing);
  var bars = document.querySelectorAll('.hdp-card-edit-bar');
  for (var i = 0; i < bars.length; i++) bars[i].setAttribute('data-editing', editing ? 'true' : 'false');
  if (editing) {
    var home = root.querySelector('.hdp-home-content');
    if (window.innerWidth > 639 && hdpEnsureCardLayout().mode !== 'freeform') hdpMigrateHomeToFreeform(home);
    else hdpActivateFreeformLayout(home);
  } else {
    hdpSelectCardSlot(null, root);
  }
  hdpSyncCardLayoutToolbar(root);
  hdpSetHomeCardDraggable(editing);
  hdpInitCardSlotDragging(root);
};

function hdpGetHomeSlotWrappers() {
  var home = document.querySelector('.hdp-home-content');
  if (!home) return [];
  return Array.prototype.slice.call(home.children).filter(function(child) {
    return child.classList && child.classList.contains('hdp-bento') && child.querySelector('[data-card-slot]');
  });
}

function hdpGetSlotElement(slotId) {
  var cards = document.querySelectorAll('[data-card-slot]');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute('data-card-slot') === String(slotId)) return cards[i];
  }
  return null;
}

function hdpGetSlotWrapperFromElement(element) {
  var directCard = element && element.getAttribute && element.getAttribute('data-card-slot')
    ? element
    : null;
  if (directCard) {
    var directParent = directCard.parentNode;
    return directParent && directParent.classList && directParent.classList.contains('hdp-bento')
      ? directParent
      : directCard;
  }
  var card = element && element.closest ? element.closest('[data-card-slot]') : null;
  if (!card && element && element.classList && element.classList.contains('hdp-bento')) {
    var directChild = element.querySelector('[data-card-slot]');
    if (directChild && directChild.parentNode === element) return element;
  }
  if (!card) return null;
  var parent = card.parentNode;
  return parent && parent.classList && parent.classList.contains('hdp-bento') ? parent : card;
}

function hdpGetSlotWrapper(slotId) {
  return hdpGetSlotWrapperFromElement(hdpGetSlotElement(slotId));
}

function hdpIsSlotWrapper(child) {
  if (!child || !child.parentNode) return false;
  if (child.getAttribute && child.getAttribute('data-card-slot')) return true;
  if (!child.classList || !child.classList.contains('hdp-bento')) return false;
  var card = child.querySelector('[data-card-slot]');
  return !!(card && card.parentNode === child);
}

function hdpGetSlotGroupWrappers(slotIdOrWrapper) {
  var wrapper = typeof slotIdOrWrapper === 'string'
    ? hdpGetSlotWrapper(slotIdOrWrapper)
    : slotIdOrWrapper;
  if (!wrapper || !wrapper.parentNode) return [];
  return Array.prototype.slice.call(wrapper.parentNode.children).filter(hdpIsSlotWrapper);
}

function hdpFindSlotWrapperFromTarget(target) {
  return hdpGetSlotWrapperFromElement(target);
}

function hdpPersistSlotGroupOrder(wrappers, markDirty) {
  var parent = wrappers[0] && wrappers[0].parentNode;
  var currentWrappers = parent
    ? Array.prototype.slice.call(parent.children).filter(hdpIsSlotWrapper)
    : wrappers;
  currentWrappers.forEach(function(wrapper, index) {
    var card = wrapper.getAttribute && wrapper.getAttribute('data-card-slot')
      ? wrapper
      : wrapper.querySelector('[data-card-slot]');
    var slotId = card && card.getAttribute('data-card-slot');
    if (!slotId) return;
    var slot = hdpEnsureCardSlot(slotId);
    slot.order = index;
    wrapper.style.order = index;
  });
  if (markDirty !== false) hdpMarkCardDraftDirty();
}

function hdpSetHomeCardDraggable(enabled) {
  var cards = document.querySelectorAll('.hdp-home-content [data-card-slot]');
  var wrappers = [];
  for (var i = 0; i < cards.length; i++) {
    var wrapper = hdpGetSlotWrapperFromElement(cards[i]);
    if (wrapper && wrappers.indexOf(wrapper) < 0) wrappers.push(wrapper);
  }
  wrappers.forEach(function(wrapper) {
    var isFreeformTopLevel = wrapper.parentNode && wrapper.parentNode.classList &&
      wrapper.parentNode.classList.contains('hdp-home-content') &&
      wrapper.parentNode.getAttribute('data-hdp-layout-mode') === 'freeform';
    if (enabled && !isFreeformTopLevel) wrapper.setAttribute('draggable', 'true');
    else wrapper.removeAttribute('draggable');
  });
}

function hdpPersistHomeSlotDomOrder(markDirty) {
  hdpPersistSlotGroupOrder(hdpGetHomeSlotWrappers(), markDirty);
}

function hdpGetFreeformBreakpoint() {
  return window.innerWidth <= 1023 ? 'tablet' : 'desktop';
}

function hdpGetWrapperSlotId(wrapper) {
  var card = wrapper && wrapper.getAttribute && wrapper.getAttribute('data-card-slot')
    ? wrapper
    : wrapper && wrapper.querySelector ? wrapper.querySelector('[data-card-slot]') : null;
  return card && card.getAttribute ? card.getAttribute('data-card-slot') : '';
}

function hdpRectFromWrapper(wrapper, home) {
  var rect = wrapper.getBoundingClientRect();
  var homeRect = home.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(rect.left - homeRect.left)),
    y: Math.max(0, Math.round(rect.top - homeRect.top)),
    width: Math.max(150, Math.round(rect.width)),
    height: Math.max(96, Math.round(rect.height))
  };
}

function hdpSanitizeFreeformRect(rect, width) {
  width = Math.max(150, Math.round(Number(width) || 1200));
  var safeWidth = Math.max(150, Math.min(width, Math.round(Number(rect && rect.width) || 300)));
  var safeHeight = Math.max(96, Math.round(Number(rect && rect.height) || 192));
  return {
    x: Math.max(0, Math.min(width - safeWidth, Math.round(Number(rect && rect.x) || 0))),
    y: Math.max(0, Math.round(Number(rect && rect.y) || 0)),
    width: safeWidth,
    height: safeHeight
  };
}

function hdpApplyFreeformRect(wrapper, rect, breakpoint) {
  if (!wrapper || !rect) return;
  var prefix = breakpoint === 'tablet' ? '--hdp-ff-tablet-' : '--hdp-ff-';
  wrapper.style.setProperty(prefix + 'x', rect.x + 'px');
  wrapper.style.setProperty(prefix + 'y', rect.y + 'px');
  wrapper.style.setProperty(prefix + 'width', rect.width + 'px');
  wrapper.style.setProperty(prefix + 'height', rect.height + 'px');
  wrapper.setAttribute('data-hdp-freeform-' + breakpoint, 'true');
}

function hdpSetFreeformRect(slotId, wrapper, rect, breakpoint, markDirty, containerWidth) {
  if (!slotId || !wrapper || !rect) return;
  breakpoint = breakpoint === 'tablet' ? 'tablet' : 'desktop';
  var slot = hdpEnsureCardSlot(slotId);
  if (!slot.freeform || typeof slot.freeform !== 'object' || Array.isArray(slot.freeform)) slot.freeform = {};
  var safe = hdpSanitizeFreeformRect(rect, containerWidth || 1200);
  slot.freeform[breakpoint] = safe;
  hdpApplyFreeformRect(wrapper, safe, breakpoint);
  if (markDirty !== false) hdpMarkCardDraftDirty();
  return safe;
}

function hdpGetSavedFreeformRect(slotId, breakpoint) {
  var draft = hdpGetCardEditDraft();
  var slot = draft.cards && draft.cards.slots && draft.cards.slots[slotId];
  return slot && slot.freeform && slot.freeform[breakpoint] ? slot.freeform[breakpoint] : null;
}


function hdpGetAlternateCanvasWidth(width, breakpoint) {
  width = Math.max(150, Number(width) || 1200);
  return breakpoint === 'desktop'
    ? Math.max(640, Math.min(960, Math.round(width * 0.72)))
    : Math.max(1024, Math.round(width * 1.5));
}

function hdpFindFreeformPlacement(size, peers, width, gap) {
  width = Math.max(150, Number(width) || 1200);
  gap = Math.max(0, Number(gap) || 12);
  var safeSize = hdpSanitizeFreeformRect({ x: 0, y: 0, width: size.width, height: size.height }, width);
  var anchors = [0];
  peers.forEach(function(peer) {
    var candidate = Math.round(peer.x + peer.width + gap);
    if (candidate + safeSize.width <= width && anchors.indexOf(candidate) < 0) anchors.push(candidate);
  });
  anchors.sort(function(a, b) { return a - b; });
  var best = null;
  anchors.forEach(function(x) {
    var y = peers.filter(function(peer) {
      return x < peer.x + peer.width && x + safeSize.width > peer.x;
    }).reduce(function(bottom, peer) {
      return Math.max(bottom, peer.y + peer.height + gap);
    }, 0);
    if (!best || y < best.y || (y === best.y && x < best.x)) best = { x: x, y: y };
  });
  return hdpSanitizeFreeformRect({
    x: best ? best.x : 0,
    y: best ? best.y : 0,
    width: safeSize.width,
    height: safeSize.height
  }, width);
}

function hdpPackFreeformItems(items, targetWidth, sourceWidth) {
  var placed = [];
  var output = {};
  var scale = Math.max(0.35, Math.min(2, targetWidth / Math.max(150, sourceWidth || targetWidth)));
  items.forEach(function(item) {
    var rect = hdpFindFreeformPlacement({
      width: Math.max(150, Math.min(targetWidth, Math.round(item.rect.width * scale))),
      height: item.rect.height
    }, placed, targetWidth, 12);
    output[item.slotId] = rect;
    placed.push(rect);
  });
  return output;
}

function hdpUpdateFreeformCanvasHeight(home) {
  if (!home || home.getAttribute('data-hdp-layout-mode') !== 'freeform') return;
  var bottom = 0;
  hdpGetHomeSlotWrappers().forEach(function(wrapper) {
    var rect = hdpRectFromWrapper(wrapper, home);
    bottom = Math.max(bottom, rect.y + rect.height);
  });
  var property = hdpGetFreeformBreakpoint() === 'tablet'
    ? '--hdp-freeform-tablet-canvas-height'
    : '--hdp-freeform-canvas-height';
  home.style.setProperty(property, Math.max(320, Math.ceil(bottom + 12)) + 'px');
}

var hdpActiveFreeformBreakpoint = null;

function hdpActivateFreeformLayout(home) {
  if (!home || window.innerWidth <= 639) return;
  var layout = hdpEnsureCardLayout();
  if (layout.mode !== 'freeform') return;
  var breakpoint = hdpGetFreeformBreakpoint();
  var alternate = breakpoint === 'desktop' ? 'tablet' : 'desktop';
  var width = Math.max(150, Math.round(home.clientWidth || home.getBoundingClientRect().width || 1200));
  var wrappers = hdpGetHomeSlotWrappers();
  var measured = wrappers.map(function(wrapper) {
    return { wrapper: wrapper, slotId: hdpGetWrapperSlotId(wrapper), rect: hdpRectFromWrapper(wrapper, home) };
  });
  home.setAttribute('data-hdp-layout-mode', 'freeform');
  var placed = [];
  measured.forEach(function(item) {
    var saved = hdpGetSavedFreeformRect(item.slotId, breakpoint);
    var safe;
    if (saved) {
      safe = hdpSanitizeFreeformRect(saved, width);
    } else {
      var alternateRect = hdpGetSavedFreeformRect(item.slotId, alternate);
      var alternateWidth = hdpGetAlternateCanvasWidth(width, breakpoint);
      var source = alternateRect || item.rect;
      safe = hdpFindFreeformPlacement({
        width: Math.round(source.width * width / alternateWidth),
        height: source.height
      }, placed, width, 12);
      hdpSetFreeformRect(item.slotId, item.wrapper, safe, breakpoint, false, width);
    }
    hdpApplyFreeformRect(item.wrapper, safe, breakpoint);
    placed.push(safe);
  });
  hdpActiveFreeformBreakpoint = breakpoint;
  hdpUpdateFreeformCanvasHeight(home);
}

function hdpMigrateHomeToFreeform(home) {
  if (!home || window.innerWidth <= 639) return;
  var breakpoint = hdpGetFreeformBreakpoint();
  var alternate = breakpoint === 'desktop' ? 'tablet' : 'desktop';
  var width = Math.max(150, Math.round(home.clientWidth || home.getBoundingClientRect().width || 1200));
  var items = hdpGetHomeSlotWrappers().map(function(wrapper) {
    return {
      wrapper: wrapper,
      slotId: hdpGetWrapperSlotId(wrapper),
      rect: hdpSanitizeFreeformRect(hdpRectFromWrapper(wrapper, home), width)
    };
  });
  var alternateWidth = hdpGetAlternateCanvasWidth(width, breakpoint);
  var alternateRects = hdpPackFreeformItems(items, alternateWidth, width);
  hdpEnsureCardLayout().mode = 'freeform';
  home.setAttribute('data-hdp-layout-mode', 'freeform');
  items.forEach(function(item) {
    hdpSetFreeformRect(item.slotId, item.wrapper, item.rect, breakpoint, false, width);
    hdpSetFreeformRect(item.slotId, item.wrapper, alternateRects[item.slotId], alternate, false, alternateWidth);
  });
  hdpActiveFreeformBreakpoint = breakpoint;
  hdpMarkCardDraftDirty();
  hdpUpdateFreeformCanvasHeight(home);
}

function hdpGetPeerRects(home, activeWrapper) {
  return hdpGetHomeSlotWrappers().filter(function(wrapper) { return wrapper !== activeWrapper; }).map(function(wrapper) {
    return hdpRectFromWrapper(wrapper, home);
  });
}

function hdpClosestSnap(edges, anchors, threshold) {
  var best = null;
  edges.forEach(function(edge) {
    anchors.forEach(function(anchor) {
      var distance = Math.abs(edge.value - anchor);
      if (distance <= threshold && (!best || distance < best.distance)) best = { anchor: anchor, offset: edge.offset, distance: distance };
    });
  });
  return best;
}

function hdpSnapFreeformRect(rect, peers, width, enabled, threshold, height) {
  if (!enabled) return { rect: rect };
  var xAnchors = [0, width / 2, width];
  var yAnchors = [0];
  var canvasBottom = Math.max(0, Math.round(Number(height) || 0) - 12);
  if (canvasBottom > 0) yAnchors.push(canvasBottom / 2, canvasBottom);
  peers.forEach(function(peer) {
    xAnchors.push(peer.x, peer.x + peer.width / 2, peer.x + peer.width);
    yAnchors.push(peer.y, peer.y + peer.height / 2, peer.y + peer.height);
  });
  var xSnap = hdpClosestSnap([
    { value: rect.x, offset: 0 },
    { value: rect.x + rect.width / 2, offset: rect.width / 2 },
    { value: rect.x + rect.width, offset: rect.width }
  ], xAnchors, threshold);
  var ySnap = hdpClosestSnap([
    { value: rect.y, offset: 0 },
    { value: rect.y + rect.height / 2, offset: rect.height / 2 },
    { value: rect.y + rect.height, offset: rect.height }
  ], yAnchors, threshold);
  return {
    rect: {
      x: Math.max(0, Math.min(width - rect.width, Math.round(xSnap ? xSnap.anchor - xSnap.offset : rect.x))),
      y: Math.max(0, Math.round(ySnap ? ySnap.anchor - ySnap.offset : rect.y)),
      width: rect.width,
      height: rect.height
    },
    guideX: xSnap ? xSnap.anchor : null,
    guideY: ySnap ? ySnap.anchor : null
  };
}

function hdpSnapFreeformResizeRect(rect, peers, width, enabled, threshold, edge, height) {
  if (!enabled) return { rect: rect };
  edge = String(edge || 'se');
  var xAnchors = [0, width];
  var yAnchors = [0];
  var canvasBottom = Math.max(0, Math.round(Number(height) || 0) - 12);
  if (canvasBottom > 0) yAnchors.push(canvasBottom / 2, canvasBottom);
  peers.forEach(function(peer) {
    xAnchors.push(peer.x, peer.x + peer.width / 2, peer.x + peer.width);
    yAnchors.push(peer.y, peer.y + peer.height / 2, peer.y + peer.height);
  });
  var snapWest = edge.indexOf('w') >= 0;
  var snapEast = edge.indexOf('e') >= 0;
  var snapNorth = edge.indexOf('n') >= 0;
  var snapSouth = edge.indexOf('s') >= 0;
  var xSnap = hdpClosestSnap(snapWest
    ? [{ value: rect.x, offset: 0 }]
    : snapEast ? [{ value: rect.x + rect.width, offset: rect.x }] : [], xAnchors, threshold);
  var ySnap = hdpClosestSnap(snapNorth
    ? [{ value: rect.y, offset: 0 }]
    : snapSouth ? [{ value: rect.y + rect.height, offset: rect.y }] : [], yAnchors, threshold);
  var snapped = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  if (xSnap && snapWest) {
    var right = rect.x + rect.width;
    if (right - xSnap.anchor >= 150) {
      snapped.x = xSnap.anchor;
      snapped.width = right - xSnap.anchor;
    } else xSnap = null;
  } else if (xSnap && snapEast) {
    if (xSnap.anchor - rect.x >= 150) snapped.width = xSnap.anchor - rect.x;
    else xSnap = null;
  }
  if (ySnap && snapNorth) {
    var bottom = rect.y + rect.height;
    if (bottom - ySnap.anchor >= 96) {
      snapped.y = ySnap.anchor;
      snapped.height = bottom - ySnap.anchor;
    } else ySnap = null;
  } else if (ySnap && snapSouth) {
    if (ySnap.anchor - rect.y >= 96) snapped.height = ySnap.anchor - rect.y;
    else ySnap = null;
  }
  return {
    rect: hdpSanitizeFreeformRect(snapped, width),
    guideX: xSnap ? xSnap.anchor : null,
    guideY: ySnap ? ySnap.anchor : null
  };
}

function hdpResizeFreeformRect(startRect, deltaX, deltaY, edge, width) {
  edge = String(edge || 'se');
  var right = startRect.x + startRect.width;
  var bottom = startRect.y + startRect.height;
  var rect = { x: startRect.x, y: startRect.y, width: startRect.width, height: startRect.height };
  if (edge.indexOf('w') >= 0) {
    rect.x = Math.max(0, Math.min(right - 150, startRect.x + deltaX));
    rect.width = right - rect.x;
  } else if (edge.indexOf('e') >= 0) {
    rect.width = Math.max(150, Math.min(width - startRect.x, startRect.width + deltaX));
  }
  if (edge.indexOf('n') >= 0) {
    rect.y = Math.max(0, Math.min(bottom - 96, startRect.y + deltaY));
    rect.height = bottom - rect.y;
  } else if (edge.indexOf('s') >= 0) {
    rect.height = Math.max(96, startRect.height + deltaY);
  }
  return hdpSanitizeFreeformRect(rect, width);
}

function hdpShowSnapGuides(home, guideX, guideY) {
  var x = home.querySelector('.hdp-snap-guide--x');
  var y = home.querySelector('.hdp-snap-guide--y');
  if (x) {
    x.setAttribute('data-visible', guideX == null ? 'false' : 'true');
    if (guideX != null) x.style.left = Math.round(guideX) + 'px';
  }
  if (y) {
    y.setAttribute('data-visible', guideY == null ? 'false' : 'true');
    if (guideY != null) y.style.top = Math.round(guideY) + 'px';
  }
}

function hdpAnnounceCardLayout(root, text) {
  if (!root || !root.querySelectorAll) return;
  var statuses = root.querySelectorAll('.hdp-card-layout-status');
  for (var i = 0; i < statuses.length; i++) statuses[i].textContent = text;
}

function hdpSelectCardSlot(slotId, root) {
  root = root || document.getElementById('hdp-root');
  hdpSelectedCardSlotId = slotId ? String(slotId) : null;
  hdpGetHomeSlotWrappers().forEach(function(wrapper) {
    wrapper.classList.remove('hdp-bento--selected');
  });
  var selected = hdpSelectedCardSlotId && hdpGetSlotWrapper(hdpSelectedCardSlotId);
  if (selected && selected.parentNode && selected.parentNode.classList && selected.parentNode.classList.contains('hdp-home-content')) {
    selected.classList.add('hdp-bento--selected');
  } else if (hdpSelectedCardSlotId) {
    hdpSelectedCardSlotId = null;
  }
  if (root) hdpSyncCardGeometryEditor(root);
}

function hdpSyncCardGeometryEditor(root) {
  if (!root || !root.querySelector) return;
  var editor = root.querySelector('[data-card-geometry-editor]');
  if (!editor) return;
  var home = root.querySelector('.hdp-home-content');
  var wrapper = hdpSelectedCardSlotId && hdpGetSlotWrapper(hdpSelectedCardSlotId);
  var visible = Boolean(
    hdpSelectedCardSlotId && wrapper && home && wrapper.parentNode === home &&
    root.classList.contains('hdp-root--card-edit') &&
    home.getAttribute('data-hdp-layout-mode') === 'freeform' && window.innerWidth > 639
  );
  editor.hidden = !visible;
  editor.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (!visible) return;
  var rect = hdpRectFromWrapper(wrapper, home);
  var label = editor.querySelector('[data-card-geometry-label]');
  if (label) label.textContent = hdpSelectedCardSlotId + ' · ' + (hdpGetFreeformBreakpoint() === 'tablet' ? '平板' : '桌面');
  ['x', 'y', 'width', 'height'].forEach(function(field) {
    var input = editor.querySelector('[data-card-geometry-field="' + field + '"]');
    if (input && document.activeElement !== input) input.value = String(rect[field]);
  });
}

window.hdpSetCardSnapDistance = function(value) {
  var root = document.getElementById('hdp-root');
  var layout = hdpEnsureCardLayout();
  layout.snap_distance = hdpNormalizeSnapDistance(value);
  hdpMarkCardDraftDirty();
  if (root) hdpSyncCardLayoutToolbar(root);
};

window.hdpUpdateSelectedCardGeometry = function() {
  var root = document.getElementById('hdp-root');
  var home = root && root.querySelector('.hdp-home-content');
  var editor = root && root.querySelector('[data-card-geometry-editor]');
  var wrapper = hdpSelectedCardSlotId && hdpGetSlotWrapper(hdpSelectedCardSlotId);
  if (!root || !home || !editor || !wrapper || wrapper.parentNode !== home || window.innerWidth <= 639) return;
  var width = home.clientWidth || home.getBoundingClientRect().width || 1200;
  var current = hdpRectFromWrapper(wrapper, home);
  var candidate = { x: current.x, y: current.y, width: current.width, height: current.height };
  ['x', 'y', 'width', 'height'].forEach(function(field) {
    var input = editor.querySelector('[data-card-geometry-field="' + field + '"]');
    var value = input ? Number(input.value) : NaN;
    if (isFinite(value)) candidate[field] = Math.round(value);
  });
  var layout = hdpEnsureCardLayout();
  var peers = hdpGetPeerRects(home, wrapper);
  var resolved = hdpResolveFreeformDrop(candidate, peers, width, 12, layout.collision_push);
  var breakpoint = hdpGetFreeformBreakpoint();
  var finalRect = hdpSetFreeformRect(hdpSelectedCardSlotId, wrapper, resolved, breakpoint, false, width);
  if (layout.collision_push) hdpPushCollidingPeers(home, wrapper, finalRect, breakpoint, width, 12);
  hdpUpdateFreeformCanvasHeight(home);
  hdpMarkCardDraftDirty();
  hdpSyncCardGeometryEditor(root);
  hdpAnnounceCardLayout(root, '卡片位置 ' + finalRect.x + ', ' + finalRect.y + '，尺寸 ' + finalRect.width + ' × ' + finalRect.height + ' 像素');
};

function hdpRectOverlaps(left, right, gap) {
  return left.x < right.x + right.width + gap && left.x + left.width + gap > right.x &&
    left.y < right.y + right.height + gap && left.y + left.height + gap > right.y;
}

function hdpResolveFreeformCollision(rect, peers, width, gap) {
  var result = rect;
  for (var i = 0; i < peers.length + 2; i++) {
    var collision = peers.find(function(peer) { return hdpRectOverlaps(result, peer, gap); });
    if (!collision) break;
    result = { x: result.x, y: collision.y + collision.height + gap, width: result.width, height: result.height };
  }
  result.x = Math.max(0, Math.min(width - result.width, result.x));
  return result;
}

function hdpResolveFreeformDrop(rect, peers, width, gap, pushPeers) {
  var safe = hdpSanitizeFreeformRect(rect, width);
  return pushPeers ? safe : hdpResolveFreeformCollision(safe, peers, width, gap);
}

function hdpPushCollidingPeers(home, activeWrapper, activeRect, breakpoint, width, gap) {
  var wrappers = hdpGetHomeSlotWrappers();
  var rects = wrappers.map(function(wrapper) {
    return { wrapper: wrapper, rect: wrapper === activeWrapper ? activeRect : hdpRectFromWrapper(wrapper, home) };
  });
  var queue = rects.filter(function(item) { return item.wrapper === activeWrapper; });
  var iterations = 0;
  while (queue.length && iterations < wrappers.length * wrappers.length + 1) {
    var source = queue.shift();
    rects.forEach(function(peer) {
      if (peer.wrapper === source.wrapper || !hdpRectOverlaps(source.rect, peer.rect, gap)) return;
      peer.rect = hdpSanitizeFreeformRect({
        x: peer.rect.x,
        y: source.rect.y + source.rect.height + gap,
        width: peer.rect.width,
        height: peer.rect.height
      }, width);
      hdpSetFreeformRect(hdpGetWrapperSlotId(peer.wrapper), peer.wrapper, peer.rect, breakpoint, false, width);
      queue.push(peer);
    });
    iterations += 1;
  }
}

function hdpSyncCardLayoutToolbar(root) {
  var layout = hdpEnsureCardLayout();
  var freeform = root.querySelector('[data-action="toggle-freeform-layout"]');
  var snap = root.querySelector('[data-action="toggle-card-snap"]');
  var collisionPush = root.querySelector('[data-action="toggle-card-collision-push"]');
  var snapDistance = root.querySelector('[data-card-layout-input="snap-distance"]');
  if (freeform) {
    freeform.setAttribute('aria-pressed', layout.mode === 'freeform' ? 'true' : 'false');
    freeform.textContent = layout.mode === 'freeform' ? '自由布局：开' : '自由布局';
  }
  if (snap) {
    snap.setAttribute('aria-pressed', layout.snap_enabled ? 'true' : 'false');
    snap.textContent = layout.snap_enabled ? '磁吸：开' : '磁吸：关';
  }
  if (collisionPush) {
    collisionPush.setAttribute('aria-pressed', layout.collision_push ? 'true' : 'false');
    collisionPush.textContent = layout.collision_push ? '推开卡片：开' : '推开卡片：关';
  }
  if (snapDistance && document.activeElement !== snapDistance) snapDistance.value = String(layout.snap_distance);
  hdpSyncCardGeometryEditor(root);
}

window.hdpToggleFreeformLayout = function() {
  var root = document.getElementById('hdp-root');
  var home = root && root.querySelector('.hdp-home-content');
  if (!root || !home || window.innerWidth <= 639) return;
  var layout = hdpEnsureCardLayout();
  if (layout.mode === 'freeform') {
    layout.mode = 'grid';
    home.setAttribute('data-hdp-layout-mode', 'grid');
    home.style.removeProperty('--hdp-freeform-canvas-height');
    home.style.removeProperty('--hdp-freeform-tablet-canvas-height');
    hdpActiveFreeformBreakpoint = null;
    hdpMarkCardDraftDirty();
  } else {
    hdpMigrateHomeToFreeform(home);
  }
  hdpSyncCardLayoutToolbar(root);
  hdpSetHomeCardDraggable(root.classList.contains('hdp-root--card-edit'));
};

window.hdpToggleCardSnap = function() {
  var root = document.getElementById('hdp-root');
  var layout = hdpEnsureCardLayout();
  layout.snap_enabled = !layout.snap_enabled;
  hdpMarkCardDraftDirty();
  if (root) hdpSyncCardLayoutToolbar(root);
};

window.hdpToggleCardCollisionPush = function() {
  var root = document.getElementById('hdp-root');
  var layout = hdpEnsureCardLayout();
  layout.collision_push = !layout.collision_push;
  hdpMarkCardDraftDirty();
  if (root) hdpSyncCardLayoutToolbar(root);
};

function hdpAlignFreeformRectsToGrid(items, width, gap) {
  var grid = 12;
  var safeWidth = Math.max(156, Math.floor((Number(width) || 1200) / grid) * grid);
  var safeGap = Math.max(0, Number(gap) || grid);
  var placed = [];
  var output = {};
  items.map(function(item, index) {
    return { slotId: item.slotId, rect: item.rect, index: index };
  }).sort(function(left, right) {
    return left.rect.y - right.rect.y || left.rect.x - right.rect.x || left.index - right.index;
  }).forEach(function(item) {
    var alignedWidth = Math.max(156, Math.round(item.rect.width / grid) * grid);
    alignedWidth = Math.min(safeWidth, alignedWidth);
    var aligned = {
      x: Math.max(0, Math.round(item.rect.x / grid) * grid),
      y: Math.max(0, Math.round(item.rect.y / grid) * grid),
      width: alignedWidth,
      height: Math.max(96, Math.round(item.rect.height / grid) * grid)
    };
    if (aligned.x + aligned.width > safeWidth) {
      aligned.x = Math.max(0, Math.floor((safeWidth - aligned.width) / grid) * grid);
    }
    aligned = hdpResolveFreeformCollision(aligned, placed, safeWidth, safeGap);
    output[item.slotId] = aligned;
    placed.push(aligned);
  });
  return output;
}

window.hdpAlignCardsToGrid = function() {
  var root = document.getElementById('hdp-root');
  var home = root && root.querySelector('.hdp-home-content');
  if (!home || hdpEnsureCardLayout().mode !== 'freeform') return;
  var breakpoint = hdpGetFreeformBreakpoint();
  var width = home.clientWidth || home.getBoundingClientRect().width || 1200;
  var items = hdpGetHomeSlotWrappers().map(function(wrapper) {
    return { wrapper: wrapper, slotId: hdpGetWrapperSlotId(wrapper), rect: hdpRectFromWrapper(wrapper, home) };
  });
  var aligned = hdpAlignFreeformRectsToGrid(items, width, 12);
  items.forEach(function(item) {
    hdpSetFreeformRect(item.slotId, item.wrapper, aligned[item.slotId], breakpoint, false, width);
  });
  hdpMarkCardDraftDirty();
  hdpUpdateFreeformCanvasHeight(home);
};

window.hdpAutoArrangeCards = function() {
  var root = document.getElementById('hdp-root');
  var home = root && root.querySelector('.hdp-home-content');
  if (!home || window.innerWidth <= 639) return;
  if (hdpEnsureCardLayout().mode !== 'freeform') hdpMigrateHomeToFreeform(home);
  var width = home.clientWidth || home.getBoundingClientRect().width;
  var breakpoint = hdpGetFreeformBreakpoint();
  var items = hdpGetHomeSlotWrappers().map(function(wrapper) {
    return { wrapper: wrapper, slotId: hdpGetWrapperSlotId(wrapper), rect: hdpRectFromWrapper(wrapper, home) };
  });
  var packed = hdpPackFreeformItems(items, width, width);
  items.forEach(function(item) {
    hdpSetFreeformRect(item.slotId, item.wrapper, packed[item.slotId], breakpoint, false, width);
  });
  hdpMarkCardDraftDirty();
  hdpUpdateFreeformCanvasHeight(home);
  hdpSyncCardLayoutToolbar(root);
};

function hdpInitCardSlotDragging(root) {
  if (!root || root.__hdpCardSlotDragReady) return;
  root.__hdpCardSlotDragReady = true;
  window.hdpCardSlotDragReady = true;
  var dragging = null;
  var draggingGroup = [];
  var clearDragHighlights = function() {
    hdpGetHomeSlotWrappers().forEach(function(wrapper) {
      wrapper.classList.remove('hdp-bento--dragging');
      wrapper.classList.remove('hdp-bento--drag-over');
    });
    var cards = document.querySelectorAll('.hdp-home-content [data-card-slot]');
    for (var i = 0; i < cards.length; i++) {
      var wrapper = hdpGetSlotWrapperFromElement(cards[i]);
      if (wrapper) {
        wrapper.classList.remove('hdp-bento--dragging');
        wrapper.classList.remove('hdp-bento--drag-over');
      }
    }
  };
  root.addEventListener('dragstart', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    var dragHandle = e.target && e.target.closest && e.target.closest('[data-card-edit-action="drag"]');
    if (e.target && e.target.closest && e.target.closest('.hdp-slot-edit-panel') && !dragHandle) {
      e.preventDefault();
      return;
    }
    var wrapper = hdpFindSlotWrapperFromTarget(dragHandle || e.target);
    if (!wrapper) return;
    var card = wrapper.getAttribute('data-card-slot') ? wrapper : wrapper.querySelector('[data-card-slot]');
    if (!card) return;
    dragging = wrapper;
    draggingGroup = hdpGetSlotGroupWrappers(wrapper);
    wrapper.classList.add('hdp-bento--dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.getAttribute('data-card-slot') || '');
    }
  });
  root.addEventListener('dragover', function(e) {
    if (!dragging) return;
    var target = hdpFindSlotWrapperFromTarget(e.target);
    if (!target || target === dragging || target.parentNode !== dragging.parentNode) return;
    e.preventDefault();
    draggingGroup.forEach(function(wrapper) { wrapper.classList.remove('hdp-bento--drag-over'); });
    target.classList.add('hdp-bento--drag-over');
  });
  root.addEventListener('drop', function(e) {
    if (!dragging) return;
    var target = hdpFindSlotWrapperFromTarget(e.target);
    draggingGroup.forEach(function(wrapper) { wrapper.classList.remove('hdp-bento--drag-over'); });
    if (!target || target === dragging || target.parentNode !== dragging.parentNode) return;
    e.preventDefault();
    var rect = target.getBoundingClientRect();
    var after = e.clientY > rect.top + rect.height / 2 || (Math.abs(e.clientY - (rect.top + rect.height / 2)) < 12 && e.clientX > rect.left + rect.width / 2);
    target.parentNode.insertBefore(dragging, after ? target.nextSibling : target);
    hdpPersistSlotGroupOrder(draggingGroup, true);
  });
  root.addEventListener('dragend', function() {
    clearDragHighlights();
    dragging = null;
    draggingGroup = [];
  });

  var pointerDragging = null;
  var pointerHandle = null;
  var pointerMoved = false;
  var pointerResize = null;
  var pointerFreeform = null;
  root.addEventListener('pointerdown', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    var selectedWrapper = hdpFindSlotWrapperFromTarget(e.target);
    if (selectedWrapper && selectedWrapper.parentNode && selectedWrapper.parentNode.classList && selectedWrapper.parentNode.classList.contains('hdp-home-content')) {
      hdpSelectCardSlot(hdpGetWrapperSlotId(selectedWrapper), root);
    }
    var handle = hdpClosestCardEditControl(e);
    if (!handle) return;
    var action = handle.getAttribute('data-card-edit-action');
    if (action !== 'drag' && action !== 'resize') return;
    var wrapper = hdpFindSlotWrapperFromTarget(handle);
    if (!wrapper) return;
    var freeformHome = null;
    if (wrapper.parentNode && wrapper.parentNode.classList &&
        wrapper.parentNode.classList.contains('hdp-home-content') &&
        wrapper.parentNode.getAttribute('data-hdp-layout-mode') === 'freeform') {
      freeformHome = wrapper.parentNode;
    }
    if (freeformHome && window.innerWidth > 639) {
      var freeformSlotId = handle.getAttribute('data-slot-id') || hdpGetWrapperSlotId(wrapper);
      var freeformRect = hdpRectFromWrapper(wrapper, freeformHome);
      pointerFreeform = {
        action: action,
        edge: handle.getAttribute('data-resize-edge') || 'se',
        slotId: freeformSlotId,
        wrapper: wrapper,
        handle: handle,
        home: freeformHome,
        breakpoint: hdpGetFreeformBreakpoint(),
        startX: e.clientX,
        startY: e.clientY,
        startRect: freeformRect,
        currentRect: freeformRect,
        peers: hdpGetPeerRects(freeformHome, wrapper),
        width: freeformHome.clientWidth || freeformHome.getBoundingClientRect().width,
        height: freeformHome.clientHeight || freeformHome.getBoundingClientRect().height || 320,
        moved: false
      };
      if (action === 'resize') wrapper.classList.add('hdp-bento--resizing');
      else wrapper.classList.add('hdp-bento--dragging');
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (action === 'resize') {
      var slotId = handle.getAttribute('data-slot-id');
      var home = wrapper.parentNode && wrapper.parentNode.classList && wrapper.parentNode.classList.contains('hdp-home-content')
        ? wrapper.parentNode
        : null;
      if (!slotId || !home || !wrapper.getBoundingClientRect || !home.getBoundingClientRect) return;
      var wrapperRect = wrapper.getBoundingClientRect();
      var homeRect = home.getBoundingClientRect();
      var styles = typeof getComputedStyle === 'function' ? getComputedStyle(home) : null;
      var gap = styles ? parseFloat(styles.columnGap || styles.gap || '0') : 0;
      if (isNaN(gap)) gap = 0;
      var rowHeight = styles ? parseFloat(styles.getPropertyValue('--hdp-density-row-height') || '120') : 120;
      if (isNaN(rowHeight) || rowHeight < 1) rowHeight = 120;
      var slot = hdpEnsureCardSlot(slotId);
      var initialColumns = parseInt(slot.grid_columns, 10);
      var initialRows = parseInt(slot.grid_rows, 10);
      if (isNaN(initialColumns)) initialColumns = Math.max(1, Math.min(4, Math.round((wrapperRect.width + gap) / ((homeRect.width - gap * 3) / 4 + gap))));
      if (isNaN(initialRows)) initialRows = Math.max(1, Math.min(6, Math.round((wrapperRect.height + gap) / (rowHeight + gap))));
      pointerResize = {
        slotId: slotId,
        wrapper: wrapper,
        handle: handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: wrapperRect.width,
        startHeight: wrapperRect.height,
        columnWidth: Math.max(1, (homeRect.width - gap * 3) / 4),
        rowHeight: rowHeight,
        gap: gap,
        columns: initialColumns,
        rows: initialRows,
        live: false
      };
      wrapper.classList.add('hdp-bento--resizing');
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    pointerDragging = wrapper;
    draggingGroup = hdpGetSlotGroupWrappers(wrapper);
    pointerHandle = handle;
    pointerMoved = false;
    wrapper.classList.add('hdp-bento--dragging');
    if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  root.addEventListener('pointermove', function(e) {
    if (pointerFreeform) {
      var freeform = pointerFreeform;
      var deltaX = e.clientX - freeform.startX;
      var deltaY = e.clientY - freeform.startY;
      var layout = hdpEnsureCardLayout();
      var candidate;
      if (freeform.action === 'resize') {
        candidate = hdpResizeFreeformRect(freeform.startRect, deltaX, deltaY, freeform.edge, freeform.width);
      } else {
        candidate = {
          x: Math.max(0, Math.min(freeform.width - freeform.startRect.width, freeform.startRect.x + deltaX)),
          y: Math.max(0, freeform.startRect.y + deltaY),
          width: freeform.startRect.width,
          height: freeform.startRect.height
        };
      }
      var snapped;
      if (freeform.action === 'resize') {
        snapped = hdpSnapFreeformResizeRect(candidate, freeform.peers, freeform.width, layout.snap_enabled, layout.snap_distance, freeform.edge, freeform.height);
      } else {
        snapped = hdpSnapFreeformRect(candidate, freeform.peers, freeform.width, layout.snap_enabled, layout.snap_distance, freeform.height);
      }
      freeform.currentRect = snapped.rect;
      freeform.moved = freeform.moved || Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1;
      hdpSetFreeformRect(freeform.slotId, freeform.wrapper, snapped.rect, freeform.breakpoint, false, freeform.width);
      hdpSyncCardGeometryEditor(root);
      hdpShowSnapGuides(freeform.home, snapped.guideX, snapped.guideY);
      hdpUpdateFreeformCanvasHeight(freeform.home);
      e.preventDefault();
      return;
    }
    if (pointerResize) {
      var resize = pointerResize;
      if (!resize.live && (e.clientX !== resize.startX || e.clientY !== resize.startY)) {
        resize.live = true;
      }
      var columns = Math.max(1, Math.min(4, Math.round((resize.startWidth + (e.clientX - resize.startX) + resize.gap) / (resize.columnWidth + resize.gap))));
      var rows = Math.max(1, Math.min(6, Math.round((resize.startHeight + (e.clientY - resize.startY) + resize.gap) / (resize.rowHeight + resize.gap))));
      resize.columns = columns;
      resize.rows = rows;
      resize.wrapper.setAttribute('data-hdp-bento-custom', 'true');
      resize.wrapper.style.setProperty('--hdp-bento-column-span', columns);
      resize.wrapper.style.setProperty('--hdp-bento-tablet-column-span', Math.min(columns, 2));
      resize.wrapper.style.setProperty('--hdp-bento-row-span', rows);
      if (resize.handle) resize.handle.textContent = columns + '×' + rows;
      e.preventDefault();
      return;
    }
    if (!pointerDragging || !document.elementFromPoint) return;
    var hovered = document.elementFromPoint(e.clientX, e.clientY);
    var target = hdpFindSlotWrapperFromTarget(hovered);
    if (!target || target === pointerDragging || target.parentNode !== pointerDragging.parentNode) return;
    var rect = target.getBoundingClientRect();
    var after = e.clientY > rect.top + rect.height / 2 ||
      (Math.abs(e.clientY - (rect.top + rect.height / 2)) < 12 && e.clientX > rect.left + rect.width / 2);
    target.parentNode.insertBefore(pointerDragging, after ? target.nextSibling : target);
    pointerMoved = true;
    e.preventDefault();
  });
  function finishPointerDrag(e) {
    if (pointerFreeform) {
      var freeform = pointerFreeform;
      if (freeform.handle && freeform.handle.releasePointerCapture) {
        try { freeform.handle.releasePointerCapture(e.pointerId); } catch(err) {}
      }
      var layout = hdpEnsureCardLayout();
      var resolvedRect = freeform.moved
        ? hdpResolveFreeformDrop(freeform.currentRect, freeform.peers, freeform.width, 12, layout.collision_push)
        : freeform.currentRect;
      var finalRect = hdpSetFreeformRect(
        freeform.slotId,
        freeform.wrapper,
        resolvedRect,
        freeform.breakpoint,
        false,
        freeform.width
      );
      if (freeform.moved && layout.collision_push) {
        hdpPushCollidingPeers(freeform.home, freeform.wrapper, finalRect, freeform.breakpoint, freeform.width, 12);
      }
      freeform.wrapper.classList.remove('hdp-bento--dragging');
      freeform.wrapper.classList.remove('hdp-bento--resizing');
      hdpShowSnapGuides(freeform.home, null, null);
      hdpUpdateFreeformCanvasHeight(freeform.home);
      if (freeform.moved) hdpMarkCardDraftDirty();
      hdpSyncCardGeometryEditor(root);
      pointerFreeform = null;
      return;
    }
    if (pointerResize) {
      var resize = pointerResize;
      if (resize.handle && resize.handle.releasePointerCapture) {
        try { resize.handle.releasePointerCapture(e.pointerId); } catch(err) {}
      }
      resize.wrapper.classList.remove('hdp-bento--resizing');
      if (resize.live) window.hdpSetCardSlotGridSpan(resize.slotId, resize.columns, resize.rows);
      pointerResize = null;
      return;
    }
    if (!pointerDragging) return;
    if (pointerHandle && pointerHandle.releasePointerCapture) {
      try { pointerHandle.releasePointerCapture(e.pointerId); } catch(err) {}
    }
    pointerDragging.classList.remove('hdp-bento--dragging');
    if (pointerMoved) hdpPersistSlotGroupOrder(draggingGroup, true);
    pointerDragging = null;
    pointerHandle = null;
    pointerMoved = false;
    draggingGroup = [];
  }
  root.addEventListener('pointerup', finishPointerDrag);
  root.addEventListener('pointercancel', finishPointerDrag);
  root.addEventListener('keydown', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
    var handle = hdpClosestCardEditControl(e);
    if (!handle) return;
    var action = handle.getAttribute('data-card-edit-action');
    if (action !== 'drag' && action !== 'resize') return;
    var wrapper = hdpFindSlotWrapperFromTarget(handle);
    if (!wrapper) return;
    var slotId = handle.getAttribute('data-slot-id') || hdpGetWrapperSlotId(wrapper);
    if (!slotId) return;
    var home = wrapper.parentNode && wrapper.parentNode.classList && wrapper.parentNode.classList.contains('hdp-home-content')
      ? wrapper.parentNode
      : null;
    var step = e.shiftKey ? 10 : 1;
    var deltaX = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    var deltaY = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

    if (home && home.getAttribute('data-hdp-layout-mode') === 'freeform' && window.innerWidth > 639) {
      var width = home.clientWidth || home.getBoundingClientRect().width || 1200;
      var height = home.clientHeight || home.getBoundingClientRect().height || 320;
      var current = hdpRectFromWrapper(wrapper, home);
      var edge = handle.getAttribute('data-resize-edge') || 'se';
      var candidate = action === 'resize'
        ? hdpResizeFreeformRect(current, deltaX, deltaY, edge, width)
        : hdpSanitizeFreeformRect({
          x: current.x + deltaX,
          y: current.y + deltaY,
          width: current.width,
          height: current.height
        }, width);
      if (candidate.x === current.x && candidate.y === current.y && candidate.width === current.width && candidate.height === current.height) return;
      var layout = hdpEnsureCardLayout();
      var peers = hdpGetPeerRects(home, wrapper);
      var snapped = action === 'resize'
        ? hdpSnapFreeformResizeRect(candidate, peers, width, layout.snap_enabled, layout.snap_distance, edge, height)
        : hdpSnapFreeformRect(candidate, peers, width, layout.snap_enabled, layout.snap_distance, height);
      var resolved = hdpResolveFreeformDrop(snapped.rect, peers, width, 12, layout.collision_push);
      var breakpoint = hdpGetFreeformBreakpoint();
      var finalRect = hdpSetFreeformRect(slotId, wrapper, resolved, breakpoint, false, width);
      if (layout.collision_push) hdpPushCollidingPeers(home, wrapper, finalRect, breakpoint, width, 12);
      hdpShowSnapGuides(home, snapped.guideX, snapped.guideY);
      clearTimeout(home.__hdpKeyboardGuideTimer);
      home.__hdpKeyboardGuideTimer = setTimeout(function() { hdpShowSnapGuides(home, null, null); }, 500);
      hdpUpdateFreeformCanvasHeight(home);
      hdpMarkCardDraftDirty();
      hdpSelectCardSlot(slotId, root);
      hdpAnnounceCardLayout(root, '卡片位置 ' + finalRect.x + ', ' + finalRect.y + '，尺寸 ' + finalRect.width + ' × ' + finalRect.height + ' 像素');
    } else if (action === 'drag') {
      window.hdpMoveCardSlot(slotId, deltaX < 0 || deltaY < 0 ? -1 : 1);
      hdpAnnounceCardLayout(root, '卡片顺序已调整');
    } else {
      var slot = hdpEnsureCardSlot(slotId);
      var columns = Math.max(1, Math.min(4, parseInt(slot.grid_columns, 10) || 2));
      var rows = Math.max(1, Math.min(6, parseInt(slot.grid_rows, 10) || 1));
      if (deltaX) columns = Math.max(1, Math.min(4, columns + (deltaX < 0 ? -1 : 1)));
      if (deltaY) rows = Math.max(1, Math.min(6, rows + (deltaY < 0 ? -1 : 1)));
      window.hdpSetCardSlotGridSpan(slotId, columns, rows);
      hdpAnnounceCardLayout(root, '卡片跨度 ' + columns + ' 列，' + rows + ' 行');
    }
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  });
  root.addEventListener('focusin', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    var handle = hdpClosestCardEditControl(e);
    if (!handle) return;
    var action = handle.getAttribute('data-card-edit-action');
    if (action !== 'drag' && action !== 'resize') return;
    var wrapper = hdpFindSlotWrapperFromTarget(handle);
    if (wrapper && wrapper.parentNode && wrapper.parentNode.classList && wrapper.parentNode.classList.contains('hdp-home-content')) {
      hdpSelectCardSlot(hdpGetWrapperSlotId(wrapper), root);
    }
  });
}

window.hdpSetCardSlotSize = function(slotId, size) {
  var allowed = ['sm', 'md', 'lg', 'wide', 'tall'];
  var safeSize = allowed.indexOf(size) >= 0 ? size : 'md';
  var slot = hdpEnsureCardSlot(slotId);
  slot.size = safeSize;
  hdpMarkCardDraftDirty();
  var wrapper = hdpGetSlotWrapper(slotId);
  if (wrapper) {
    wrapper.setAttribute('data-card-slot-size', safeSize);
    if (wrapper.classList && wrapper.classList.contains('hdp-bento')) {
      allowed.forEach(function(value) { wrapper.classList.remove('hdp-bento--' + value); });
      wrapper.classList.add('hdp-bento--' + safeSize);
    }
  }
};

window.hdpSetCardSlotGridSpan = function(slotId, columns, rows) {
  var slot = hdpEnsureCardSlot(slotId);
  var currentColumns = parseInt(slot.grid_columns, 10);
  var currentRows = parseInt(slot.grid_rows, 10);
  if (isNaN(currentColumns)) currentColumns = 2;
  if (isNaN(currentRows)) currentRows = 1;
  if (columns != null) currentColumns = Math.max(1, Math.min(4, Math.round(Number(columns) || 1)));
  if (rows != null) currentRows = Math.max(1, Math.min(6, Math.round(Number(rows) || 1)));
  slot.grid_columns = currentColumns;
  slot.grid_rows = currentRows;
  hdpMarkCardDraftDirty();
  var wrapper = hdpGetSlotWrapper(slotId);
  if (!wrapper || !wrapper.style) return;
  wrapper.setAttribute('data-hdp-bento-custom', 'true');
  wrapper.style.setProperty('--hdp-bento-column-span', currentColumns);
  wrapper.style.setProperty('--hdp-bento-tablet-column-span', Math.min(currentColumns, 2));
  wrapper.style.setProperty('--hdp-bento-row-span', currentRows);
};

window.hdpMoveCardSlot = function(slotId, delta) {
  var wrappers = hdpGetSlotGroupWrappers(slotId);
  var index = wrappers.findIndex(function(wrapper) {
    var card = wrapper.getAttribute('data-card-slot') ? wrapper : wrapper.querySelector('[data-card-slot]');
    return card && card.getAttribute('data-card-slot') === slotId;
  });
  var target = index + Number(delta || 0);
  if (index < 0 || target < 0 || target >= wrappers.length) return;
  var current = wrappers[index];
  var targetWrapper = wrappers[target];
  if (!current.parentNode) return;
  current.parentNode.insertBefore(current, delta > 0 ? targetWrapper.nextSibling : targetWrapper);
  hdpPersistSlotGroupOrder(wrappers, true);
};

window.hdpHideCardSlot = function(slotId) {
  hdpEnsureCardSlot(slotId).enabled = false;
  hdpMarkCardDraftDirty();
  var card = document.querySelector('[data-card-slot="' + slotId + '"]');
  if (card) card.classList.add('hdp-card-slot--draft-hidden');
  if (typeof hdpShowToast === 'function') hdpShowToast('卡片已隐藏，保存后生效', 'info');
};

window.hdpResetCardSlot = function(slotId) {
  var draft = hdpGetCardEditDraft();
  if (draft.cards && draft.cards.slots) delete draft.cards.slots[slotId];
  var card = document.querySelector('[data-card-slot="' + slotId + '"]');
  if (String(slotId).indexOf('home.custom.') === 0) {
    var wrapper = hdpGetSlotWrapperFromElement(card);
    if (wrapper && wrapper.remove) wrapper.remove();
    hdpPersistHomeSlotDomOrder(false);
  } else if (card) {
    card.classList.remove('hdp-card-slot--draft-hidden');
  }
  hdpMarkCardDraftDirty();
  if (typeof hdpShowToast === 'function') hdpShowToast(
    String(slotId).indexOf('home.custom.') === 0 ? '已从草稿删除卡片' : '已恢复默认，保存后生效',
    'info'
  );
};

window.hdpRestoreHiddenCardSlot = function(slotId) {
  var draft = hdpGetCardEditDraft();
  var slots = draft.cards && draft.cards.slots;
  var slot = slots && slots[slotId];
  if (String(slotId).indexOf('home.custom.') === 0 && slot) {
    delete slot.enabled;
    var card = hdpGetSlotElement(slotId);
    if (card) card.classList.remove('hdp-card-slot--draft-hidden');
    hdpMarkCardDraftDirty();
    if (typeof hdpShowToast === 'function') hdpShowToast('已恢复卡片，保存后生效', 'info');
    return;
  }
  window.hdpResetCardSlot(slotId);
};

function hdpDismissCardSlotModal(modal) {
  if (!modal) return;
  if (typeof modal.__hdpCloseCardSlotModal === 'function') modal.__hdpCloseCardSlotModal();
  else modal.remove();
}

function hdpDismissExistingCardSlotModals() {
  ['hdp-hidden-slots-modal', 'hdp-slot-editor-modal', 'hdp-add-card-modal'].forEach(function(id) {
    hdpDismissCardSlotModal(document.getElementById(id));
  });
}

function hdpClosestCardSlotModalAction(e, modal) {
  if (e && e.target && e.target.closest) {
    var direct = e.target.closest('[data-action]');
    if (direct && (!modal.contains || modal.contains(direct))) return direct;
  }
  var path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (var i = 0; i < path.length; i++) {
    if (path[i] === modal) break;
    if (path[i] && path[i].matches && path[i].matches('[data-action]')) return path[i];
  }
  return null;
}

function hdpBindCardSlotModal(modal, focusTarget, cleanup) {
  var closed = false;
  var close = function() {
    if (closed) return;
    closed = true;
    if (typeof cleanup === 'function') cleanup();
    if (document.removeEventListener) document.removeEventListener('keydown', onKeydown);
    modal.remove();
  };
  var onKeydown = function(e) {
    if (e.key !== 'Escape') return;
    if (e.preventDefault) e.preventDefault();
    close();
  };
  modal.__hdpCloseCardSlotModal = close;
  document.addEventListener('keydown', onKeydown);
  if (focusTarget && focusTarget.focus) focusTarget.focus();
  return close;
}

// The dashboard card can be rendered inside a scoped html-card-pro tree while
// these dialogs are appended to document.body. Inline layout guards keep the
// modal usable in both rendering modes.
function hdpPrepareCardSlotModal(modal) {
  if (!modal || !modal.style) return;
  modal.style.cssText += ';position:fixed!important;inset:0!important;z-index:2147483000!important;display:grid!important;place-items:center!important;box-sizing:border-box!important;overflow:auto!important;padding:18px!important;background:var(--hdp-overlay-bg,rgba(8,12,22,.46))!important;';
  var dialog = modal.querySelector && modal.querySelector('.hdp-slot-editor-dialog');
  if (!dialog || !dialog.style) return;
  var isYamlEditor = modal.id === 'hdp-slot-editor-modal';
  var dialogWidth = dialog.classList && dialog.classList.contains('hdp-add-card-dialog') ? '520px' : (isYamlEditor ? '1200px' : '860px');
  var yamlEditorMobile = isYamlEditor && window.matchMedia && window.matchMedia('(max-width: 800px)').matches;
  var dialogOverflow = isYamlEditor && !yamlEditorMobile ? 'hidden' : 'auto';
  dialog.style.cssText += ';position:relative!important;z-index:1;box-sizing:border-box;width:min(' + dialogWidth + ',calc(100vw - 36px))!important;max-height:min(90dvh,calc(100vh - 36px));display:flex!important;flex-direction:column!important;gap:12px!important;overflow:' + dialogOverflow + '!important;padding:18px!important;border:1px solid var(--hdp-border,var(--divider-color,rgba(127,127,127,.24)))!important;border-radius:var(--hdp-radius-lg,var(--ha-card-border-radius,16px))!important;background:var(--hdp-modal-bg,var(--hdp-bg,var(--ha-card-background,var(--card-background-color,#fff))))!important;color:var(--hdp-text,var(--primary-text-color,#1f2937))!important;box-shadow:var(--hdp-shadow-elevated,0 20px 60px rgba(0,0,0,.28))!important;font:14px/1.45 var(--hdp-font,system-ui,sans-serif)!important;';
  var heads = dialog.querySelectorAll ? dialog.querySelectorAll('.hdp-slot-editor-head,.hdp-slot-editor-actions') : [];
  for (var i = 0; i < heads.length; i++) heads[i].style.cssText += ';display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;';
  var fields = dialog.querySelectorAll ? dialog.querySelectorAll('.hdp-add-card-field') : [];
  for (var j = 0; j < fields.length; j++) {
    fields[j].style.cssText += ';display:' + (fields[j].hidden ? 'none' : 'grid') + '!important;gap:6px!important;';
  }
  var addCardGrid = dialog.querySelector ? dialog.querySelector('.hdp-add-card-grid') : null;
  if (addCardGrid && addCardGrid.style) addCardGrid.style.cssText += ';display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:12px!important;';
  var controls = dialog.querySelectorAll ? dialog.querySelectorAll('.hdp-add-card-field select,.hdp-add-card-field input') : [];
  for (var k = 0; k < controls.length; k++) controls[k].style.cssText += ';box-sizing:border-box!important;width:100%!important;min-height:40px!important;border:1px solid var(--hdp-border,var(--divider-color,rgba(127,127,127,.24)))!important;border-radius:var(--hdp-radius-sm,8px)!important;background:var(--hdp-surface-card,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color,#fff))))!important;color:var(--hdp-text,var(--primary-text-color,#1f2937))!important;padding:8px 10px!important;font:inherit!important;';
  var buttons = dialog.querySelectorAll ? dialog.querySelectorAll('.hdp-slot-editor-head button,.hdp-slot-editor-actions button') : [];
  for (var m = 0; m < buttons.length; m++) buttons[m].style.cssText += ';min-height:38px!important;padding:8px 14px!important;border:1px solid var(--hdp-border,var(--divider-color,rgba(127,127,127,.24)))!important;border-radius:10px!important;background:var(--hdp-control-bg,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color,#fff))))!important;color:var(--hdp-text,var(--primary-text-color,#1f2937))!important;font:inherit!important;font-weight:700!important;cursor:pointer!important;';
  var primary = dialog.querySelector ? dialog.querySelector('.hdp-slot-editor-actions .hdp-primary') : null;
  if (primary) primary.style.cssText += ';background:var(--hdp-primary)!important;border-color:var(--hdp-primary)!important;color:var(--hdp-text-inverse,white)!important;';
  var help = dialog.querySelector ? dialog.querySelector('.hdp-add-card-help') : null;
  if (help) help.style.cssText += ';padding:10px 12px!important;border-left:3px solid var(--hdp-primary)!important;background:var(--hdp-primary-light)!important;color:var(--hdp-text-secondary)!important;line-height:1.5!important;';
}

function hdpGetHiddenSlotLabel(slotId) {
  var id = String(slotId || '');
  if (id.indexOf('home.favorites.') === 0) return '收藏设备：' + id.slice('home.favorites.'.length);
  if (id.indexOf('home.people.person.') === 0) return '家庭成员：' + id.slice('home.people.person.'.length);
  if (id.indexOf('home.power_usage.') === 0) return '区域功率：' + id.slice('home.power_usage.'.length);
  if (id.indexOf('entity.') === 0) return '实体卡片：' + id.slice('entity.'.length);
  return id;
}

function hdpGetHiddenHomeSlots(slots) {
  var known = {};
  var allSlots = HDP_HOME_CARD_SLOTS.slice();
  allSlots.forEach(function(item) { known[item.id] = true; });
  Object.keys(slots || {}).forEach(function(slotId) {
    if (!slots[slotId] || slots[slotId].enabled !== false || known[slotId]) return;
    allSlots.push({ id: slotId, label: hdpGetHiddenSlotLabel(slotId) });
  });
  return allSlots.filter(function(item) {
    return slots[item.id] && slots[item.id].enabled === false;
  });
}

function hdpNextCustomHomeSlotId() {
  var slots = (hdpGetCardEditDraft().cards || {}).slots || {};
  var suffix;
  do {
    suffix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  } while (slots['home.custom.' + suffix]);
  return 'home.custom.' + suffix;
}

function hdpBuildAddCardDomains() {
  var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
  var states = hass && hass.states || {};
  var domains = {};
  Object.keys(states).forEach(function(entityId) { domains[String(entityId).split('.')[0]] = true; });
  return Object.keys(domains).sort().map(function(domain) {
    return '<option value="' + hdpEscapeSlotText(domain) + '">' + hdpEscapeSlotText(domain) + '</option>';
  }).join('');
}

function hdpBuildAddCardEntities() {
  var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
  var states = hass && hass.states || {};
  return Object.keys(states).sort(function(a, b) {
    var aName = String(states[a] && states[a].attributes && states[a].attributes.friendly_name || a);
    var bName = String(states[b] && states[b].attributes && states[b].attributes.friendly_name || b);
    return aName.localeCompare(bName) || a.localeCompare(b);
  }).slice(0, 800).map(function(entityId) {
    var name = String(states[entityId] && states[entityId].attributes && states[entityId].attributes.friendly_name || entityId);
    return '<option value="' + hdpEscapeSlotText(entityId) + '" label="' + hdpEscapeSlotText(name) + '"></option>';
  }).join('');
}

function hdpBuildDraftAddedCardPreview(slot) {
  var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
  var states = hass && hass.states || {};
  if (slot.kind === 'entity') {
    var stateObj = states[slot.entity_id];
    var attrs = stateObj && stateObj.attributes || {};
    var name = String(slot.title || attrs.friendly_name || slot.entity_id || '设备卡片');
    var state = stateObj ? String(stateObj.state) + (attrs.unit_of_measurement ? ' ' + attrs.unit_of_measurement : '') : '保存后读取设备';
    return '<div class="hdp-add-card-draft"><strong>' + hdpEscapeSlotText(name) + '</strong><span>' + hdpEscapeSlotText(state) + '</span></div>';
  }
  if (slot.kind === 'domain') {
    var ids = Object.keys(states).filter(function(entityId) { return entityId.split('.')[0] === slot.domain; });
    var labels = ids.slice(0, 4).map(function(entityId) {
      var stateObj = states[entityId];
      return String(stateObj && stateObj.attributes && stateObj.attributes.friendly_name || entityId);
    });
    return '<div class="hdp-add-card-draft"><strong>' + hdpEscapeSlotText(slot.title || slot.domain || '设备类别') + '</strong><span>' + hdpEscapeSlotText(ids.length + ' 个设备' + (labels.length ? ' · ' + labels.join('、') : '')) + '</span></div>';
  }
  return '<div class="hdp-add-card-draft"><strong>' + hdpEscapeSlotText(slot.title || '自定义卡片') + '</strong><span>点击 YAML 编辑内容</span></div>';
}

function hdpBuildResizeHandles(id) {
  return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map(function(edge) {
    return '<button type="button" class="hdp-slot-resize-handle" title="Resize card" aria-label="Resize card from ' + edge + '" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" data-card-edit-action="resize" data-resize-edge="' + edge + '" data-slot-id="' + id + '"></button>';
  }).join('');
}

function hdpBuildDraftAddedCardControls(slotId) {
  var id = hdpEscapeSlotText(slotId);
  return '<div class="hdp-slot-edit-panel" data-slot-edit-panel="' + id + '">' +
    '<button type="button" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" data-card-edit-action="drag" data-slot-id="' + id + '">拖</button>' +
    '<button type="button" data-card-edit-action="yaml" data-slot-id="' + id + '">YAML</button>' +
    '<button type="button" data-card-edit-action="background" data-slot-id="' + id + '">图片</button>' +
    '<button type="button" data-card-edit-action="hide" data-slot-id="' + id + '">隐藏</button>' +
    '<button type="button" data-card-edit-action="reset" data-slot-id="' + id + '">删除</button>' +
  '</div>' + hdpBuildResizeHandles(id);
}

function hdpAppendDraftAddedHomeCard(slotId, slot) {
  var home = document.querySelector('.hdp-home-content');
  if (!home || !document.createElement) return;
  var wrapper = document.createElement('div');
  wrapper.className = 'hdp-bento hdp-bento--lg';
  wrapper.setAttribute('data-hdp-bento-custom', 'true');
  wrapper.style.setProperty('--hdp-bento-column-span', slot.grid_columns || 2);
  wrapper.style.setProperty('--hdp-bento-tablet-column-span', Math.min(slot.grid_columns || 2, 2));
  wrapper.style.setProperty('--hdp-bento-row-span', slot.grid_rows || 2);
  wrapper.innerHTML = '<div class="hdp-card-slot hdp-card-slot--default hdp-card-slot--draft-added" data-card-slot="' + hdpEscapeSlotText(slotId) + '" data-card-custom="false" data-card-slot-size="lg">' +
    hdpBuildDraftAddedCardControls(slotId) + hdpBuildDraftAddedCardPreview(slot) + '</div>';
  home.appendChild(wrapper);
  hdpPersistHomeSlotDomOrder();
  if (home.getAttribute('data-hdp-layout-mode') !== 'freeform' || window.innerWidth <= 639) {
    wrapper.draggable = true;
    return;
  }
  var width = Math.max(150, home.clientWidth || home.getBoundingClientRect().width || 1200);
  var breakpoint = hdpGetFreeformBreakpoint();
  var alternate = breakpoint === 'desktop' ? 'tablet' : 'desktop';
  var columns = Math.max(1, Math.min(4, Number(slot.grid_columns) || 2));
  var rows = Math.max(1, Math.min(6, Number(slot.grid_rows) || 2));
  var columnWidth = Math.max(150, (width - 36) / 4);
  var size = {
    width: Math.min(width, columns * columnWidth + Math.max(0, columns - 1) * 12),
    height: rows * 120 + Math.max(0, rows - 1) * 12
  };
  var peers = hdpGetHomeSlotWrappers().filter(function(item) { return item !== wrapper; }).map(function(item) {
    return hdpRectFromWrapper(item, home);
  });
  var rect = hdpFindFreeformPlacement(size, peers, width, 12);
  var alternateWidth = hdpGetAlternateCanvasWidth(width, breakpoint);
  var alternatePeers = hdpGetHomeSlotWrappers().filter(function(item) { return item !== wrapper; }).map(function(item) {
    var saved = hdpGetSavedFreeformRect(hdpGetWrapperSlotId(item), alternate);
    return saved ? hdpSanitizeFreeformRect(saved, alternateWidth) : null;
  }).filter(Boolean);
  var alternateRect = hdpFindFreeformPlacement({
    width: rect.width * alternateWidth / width,
    height: rect.height
  }, alternatePeers, alternateWidth, 12);
  hdpSetFreeformRect(slotId, wrapper, rect, breakpoint, false, width);
  hdpSetFreeformRect(slotId, wrapper, alternateRect, alternate, false, alternateWidth);
  wrapper.removeAttribute('draggable');
  hdpUpdateFreeformCanvasHeight(home);
}

window.hdpOpenAddCard = function() {
  hdpDismissExistingCardSlotModals();
  var modal = document.createElement('div');
  modal.id = 'hdp-add-card-modal';
  modal.className = 'hdp-slot-editor-modal';
  if (typeof hdpApplyThemeVarsToOverlay === 'function') hdpApplyThemeVarsToOverlay(modal);
  var domains = hdpBuildAddCardDomains();
  var entities = hdpBuildAddCardEntities();
  modal.innerHTML =
    '<div class="hdp-slot-editor-dialog hdp-add-card-dialog" role="dialog" aria-modal="true">' +
      '<div class="hdp-slot-editor-head"><div class="hdp-slot-editor-title">新增或替换卡片</div><button type="button" data-action="close">×</button></div>' +
      '<label class="hdp-add-card-field">卡片类型<select id="hdp-add-card-kind" name="hdp_add_card_kind"><option value="custom">独立自定义卡片</option><option value="domain">设备类别卡片</option><option value="entity">单个设备卡片</option></select></label>' +
      '<label class="hdp-add-card-field">标题（可选）<input id="hdp-add-card-title" name="hdp_add_card_title" placeholder="使用默认名称" maxlength="80" /></label>' +
      '<label class="hdp-add-card-field" id="hdp-add-card-domain-field">设备类别<select id="hdp-add-card-domain" name="hdp_add_card_domain">' + domains + '</select></label>' +
      '<label class="hdp-add-card-field" id="hdp-add-card-entity-field" hidden>设备<input id="hdp-add-card-entity" name="hdp_add_card_entity" list="hdp-add-card-entities" placeholder="搜索或输入实体 ID" /><datalist id="hdp-add-card-entities">' + entities + '</datalist></label>' +
      '<div class="hdp-add-card-grid"><label class="hdp-add-card-field">宽度（1-4）<input id="hdp-add-card-columns" name="hdp_add_card_columns" type="number" min="1" max="4" value="2" /></label><label class="hdp-add-card-field">高度（1-6）<input id="hdp-add-card-rows" name="hdp_add_card_rows" type="number" min="1" max="6" value="2" /></label></div>' +
      '<div class="hdp-add-card-help" id="hdp-add-card-help">创建一张独立的 HTML Pro Card，可自由设置大小、位置、背景图和 YAML。</div>' +
      '<div class="hdp-slot-editor-actions"><button type="button" data-action="close">取消</button><button type="button" class="hdp-primary" data-action="create">创建卡片</button></div>' +
    '</div>';
  hdpPrepareCardSlotModal(modal);
  document.body.appendChild(modal);
  var kind = modal.querySelector('#hdp-add-card-kind');
  var domainField = modal.querySelector('#hdp-add-card-domain-field');
  var entityField = modal.querySelector('#hdp-add-card-entity-field');
  var help = modal.querySelector('#hdp-add-card-help');
  var updateFields = function() {
    var value = kind.value;
    domainField.hidden = value !== 'domain';
    entityField.hidden = value !== 'entity';
    domainField.style.setProperty('display', value === 'domain' ? 'grid' : 'none', 'important');
    entityField.style.setProperty('display', value === 'entity' ? 'grid' : 'none', 'important');
    help.textContent = value === 'domain'
      ? '在首页新增该类别的设备集合，自动使用当前 HA 实体并支持直接控制。'
      : value === 'entity'
        ? '在首页新增一个指定设备的控制卡片，自动使用该设备的专用控件。'
        : '创建一张独立的 HTML Pro Card，可自由设置大小、位置、背景图和 YAML。';
  };
  kind.addEventListener('change', updateFields);
  updateFields();
  var close = hdpBindCardSlotModal(modal, kind);
  modal.addEventListener('click', function(e) {
    var control = hdpClosestCardSlotModalAction(e, modal);
    var action = control && control.getAttribute('data-action');
    var eventPath = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
    if (e.target === modal || eventPath[0] === modal || action === 'close') { close(); return; }
    if (action !== 'create') return;
    var slotId = hdpNextCustomHomeSlotId();
    var slot = hdpEnsureCardSlot(slotId);
    slot.kind = kind.value;
    slot.title = String(modal.querySelector('#hdp-add-card-title').value || '').trim().slice(0, 80);
    slot.grid_columns = Math.max(1, Math.min(4, Math.round(Number(modal.querySelector('#hdp-add-card-columns').value) || 2)));
    slot.grid_rows = Math.max(1, Math.min(6, Math.round(Number(modal.querySelector('#hdp-add-card-rows').value) || 2)));
    slot.order = hdpGetHomeSlotWrappers().length;
    if (kind.value === 'custom') {
      slot.yaml = hdpGetSlotTemplate('blank', slotId);
    } else if (kind.value === 'domain') {
      var domain = String(modal.querySelector('#hdp-add-card-domain').value || '').trim().toLowerCase();
      if (!/^[a-z_][a-z0-9_]*$/.test(domain)) {
        if (typeof hdpShowToast === 'function') hdpShowToast('请选择有效的设备类别', 'error');
        return;
      }
      slot.domain = domain;
    } else {
      var entityId = String(modal.querySelector('#hdp-add-card-entity').value || '').trim().toLowerCase();
      if (!/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(entityId)) {
        if (typeof hdpShowToast === 'function') hdpShowToast('请输入有效的实体 ID，例如 climate.living_room', 'error');
        return;
      }
      var hass = typeof hdpFindHass === 'function' ? hdpFindHass() : null;
      if (!hass || !hass.states || !hass.states[entityId]) {
        if (typeof hdpShowToast === 'function') hdpShowToast('未找到该实体，请从列表选择现有设备', 'error');
        return;
      }
      slot.entity_id = entityId;
    }
    hdpMarkCardDraftDirty();
    hdpAppendDraftAddedHomeCard(slotId, slot);
    close();
    if (kind.value === 'custom') {
      window.hdpEditCardSlotYAML(slotId);
    } else if (typeof hdpShowToast === 'function') {
      hdpShowToast('卡片已加入草稿，点击“保存并应用”后永久生效', 'success');
    }
  });
};

window.hdpOpenHiddenCardSlots = function() {
  hdpDismissExistingCardSlotModals();
  var draft = hdpGetCardEditDraft();
  var slots = (draft.cards && draft.cards.slots) || {};
  var hidden = hdpGetHiddenHomeSlots(slots);
  var modal = document.createElement('div');
  modal.id = 'hdp-hidden-slots-modal';
  modal.className = 'hdp-slot-editor-modal';
  if (typeof hdpApplyThemeVarsToOverlay === 'function') hdpApplyThemeVarsToOverlay(modal);
  var rows = hidden.length
    ? hidden.map(function(item) {
        return '<div class="hdp-hidden-slot-row"><span>' + hdpEscapeSlotText(item.label) + '</span><button type="button" data-slot="' + hdpEscapeSlotText(item.id) + '">恢复默认</button></div>';
      }).join('')
    : '<div class="hdp-hidden-slot-row"><span>没有隐藏的首页卡片</span><button type="button" data-action="close">关闭</button></div>';
  modal.innerHTML =
    '<div class="hdp-slot-editor-dialog" role="dialog" aria-modal="true">' +
      '<div class="hdp-slot-editor-head"><div class="hdp-slot-editor-title">隐藏卡片管理</div><button type="button" data-action="close">×</button></div>' +
      '<div class="hdp-hidden-slot-list">' + rows + '</div>' +
    '</div>';
  hdpPrepareCardSlotModal(modal);
  document.body.appendChild(modal);
  var close = hdpBindCardSlotModal(modal, modal.querySelector('[data-action="close"]'));
  modal.addEventListener('click', function(e) {
    var target = e.target;
    if (target === modal || (target && target.getAttribute && target.getAttribute('data-action') === 'close')) {
      close();
      return;
    }
    var slotId = target && target.getAttribute && target.getAttribute('data-slot');
    if (!slotId) return;
    window.hdpRestoreHiddenCardSlot(slotId);
    target.closest('.hdp-hidden-slot-row').remove();
  });
};

window.hdpEditCardSlotBackground = function(slotId) {
  var slot = hdpEnsureCardSlot(slotId);
  var current = slot.background_image_url || '';
  var url = prompt('输入卡片背景图片 URL（留空清除）', current);
  if (url === null) return;
  var rawUrl = String(url || '').trim();
  var safeUrl = hdpSafeSlotImageUrl(rawUrl);
  if (rawUrl && !safeUrl) {
    if (typeof hdpShowToast === 'function') hdpShowToast('背景图片地址无效，请使用 HTTP(S)、/local/ 或相对路径', 'error');
    return;
  }
  slot.background_image_url = safeUrl;
  slot.theme_from_image = Boolean(slot.background_image_url) && confirm('是否根据图片自动调整该卡片强调色？');
  hdpMarkCardDraftDirty();
  var card = document.querySelector('[data-card-slot="' + slotId + '"]');
  if (!card) return;
  if (slot.background_image_url) {
    card.classList.add('hdp-card-slot--image');
    card.classList.toggle('hdp-card-slot--theme-image', slot.theme_from_image === true);
    card.style.setProperty('--hdp-slot-bg-image', 'url(' + hdpSafeSlotImageUrl(slot.background_image_url) + ')');
    hdpClearCardSlotImageTheme(card);
    if (slot.theme_from_image === true) hdpApplyCardSlotImageThemes(card);
  } else {
    card.classList.remove('hdp-card-slot--image');
    card.classList.remove('hdp-card-slot--theme-image');
    card.style.removeProperty('--hdp-slot-bg-image');
    hdpClearCardSlotImageTheme(card);
  }
};

window.hdpEditCardSlotYAML = function(slotId) {
  var slot = hdpEnsureCardSlot(slotId);
  hdpOpenSlotEditor(slotId, slot.yaml || '');
};

function hdpOpenSlotEditor(slotId, yaml) {
  hdpDismissExistingCardSlotModals();
  var modal = document.createElement('div');
  modal.id = 'hdp-slot-editor-modal';
  modal.className = 'hdp-slot-editor-modal';
  if (typeof hdpApplyThemeVarsToOverlay === 'function') hdpApplyThemeVarsToOverlay(modal);
  modal.innerHTML =
    '<style>' + hdpSlotEditorOverlayCSS() + '</style>' +
    '<div class="hdp-slot-editor-dialog" role="dialog" aria-modal="true">' +
      '<div class="hdp-slot-editor-head"><div><div class="hdp-slot-editor-title">编辑卡片槽位：' + hdpEscapeSlotText(slotId) + '</div><div class="hdp-slot-editor-error" id="hdp-slot-editor-error"></div></div><button type="button" data-action="close">×</button></div>' +
      '<div class="hdp-slot-template-bar" aria-label="卡片模板">' +
        '<button type="button" data-template="entity-control">控制卡</button>' +
        '<button type="button" data-template="metric-soft">数据卡</button>' +
        '<button type="button" data-template="status-list">状态列表</button>' +
        '<button type="button" data-template="blank">空白</button>' +
      '</div>' +
      '<div class="hdp-slot-editor-body"><textarea id="hdp-slot-yaml" name="hdp_slot_yaml" spellcheck="false"></textarea><div class="hdp-slot-editor-preview" id="hdp-slot-preview"></div></div>' +
      '<div class="hdp-slot-editor-actions"><button type="button" data-action="clear">清除自定义</button><span></span><button type="button" data-action="preview">预览</button><button type="button" class="hdp-primary" data-action="save">保存到草稿</button></div>' +
    '</div>';
  hdpPrepareCardSlotModal(modal);
  document.body.appendChild(modal);
  var textarea = modal.querySelector('#hdp-slot-yaml');
  textarea.value = yaml || hdpGetSlotTemplate('entity-control', slotId);
  var previewTimer = null;
  var close = hdpBindCardSlotModal(modal, textarea, function() {
    clearTimeout(previewTimer);
    previewTimer = null;
  });
  var schedulePreview = function() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function() {
      previewTimer = null;
      hdpPreviewSlotYaml(textarea.value, modal);
    }, 180);
  };
  textarea.addEventListener('input', schedulePreview);
  modal.addEventListener('click', function(e) {
    var target = e.target;
    var action = target && target.getAttribute && target.getAttribute('data-action');
    var template = target && target.getAttribute && target.getAttribute('data-template');
    if (target === modal || action === 'close') close();
    if (template) {
      textarea.value = hdpGetSlotTemplate(template, slotId);
      hdpPreviewSlotYaml(textarea.value, modal);
      textarea.focus();
    }
    if (action === 'preview') hdpPreviewSlotYaml(textarea.value, modal);
    if (action === 'clear') {
      hdpEnsureCardSlot(slotId).yaml = '';
      hdpMarkCardDraftDirty();
      close();
    }
    if (action === 'save') {
      if (!hdpPreviewSlotYaml(textarea.value, modal)) return;
      hdpEnsureCardSlot(slotId).yaml = textarea.value;
      hdpMarkCardDraftDirty();
      if (typeof hdpShowToast === 'function') hdpShowToast('自定义卡片已暂存，保存后生效', 'success');
      close();
    }
  });
  hdpPreviewSlotYaml(textarea.value, modal);
}

function hdpSlotEditorOverlayCSS() {
  return '#hdp-slot-editor-modal .hdp-slot-editor-dialog{width:min(1200px,calc(100vw - 36px))!important;overflow:hidden!important}' +
    '#hdp-slot-editor-modal .hdp-slot-template-bar{display:flex;flex-wrap:wrap;gap:8px}' +
    '#hdp-slot-editor-modal .hdp-slot-template-bar button{appearance:none;min-height:36px;padding:7px 12px;border:1px solid var(--hdp-border,var(--divider-color,rgba(127,127,127,.24)));border-radius:999px;background:var(--hdp-control-bg,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color,#fff))));color:var(--hdp-text,var(--primary-text-color,#1f2937));font:inherit;font-size:12px;font-weight:800;cursor:pointer}' +
    '#hdp-slot-editor-modal .hdp-slot-template-bar button:hover{border-color:var(--hdp-primary,var(--primary-color,#03a9f4));color:var(--hdp-primary,var(--primary-color,#03a9f4));background:var(--hdp-control-bg-hover,var(--hdp-primary-light,rgba(3,169,244,.12)))}' +
    '#hdp-slot-editor-modal .hdp-slot-editor-body{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;height:min(66dvh,720px);min-height:460px;overflow:hidden}' +
    '#hdp-slot-editor-modal #hdp-slot-yaml{box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;resize:none;overflow:auto;padding:14px;border:1px solid var(--hdp-border,var(--divider-color,rgba(127,127,127,.24)));border-radius:12px;background:var(--hdp-surface-card,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color,#fff))));color:var(--hdp-text,var(--primary-text-color,#1f2937));caret-color:var(--hdp-primary,var(--primary-color,#03a9f4));font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:2}' +
    '#hdp-slot-editor-modal .hdp-slot-editor-preview{box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;overflow:auto;padding:14px;border:1px dashed var(--hdp-border,var(--divider-color,rgba(127,127,127,.24)));border-radius:12px;background:var(--hdp-surface-muted,var(--hdp-card-bg,var(--ha-card-background,var(--card-background-color,#fff))));color:var(--hdp-text,var(--primary-text-color,#1f2937))}' +
    '@media(max-width:800px){#hdp-slot-editor-modal .hdp-slot-editor-dialog{overflow:auto!important}#hdp-slot-editor-modal .hdp-slot-editor-body{grid-template-columns:minmax(0,1fr)!important;height:auto;min-height:0;overflow:visible}#hdp-slot-editor-modal #hdp-slot-yaml,#hdp-slot-editor-modal .hdp-slot-editor-preview{height:42dvh;min-height:320px}}';
}

function hdpPreviewSlotYaml(yaml, scope) {
  var root = scope && scope.querySelector ? scope : document;
  var err = root.querySelector('#hdp-slot-editor-error');
  var preview = root.querySelector('#hdp-slot-preview');
  var save = root.querySelector('[data-action="save"]');
  var parsed = hdpParseSafeHtmlProYaml(yaml);
  if (!parsed.ok) {
    if (err) {
      err.textContent = parsed.error;
      err.setAttribute('data-state', 'error');
    }
    if (preview) {
      preview.textContent = '';
      preview.setAttribute('data-state', 'error');
    }
    if (save) save.disabled = true;
    return false;
  }
  if (err) {
    err.textContent = '预览正常';
    err.setAttribute('data-state', 'ok');
  }
  if (preview) {
    preview.innerHTML = '<div class="bp-html-card">' + hdpSanitizeSlotHTML(parsed.content) + '</div>';
    preview.setAttribute('data-state', 'ok');
  }
  if (save) save.disabled = false;
  return true;
}

function hdpParseSafeHtmlProYaml(yaml) {
  var text = String(yaml || '').replace(/\\r\\n?/g, '\\n');
  var lines = text.split('\\n');
  var significant = [];
  for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    var trimmedLine = lines[lineIndex].trim();
    if (!trimmedLine || trimmedLine.charAt(0) === '#') continue;
    var leading = lines[lineIndex].match(/^\\s*/);
    significant.push({ index: lineIndex, indent: leading ? leading[0].length : 0 });
  }
  if (!significant.length) return { ok: false, error: '仅支持 type: custom:html-pro-card' };

  var rootIndent = significant.reduce(function(minimum, entry) {
    return Math.min(minimum, entry.indent);
  }, significant[0].indent);
  var fieldStart = 0;
  var fieldEnd = lines.length;
  var fieldIndent = rootIndent;
  var cardEntry = null;
  for (var entryIndex = 0; entryIndex < significant.length; entryIndex++) {
    var entry = significant[entryIndex];
    if (entry.indent === rootIndent && /^card:\\s*(?:#.*)?$/.test(lines[entry.index].trim())) {
      cardEntry = entry;
      break;
    }
  }
  if (cardEntry) {
    fieldStart = cardEntry.index + 1;
    fieldIndent = Infinity;
    for (var childIndex = 0; childIndex < significant.length; childIndex++) {
      var child = significant[childIndex];
      if (child.index < fieldStart) continue;
      if (child.indent <= cardEntry.indent) {
        fieldEnd = child.index;
        break;
      }
      fieldIndent = Math.min(fieldIndent, child.indent);
    }
  }
  if (!isFinite(fieldIndent)) return { ok: false, error: '仅支持 type: custom:html-pro-card' };

  var hasSupportedType = false;
  for (var typeIndex = fieldStart; typeIndex < fieldEnd; typeIndex++) {
    var typeIndentMatch = lines[typeIndex].match(/^\\s*/);
    var typeIndent = typeIndentMatch ? typeIndentMatch[0].length : 0;
    if (typeIndent !== fieldIndent || !/^type:/.test(lines[typeIndex].trim())) continue;
    hasSupportedType = /^type:\\s*['"]?custom:html-pro-card['"]?\\s*(?:#.*)?$/.test(lines[typeIndex].trim());
    break;
  }
  if (!hasSupportedType) return { ok: false, error: '仅支持 type: custom:html-pro-card' };
  var unsafeLine = hdpFindUnsafeSlotLine(text);
  if (unsafeLine) return { ok: false, error: '第 ' + unsafeLine + ' 行包含禁止内容：自定义 JS、on* 事件或 javascript URL' };
  var contentLine = -1;
  var contentIndent = -1;
  var folded = false;
  for (var i = fieldStart; i < fieldEnd; i++) {
    var match = lines[i].match(/^(\\s*)content:\\s*([|>])\\s*(?:#.*)?$/);
    if (!match || match[1].length !== fieldIndent) continue;
    contentLine = i;
    contentIndent = match[1].length;
    folded = match[2] === '>';
    break;
  }
  if (contentLine < 0) return { ok: false, error: '需要 content: | 多行内容' };

  var blockIndent = -1;
  var blockLines = [];
  for (var j = contentLine + 1; j < lines.length; j++) {
    var line = lines[j];
    if (!line.trim()) {
      blockLines.push('');
      continue;
    }
    var indentMatch = line.match(/^\\s*/);
    var indent = indentMatch ? indentMatch[0].length : 0;
    if (indent <= contentIndent) break;
    if (blockIndent < 0) blockIndent = indent;
    if (indent < blockIndent) break;
    blockLines.push(line.substring(blockIndent));
  }
  var content = folded
    ? blockLines.join(' ').replace(/\\s+/g, ' ').trim()
    : blockLines.join('\\n');
  if (!content.trim()) return { ok: false, error: '需要 content: | 多行内容' };
  return { ok: true, content: content };
}

function hdpFindUnsafeSlotLine(text) {
  var lines = String(text || '').split('\\n');
  for (var i = 0; i < lines.length; i++) {
    if (/<\\s*script\\b|\\son[a-z]+\\s*=|javascript\\s*:/i.test(lines[i])) return i + 1;
  }
  return 0;
}

function hdpGetSlotTemplate(template, slotId) {
  var title = String(slotId || 'custom.card').replace(/^home\\./, '').replace(/[_.-]+/g, ' ');
  var entityBinding = '';
  if (String(slotId || '').indexOf('entity.domain.') === 0) entityBinding = '$entity$';
  else if (String(slotId || '').indexOf('entity.') === 0) entityBinding = String(slotId).slice('entity.'.length);
  var entityAttrs = entityBinding
    ? ' data-entity="' + hdpEscapeSlotText(entityBinding) + '" data-action="toggle"'
    : ' data-view="home"';
  var entityLabel = entityBinding === '$entity$' ? '$name$' : title;
  var templates = {
    'entity-control': [
      'type: custom:html-pro-card',
      'content: |',
      '  <div class="hdp-custom-control"' + entityAttrs + '>',
      '    <strong>' + hdpEscapeSlotText(entityLabel) + '</strong>',
      '    <span>点击切换设备</span>',
      '  </div>'
    ],
    'metric-soft': [
      'type: custom:html-pro-card',
      'content: |',
      '  <section class="hdp-custom-metric" data-view="home" style="padding:16px;border-radius:18px;background:rgba(255,255,255,.78)">',
      '    <small>今日数据</small>',
      '    <strong style="display:block;font-size:30px;margin-top:8px">24.6°C</strong>',
      '    <span style="color:#16a34a">+2.4% 更舒适</span>',
      '  </section>'
    ],
    'status-list': [
      'type: custom:html-pro-card',
      'content: |',
      '  <div class="hdp-custom-list">',
      '    <button type="button"' + entityAttrs + '>' + hdpEscapeSlotText(entityLabel) + '</button>',
      '  </div>'
    ],
    'blank': [
      'type: custom:html-pro-card',
      'content: |',
      '  <div data-view="home">',
      '    自定义卡片',
      '  </div>'
    ]
  };
  return (templates[template] || templates['entity-control']).join('\\n');
}

function hdpSanitizeSlotHTML(html) {
  return String(html || '')
    .replace(/<!--[\\s\\S]*?-->/g, '')
    .replace(/<\\s*(script|iframe|object|embed|form)\\b[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>/gi, '')
    .replace(/<\\s*style\\b[^>]*>([\\s\\S]*?)<\\s*\\/\\s*style\\s*>/gi, function(_, css) {
      return '<style>' + hdpScopeSlotCSS(String(css)) + '</style>';
    })
    .replace(/<[^>]+>/g, function(tag) { return hdpSanitizeSlotTag(tag); });
}

function hdpSanitizeSlotTag(tag) {
  var match = String(tag || '').match(/^<\\s*(\\/)?\\s*([a-zA-Z][a-zA-Z0-9-]*)\\b([^>]*)>$/);
  if (!match) return hdpEscapeSlotText(tag);
  var closing = !!match[1];
  var rawName = match[2];
  var name = rawName.toLowerCase();
  var allowedTags = {
    a:1, article:1, aside:1, b:1, br:1, button:1, canvas:1, circle:1, code:1,
    dd:1, details:1, div:1, dl:1, dt:1, em:1, footer:1, h1:1, h2:1, h3:1,
    h4:1, h5:1, h6:1, 'ha-icon':1, 'ha-state-icon':1, header:1, hr:1, i:1,
    img:1, input:1, li:1, line:1, main:1, nav:1, ol:1, p:1, path:1, polygon:1,
    polyline:1, rect:1, section:1, select:1, small:1, span:1, 'state-badge':1, strong:1,
    style:1, sub:1, summary:1, sup:1, svg:1, ul:1, option:1
  };
  if (!allowedTags[name]) return hdpEscapeSlotText(tag);
  if (closing) return '</' + name + '>';
  if (name === 'style') return '<style>';
  var attrs = hdpSanitizeSlotAttributes(match[3] || '');
  if (name === 'input' && !/(?:^| )type="(?:range|text|date|time|datetime-local)"(?= |$)/i.test(attrs)) return hdpEscapeSlotText(tag);
  return '<' + name + (attrs ? ' ' + attrs : '') + '>';
}

function hdpSanitizeSlotAttributes(rawAttrs) {
  var attrs = [];
  var seenAttrs = {};
  var allowedAttrs = {
    alt:1, class:1, cx:1, cy:1, d:1, disabled:1, fill:1, height:1, href:1, icon:1, id:1, name:1,
    max:1, min:1, r:1, role:1, rx:1, ry:1, src:1, step:1, stroke:1, 'stroke-linecap':1,
    'stroke-linejoin':1, 'stroke-width':1, style:1, tabindex:1, title:1, type:1, value:1, viewbox:1,
    width:1, x:1, x1:1, x2:1, y:1, y1:1, y2:1, selected:1
  };
  var pattern = /([:@a-zA-Z_][:@a-zA-Z0-9_.-]*)(?:\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+)))?/g;
  var match;
  while ((match = pattern.exec(String(rawAttrs || ''))) !== null) {
    var rawName = match[1];
    var name = rawName.toLowerCase();
    if (name.indexOf('on') === 0) continue;
    if (!allowedAttrs[name] && name.indexOf('data-') !== 0 && name.indexOf('aria-') !== 0) continue;
    if (seenAttrs[name]) continue;
    seenAttrs[name] = true;
    var value = match[3] != null ? match[3] : match[4] != null ? match[4] : match[5] || '';
    var safeValue = hdpSanitizeSlotAttributeValue(name, value);
    if (safeValue == null) continue;
    attrs.push(rawName + '="' + safeValue + '"');
  }
  return attrs.join(' ');
}

function hdpSanitizeSlotAttributeValue(name, value) {
  if (name === 'tabindex') {
    var normalizedTabIndex = String(value || '').trim();
    return normalizedTabIndex === '0' || normalizedTabIndex === '-1' ? normalizedTabIndex : null;
  }
  if (name === 'href' || name === 'src') {
    var url = String(value || '').trim();
    if (/[\\u0000-\\u001f\\u007f\\\\]/.test(url)) return null;
    var schemeProbe = url.replace(/[\\u0000-\\u0020]/g, '');
    var scheme = schemeProbe.match(/^([a-z][a-z0-9+.-]*):/i);
    if (name === 'href' && scheme && !/^https?$/i.test(scheme[1])) return null;
    if (scheme && !/^https?$/i.test(scheme[1]) && !/^data$/i.test(scheme[1])) return null;
    if (scheme && /^data$/i.test(scheme[1]) && !/^data:image\\//i.test(schemeProbe)) return null;
    return hdpEscapeSlotAttribute(url);
  }
  if (name === 'style') return hdpSanitizeSlotStyle(value);
  return hdpEscapeSlotAttribute(value);
}

function hdpSanitizeSlotStyle(value) {
  return String(value || '').split(';').map(function(declaration) {
    var separator = declaration.indexOf(':');
    if (separator === -1) return '';
    var property = declaration.slice(0, separator).trim();
    var rawValue = declaration.slice(separator + 1).trim();
    if (!/^(?:--)?[a-zA-Z][a-zA-Z0-9-]*$/.test(property)) return '';
    if (/javascript\\s*:|expression\\s*\\(|behavior\\s*:|@import|url\\s*\\(/i.test(rawValue)) return '';
    return rawValue ? property + ': ' + hdpEscapeSlotAttribute(rawValue) : '';
  }).filter(Boolean).join('; ');
}

function hdpStripSlotCSSResources(css) {
  return String(css || '')
    .replace(/@font-face\\s*\\{[^{}]*\\}/gi, '')
    .replace(/(^|[;{])\\s*[^;{}]*:\\s*[^;{}]*(?:url|(?:-webkit-)?image-set)\\s*\\([^;{}]*\\)[^;{}]*;?/gi, '$1');
}

function hdpNamespaceSlotCSSAnimations(css, prefix) {
  var names = {};
  var renamed = String(css || '').replace(/@(-webkit-)?keyframes\\s+([_a-zA-Z][_a-zA-Z0-9-]*)/g, function(_, vendor, name) {
    var scopedName = prefix + '-' + name;
    names[name] = scopedName;
    return '@' + (vendor || '') + 'keyframes ' + scopedName;
  });
  if (!Object.keys(names).length) return renamed;
  return renamed.replace(/(^|[;{])(\\s*(?:-webkit-)?animation(?:-name)?\\s*:\\s*)([^;{}]+)/gi, function(_, boundary, property, value) {
    var scopedValue = String(value).replace(/(^|[^_a-zA-Z0-9-])([_a-zA-Z][_a-zA-Z0-9-]*)(?=$|[^_a-zA-Z0-9-])/g, function(_, tokenBoundary, token) {
      return tokenBoundary + (names[token] || token);
    });
    return boundary + property + scopedValue;
  });
}

function hdpExtractSlotCSSKeyframes(css) {
  var blocks = [];
  var pattern = /@(?:-webkit-)?keyframes\\s+[_a-zA-Z][_a-zA-Z0-9-]*\\s*\\{/gi;
  var output = '';
  var cursor = 0;
  var match;
  while ((match = pattern.exec(css)) !== null) {
    var openBrace = pattern.lastIndex - 1;
    var depth = 1;
    var quote = '';
    var end = -1;
    for (var index = openBrace + 1; index < css.length; index++) {
      var char = css[index];
      var next = css[index + 1];
      if (quote) {
        if (char === '\\\\') index += 1;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '/' && next === '*') {
        var commentEnd = css.indexOf('*/', index + 2);
        index = commentEnd === -1 ? css.length : commentEnd + 1;
        continue;
      }
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
    if (end === -1) break;
    output += css.slice(cursor, match.index);
    blocks.push(css.slice(match.index, end + 1));
    cursor = end + 1;
    pattern.lastIndex = cursor;
  }
  return { css: output + css.slice(cursor), blocks: blocks };
}

function hdpRestoreSlotCSSKeyframes(css, blocks) {
  return blocks.length ? css + ' ' + blocks.join(' ') : css;
}

function hdpScopeSlotCSS(css) {
  var cleaned = hdpStripSlotCSSResources(css)
    .replace(/@import[^;]+;?/gi, '')
    .replace(/javascript\\s*:/gi, '')
    .replace(/expression\\s*\\(/gi, '')
    .replace(/behavior\\s*:/gi, '')
    .replace(/<\\/?style/gi, '');
  var extracted = hdpExtractSlotCSSKeyframes(hdpNamespaceSlotCSSAnimations(cleaned, 'hdp-preview'));
  var scopedCSS = extracted.css.replace(/(^|[{}])\\s*([^@{}\\s][^{}]*)\\{/g, function(_, prefix, selectors) {
    var scoped = String(selectors).split(',').map(function(selector) {
      selector = selector.trim();
      if (!selector) return '';
      if (selector.indexOf('#hdp-slot-preview ') === 0) return selector;
      if (selector.indexOf('.bp-html-card') === 0) return '#hdp-slot-preview ' + selector;
      if (/^:host\\b/.test(selector)) return '#hdp-slot-preview ' + selector.replace(/^:host\\b/, '.bp-html-card');
      return '#hdp-slot-preview .bp-html-card ' + selector;
    }).filter(Boolean).join(', ');
    return prefix + ' ' + scoped + ' {';
  });
  return hdpRestoreSlotCSSKeyframes(scopedCSS, extracted.blocks);
}

function hdpEscapeSlotText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function hdpEscapeSlotAttribute(value) {
  return String(value == null ? '' : value).replace(/&(?!(?:amp|lt|gt|quot|#39);)|[<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function hdpSafeSlotImageUrl(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  var normalized = text.replace(/[\\r\\n)"'\\\\]/g, '');
  if (/^data:/i.test(normalized) && !/^data:image\\//i.test(normalized)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized) && !/^(https?:|data:image\\/)/i.test(normalized)) return '';
  return normalized;
}

function hdpClearCardSlotImageTheme(card) {
  if (!card) return;
  card.classList.remove('hdp-card-slot--theme-ready');
  card.removeAttribute('data-theme-sampled');
  card.style.removeProperty('--hdp-slot-primary');
  card.style.removeProperty('--hdp-slot-primary-light');
  card.style.removeProperty('--hdp-primary');
  card.style.removeProperty('--hdp-primary-light');
}

function hdpApplyCardSlotImageThemes(scope) {
  var root = scope && scope.matches && scope.matches('.hdp-card-slot--theme-image') ? scope : document;
  var cards = root.matches && root.matches('.hdp-card-slot--theme-image')
    ? [root]
    : Array.prototype.slice.call(root.querySelectorAll('.hdp-card-slot--theme-image'));
  cards.forEach(function(card) {
    var raw = card.style.getPropertyValue('--hdp-slot-bg-image') || '';
    var url = raw.replace(/^url\\((.*)\\)$/i, '$1').replace(/^["']|["']$/g, '').trim();
    url = hdpSafeSlotImageUrl(url);
    if (!url || card.getAttribute('data-theme-sampled') === url) return;
    card.setAttribute('data-theme-sampled', url);
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      if (card.getAttribute('data-theme-sampled') !== url) return;
      try {
        var canvas = document.createElement('canvas');
        var size = 48;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        var data = ctx.getImageData(0, 0, size, size).data;
        var r = 0, g = 0, b = 0, count = 0;
        for (var i = 0; i < data.length; i += 16) {
          var alpha = data[i + 3];
          if (alpha < 32) continue;
          var pr = data[i], pg = data[i + 1], pb = data[i + 2];
          var max = Math.max(pr, pg, pb);
          var min = Math.min(pr, pg, pb);
          if (max < 36 || min > 236) continue;
          r += pr; g += pg; b += pb; count += 1;
        }
        if (!count) return;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        var primary = 'rgb(' + r + ' ' + g + ' ' + b + ')';
        var primaryLight = 'rgba(' + r + ',' + g + ',' + b + ',0.16)';
        card.style.setProperty('--hdp-slot-primary', primary);
        card.style.setProperty('--hdp-slot-primary-light', primaryLight);
        card.style.setProperty('--hdp-primary', primary);
        card.style.setProperty('--hdp-primary-light', primaryLight);
        card.classList.add('hdp-card-slot--theme-ready');
      } catch(e) {
        if (card.getAttribute('data-theme-sampled') === url) card.removeAttribute('data-theme-sampled');
      }
    };
    img.onerror = function() {
      if (card.getAttribute('data-theme-sampled') === url) card.removeAttribute('data-theme-sampled');
    };
    img.src = url;
  });
}

window.hdpSaveCardEdits = function() {
  if (typeof window.hdpCommitSettings === 'function') {
    window.hdpCommitSettings();
    return;
  }
  try {
    localStorage.setItem('hdp_config', JSON.stringify(hdpGetCardEditDraft()));
  } catch(e) {}
  location.reload();
};

window.hdpCancelCardEdits = function() {
  if (typeof window.hdpCancelSettings === 'function') {
    window.hdpCancelSettings();
  } else {
    window.hdpCardEditDraft = undefined;
  }
  location.reload();
};

function hdpInitCardSlotRuntime() {
  hdpApplyCardSlotImageThemes();
  if (typeof document.getElementById !== 'function') return;
  var root = document.getElementById('hdp-root');
  var home = root && root.querySelector ? root.querySelector('.hdp-home-content') : null;
  if (home) hdpActivateFreeformLayout(home);
  if (root) hdpSyncCardLayoutToolbar(root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hdpInitCardSlotRuntime);
} else {
  hdpInitCardSlotRuntime();
}
if (window.addEventListener) {
  var hdpFreeformResizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(hdpFreeformResizeTimer);
    hdpFreeformResizeTimer = setTimeout(function() {
      if (typeof document.getElementById !== 'function') return;
      var root = document.getElementById('hdp-root');
      var home = root && root.querySelector ? root.querySelector('.hdp-home-content') : null;
      if (!home) return;
      if (window.innerWidth <= 639) {
        hdpActiveFreeformBreakpoint = null;
        home.style.removeProperty('--hdp-freeform-canvas-height');
        home.style.removeProperty('--hdp-freeform-tablet-canvas-height');
        return;
      }
      if (hdpEnsureCardLayout().mode === 'freeform' && hdpActiveFreeformBreakpoint !== hdpGetFreeformBreakpoint()) {
        hdpActivateFreeformLayout(home);
      } else if (hdpEnsureCardLayout().mode === 'freeform') {
        hdpActivateFreeformLayout(home);
      }
    }, 80);
  });
}
hdpInitCardSlotEditorActions();
`;
}
