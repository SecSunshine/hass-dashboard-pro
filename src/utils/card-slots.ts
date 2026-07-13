import type { CardSlotConfig, StrategyConfig } from '../types';
import { cardConfigToHTML, parseCardYAML } from '../blueprints/blueprint-parser';
import { sanitizeBentoSize, type BentoSize } from './bento-layout';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue, escapeURLAttribute } from './html';

export interface SlottedCard {
  slotId: string;
  html: string;
  size: BentoSize;
  order: number;
  hidden: boolean;
  custom: boolean;
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
  const order = typeof slot?.order === 'number' && Number.isFinite(slot.order) ? slot.order : defaultOrder;
  if (hidden) return { slotId, html: '', size, order, hidden: true, custom: false };

  const custom = renderCustomSlotHTML(slotId, slot, context);
  const content = custom.html || defaultHTML;
  const error = custom.error ? buildSlotErrorHTML(slotId, custom.error) : '';
  return {
    slotId,
    html: wrapSlotHTML(slotId, `${error}${content}`, slot, Boolean(custom.html)),
    size,
    order,
    hidden: false,
    custom: Boolean(custom.html),
  };
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
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-card-slot {
    outline: 2px dashed color-mix(in srgb, var(--hdp-primary) 60%, transparent);
    outline-offset: -4px;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content > .hdp-bento {
    cursor: grab;
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-home-content > .hdp-bento:active {
    cursor: grabbing;
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
    top: 8px;
    right: 8px;
    z-index: 20;
    display: none;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--hdp-card-bg) 92%, transparent);
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-card);
    backdrop-filter: blur(12px);
  }
  .hdp-root--card-edit .hdp-view[data-view="home"] .hdp-slot-edit-panel {
    display: flex;
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
  .hdp-slot-edit-panel [data-card-edit-action="drag"] {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .hdp-slot-edit-panel [data-card-edit-action="drag"]:active {
    cursor: grabbing;
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
    position: fixed;
    inset: 0;
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: var(--hdp-overlay-bg, rgba(8,12,22,0.46));
    backdrop-filter: blur(10px);
  }
  .hdp-slot-editor-dialog {
    width: min(860px, 96vw);
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: var(--hdp-radius-lg, 18px);
    background: var(--hdp-modal-bg, var(--hdp-bg));
    border: 1px solid var(--hdp-border);
    box-shadow: var(--hdp-shadow-elevated, 0 24px 80px rgba(0,0,0,0.28));
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
  .hdp-card-slot--image {
    --hdp-slot-bg-opacity: 1;
    --hdp-slot-bg-scrim: linear-gradient(135deg, rgba(255,255,255,0.84), rgba(255,255,255,0.58));
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

function wrapSlotHTML(slotId: string, html: string, slot: CardSlotConfig | undefined, custom: boolean): string {
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
  return `<div class="${classes}" data-card-slot="${escapeAttribute(slotId)}" data-card-custom="${custom ? 'true' : 'false'}"${style}>
    ${buildSlotEditPanel(slotId, slot)}
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

function buildSlotEditPanel(slotId: string, slot?: CardSlotConfig): string {
  const slotAttr = escapeAttribute(slotId);
  const size = sanitizeBentoSize(slot?.size, 'md');
  const sizeOptions = ['sm', 'md', 'lg', 'wide', 'tall']
    .map(value => `<option value="${value}"${value === size ? ' selected' : ''}>${value}</option>`)
    .join('');
  return `<div class="hdp-slot-edit-panel" data-slot-edit-panel="${escapeAttribute(slotId)}">
    <select aria-label="卡片大小" data-card-edit-action="size" data-slot-id="${slotAttr}">
      ${sizeOptions}
    </select>
    <button type="button" title="拖动排序" aria-label="拖动排序" data-card-edit-action="drag" data-slot-id="${slotAttr}">拖</button>
    <button type="button" title="上移" aria-label="上移卡片" data-card-edit-action="move" data-slot-id="${slotAttr}" data-delta="-1">↑</button>
    <button type="button" title="下移" aria-label="下移卡片" data-card-edit-action="move" data-slot-id="${slotAttr}" data-delta="1">↓</button>
    <button type="button" title="编辑 YAML" data-card-edit-action="yaml" data-slot-id="${slotAttr}">YAML</button>
    <button type="button" title="背景图" aria-label="设置卡片背景图" data-card-edit-action="background" data-slot-id="${slotAttr}">图</button>
    <button type="button" title="隐藏" aria-label="隐藏卡片" data-card-edit-action="hide" data-slot-id="${slotAttr}">藏</button>
    <button type="button" title="恢复默认" aria-label="恢复默认卡片" data-card-edit-action="reset" data-slot-id="${slotAttr}">↺</button>
  </div>`;
}

export function generateCardSlotEditorJS(): string {
  return `
var HDP_HOME_CARD_SLOTS = [
  { id: 'home.welcome', label: '欢迎卡片' },
  { id: 'home.status_badges', label: '状态徽章' },
  { id: 'home.people', label: '家庭成员' },
  { id: 'home.environment', label: '家居环境' },
  { id: 'home.power_usage', label: '全屋功率' },
  { id: 'home.favorites', label: '收藏设备' },
  { id: 'home.summary', label: '系统概览' }
];

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
    var direct = e.target.closest('.hdp-home-edit-bar [data-action]');
    if (direct) return direct;
  }
  var path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (var i = 0; i < path.length; i++) {
    if (path[i] && path[i].matches && path[i].matches('.hdp-home-edit-bar [data-action]')) return path[i];
  }
  return null;
}

function hdpInitCardSlotEditorActions() {
  if (window.hdpCardSlotEditorActionsReady) return;
  window.hdpCardSlotEditorActionsReady = true;
  document.addEventListener('click', function(e) {
    var toolbarControl = hdpClosestHomeEditControl(e);
    var toolbarAction = toolbarControl && toolbarControl.getAttribute('data-action');
    if (toolbarAction === 'enter-card-edit' || toolbarAction === 'manage-hidden-cards' ||
        toolbarAction === 'save-card-edits' || toolbarAction === 'cancel-card-edits') {
      e.preventDefault();
      e.stopPropagation();
      if (toolbarAction === 'enter-card-edit') window.hdpToggleCardEditMode(true);
      else if (toolbarAction === 'manage-hidden-cards') window.hdpOpenHiddenCardSlots();
      else if (toolbarAction === 'save-card-edits') window.hdpSaveCardEdits();
      else window.hdpCancelCardEdits();
      return;
    }
    var control = hdpClosestCardEditControl(e);
    if (!control) return;
    var action = control.getAttribute('data-card-edit-action');
    if (action === 'drag' || action === 'size') return;
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
    var control = hdpClosestCardEditControl(e);
    if (!control || control.getAttribute('data-card-edit-action') !== 'size') return;
    var slotId = control.getAttribute('data-slot-id');
    if (!slotId) return;
    window.hdpSetCardSlotSize(slotId, control.value);
  }, true);
}

window.hdpToggleCardEditMode = function(force) {
  var root = document.getElementById('hdp-root');
  if (!root) return;
  var editing = typeof force === 'boolean' ? force : !root.classList.contains('hdp-root--card-edit');
  root.classList.toggle('hdp-root--card-edit', editing);
  var bar = document.querySelector('.hdp-home-edit-bar');
  if (bar) bar.setAttribute('data-editing', editing ? 'true' : 'false');
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

function hdpSetHomeCardDraggable(enabled) {
  hdpGetHomeSlotWrappers().forEach(function(wrapper) {
    if (enabled) wrapper.setAttribute('draggable', 'true');
    else wrapper.removeAttribute('draggable');
  });
}

function hdpPersistHomeSlotDomOrder(markDirty) {
  hdpGetHomeSlotWrappers().forEach(function(wrapper, index) {
    var card = wrapper.querySelector('[data-card-slot]');
    var slotId = card && card.getAttribute('data-card-slot');
    if (!slotId) return;
    var slot = hdpEnsureCardSlot(slotId);
    slot.order = index;
    wrapper.style.order = index;
  });
  if (markDirty !== false) hdpMarkCardDraftDirty();
}

function hdpInitCardSlotDragging(root) {
  if (!root || root.__hdpCardSlotDragReady) return;
  root.__hdpCardSlotDragReady = true;
  window.hdpCardSlotDragReady = true;
  var dragging = null;
  root.addEventListener('dragstart', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    var dragHandle = e.target && e.target.closest && e.target.closest('[data-card-edit-action="drag"]');
    if (e.target && e.target.closest && e.target.closest('.hdp-slot-edit-panel') && !dragHandle) {
      e.preventDefault();
      return;
    }
    var wrapper = dragHandle
      ? dragHandle.closest('.hdp-home-content > .hdp-bento')
      : e.target && e.target.closest && e.target.closest('.hdp-home-content > .hdp-bento');
    if (!wrapper) return;
    var card = wrapper.querySelector('[data-card-slot]');
    if (!card) return;
    dragging = wrapper;
    wrapper.classList.add('hdp-bento--dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.getAttribute('data-card-slot') || '');
    }
  });
  root.addEventListener('dragover', function(e) {
    if (!dragging) return;
    var target = e.target && e.target.closest && e.target.closest('.hdp-home-content > .hdp-bento');
    if (!target || target === dragging) return;
    e.preventDefault();
    hdpGetHomeSlotWrappers().forEach(function(wrapper) { wrapper.classList.remove('hdp-bento--drag-over'); });
    target.classList.add('hdp-bento--drag-over');
  });
  root.addEventListener('drop', function(e) {
    if (!dragging) return;
    var target = e.target && e.target.closest && e.target.closest('.hdp-home-content > .hdp-bento');
    hdpGetHomeSlotWrappers().forEach(function(wrapper) { wrapper.classList.remove('hdp-bento--drag-over'); });
    if (!target || target === dragging || !target.parentNode) return;
    e.preventDefault();
    var rect = target.getBoundingClientRect();
    var after = e.clientY > rect.top + rect.height / 2 || (Math.abs(e.clientY - (rect.top + rect.height / 2)) < 12 && e.clientX > rect.left + rect.width / 2);
    target.parentNode.insertBefore(dragging, after ? target.nextSibling : target);
    hdpPersistHomeSlotDomOrder(true);
  });
  root.addEventListener('dragend', function() {
    hdpGetHomeSlotWrappers().forEach(function(wrapper) {
      wrapper.classList.remove('hdp-bento--dragging');
      wrapper.classList.remove('hdp-bento--drag-over');
    });
    dragging = null;
  });

  var pointerDragging = null;
  var pointerHandle = null;
  var pointerMoved = false;
  root.addEventListener('pointerdown', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    var handle = hdpClosestCardEditControl(e);
    if (!handle || handle.getAttribute('data-card-edit-action') !== 'drag') return;
    var wrapper = handle.closest && handle.closest('.hdp-home-content > .hdp-bento');
    if (!wrapper) return;
    pointerDragging = wrapper;
    pointerHandle = handle;
    pointerMoved = false;
    wrapper.classList.add('hdp-bento--dragging');
    if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  root.addEventListener('pointermove', function(e) {
    if (!pointerDragging || !document.elementFromPoint) return;
    var hovered = document.elementFromPoint(e.clientX, e.clientY);
    var target = hovered && hovered.closest && hovered.closest('.hdp-home-content > .hdp-bento');
    if (!target || target === pointerDragging || !target.parentNode) return;
    var rect = target.getBoundingClientRect();
    var after = e.clientY > rect.top + rect.height / 2 ||
      (Math.abs(e.clientY - (rect.top + rect.height / 2)) < 12 && e.clientX > rect.left + rect.width / 2);
    target.parentNode.insertBefore(pointerDragging, after ? target.nextSibling : target);
    pointerMoved = true;
    e.preventDefault();
  });
  function finishPointerDrag(e) {
    if (!pointerDragging) return;
    if (pointerHandle && pointerHandle.releasePointerCapture) {
      try { pointerHandle.releasePointerCapture(e.pointerId); } catch(err) {}
    }
    pointerDragging.classList.remove('hdp-bento--dragging');
    if (pointerMoved) hdpPersistHomeSlotDomOrder(true);
    pointerDragging = null;
    pointerHandle = null;
    pointerMoved = false;
  }
  root.addEventListener('pointerup', finishPointerDrag);
  root.addEventListener('pointercancel', finishPointerDrag);
}

window.hdpSetCardSlotSize = function(slotId, size) {
  var allowed = ['sm', 'md', 'lg', 'wide', 'tall'];
  var safeSize = allowed.indexOf(size) >= 0 ? size : 'md';
  var slot = hdpEnsureCardSlot(slotId);
  slot.size = safeSize;
  hdpMarkCardDraftDirty();
  var card = document.querySelector('[data-card-slot="' + slotId + '"]');
  var wrapper = card && card.closest('.hdp-bento');
  if (wrapper) {
    allowed.forEach(function(value) { wrapper.classList.remove('hdp-bento--' + value); });
    wrapper.classList.add('hdp-bento--' + safeSize);
  }
};

window.hdpMoveCardSlot = function(slotId, delta) {
  var wrappers = hdpGetHomeSlotWrappers();
  var index = wrappers.findIndex(function(wrapper) {
    var card = wrapper.querySelector('[data-card-slot]');
    return card && card.getAttribute('data-card-slot') === slotId;
  });
  var target = index + Number(delta || 0);
  if (index < 0 || target < 0 || target >= wrappers.length) return;
  var current = wrappers[index];
  var targetWrapper = wrappers[target];
  if (!current.parentNode) return;
  current.parentNode.insertBefore(current, delta > 0 ? targetWrapper.nextSibling : targetWrapper);
  hdpPersistHomeSlotDomOrder(true);
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
  if (card) card.classList.remove('hdp-card-slot--draft-hidden');
  hdpMarkCardDraftDirty();
  if (typeof hdpShowToast === 'function') hdpShowToast('已恢复默认，保存后生效', 'info');
};

function hdpDismissCardSlotModal(modal) {
  if (!modal) return;
  if (typeof modal.__hdpCloseCardSlotModal === 'function') modal.__hdpCloseCardSlotModal();
  else modal.remove();
}

function hdpDismissExistingCardSlotModals() {
  ['hdp-hidden-slots-modal', 'hdp-slot-editor-modal'].forEach(function(id) {
    hdpDismissCardSlotModal(document.getElementById(id));
  });
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

window.hdpOpenHiddenCardSlots = function() {
  hdpDismissExistingCardSlotModals();
  var draft = hdpGetCardEditDraft();
  var slots = (draft.cards && draft.cards.slots) || {};
  var hidden = HDP_HOME_CARD_SLOTS.filter(function(item) {
    return slots[item.id] && slots[item.id].enabled === false;
  });
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
    window.hdpResetCardSlot(slotId);
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
    '<div class="hdp-slot-editor-dialog" role="dialog" aria-modal="true">' +
      '<div class="hdp-slot-editor-head"><div><div class="hdp-slot-editor-title">编辑卡片槽位：' + hdpEscapeSlotText(slotId) + '</div><div class="hdp-slot-editor-error" id="hdp-slot-editor-error"></div></div><button type="button" data-action="close">×</button></div>' +
      '<div class="hdp-slot-template-bar" aria-label="卡片模板">' +
        '<button type="button" data-template="entity-control">控制卡</button>' +
        '<button type="button" data-template="metric-soft">数据卡</button>' +
        '<button type="button" data-template="status-list">状态列表</button>' +
        '<button type="button" data-template="blank">空白</button>' +
      '</div>' +
      '<div class="hdp-slot-editor-body"><textarea id="hdp-slot-yaml" spellcheck="false"></textarea><div class="hdp-slot-editor-preview" id="hdp-slot-preview"></div></div>' +
      '<div class="hdp-slot-editor-actions"><button type="button" data-action="clear">清除自定义</button><span></span><button type="button" data-action="preview">预览</button><button type="button" class="hdp-primary" data-action="save">保存到草稿</button></div>' +
    '</div>';
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
  var templates = {
    'entity-control': [
      'type: custom:html-pro-card',
      'content: |',
      '  <div class="hdp-custom-control" data-entity="light.example" data-action="toggle">',
      '    <strong>' + hdpEscapeSlotText(title) + '</strong>',
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
      '    <button type="button" data-entity="light.example" data-action="toggle">灯光</button>',
      '    <button type="button" data-entity="cover.example" data-action="cover-open">窗帘打开</button>',
      '    <button type="button" data-entity="cover.example" data-action="cover-close">窗帘关闭</button>',
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
    polyline:1, rect:1, section:1, small:1, span:1, 'state-badge':1, strong:1,
    style:1, sub:1, summary:1, sup:1, svg:1, ul:1
  };
  if (!allowedTags[name]) return hdpEscapeSlotText(tag);
  if (closing) return '</' + name + '>';
  if (name === 'style') return '<style>';
  var attrs = hdpSanitizeSlotAttributes(match[3] || '');
  if (name === 'input' && !/(?:^| )type="range"(?= |$)/i.test(attrs)) return hdpEscapeSlotText(tag);
  return '<' + name + (attrs ? ' ' + attrs : '') + '>';
}

function hdpSanitizeSlotAttributes(rawAttrs) {
  var attrs = [];
  var seenAttrs = {};
  var allowedAttrs = {
    alt:1, class:1, cx:1, cy:1, d:1, fill:1, height:1, href:1, icon:1, id:1,
    max:1, min:1, r:1, role:1, rx:1, ry:1, src:1, step:1, stroke:1, 'stroke-linecap':1,
    'stroke-linejoin':1, 'stroke-width':1, style:1, tabindex:1, title:1, type:1, value:1, viewbox:1,
    width:1, x:1, x1:1, x2:1, y:1, y1:1, y2:1
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { hdpApplyCardSlotImageThemes(); });
} else {
  hdpApplyCardSlotImageThemes();
}
hdpInitCardSlotEditorActions();
`;
}
