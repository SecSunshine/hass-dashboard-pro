/**
 * Bento Grid Layout Engine (v1.0)
 *
 * Replaces the vertical flex-column card stacking with an asymmetric
 * CSS Grid "Bento Box" layout. Cards have size attributes (sm/md/lg/wide/tall)
 * that control their grid-column and grid-row spans.
 *
 * Desktop (≥1024px): 4-column grid
 * Tablet (640-1023px): 2-column grid
 * Mobile (<640px): 1-column grid (all cards full width)
 *
 * Uses `grid-auto-flow: dense` to automatically fill gaps when card
 * sizes vary, producing a visually balanced masonry-like layout.
 */

// ─── Card Size Types ───────────────────────────────────────────────────────

export type BentoSize = 'sm' | 'md' | 'lg' | 'wide' | 'tall';
export const BENTO_SIZE_VALUES: readonly BentoSize[] = ['sm', 'md', 'lg', 'wide', 'tall'];

interface GridSpan {
  /** Columns to span on desktop (4-col grid) */
  colDesktop: number;
  /** Rows to span on desktop */
  rowDesktop: number;
  /** Columns to span on tablet (2-col grid) */
  colTablet: number;
  /** Rows to span on tablet */
  rowTablet: number;
}

/**
 * Bento size specifications.
 * Desktop grid is 4 columns; tablet grid is 2 columns.
 */
export const BENTO_SIZES: Record<BentoSize, GridSpan> = {
  sm:   { colDesktop: 1, rowDesktop: 1, colTablet: 1, rowTablet: 1 },
  md:   { colDesktop: 2, rowDesktop: 1, colTablet: 2, rowTablet: 1 },
  lg:   { colDesktop: 2, rowDesktop: 2, colTablet: 2, rowTablet: 2 },
  wide: { colDesktop: 4, rowDesktop: 1, colTablet: 2, rowTablet: 1 },
  tall: { colDesktop: 1, rowDesktop: 2, colTablet: 1, rowTablet: 2 },
};

// ─── CSS Generation ────────────────────────────────────────────────────────

/**
 * Generate the Bento grid CSS for both home and area content containers.
 * This CSS replaces the flex-column layout in the layout card.
 */
