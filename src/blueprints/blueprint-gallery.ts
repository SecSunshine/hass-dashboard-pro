/**
 * Blueprint Gallery — Import UI
 *
 * Builds the HTML for the blueprint management interface:
 *   1. Gallery header — title + import buttons
 *   2. Blueprint list — installed pages with edit/remove
 *   3. Import modal — paste YAML, enter URL, or browse gallery
 *   4. Input editor — configure placeholder values
 *
 * All interactions are handled by client-side JS (from blueprint-storage.ts).
 */

import type { BlueprintInstance } from '../types';
import { escapeAttribute, escapeHTML } from '../utils/html';

function jsArg(value: unknown): string {
  return escapeAttribute(JSON.stringify(String(value ?? '')));
}

// ─── Gallery HTML Builder ───────────────────────────────────────────────────

/**
 * Build the blueprint management panel HTML.
 * This is rendered inside the settings view's "Blueprints" section.
 */
export function buildBlueprintGalleryHTML(pages: BlueprintInstance[]): string {
  const pagesHTML = pages.length > 0
    ? pages.map(p => buildBlueprintItemHTML(p)).join('')
    : '<div class="bp-empty-list">暂无蓝图页面，点击上方按钮导入</div>';

  return `
<style>
  .bp-gallery {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bp-gallery-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 4px;
    min-width: 0;
  }
  .bp-gallery-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .bp-gallery-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 0;
  }
  .bp-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--hdp-radius);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
    border: 1px solid var(--hdp-border);
    background: var(--hdp-card-bg);
    color: var(--hdp-text);
    max-width: 100%;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: center;
  }
  .bp-btn:hover {
    transform: translateY(-2px);
    border-color: var(--hdp-primary);
  }
  .bp-btn--primary {
    background: var(--hdp-primary);
    color: white;
    border-color: var(--hdp-primary);
  }
  .bp-btn--primary:hover {
    opacity: 0.9;
  }
  .bp-btn svg {
    width: 16px; height: 16px;
  }
  .bp-item {
    background: var(--hdp-card-bg);
    border-radius: var(--hdp-radius);
    padding: 14px;
    border: 1px solid var(--hdp-border);
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.2s ease;
    min-width: 0;
  }
  .bp-item:hover {
    border-color: var(--hdp-primary);
  }
  .bp-item-icon {
    width: 38px; height: 38px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    background: var(--hdp-primary-light, rgba(79,110,247,0.1));
    color: var(--hdp-primary);
    flex-shrink: 0;
  }
  .bp-item-icon svg { width: 19px; height: 19px; }
  .bp-item-info {
    flex: 1;
    min-width: 0;
  }
  .bp-item-name {
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--hdp-text);
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .bp-item-meta {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 2px;
  }
  .bp-item-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
    flex: 0 1 auto;
    min-width: 0;
  }
  .bp-item-btn {
    width: 34px; height: 34px;
    flex: 0 0 34px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--hdp-border);
    background: transparent;
    color: var(--hdp-text-secondary);
  }
  .bp-item-btn:hover {
    background: var(--hdp-divider);
    color: var(--hdp-text);
  }
  .bp-item-btn--danger:hover {
    background: var(--hdp-danger-light, rgba(239,68,68,0.1));
    color: var(--hdp-danger, #EF4444);
    border-color: var(--hdp-danger, #EF4444);
  }
  .bp-item-btn svg { width: 16px; height: 16px; }
  .bp-empty-list {
    text-align: center;
    padding: 30px 20px;
    color: var(--hdp-text-muted);
    font: inherit;
    font-size: 13px;
  }
  .bp-version {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: var(--hdp-radius-pill, 20px);
    background: var(--hdp-divider);
    color: var(--hdp-text-muted);
    font-weight: 600;
  }
  .bp-update-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--hdp-success);
    display: inline-block;
    margin-left: 4px;
  }
  @media (max-width: 720px) {
    .bp-gallery-hdr {
      align-items: stretch;
      flex-direction: column;
    }
    .bp-gallery-actions {
      justify-content: stretch;
      width: 100%;
    }
    .bp-btn {
      flex: 1 1 120px;
      justify-content: center;
    }
    .bp-item {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .bp-item-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>
<div class="bp-gallery" id="bp-gallery">
  <div class="bp-gallery-hdr">
    <span class="bp-gallery-title">蓝图页面</span>
    <div class="bp-gallery-actions">
      <button class="bp-btn" data-action="import-built-in-template" onclick="hdpImportBuiltInTemplate()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        模板库
      </button>
      <button class="bp-btn" data-action="import-online-template" onclick="hdpImportOnlineTemplate()">在线库</button>
      <button class="bp-btn" data-action="import-screenshot-draft" onclick="hdpImportScreenshotDraft()">截图复刻</button>
      <button class="bp-btn" data-action="export-share-code" onclick="hdpExportShareCode()">分享</button>
      <button class="bp-btn" data-action="import-share-code" onclick="hdpImportShareCode()">复刻</button>
      <button class="bp-btn" data-action="show-import-report" onclick="hdpShowImportReport()">报告</button>
      <button class="bp-btn" onclick="hdpShowImportModal('url')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        URL 导入
      </button>
      <button class="bp-btn bp-btn--primary" onclick="hdpShowImportModal('paste')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
        粘贴导入
      </button>
    </div>
  </div>
  ${pagesHTML}
</div>`;
}

