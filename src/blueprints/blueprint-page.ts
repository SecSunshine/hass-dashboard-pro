/**
 * Blueprint Page — Rendering
 *
 * Builds the HTML content for each blueprint page view.
 * Blueprint pages are embedded in the monolithic layout card
 * as hidden <div class="hdp-view" data-view="bp-{id}"> sections.
 */

import type { BlueprintInstance, LovelaceCardConfig } from '../types';
import { cardConfigToHTML } from './blueprint-parser';
import { escapeAttribute, escapeHTML } from '../utils/html';
import { safeDomIdSegment } from '../utils/dom-id';

// ─── Page Renderer ──────────────────────────────────────────────────────────

/**
 * Build HTML for all blueprint pages.
 * Returns an array of { id, html } pairs for the layout card.
 */
export function buildBlueprintPagesHTML(pages: BlueprintInstance[], canEdit = true): Array<{ id: string; html: string }> {
  return pages.map(page => ({
    id: safeDomIdSegment(page.id),
    html: buildBlueprintPageHTML(page, canEdit),
  }));
}

/**
 * Build HTML for a single blueprint page.
 */
function buildBlueprintPageHTML(page: BlueprintInstance, canEdit: boolean): string {
  if (!page.card || Object.keys(page.card).length === 0) {
    return buildEmptyBlueprintHTML(page, canEdit);
  }

  // Render the resolved card config as HTML
  const cardHTML = cardConfigToHTML(page.card, page.name);
  const editButton = canEdit
    ? `<button class="bp-page-edit" title="编辑输入" data-action="edit-blueprint" data-blueprint-id="${escapeAttribute(page.id)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>`
    : '';

  return `
<style>
  .bp-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bp-page-hdr {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .bp-page-icon {
    width: 32px; height: 32px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    color: var(--hdp-primary);
  }
  .bp-page-icon svg { width: 16px; height: 16px; }
  .bp-page-name {
    font: inherit;
    font-size: 16px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .bp-page-edit {
    margin-left: auto;
    width: 34px; height: 34px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    border: 1px solid var(--hdp-border);
    background: transparent;
    color: var(--hdp-text-secondary);
    transition: all 0.2s ease;
  }
  .bp-page-edit:hover {
    background: var(--hdp-divider);
    color: var(--hdp-text);
  }
  .bp-page-edit svg { width: 16px; height: 16px; }
  .bp-page-content {
    display: flex;
    flex-direction: column;
    gap: var(--hdp-card-gap, 12px);
  }
</style>
<div class="bp-page">
  <div class="bp-page-hdr">
    <div class="bp-page-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </div>
    <span class="bp-page-name">${escapeHTML(page.name)}</span>
    ${editButton}
  </div>
  <div class="bp-page-content">
    ${cardHTML}
  </div>
</div>`;
}

/**
 * Build HTML for an empty/unconfigured blueprint.
 */
function buildEmptyBlueprintHTML(page: BlueprintInstance, canEdit: boolean): string {
  const configureButton = canEdit
    ? `<button class="bp-btn bp-btn--primary" data-action="edit-blueprint" data-blueprint-id="${escapeAttribute(page.id)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      配置输入
    </button>`
    : '';
  return `<div class="bp-empty-page">
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
    <span class="bp-empty-title">${escapeHTML(page.name)}</span>
    <span class="bp-empty-desc">蓝图配置为空，请点击编辑按钮配置输入参数</span>
    ${configureButton}
  </div>
  <style>
    .bp-empty-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px 20px;
      color: var(--hdp-text-muted);
    }
    .bp-empty-title {
      font: inherit;
      font-size: 16px;
      font-weight: 700;
      color: var(--hdp-text);
    }
    .bp-empty-desc {
      font: inherit;
      font-size: 13px;
      color: var(--hdp-text-secondary);
      text-align: center;
      max-width: 300px;
    }
  </style>`;
}
