export interface FreeformRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FreeformSnapResult {
  rect: FreeformRect;
  guideX?: number;
  guideY?: number;
}

export interface PackedFreeformItem {
  id: string;
  width: number;
  height: number;
}

export const FREEFORM_MIN_WIDTH = 150;
export const FREEFORM_MIN_HEIGHT = 96;
export const FREEFORM_DEFAULT_GAP = 12;
export const FREEFORM_DEFAULT_SNAP_DISTANCE = 10;

export function sanitizeFreeformRect(
  value: unknown,
  containerWidth = 1200,
  fallback: FreeformRect = { x: 0, y: 0, width: 300, height: 192 },
): FreeformRect {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Record<keyof FreeformRect, unknown>>
    : {};
  const widthLimit = Math.max(FREEFORM_MIN_WIDTH, finite(containerWidth, 1200));
  const width = clamp(finite(input.width, fallback.width), FREEFORM_MIN_WIDTH, widthLimit);
  const height = Math.max(FREEFORM_MIN_HEIGHT, finite(input.height, fallback.height));
  const x = clamp(finite(input.x, fallback.x), 0, Math.max(0, widthLimit - width));
  const y = Math.max(0, finite(input.y, fallback.y));
  return roundRect({ x, y, width, height });
}

export function snapFreeformRect(
  source: FreeformRect,
  peers: FreeformRect[],
  containerWidth: number,
  threshold = FREEFORM_DEFAULT_SNAP_DISTANCE,
): FreeformSnapResult {
  const rect = sanitizeFreeformRect(source, containerWidth, source);
  const safeThreshold = Math.max(0, finite(threshold, FREEFORM_DEFAULT_SNAP_DISTANCE));
  const xAnchors = [0, containerWidth / 2, containerWidth];
  const yAnchors = [0];
  peers.forEach(peer => {
    const safe = sanitizeFreeformRect(peer, containerWidth, peer);
    xAnchors.push(safe.x, safe.x + safe.width / 2, safe.x + safe.width);
    yAnchors.push(safe.y, safe.y + safe.height / 2, safe.y + safe.height);
  });
  const snappedX = closestSnap([
    { value: rect.x, offset: 0 },
    { value: rect.x + rect.width / 2, offset: rect.width / 2 },
    { value: rect.x + rect.width, offset: rect.width },
  ], xAnchors, safeThreshold);
  const snappedY = closestSnap([
    { value: rect.y, offset: 0 },
    { value: rect.y + rect.height / 2, offset: rect.height / 2 },
    { value: rect.y + rect.height, offset: rect.height },
  ], yAnchors, safeThreshold);
  return {
    rect: sanitizeFreeformRect({
      ...rect,
      x: snappedX ? snappedX.anchor - snappedX.offset : rect.x,
      y: snappedY ? snappedY.anchor - snappedY.offset : rect.y,
    }, containerWidth, rect),
    guideX: snappedX?.anchor,
    guideY: snappedY?.anchor,
  };
}

export function resolveFreeformCollisions(
  source: FreeformRect,
  peers: FreeformRect[],
  containerWidth: number,
  gap = FREEFORM_DEFAULT_GAP,
): FreeformRect {
  const safeGap = Math.max(0, finite(gap, FREEFORM_DEFAULT_GAP));
  let rect = sanitizeFreeformRect(source, containerWidth, source);
  const ordered = peers
    .map(peer => sanitizeFreeformRect(peer, containerWidth, peer))
    .sort((left, right) => left.y - right.y || left.x - right.x);
  let iterations = 0;
  while (iterations < ordered.length + 2) {
    const collision = ordered.find(peer => overlaps(rect, peer, safeGap));
    if (!collision) break;
    rect = sanitizeFreeformRect({ ...rect, y: collision.y + collision.height + safeGap }, containerWidth, rect);
    iterations += 1;
  }
  return rect;
}

export function packFreeformItems(
  items: PackedFreeformItem[],
  containerWidth: number,
  gap = FREEFORM_DEFAULT_GAP,
): Record<string, FreeformRect> {
  const width = Math.max(FREEFORM_MIN_WIDTH, finite(containerWidth, 1200));
  const safeGap = Math.max(0, finite(gap, FREEFORM_DEFAULT_GAP));
  const output: Record<string, FreeformRect> = {};
  const placed: FreeformRect[] = [];
  items.forEach(item => {
    const size = sanitizeFreeformRect({ x: 0, y: 0, width: item.width, height: item.height }, width);
    let x = 0;
    let y = 0;
    let found = false;
    const candidates = Array.from(new Set([0, ...placed.map(rect => rect.x + rect.width + safeGap)]))
      .filter(candidate => candidate + size.width <= width + 0.5)
      .sort((left, right) => left - right);
    for (const candidateX of candidates) {
      const candidateY = placed
        .filter(rect => horizontalOverlap(candidateX, size.width, rect))
        .reduce((bottom, rect) => Math.max(bottom, rect.y + rect.height + safeGap), 0);
      if (!found || candidateY < y || (candidateY === y && candidateX < x)) {
        x = candidateX;
        y = candidateY;
        found = true;
      }
    }
    const rect = sanitizeFreeformRect({ x, y, width: size.width, height: size.height }, width, size);
    output[item.id] = rect;
    placed.push(rect);
  });
  return output;
}

export function freeformCanvasHeight(rects: FreeformRect[], gap = FREEFORM_DEFAULT_GAP): number {
  if (!rects.length) return 0;
  return Math.ceil(Math.max(...rects.map(rect => rect.y + rect.height)) + Math.max(0, gap));
}

function finite(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundRect(rect: FreeformRect): FreeformRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function closestSnap(
  edges: Array<{ value: number; offset: number }>,
  anchors: number[],
  threshold: number,
): { anchor: number; offset: number } | undefined {
  let best: { anchor: number; offset: number; distance: number } | undefined;
  edges.forEach(edge => anchors.forEach(anchor => {
    const distance = Math.abs(edge.value - anchor);
    if (distance <= threshold && (!best || distance < best.distance)) best = { anchor, offset: edge.offset, distance };
  }));
  return best;
}

function overlaps(left: FreeformRect, right: FreeformRect, gap: number): boolean {
  return left.x < right.x + right.width + gap && left.x + left.width + gap > right.x &&
    left.y < right.y + right.height + gap && left.y + left.height + gap > right.y;
}

function horizontalOverlap(x: number, width: number, rect: FreeformRect): boolean {
  return x < rect.x + rect.width && x + width > rect.x;
}
