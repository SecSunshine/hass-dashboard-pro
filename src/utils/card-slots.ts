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

export function resolveSlottedCard(
  config: StrategyConfig,
  slotId: string,
  defaultHTML: string,
  defaultSize: BentoSize,
  defaultOrder = 0,
): SlottedCard {
  const slot = getCardSlot(config, slotId);
  const hidden = slot?.enabled === false;
  const size = sanitizeBentoSize(slot?.size, defaultSize);
  const order = typeof slot?.order === 'number' && Number.isFinite(slot.order) ? slot.order : defaultOrder;
  if (hidden) return { slotId, html: '', size, order, hidden: true, custom: false };

  const customHTML = renderCustomSlotHTML(slotId, slot);
  const content = customHTML || defaultHTML;
  const error = slot?.yaml && !customHTML ? buildSlotErrorHTML(slotId) : '';
  return {
    slotId,
    html: wrapSlotHTML(slotId, `${error}${content}`, slot, Boolean(customHTML)),
    size,
    order,
    hidden: false,
    custom: Boolean(customHTML),
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
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .hdp-slot-edit-panel select {
    width: 68px;
    padding: 0 6px;
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
    background: rgba(8,12,22,0.46);
    backdrop-filter: blur(10px);
  }
  .hdp-slot-editor-dialog {
    width: min(860px, 96vw);
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: 18px;
    background: var(--hdp-bg);
    border: 1px solid var(--hdp-border);
    box-shadow: 0 24px 80px rgba(0,0,0,0.28);
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
  .hdp-slot-editor-body textarea {
    width: 100%;
    min-width: 0;
    min-height: 280px;
    resize: vertical;
    border-radius: 12px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
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
    background: var(--hdp-card-bg);
  }
  .hdp-slot-editor-error {
    min-height: 18px;
    color: var(--hdp-danger, #ef4444);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }
  .hdp-slot-editor-actions button,
  .hdp-home-edit-bar button {
    appearance: none;
    min-height: 38px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .hdp-slot-editor-actions .hdp-primary,
  .hdp-home-edit-bar .hdp-primary {
    background: var(--hdp-primary);
    color: white;
    border-color: var(--hdp-primary);
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

function renderCustomSlotHTML(slotId: string, slot?: CardSlotConfig): string {
  const yaml = slot?.yaml?.trim();
  if (!yaml) return '';
  try {
    const card = parseCardYAML(yaml);
    if (card.type !== 'custom:html-pro-card' || typeof card.content !== 'string') return '';
    return cardConfigToHTML(card, slotId);
  } catch {
    return '';
  }
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

function buildSlotErrorHTML(slotId: string): string {
  return `<div class="hdp-card-slot-error" data-card-slot-error="${escapeAttribute(slotId)}">${escapeHTML('自定义卡片解析失败，已显示默认卡片')}</div>`;
}

function buildSlotEditPanel(slotId: string, slot?: CardSlotConfig): string {
  const safeSlot = escapeAttribute(JSON.stringify(slotId));
  const size = sanitizeBentoSize(slot?.size, 'md');
  const sizeOptions = ['sm', 'md', 'lg', 'wide', 'tall']
    .map(value => `<option value="${value}"${value === size ? ' selected' : ''}>${value}</option>`)
    .join('');
  return `<div class="hdp-slot-edit-panel" data-slot-edit-panel="${escapeAttribute(slotId)}">
    <select aria-label="卡片大小" onchange="hdpSetCardSlotSize(${safeSlot}, this.value)">
      ${sizeOptions}
    </select>
    <button type="button" title="拖动卡片正文即可排序" data-action="drag-slot">拖</button>
    <button type="button" title="上移" onclick="hdpMoveCardSlot(${safeSlot}, -1)">↑</button>
    <button type="button" title="下移" onclick="hdpMoveCardSlot(${safeSlot}, 1)">↓</button>
    <button type="button" title="编辑 YAML" onclick="hdpEditCardSlotYAML(${safeSlot})">YAML</button>
    <button type="button" title="背景图" onclick="hdpEditCardSlotBackground(${safeSlot})">图</button>
    <button type="button" title="隐藏" onclick="hdpHideCardSlot(${safeSlot})">藏</button>
    <button type="button" title="恢复默认" onclick="hdpResetCardSlot(${safeSlot})">↺</button>
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
  if (window.hdpCardSlotDragReady) return;
  window.hdpCardSlotDragReady = true;
  var dragging = null;
  root.addEventListener('dragstart', function(e) {
    if (!root.classList.contains('hdp-root--card-edit')) return;
    if (e.target && e.target.closest && e.target.closest('.hdp-slot-edit-panel')) {
      e.preventDefault();
      return;
    }
    var wrapper = e.target && e.target.closest && e.target.closest('.hdp-home-content > .hdp-bento');
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

window.hdpOpenHiddenCardSlots = function() {
  var old = document.getElementById('hdp-hidden-slots-modal');
  if (old) old.remove();
  var draft = hdpGetCardEditDraft();
  var slots = (draft.cards && draft.cards.slots) || {};
  var hidden = HDP_HOME_CARD_SLOTS.filter(function(item) {
    return slots[item.id] && slots[item.id].enabled === false;
  });
  var modal = document.createElement('div');
  modal.id = 'hdp-hidden-slots-modal';
  modal.className = 'hdp-slot-editor-modal';
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
  modal.addEventListener('click', function(e) {
    var target = e.target;
    if (target === modal || (target && target.getAttribute && target.getAttribute('data-action') === 'close')) {
      modal.remove();
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
  slot.background_image_url = String(url || '').trim();
  slot.theme_from_image = Boolean(slot.background_image_url) && confirm('是否根据图片自动调整该卡片强调色？');
  hdpMarkCardDraftDirty();
  var card = document.querySelector('[data-card-slot="' + slotId + '"]');
  if (!card) return;
  if (slot.background_image_url) {
    card.classList.add('hdp-card-slot--image');
    card.classList.toggle('hdp-card-slot--theme-image', slot.theme_from_image === true);
    card.style.setProperty('--hdp-slot-bg-image', 'url(' + hdpSafeSlotImageUrl(slot.background_image_url) + ')');
    hdpApplyCardSlotImageThemes(card);
  } else {
    card.classList.remove('hdp-card-slot--image');
    card.classList.remove('hdp-card-slot--theme-image');
    card.classList.remove('hdp-card-slot--theme-ready');
    card.style.removeProperty('--hdp-slot-bg-image');
    card.style.removeProperty('--hdp-slot-primary');
    card.style.removeProperty('--hdp-slot-primary-light');
    card.style.removeProperty('--hdp-primary');
    card.style.removeProperty('--hdp-primary-light');
  }
};

window.hdpEditCardSlotYAML = function(slotId) {
  var slot = hdpEnsureCardSlot(slotId);
  hdpOpenSlotEditor(slotId, slot.yaml || '');
};

function hdpOpenSlotEditor(slotId, yaml) {
  var old = document.getElementById('hdp-slot-editor-modal');
  if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'hdp-slot-editor-modal';
  modal.className = 'hdp-slot-editor-modal';
  modal.innerHTML =
    '<div class="hdp-slot-editor-dialog" role="dialog" aria-modal="true">' +
      '<div class="hdp-slot-editor-head"><div><div class="hdp-slot-editor-title">编辑卡片槽位：' + hdpEscapeSlotText(slotId) + '</div><div class="hdp-slot-editor-error" id="hdp-slot-editor-error"></div></div><button type="button" data-action="close">×</button></div>' +
      '<div class="hdp-slot-editor-body"><textarea id="hdp-slot-yaml" spellcheck="false"></textarea><div class="hdp-slot-editor-preview" id="hdp-slot-preview"></div></div>' +
      '<div class="hdp-slot-editor-actions"><button type="button" data-action="clear">清除自定义</button><span></span><button type="button" data-action="preview">预览</button><button type="button" class="hdp-primary" data-action="save">保存到草稿</button></div>' +
    '</div>';
  document.body.appendChild(modal);
  var textarea = modal.querySelector('#hdp-slot-yaml');
  textarea.value = yaml || 'type: custom:html-pro-card\\ncontent: |\\n  <div class="my-card" data-entity="light.example">自定义卡片</div>';
  var close = function() { modal.remove(); };
  modal.addEventListener('click', function(e) {
    var target = e.target;
    var action = target && target.getAttribute && target.getAttribute('data-action');
    if (target === modal || action === 'close') close();
    if (action === 'preview') hdpPreviewSlotYaml(textarea.value);
    if (action === 'clear') {
      hdpEnsureCardSlot(slotId).yaml = '';
      hdpMarkCardDraftDirty();
      close();
    }
    if (action === 'save') {
      if (!hdpPreviewSlotYaml(textarea.value)) return;
      hdpEnsureCardSlot(slotId).yaml = textarea.value;
      hdpMarkCardDraftDirty();
      if (typeof hdpShowToast === 'function') hdpShowToast('自定义卡片已暂存，保存后生效', 'success');
      close();
    }
  });
  hdpPreviewSlotYaml(textarea.value);
}

function hdpPreviewSlotYaml(yaml) {
  var err = document.getElementById('hdp-slot-editor-error');
  var preview = document.getElementById('hdp-slot-preview');
  var parsed = hdpParseSafeHtmlProYaml(yaml);
  if (!parsed.ok) {
    if (err) err.textContent = parsed.error;
    if (preview) preview.textContent = '';
    return false;
  }
  if (err) err.textContent = '';
  if (preview) preview.innerHTML = hdpSanitizeSlotHTML(parsed.content);
  return true;
}

function hdpParseSafeHtmlProYaml(yaml) {
  var text = String(yaml || '');
  if (!/type:\\s*custom:html-pro-card/.test(text)) return { ok: false, error: '仅支持 type: custom:html-pro-card' };
  if (/<\\s*script\\b|\\son[a-z]+\\s*=|javascript\\s*:/i.test(text)) return { ok: false, error: '第一版禁止自定义 JS、on* 事件和 javascript URL' };
  var match = text.match(/content:\\s*[|>]\\s*\\n([\\s\\S]*)$/);
  if (!match) return { ok: false, error: '需要 content: | 多行内容' };
  var content = match[1].split('\\n').map(function(line) { return line.replace(/^\\s{2,}/, ''); }).join('\\n');
  return { ok: true, content: content };
}

function hdpSanitizeSlotHTML(html) {
  return String(html || '')
    .replace(/<\\s*(script|iframe|object|embed|form)\\b[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>/gi, '')
    .replace(/\\son[a-z]+\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/gi, '')
    .replace(/javascript\\s*:/gi, '');
}

function hdpEscapeSlotText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function hdpSafeSlotImageUrl(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  if (!/^(https?:|\\/|data:image\\/|blob:)/i.test(text)) return '';
  return text.replace(/[\\r\\n)"'\\\\]/g, '');
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
        card.removeAttribute('data-theme-sampled');
      }
    };
    img.onerror = function() { card.removeAttribute('data-theme-sampled'); };
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
    return;
  }
  window.hdpCardEditDraft = undefined;
  location.reload();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { hdpApplyCardSlotImageThemes(); });
} else {
  hdpApplyCardSlotImageThemes();
}
`;
}
