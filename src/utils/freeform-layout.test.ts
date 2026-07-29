import { describe, expect, it } from 'vitest';
import {
  freeformCanvasHeight,
  packFreeformItems,
  resolveFreeformCollisions,
  sanitizeFreeformRect,
  snapFreeformRect,
} from './freeform-layout';

describe('freeform card layout', () => {
  it('sanitizes free pixel dimensions inside the canvas', () => {
    expect(sanitizeFreeformRect({ x: 1100, y: -20, width: 360.4, height: 70 }, 1200)).toEqual({
      x: 840,
      y: 0,
      width: 360,
      height: 96,
    });
  });

  it('snaps edges and centers to nearby cards and canvas guides', () => {
    const snapped = snapFreeformRect(
      { x: 305, y: 198, width: 290, height: 180 },
      [{ x: 0, y: 0, width: 300, height: 190 }],
      1200,
      10,
    );

    expect(snapped.rect).toEqual({ x: 300, y: 190, width: 290, height: 180 });
    expect(snapped.guideX).toBe(300);
    expect(snapped.guideY).toBe(190);
  });

  it('pushes a dropped card below colliding cards', () => {
    expect(resolveFreeformCollisions(
      { x: 10, y: 20, width: 300, height: 150 },
      [{ x: 0, y: 0, width: 320, height: 180 }],
      1000,
      12,
    )).toEqual({ x: 10, y: 192, width: 300, height: 150 });
  });

  it('packs legacy cards without overlap and reports canvas height', () => {
    const packed = packFreeformItems([
      { id: 'welcome', width: 580, height: 220 },
      { id: 'environment', width: 280, height: 180 },
      { id: 'summary', width: 280, height: 180 },
    ], 1200, 12);

    expect(packed.welcome).toEqual({ x: 0, y: 0, width: 580, height: 220 });
    expect(packed.environment.x).toBe(592);
    expect(packed.summary.x).toBeGreaterThan(packed.environment.x);
    expect(freeformCanvasHeight(Object.values(packed), 12)).toBeGreaterThan(220);
  });
});
