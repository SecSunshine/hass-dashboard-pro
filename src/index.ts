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
 *   1. customElements.define('ll-strategy-dashboard-hass-dashboard-pro', ...)
 *   2. customElements.define('ll-strategy-view-hass-dashboard-pro-view', ...)
 *   3. window.customStrategies array — appears in HA "Add Dashboard" dialog (HA 2026.5+)
 */

import { HassDashboardProStrategy } from './strategies/dashboard-strategy';
import { HassDashboardProViewStrategy } from './strategies/view-strategy';

const VERSION = '2.0.0';
const NAME = 'Hass Dashboard Pro';

const DASHBOARD_STRATEGY_TYPE = 'hass-dashboard-pro';
const VIEW_STRATEGY_TYPE = 'hass-dashboard-pro-view';
const DASHBOARD_STRATEGY_TAG = `ll-strategy-dashboard-${DASHBOARD_STRATEGY_TYPE}`;
const VIEW_STRATEGY_TAG = `ll-strategy-view-${VIEW_STRATEGY_TYPE}`;

// ─── Safe Element Registration ────────────────────────────────────────────

const safeDefine = (elementName: string, constructor: CustomElementConstructor) => {
  if (!customElements.get(elementName)) {
    customElements.define(elementName, constructor);
    console.info(`%c✓ ${elementName}`, 'color: #16A34A;');
  }
};

// ─── Strategy Element Wrappers ────────────────────────────────────────────
// HA looks for custom elements named `ll-strategy-dashboard-<type>` and
// `ll-strategy-view-<type>`. Each must have a static generate() method.

const createDashboardStrategyElement = () =>
  class extends HTMLElement {
    static async generate(config: any, hass: any) {
      return HassDashboardProStrategy.generate(config, hass);
    }
  };

const createViewStrategyElement = () =>
  class extends HTMLElement {
    static async generate(config: any, hass: any) {
      return HassDashboardProViewStrategy.generate(config, hass);
    }
  };

// ─── Register Custom Elements ─────────────────────────────────────────────

safeDefine(DASHBOARD_STRATEGY_TAG, createDashboardStrategyElement());
safeDefine(VIEW_STRATEGY_TAG, createViewStrategyElement());

// ─── Register in HA "Add Dashboard" Dialog (HA 2026.5+) ──────────────────

declare global {
  interface Window {
    customStrategies?: Array<{
      type: string;
      strategyType: 'dashboard' | 'view';
      name: string;
      description?: string;
      documentationURL?: string;
    }>;
  }
}

window.customStrategies = window.customStrategies || [];
if (!window.customStrategies.some((s) => s?.type === DASHBOARD_STRATEGY_TYPE)) {
  window.customStrategies.push({
    type: DASHBOARD_STRATEGY_TYPE,
    strategyType: 'dashboard',
    name: NAME,
    description: 'Zero-config Lovelace dashboard with Apple HIG design — powered by html-pro-card',
    documentationURL: 'https://github.com/SecSunshine/hass-dashboard-pro',
  });
}

// ─── Boot Log ─────────────────────────────────────────────────────────────

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
