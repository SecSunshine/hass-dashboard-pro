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

// ─── HA Strategy Registration ─────────────────────────────────────────────

// HA loads strategies from window.customStrategies, keyed by the `type`
// field in the dashboard YAML (e.g. strategy.type: hass-dashboard-pro).
// Each strategy class must implement generate(config): { views } | { cards }.

const VERSION = '1.0.0';
const NAME = 'Hass Dashboard Pro';

interface HAWindow {
  customCards?: Array<{ type: string; name: string; description: string; preview?: boolean }>;
  customStrategies?: Record<string, unknown>;
}

function register(): void {
  const w = window as unknown as HAWindow;

  // Register for HACS / HA info display
  if (!w.customCards) w.customCards = [];
  w.customCards.push({
    type: 'hass-dashboard-pro',
    name: NAME,
    description: 'Zero-config Lovelace dashboard with Apple HIG design — powered by html-pro-card',
    preview: false,
  });

  // Register strategies so HA's strategy loader can find them by type name
  if (!w.customStrategies) w.customStrategies = {};
  w.customStrategies['hass-dashboard-pro'] = HassDashboardProStrategy;
  w.customStrategies['hass-dashboard-pro-home'] = HassDashboardProViewStrategy;
  w.customStrategies['hass-dashboard-pro-area'] = HassDashboardProViewStrategy;
}

// ─── Strategy Exports ────────────────────────────────────────────────────

export { HassDashboardProStrategy, HassDashboardProViewStrategy };

// ─── Auto-Registration ───────────────────────────────────────────────────

register();

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
