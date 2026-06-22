/**
 * hass-dashboard-pro — Entry Point
 *
 * Beautified Home Assistant Dashboard Strategy
 * Powered by html-pro-card rendering engine
 *
 * Design Philosophy: Apple HIG · Dieter Rams Minimalism
 * Specification: html-card-pro Design Guidelines
 *
 * Registration:
 *   Dashboard strategy → customStrategies in raw dashboard YAML
 *   View strategy → auto-registered via dashboard views
 */

import { HassDashboardProStrategy } from './strategies/dashboard-strategy';
import { HassDashboardProViewStrategy } from './strategies/view-strategy';

// ─── HA Custom Card Registration ─────────────────────────────────────────

// Register the strategies as Home Assistant custom cards
// This allows them to be used in Lovelace dashboards

const VERSION = '1.0.0';
const NAME = 'Hass Dashboard Pro';

interface HACustomCard {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
}

interface HAWindow {
  customCards?: HACustomCard[];
}

// Register custom card metadata (for HACS / HA info)
function registerCustomCard(): void {
  const w = window as unknown as HAWindow;
  if (!w.customCards) w.customCards = [];
  w.customCards.push({
    type: 'hass-dashboard-pro',
    name: NAME,
    description: 'Beautified smart home dashboard with html-pro-card rendering — Apple HIG minimalism design',
    preview: false,
  });
}

// ─── Strategy Exports ────────────────────────────────────────────────────

// Export for direct import by HA's strategy loader
export { HassDashboardProStrategy, HassDashboardProViewStrategy };

// ─── Auto-Registration ───────────────────────────────────────────────────

registerCustomCard();

console.info(
  `%c${NAME} %cv${VERSION} %cloaded`,
  'color: #1E40AF; font-weight: bold;',
  'color: #64748B;',
  'color: #16A34A;',
);
console.info(
  '%cDesign: %cApple HIG · Dieter Rams · html-pro-card',
  'color: #94A3B8;',
  'color: #1E293B;',
);
