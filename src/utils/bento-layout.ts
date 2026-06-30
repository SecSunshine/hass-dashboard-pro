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
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: minmax(120px, auto);
    grid-auto-flow: dense;
    gap: var(--hdp-card-gap, 12px);
  }

  /* ── Bento Grid: Area & Device Content (2 columns) ── */
  .hdp-area-content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: minmax(80px, auto);
    grid-auto-flow: dense;
    gap: var(--hdp-card-gap, 12px);
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

  /* ── Non-bento children span full width (settings, blueprints, etc.) ── */
  .hdp-area-content > :not(.hdp-bento) {
    grid-column: 1 / -1;
  }

  /* ── Tablet Responsive (≤1023px): Home → 2 columns ── */
  @media (max-width: 1023px) {
    .hdp-home-content {
      grid-template-columns: repeat(2, 1fr);
    }
    .hdp-bento--sm   { grid-column: span 1; grid-row: span 1; }
    .hdp-bento--md   { grid-column: span 2; grid-row: span 1; }
    .hdp-bento--lg   { grid-column: span 2; grid-row: span 2; }
    .hdp-bento--wide { grid-column: span 2; grid-row: span 1; }
    .hdp-bento--tall { grid-column: span 1; grid-row: span 2; }
  }

  /* ── Mobile Responsive (≤639px): Home → 1 column, Area → 1 column ── */
  @media (max-width: 639px) {
    .hdp-home-content {
      grid-template-columns: 1fr;
    }
    .hdp-area-content {
      grid-template-columns: 1fr;
    }
    .hdp-bento--sm,
    .hdp-bento--md,
    .hdp-bento--lg,
    .hdp-bento--wide,
    .hdp-bento--tall {
      grid-column: span 1;
      grid-row: span 1;
    }
  }
  `;
}

// ─── HTML Wrapper ──────────────────────────────────────────────────────────

/**
 * Wrap card HTML content in a Bento grid item div with the specified size.
 *
 * @param html   The card's inner HTML
 * @param size   Bento size class (sm/md/lg/wide/tall)
 * @returns      Wrapped HTML: `<div class="hdp-bento hdp-bento--{size}">{html}</div>`
 */
export function bentoWrap(html: string, size: BentoSize): string {
  return `<div class="hdp-bento hdp-bento--${size}">${html}</div>`;
}