export function generateBentoCSS(): string {
  return /* css */ `
  /* ── Bento Grid: Home Content (4 columns desktop) ── */
  .hdp-home-content {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: var(--hdp-density-row-height, 120px);
    grid-auto-flow: dense;
    gap: var(--hdp-card-gap, var(--hdp-density-gap, 12px));
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  /* ── Bento Grid: Area & Device Content (2 columns) ── */
  .hdp-area-content {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: auto;
    grid-auto-flow: dense;
    align-items: start;
    gap: var(--hdp-card-gap, var(--hdp-density-gap, 12px));
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .hdp-area-content > .hdp-bento {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  /* ── Bento Card Size Classes (Desktop) ── */
  .hdp-bento--sm   { grid-column: span 1; grid-row: span 1; }
  .hdp-bento--md   { grid-column: span 2; grid-row: span 1; }
  .hdp-bento--lg   { grid-column: span 2; grid-row: span 2; }
  .hdp-bento--wide { grid-column: span 4; grid-row: span 1; }
  .hdp-bento--tall { grid-column: span 1; grid-row: span 2; }

  /* ── Bento Card Wrapper ── */
  .hdp-bento {
    min-width: 0;
    min-height: 0;
  }
  .hdp-bento > :first-child {
    height: 100%;
  }

  /* Explicit card spans are the only home layout override. */
  .hdp-home-content .hdp-bento[data-hdp-bento-custom="true"] {
    grid-column: span var(--hdp-bento-column-span) !important;
    grid-row: span var(--hdp-bento-row-span) !important;
  }

  .hdp-home-content[data-hdp-layout-mode="freeform"] {
    display: block;
    position: relative;
    min-height: var(--hdp-freeform-canvas-height, 320px);
  }
  .hdp-home-content[data-hdp-layout-mode="freeform"] > .hdp-bento {
    position: absolute;
    left: var(--hdp-ff-x, 0px);
    top: var(--hdp-ff-y, 0px);
    width: var(--hdp-ff-width, min(100%, 300px));
    height: var(--hdp-ff-height, 192px);
    grid-column: auto !important;
    grid-row: auto !important;
    transition: box-shadow 150ms ease;
  }
  .hdp-snap-guide {
    display: none;
    position: absolute;
    z-index: 40;
    pointer-events: none;
    background: var(--hdp-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--hdp-primary) 25%, transparent);
  }
  .hdp-root--card-edit .hdp-home-content[data-hdp-layout-mode="freeform"] .hdp-snap-guide[data-visible="true"] {
    display: block;
  }
  .hdp-snap-guide--x { top: 0; bottom: 0; width: 1px; }
  .hdp-snap-guide--y { left: 0; right: 0; height: 1px; }

  /* ── Non-bento children span full width (settings, blueprints, etc.) ── */
  .hdp-area-content > :not(.hdp-bento) {
    grid-column: 1 / -1;
  }

  /* ── Tablet Responsive (≤1023px): Home → 2 columns ── */
  @media (max-width: 1023px) {
    .hdp-home-content {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .hdp-bento--sm   { grid-column: span 1; grid-row: span 1; }
    .hdp-bento--md   { grid-column: span 2; grid-row: span 1; }
    .hdp-bento--lg   { grid-column: span 2; grid-row: span 2; }
    .hdp-bento--wide { grid-column: span 2; grid-row: span 1; }
    .hdp-bento--tall { grid-column: span 1; grid-row: span 2; }
    .hdp-home-content .hdp-bento[data-hdp-bento-custom="true"] {
      grid-column: span var(--hdp-bento-tablet-column-span) !important;
      grid-row: span var(--hdp-bento-row-span) !important;
    }
    .hdp-home-content[data-hdp-layout-mode="freeform"] > .hdp-bento {
      left: var(--hdp-ff-tablet-x, var(--hdp-ff-x, 0px));
      top: var(--hdp-ff-tablet-y, var(--hdp-ff-y, 0px));
      width: var(--hdp-ff-tablet-width, var(--hdp-ff-width, min(100%, 300px)));
      height: var(--hdp-ff-tablet-height, var(--hdp-ff-height, 192px));
    }
    .hdp-home-content[data-hdp-layout-mode="freeform"] {
      min-height: var(--hdp-freeform-tablet-canvas-height, var(--hdp-freeform-canvas-height, 320px));
    }
  }

  /* ── Mobile Responsive (≤639px): Home → 1 column, Area → 1 column ── */
  @media (max-width: 639px) {
    .hdp-home-content {
      grid-template-columns: minmax(0, 1fr);
      grid-auto-rows: auto;
    }
    .hdp-area-content {
      grid-template-columns: minmax(0, 1fr);
    }
    .hdp-bento--sm,
    .hdp-bento--md,
    .hdp-bento--lg,
    .hdp-bento--wide,
    .hdp-bento--tall {
      grid-column: span 1;
      grid-row: span 1;
    }
    .hdp-home-content .hdp-bento[data-hdp-bento-custom="true"] {
      grid-column: span 1 !important;
      grid-row: span 1 !important;
    }
    .hdp-home-content[data-hdp-layout-mode="freeform"] {
      display: grid;
      min-height: 0;
    }
    .hdp-home-content[data-hdp-layout-mode="freeform"] > .hdp-bento {
      position: relative;
      left: auto;
      top: auto;
      width: auto;
      height: auto;
    }
  }
  `;
}

export interface BentoGridSpan {
  columns: number;
  rows: number;
}

export interface BentoFreeformLayout {
  desktop?: { x: number; y: number; width: number; height: number };
  tablet?: { x: number; y: number; width: number; height: number };
}

// ─── HTML Wrapper ──────────────────────────────────────────────────────────

/**
 * Wrap card HTML content in a Bento grid item div with the specified size.
 *
 * @param html   The card's inner HTML
 * @param size   Bento size class (sm/md/lg/wide/tall)
 * @returns      Wrapped HTML: `<div class="hdp-bento hdp-bento--{size}">{html}</div>`
 */
export function bentoWrap(
  html: string,
  size: BentoSize,
  span?: BentoGridSpan,
  slotId?: string,
  freeform?: BentoFreeformLayout,
): string {
  const slotAttribute = slotId ? ` data-hdp-slot="${escapeBentoAttribute(slotId)}"` : '';
  const styles: string[] = [];
  const attributes: string[] = [];
  if (span) {
    const columns = sanitizeGridSpan(span.columns, 1, 4);
    const rows = sanitizeGridSpan(span.rows, 1, 6);
    attributes.push('data-hdp-bento-custom="true"');
    styles.push(`--hdp-bento-column-span: ${columns}`, `--hdp-bento-tablet-column-span: ${Math.min(columns, 2)}`, `--hdp-bento-row-span: ${rows}`);
  }
  if (freeform?.desktop) appendFreeformStyle(styles, attributes, 'desktop', freeform.desktop);
  if (freeform?.tablet) appendFreeformStyle(styles, attributes, 'tablet', freeform.tablet);
  const extraAttributes = attributes.length ? ` ${attributes.join(' ')}` : '';
  const styleAttribute = styles.length ? ` style="${styles.join('; ')};"` : '';
  return `<div class="hdp-bento hdp-bento--${size}"${slotAttribute}${extraAttributes}${styleAttribute}>${html}</div>`;
}