function buildBlueprintItemHTML(page: BlueprintInstance): string {
  const c = 'currentColor';
  const inputCount = Object.keys(page.inputs || {}).length;

  return `<div class="bp-item" data-bp-id="${escapeAttribute(page.id)}">
    <div class="bp-item-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </div>
    <div class="bp-item-info">
      <div class="bp-item-name">${escapeHTML(page.name)}</div>
      <div class="bp-item-meta">
        <span>${inputCount} 个输入</span>
        ${page.source ? '<span>来源: URL</span>' : '<span>本地导入</span>'}
      </div>
    </div>
    <div class="bp-item-actions">
      <button class="bp-item-btn" title="编辑输入" data-action="edit-blueprint" onclick="hdpShowInputEditor(${jsArg(page.id)})">
        <svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      ${page.source ? `<button class="bp-item-btn" title="检查更新" data-action="check-blueprint-update" onclick="hdpCheckBlueprintUpdate(${jsArg(page.id)})">
        <svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      </button>` : ''}
      <button class="bp-item-btn bp-item-btn--danger" title="删除" data-action="remove-blueprint" onclick="hdpRemoveBlueprint(${jsArg(page.id)})">
        <svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  </div>`;
}

// ─── Import Modal Builder ───────────────────────────────────────────────────

/**
 * Build the import modal HTML (shown as a sheet/overlay).
 */
export function buildImportModalHTML(): string {
  return `
<style>
  .bp-modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }
  .bp-modal-overlay--active { display: flex; }
  .bp-modal {
    background: var(--hdp-card-bg, #fff);
    border-radius: var(--hdp-radius, 14px);
    padding: 24px;
    width: min(560px, 100%);
    max-width: 100%;
    max-height: calc(100vh - 32px);
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    box-sizing: border-box;
  }
  .bp-modal-title {
    font: inherit;
    font-size: 18px;
    font-weight: 700;
    color: var(--hdp-text);
    margin-bottom: 16px;
    overflow-wrap: anywhere;
  }
  .bp-modal-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }
  .bp-modal-label {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
  }
  .bp-modal-input {
    font: inherit;
    font-size: 14px;
    padding: 10px 14px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-bg);
    color: var(--hdp-text);
    outline: none;
    min-height: 44px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .bp-modal-input:focus {
    border-color: var(--hdp-primary);
    box-shadow: 0 0 0 3px var(--hdp-primary-glow, rgba(79,110,247,0.15));
  }
  .bp-modal-textarea {
    font: inherit;
    font-size: 13px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    padding: 12px 14px;
    border-radius: var(--hdp-radius);
    border: 1px solid var(--hdp-border);
    background: var(--hdp-bg);
    color: var(--hdp-text);
    outline: none;
    min-height: 200px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    resize: vertical;
    box-sizing: border-box;
  }
  .bp-modal-textarea:focus {
    border-color: var(--hdp-primary);
  }
  .bp-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
    min-width: 0;
  }
  .bp-modal-actions .bp-btn {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .bp-input-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bp-input-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bp-input-label {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
  }
  .bp-input-desc {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-muted);
    overflow-wrap: anywhere;
  }
  @media (max-width: 480px) {
    .bp-modal-overlay { padding: 12px; }
    .bp-modal {
      padding: 16px;
      max-height: calc(100vh - 24px);
    }
    .bp-modal-actions { justify-content: stretch; }
    .bp-modal-actions .bp-btn { flex: 1 1 120px; }
  }
</style>
<div class="bp-modal-overlay" id="bp-import-modal">
  <div class="bp-modal">
    <div class="bp-modal-title" id="bp-modal-title">导入蓝图</div>

    <!-- URL Import -->
    <div id="bp-import-url" style="display:none">
      <div class="bp-modal-field">
        <label class="bp-modal-label">蓝图 YAML URL</label>
        <input class="bp-modal-input" id="bp-url-input" placeholder="https://raw.githubusercontent.com/.../page.yaml" />
      </div>
    </div>

    <!-- Paste Import -->
    <div id="bp-import-paste" style="display:none">
      <div class="bp-modal-field">
        <label class="bp-modal-label">粘贴蓝图 YAML</label>
        <textarea class="bp-modal-textarea" id="bp-yaml-input" placeholder="meta:&#10;  name: My Page&#10;  version: 1.0.0&#10;  inputs: ..."></textarea>
      </div>
    </div>

    <!-- Input Editor (for editing existing blueprint inputs) -->
    <div id="bp-input-editor" style="display:none">
      <div class="bp-input-editor" id="bp-input-fields"></div>
    </div>

    <div class="bp-modal-actions">
      <button class="bp-btn" onclick="hdpCloseImportModal()">取消</button>
      <button class="bp-btn bp-btn--primary" id="bp-modal-confirm" onclick="hdpConfirmImport()">导入</button>
    </div>
  </div>
</div>`;
}

