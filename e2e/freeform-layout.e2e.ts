import { expect, test, type Page } from '@playwright/test';
import { generateCardSlotEditorJS, getCardSlotCSS } from '../src/utils/card-slots';

type LayoutRect = { x: number; y: number; width: number; height: number };

const DESKTOP_RECTS: Record<string, LayoutRect> = {
  first: { x: 24, y: 24, width: 300, height: 180 },
  second: { x: 400, y: 24, width: 300, height: 180 },
  third: { x: 24, y: 240, width: 260, height: 160 },
};

const TABLET_RECTS: Record<string, LayoutRect> = {
  first: { x: 12, y: 12, width: 240, height: 160 },
  second: { x: 264, y: 12, width: 240, height: 160 },
  third: { x: 12, y: 184, width: 240, height: 150 },
};

function card(slotId: string): string {
  return `
    <div class="hdp-bento">
      <article class="hdp-card-slot" data-card-slot="${slotId}">
        <div class="hdp-slot-edit-panel">
          <button type="button" data-card-edit-action="drag" data-slot-id="${slotId}" aria-label="拖动 ${slotId}">拖</button>
        </div>
        <strong>${slotId}</strong>
        ${['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map(edge =>
          `<button type="button" class="hdp-slot-resize-handle" data-card-edit-action="resize" data-resize-edge="${edge}" data-slot-id="${slotId}" aria-label="${edge} resize"></button>`,
        ).join('')}
      </article>
    </div>`;
}

async function mountLayout(page: Page, width: number) {
  const browserErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') browserErrors.push(message.text());
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(`
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8">
        <style>${getCardSlotCSS()}</style>
        <style>
          * { box-sizing: border-box; }
          body { margin: 20px; font: 14px/1.4 sans-serif; }
          .hdp-home-edit-bar { display: flex; gap: 8px; margin-bottom: 12px; }
          .hdp-home-content { position: relative; width: 100%; min-height: 600px; }
          .hdp-home-content[data-hdp-layout-mode="freeform"] .hdp-bento {
            position: absolute;
            left: var(--hdp-ff-x);
            top: var(--hdp-ff-y);
            width: var(--hdp-ff-width);
            height: var(--hdp-ff-height);
          }
          .hdp-card-slot { position: relative; width: 100%; height: 100%; padding: 44px 16px 16px; border: 1px solid #777; background: #fff; }
          .hdp-slot-edit-panel { position: absolute; left: 8px; top: 8px; }
          .hdp-snap-guide { position: absolute; z-index: 5; pointer-events: none; background: #d22; }
          .hdp-snap-guide--x { top: 0; bottom: 0; width: 1px; }
          .hdp-snap-guide--y { left: 0; right: 0; height: 1px; }
          .hdp-snap-guide[data-visible="false"] { display: none; }
          @media (min-width: 640px) and (max-width: 1023px) {
            .hdp-home-content[data-hdp-layout-mode="freeform"] .hdp-bento {
              left: var(--hdp-ff-tablet-x);
              top: var(--hdp-ff-tablet-y);
              width: var(--hdp-ff-tablet-width);
              height: var(--hdp-ff-tablet-height);
            }
          }
          @media (max-width: 639px) {
            .hdp-home-content { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
            .hdp-home-content .hdp-bento { position: relative !important; inset: auto !important; width: 100% !important; height: 140px !important; }
          }
        </style>
      </head>
      <body>
        <main id="hdp-root" class="hdp-root hdp-root--card-edit">
          <div class="hdp-home-edit-bar">
            <button type="button" data-action="toggle-card-snap" aria-pressed="true">磁吸：开</button>
            <button type="button" data-action="toggle-card-collision-push" aria-pressed="true">推开卡片：开</button>
            <button type="button" data-action="align-card-grid">对齐网格</button>
            <button type="button" data-action="auto-arrange-cards">自动整理</button>
          </div>
          <section class="hdp-view" data-view="home">
            <div class="hdp-home-content" data-hdp-layout-mode="freeform">
              ${card('first')}${card('second')}${card('third')}
              <div class="hdp-snap-guide hdp-snap-guide--x" data-visible="false"></div>
              <div class="hdp-snap-guide hdp-snap-guide--y" data-visible="false"></div>
            </div>
          </section>
          <div class="hdp-card-layout-status" aria-live="polite"></div>
        </main>
      </body>
    </html>
  `);
  await page.addScriptTag({
    content: `
      window.__draft = {
        cards: {
          slots: {
            first: { freeform: { desktop: ${JSON.stringify(DESKTOP_RECTS.first)}, tablet: ${JSON.stringify(TABLET_RECTS.first)} } },
            second: { freeform: { desktop: ${JSON.stringify(DESKTOP_RECTS.second)}, tablet: ${JSON.stringify(TABLET_RECTS.second)} } },
            third: { freeform: { desktop: ${JSON.stringify(DESKTOP_RECTS.third)}, tablet: ${JSON.stringify(TABLET_RECTS.third)} } }
          },
          layout: { mode: 'freeform', snap_enabled: true, snap_distance: 10, collision_push: true }
        }
      };
      window.hdpGetSettingsDraft = function() { return window.__draft; };
      window.hdpMarkSettingsDirty = function() { window.__dirty = true; };
    `,
  });
  await page.addScriptTag({ content: generateCardSlotEditorJS() });
  await page.evaluate(() => (window as any).hdpToggleCardEditMode(true));
  return browserErrors;
}