function appendFreeformStyle(
  styles: string[],
  attributes: string[],
  breakpoint: 'desktop' | 'tablet',
  rect: { x: number; y: number; width: number; height: number },
): void {
  const prefix = breakpoint === 'desktop' ? 'ff' : 'ff-tablet';
  attributes.push(`data-hdp-freeform-${breakpoint}="true"`);
  styles.push(
    `--hdp-${prefix}-x: ${Math.max(0, Math.round(Number(rect.x) || 0))}px`,
    `--hdp-${prefix}-y: ${Math.max(0, Math.round(Number(rect.y) || 0))}px`,
    `--hdp-${prefix}-width: ${Math.max(150, Math.round(Number(rect.width) || 300))}px`,
    `--hdp-${prefix}-height: ${Math.max(96, Math.round(Number(rect.height) || 192))}px`,
  );
}

function escapeBentoAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Card Size Resolution ──────────────────────────────────────────────────

/**
 * Valid Bento sizes as a Set for quick validation.
 */
const VALID_SIZES = new Set<BentoSize>(BENTO_SIZE_VALUES);

/**
 * Resolve a card's Bento size from user configuration.
 *
 * @param cardId      Stable card identifier (e.g. 'home_welcome', 'area_header')
 * @param defaultSize The default size used when no override exists
 * @param cardSizes   Optional user-configured size map (card_id → size string)
 * @returns           The resolved BentoSize (validated, falls back to default)
 */
export function resolveCardSize(
  cardId: string,
  defaultSize: BentoSize,
  cardSizes?: Record<string, string>,
): BentoSize {
  if (!cardSizes) return defaultSize;
  return sanitizeBentoSize(cardSizes[cardId], defaultSize);
}

// ─── Layout Density Presets ────────────────────────────────────────────────

export type LayoutDensity = 'compact' | 'standard' | 'spacious';
export const LAYOUT_DENSITY_VALUES: readonly LayoutDensity[] = ['compact', 'standard', 'spacious'];

export interface DensityPreset {
  /** Card gap in px */
  gap: number;
  /** Card padding in px */
  padding: number;
  /** Bento grid auto row min height in px */
  rowHeight: number;
  /** Entity card padding in px (inside domain sections) */
  entityPadding: number;
}

export const DENSITY_PRESETS: Record<LayoutDensity, DensityPreset> = {
  compact:  { gap: 8,  padding: 12, rowHeight: 84, entityPadding: 10 },
  standard: { gap: 14, padding: 18, rowHeight: 96, entityPadding: 14 },
  spacious: { gap: 20, padding: 24, rowHeight: 112, entityPadding: 18 },
};

export function sanitizeBentoSize(value: unknown, fallback: BentoSize = 'md'): BentoSize {
  return typeof value === 'string' && VALID_SIZES.has(value as BentoSize)
    ? value as BentoSize
    : fallback;
}

export function sanitizeGridSpan(value: unknown, min: number, max: number): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export function resolveBentoGridSpan(columns: unknown, rows: unknown, size: BentoSize): BentoGridSpan {
  const preset = BENTO_SIZES[size];
  return {
    columns: columns == null ? preset.colDesktop : sanitizeGridSpan(columns, 1, 4),
    rows: rows == null ? preset.rowDesktop : sanitizeGridSpan(rows, 1, 6),
  };
}

export function sanitizeLayoutDensity(value: unknown, fallback: LayoutDensity = 'standard'): LayoutDensity {
  return typeof value === 'string' && (LAYOUT_DENSITY_VALUES as readonly string[]).includes(value)
    ? value as LayoutDensity
    : fallback;
}

/**
 * Generate CSS variables for the given layout density.
 * These variables are consumed by the Bento grid and card components.
 */
export function generateDensityCSS(density?: LayoutDensity): string {
  const safeDensity = sanitizeLayoutDensity(density);
  const preset = DENSITY_PRESETS[safeDensity];
  return /* css */ `
  :root, :host {
    --hdp-density-gap: ${preset.gap}px;
    --hdp-density-padding: ${preset.padding}px;
    --hdp-density-row-height: ${preset.rowHeight}px;
    --hdp-density-entity-padding: ${preset.entityPadding}px;
    --hdp-density: ${safeDensity};
  }
  `;
}