// ─── Client-Side Modal JS ───────────────────────────────────────────────────

/**
 * Generate client-side JS for the import modal and input editor.
 */
export function generateBlueprintModalJS(): string {
  return `
// ─── Blueprint Modal ─────────────────────────────────────────────────────

(function() {
  var currentMode = '';
  var editingPageId = '';

  function hdpEscapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function hdpEscapeAttribute(value) {
    return hdpEscapeHTML(value);
  }

  function hdpSafeDomIdSegment(value) {
    return String(value || 'page').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64) || 'page';
  }

  function hdpBlueprintViewId(id) {
    return 'bp-' + hdpSafeDomIdSegment(id);
  }

  function hdpModalElement(id) {
    return document.getElementById(id);
  }

  function hdpSetModalDisplay(id, value) {
    var el = hdpModalElement(id);
    if (el) el.style.display = value;
    return el;
  }

  function hdpSetModalText(id, value) {
    var el = hdpModalElement(id);
    if (el) el.textContent = value;
    return el;
  }

  function hdpSetModalClick(id, handler) {
    var el = hdpModalElement(id);
    if (el) el.onclick = handler;
    return el;
  }

  function hdpModalValue(id) {
    var el = hdpModalElement(id);
    return el && typeof el.value === 'string' ? el.value : '';
  }

  function hdpShowBlueprintView(id) {
    if (typeof window.hdpShowView === 'function') window.hdpShowView(hdpBlueprintViewId(id));
  }

  window.hdpShowImportModal = function(mode) {
    currentMode = mode;
    editingPageId = '';
    var modal = hdpModalElement('bp-import-modal');
    if (!modal) return;

    // Reset all panels
    hdpSetModalDisplay('bp-import-url', 'none');
    hdpSetModalDisplay('bp-import-paste', 'none');
    hdpSetModalDisplay('bp-input-editor', 'none');


    if (mode === 'url') {
      hdpSetModalText('bp-modal-title', '从 URL 导入');
      hdpSetModalDisplay('bp-import-url', '');
      hdpSetModalText('bp-modal-confirm', '导入');
      hdpSetModalClick('bp-modal-confirm', window.hdpConfirmImport);
    } else if (mode === 'paste') {
      hdpSetModalText('bp-modal-title', '粘贴 YAML 导入');
      hdpSetModalDisplay('bp-import-paste', '');
      hdpSetModalText('bp-modal-confirm', '导入');
      hdpSetModalClick('bp-modal-confirm', window.hdpConfirmImport);
    }

    modal.classList.add('bp-modal-overlay--active');
  };

  window.hdpCloseImportModal = function() {
    var modal = hdpModalElement('bp-import-modal');
    if (modal) modal.classList.remove('bp-modal-overlay--active');
  };

  window.hdpConfirmImport = function() {
    if (currentMode === 'url') {
      var url = hdpModalValue('bp-url-input').trim();
      if (!url) { alert('请输入 URL'); return; }
      hdpBlueprintImportURL(url, function(page, err) {
        if (page) {
          window.hdpCloseImportModal();
          alert('蓝图 "' + page.name + '" 导入成功！');
          hdpShowBlueprintView(page.id);
          // Re-render gallery in settings
          window.hdpRefreshBlueprintGallery();
        } else {
          alert('导入失败: ' + (err || '未知错误'));
        }
      });
    } else if (currentMode === 'paste') {
      var yaml = hdpModalValue('bp-yaml-input').trim();
      if (!yaml) { alert('请粘贴 YAML 内容'); return; }
      var page = hdpBlueprintImportYAML(yaml);
      if (page) {
        hdpBlueprintAdd(page);
        window.hdpCloseImportModal();
        alert('蓝图 "' + page.name + '" 导入成功！');
        hdpShowBlueprintView(page.id);
        window.hdpRefreshBlueprintGallery();
      }
    } else if (currentMode === 'edit') {
      window.hdpSaveInputEditor();
    }
  };

  // Input editor for existing blueprint
  window.hdpShowInputEditor = function(pageId) {
    editingPageId = pageId;
    currentMode = 'edit';
    var pages = hdpBlueprintLoad();
    var page = null;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].id === pageId) { page = pages[i]; break; }
    }
    if (!page) return;

    var modal = hdpModalElement('bp-import-modal');
    hdpSetModalDisplay('bp-import-url', 'none');
    hdpSetModalDisplay('bp-import-paste', 'none');
    hdpSetModalDisplay('bp-input-editor', '');

    hdpSetModalText('bp-modal-title', '编辑: ' + page.name);
    hdpSetModalText('bp-modal-confirm', '保存');
    hdpSetModalClick('bp-modal-confirm', window.hdpConfirmImport);

    // Build input fields
    var meta = hdpBlueprintParseMeta(page.blueprint_yaml);
    var fieldsHTML = '';
    var inputs = page.inputs || {};

    for (var key in meta.inputs) {
      if (!meta.inputs.hasOwnProperty(key)) continue;
      var inp = meta.inputs[key];
      var val = inputs[key] !== undefined ? inputs[key] : (inp['default'] || '');
      var safeKey = hdpEscapeAttribute(key);

      fieldsHTML += '<div class="bp-input-row">' +
        '<label class="bp-input-label">' + hdpEscapeHTML(inp.name || key) + '</label>' +
        (inp.description ? '<span class="bp-input-desc">' + hdpEscapeHTML(inp.description) + '</span>' : '') +
        '<input class="bp-modal-input" data-input-key="' + safeKey + '" value="' + hdpEscapeAttribute(val) + '" placeholder="' + safeKey + '" />' +
        '</div>';
    }

    if (!fieldsHTML) {
      fieldsHTML = '<div class="bp-input-desc">此蓝图没有可配置的输入</div>';
    }

    var fieldsRoot = hdpModalElement('bp-input-fields');
    if (fieldsRoot) fieldsRoot.innerHTML = fieldsHTML;
    if (modal) modal.classList.add('bp-modal-overlay--active');
  };

  window.hdpSaveInputEditor = function() {
    if (!editingPageId) return;
    var fields = document.querySelectorAll('#bp-input-fields [data-input-key]');
    var inputs = {};
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-input-key');
      inputs[key] = fields[i].value;
    }
    hdpBlueprintUpdateInputs(editingPageId, inputs);
    window.hdpCloseImportModal();
    hdpShowBlueprintView(editingPageId);
    window.hdpRefreshBlueprintGallery();
  };

  // Remove blueprint
  window.hdpRemoveBlueprint = function(id) {
    if (!confirm('确定删除此蓝图页面？')) return;
    hdpBlueprintRemove(id);
    if (typeof window.hdpShowView === 'function') window.hdpShowView('home');
    window.hdpRefreshBlueprintGallery();
  };

  // Check for updates
  window.hdpCheckBlueprintUpdate = function(id) {
    var pages = hdpBlueprintLoad();
    var page = null;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].id === id) { page = pages[i]; break; }
    }
    if (!page) return;

    hdpBlueprintCheckUpdate(page, function(result, err) {
      if (err) { alert('检查更新失败: ' + err); return; }
      if (result && result.hasUpdate) {
        if (confirm('发现新版本 ' + result.remoteVersion + '（当前 ' + result.localVersion + '），是否更新？')) {
          // Update YAML but preserve inputs
          page.blueprint_yaml = result.remoteYaml;
          page.card = hdpBlueprintResolveCard(page);
          var allPages = hdpBlueprintLoad();
          for (var i = 0; i < allPages.length; i++) {
            if (allPages[i].id === id) { allPages[i] = page; break; }
          }
          hdpBlueprintSave(allPages);
          hdpShowBlueprintView(id);
          window.hdpRefreshBlueprintGallery();
          alert('蓝图已更新到 ' + result.remoteVersion);
        }
      } else {
        alert('当前已是最新版本 (' + (result ? result.localVersion : '未知') + ')');
      }
    });
  };

  // Refresh gallery — reload only after the latest blueprint sync has settled.
  window.hdpRefreshBlueprintGallery = function() {
    var latestSave = window.hdpLastBlueprintSave || Promise.resolve();
    Promise.resolve(latestSave).finally(function() {
      location.reload();
    });
  };
})();
`;
}