async function renderedRects(page: Page) {
  return page.locator('.hdp-bento').evaluateAll(elements => {
    const home = document.querySelector('.hdp-home-content')!.getBoundingClientRect();
    return elements.map(element => {
      const rect = element.getBoundingClientRect();
      return {
        slotId: element.querySelector('[data-card-slot]')!.getAttribute('data-card-slot'),
        x: Math.round(rect.left - home.left),
        y: Math.round(rect.top - home.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        position: getComputedStyle(element).position,
      };
    });
  });
}

for (const width of [390, 768, 1024, 1440]) {
  test(`uses the expected responsive layout at ${width}px`, async ({ page }) => {
    const browserErrors = await mountLayout(page, width);
    const rects = await renderedRects(page);

    if (width <= 639) {
      expect(rects.every(rect => rect.position !== 'absolute')).toBe(true);
      expect(rects.map(rect => rect.x)).toEqual([0, 0, 0]);
      expect(rects[1].y).toBeGreaterThan(rects[0].y + rects[0].height);
      expect(rects[2].y).toBeGreaterThan(rects[1].y + rects[1].height);
      const saved = await page.evaluate(() => (window as any).__draft.cards.slots.first.freeform);
      expect(saved).toEqual({ desktop: DESKTOP_RECTS.first, tablet: TABLET_RECTS.first });
    } else {
      const expected = width <= 1023 ? TABLET_RECTS : DESKTOP_RECTS;
      expect(Object.fromEntries(rects.map(({ slotId, position: _position, ...rect }) => [slotId, rect]))).toEqual(expected);
      await expect(page.locator('.hdp-home-content')).toHaveAttribute('data-hdp-layout-mode', 'freeform');
    }
    expect(browserErrors).toEqual([]);
  });
}

test('persists tablet edits without overwriting the desktop rectangle', async ({ page }) => {
  const browserErrors = await mountLayout(page, 768);
  await page.getByRole('button', { name: '磁吸：开' }).click();

  const dragHandle = page.locator('[data-card-edit-action="drag"][data-slot-id="first"]');
  await dragHandle.focus();
  await page.keyboard.press('Shift+ArrowRight');

  const resizeHandle = page.locator('[data-card-edit-action="resize"][data-resize-edge="se"][data-slot-id="first"]');
  await resizeHandle.focus();
  await page.keyboard.press('ArrowDown');

  const saved = await page.evaluate(() => (window as any).__draft.cards.slots.first.freeform);
  expect(saved.desktop).toEqual(DESKTOP_RECTS.first);
  expect(saved.tablet).toEqual({ x: 22, y: 12, width: 240, height: 161 });
  expect(browserErrors).toEqual([]);
});

test('drags, snaps, pushes collisions, resizes and runs layout tools', async ({ page }) => {
  const browserErrors = await mountLayout(page, 1440);
  const dragHandle = page.locator('[data-card-edit-action="drag"][data-slot-id="first"]');

  let draft: any;

  const dragBox = await dragHandle.boundingBox();
  expect(dragBox).not.toBeNull();
  await page.mouse.move(dragBox!.x + dragBox!.width / 2, dragBox!.y + dragBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBox!.x + dragBox!.width / 2 + 66, dragBox!.y + dragBox!.height / 2);
  await expect(page.locator('.hdp-snap-guide--x')).toHaveAttribute('data-visible', 'true');
  await expect(page.locator('.hdp-snap-guide--x')).toHaveCSS('left', '400px');
  await page.mouse.up();

  draft = await page.evaluate(() => (window as any).__draft.cards);
  expect(draft.slots.first.freeform.desktop.x).toBe(100);
  expect(draft.slots.second.freeform.desktop.y).toBeGreaterThanOrEqual(216);

  await page.getByRole('button', { name: '磁吸：开' }).click();
  await expect(page.locator('[data-action="toggle-card-snap"]')).toHaveAttribute('aria-pressed', 'false');
  await dragHandle.focus();
  await page.keyboard.press('Shift+ArrowRight');
  draft = await page.evaluate(() => (window as any).__draft.cards);
  expect(draft.slots.first.freeform.desktop.x).toBe(110);
  await expect(page.locator('.hdp-card-layout-status')).toContainText('卡片位置 110');

  const resizeHandle = page.locator('[data-card-edit-action="resize"][data-resize-edge="se"][data-slot-id="first"]');
  const resizeBox = await resizeHandle.boundingBox();
  expect(resizeBox).not.toBeNull();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2 + 37, resizeBox!.y + resizeBox!.height / 2 + 23);
  await page.mouse.up();

  draft = await page.evaluate(() => (window as any).__draft.cards);
  expect(draft.slots.first.freeform.desktop).toMatchObject({ x: 110, width: 337, height: 203 });

  await page.getByRole('button', { name: '对齐网格' }).click();
  draft = await page.evaluate(() => (window as any).__draft.cards);
  Object.values(draft.slots).forEach((slot: any) => {
    const rect = slot.freeform.desktop;
    expect([rect.x, rect.y, rect.width, rect.height].every(value => value % 12 === 0)).toBe(true);
  });

  await page.getByRole('button', { name: '自动整理' }).click();
  const arranged = await renderedRects(page);
  for (let i = 0; i < arranged.length; i += 1) {
    for (let j = i + 1; j < arranged.length; j += 1) {
      const left = arranged[i];
      const right = arranged[j];
      const overlaps = left.x < right.x + right.width && left.x + left.width > right.x &&
        left.y < right.y + right.height && left.y + left.height > right.y;
      expect(overlaps).toBe(false);
    }
  }
  expect(browserErrors).toEqual([]);
});
