/**
 * Template: Home Dashboard View (v3.0)
 *
 * Full dwains-dashboard-next inspired home page:
 *   1. Welcome hero 鈥?greeting, weather, alarm status
 *   2. Status domain badges 鈥?horizontal row of active device counts
 *   3. People card 鈥?person.* entities with home/away status
 *   4. Indoor climate 鈥?averaged temperature & humidity
 *   5. House power usage 鈥?total watts + per-room percentage bars
 *   6. Favorites 鈥?configurable pinned entities
 *   7. Summary 鈥?repairs, updates, entity/device counts
 *
 * html-card-pro conventions:
 *   - All colors via HA theme tokens (--hdp-* 鈫?var(--primary-color), etc.)
 *   - No inline styles for colors 鈥?all in <style> blocks
 *   - border-radius via --hdp-radius
 *   - do_not_parse: true on every card
 *   - Hover: translateY(-2px), transition: all 0.2s ease
 *   - Min touch target: 44px
 */

import type { Hass, HomeLayoutPreset, HomeSectionKey, LovelaceCardConfig, StrategyConfig } from '../types';
import { generateDesignTokenCSS } from '../styles/design-tokens';
import type { ResolvedTokens } from '../utils/visual-config';
import { bentoWrap, resolveCardSize } from '../utils/bento-layout';
import { buildHousePowerUsage } from '../utils/power-usage';
import {
  getPersons,
  getClimateSummary,
  getStatusDomains,
  getFavorites,
  getHomeSummaries,
  getWeather,
  getAlarmStatus,
  countActiveAutomations,
} from '../utils/home-data';
import type { PersonInfo, DomainStatus, FavoriteEntity } from '../utils/home-data';
import { escapeAttribute, escapeHTML, escapeInlineStyleValue, escapeURLAttribute } from '../utils/html';
import { cardSkinClass } from '../utils/card-skin';
import { getConfiguredHiddenPersons } from '../utils/dashboard-model';
import { resolveSlottedCard, sortSlottedCards, type SlottedCard } from '../utils/card-slots';

const DEFAULT_HOME_SECTION_ORDER: HomeSectionKey[] = ['status_badges', 'people', 'environment', 'power_usage', 'favorites', 'summary'];

type HomeCardId = 'home_welcome' | 'home_status_badges' | 'home_people' | 'home_environment' | 'home_power' | 'home_favorites' | 'home_summary';
type HomeLayoutSizeMap = Record<HomeCardId, 'sm' | 'md' | 'lg' | 'wide' | 'tall'>;

const HOME_LAYOUT_PRESETS: Record<Exclude<HomeLayoutPreset, 'custom'>, {
  order: HomeSectionKey[];
  sizes: HomeLayoutSizeMap;
}> = {
  grid: {
    order: ['status_badges', 'people', 'environment', 'power_usage', 'favorites', 'summary'],
    sizes: {
      home_welcome: 'lg',
      home_status_badges: 'wide',
      home_people: 'md',
      home_environment: 'md',
      home_power: 'md',
      home_favorites: 'wide',
      home_summary: 'md',
    },
  },
  rows: {
    order: ['status_badges', 'environment', 'summary', 'people', 'power_usage', 'favorites'],
    sizes: {
      home_welcome: 'wide',
      home_status_badges: 'wide',
      home_people: 'wide',
      home_environment: 'wide',
      home_power: 'wide',
      home_favorites: 'wide',
      home_summary: 'wide',
    },
  },
  l_shape: {
    order: ['status_badges', 'environment', 'summary', 'people', 'power_usage', 'favorites'],
    sizes: {
      home_welcome: 'lg',
      home_status_badges: 'md',
      home_people: 'md',
      home_environment: 'md',
      home_power: 'md',
      home_favorites: 'md',
      home_summary: 'md',
    },
  },
  l_mirror: {
    order: ['status_badges', 'environment', 'summary', 'people', 'power_usage', 'favorites'],
    sizes: {
      home_welcome: 'lg',
      home_status_badges: 'md',
      home_people: 'md',
      home_environment: 'md',
      home_power: 'md',
      home_favorites: 'md',
      home_summary: 'md',
    },
  },
  u_shape: {
    order: ['status_badges', 'environment', 'summary', 'people', 'power_usage', 'favorites'],
    sizes: {
      home_welcome: 'wide',
      home_status_badges: 'md',
      home_people: 'md',
      home_environment: 'md',
      home_power: 'md',
      home_favorites: 'md',
      home_summary: 'md',
    },
  },
};

export function buildHomeView(hass: Hass, config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig[] {
  const cards: LovelaceCardConfig[] = [];

  // 1. Welcome hero (always shown)
  cards.push(buildWelcomeCard(hass, config, tokens));

  for (const section of getOrderedHomeSections(config)) {
    if (!isHomeSectionVisible(config, section)) continue;
    switch (section) {
      case 'status_badges': {
        const domains = getStatusDomains(hass, config);
        if (domains.length > 0) cards.push(buildStatusBadges(domains, tokens));
        break;
      }
      case 'people': {
        const persons = getPersons(hass, getHiddenPersons(config));
        if (persons.length > 0) cards.push(buildPeopleCard(persons, tokens));
        break;
      }
      case 'environment':
        cards.push(buildEnvironmentCard(hass, config, tokens));
        break;
      case 'power_usage': {
        const power = buildHousePowerUsage(hass, config);
        if (power.has_data) cards.push(buildPowerCard(power, tokens));
        break;
      }
      case 'favorites': {
        const favorites = getFavorites(hass, config);
        if (favorites.length > 0) cards.push(buildFavoritesCard(favorites, tokens));
        break;
      }
      case 'summary':
        cards.push(buildSummaryCard(hass, tokens, config));
        break;
    }
  }

  return cards;
}

/**
 * Build home page content as raw HTML string (for embedding in layout card).
 * Strips the design token <style> and card wrappers since the layout card
 * already provides them.
 */
export function buildHomeHTML(hass: Hass, config: StrategyConfig, tokens?: ResolvedTokens): string {
  const sections: SlottedCard[] = [];
  const cs = tokens?.card_sizes;
  const layout = getHomeLayout(config);

  sections.push(resolveSlottedCard(
    config,
    'home.welcome',
    extractCardHTML(buildWelcomeCard(hass, config, tokens)),
    resolveCardSize('home_welcome', layout.sizes.home_welcome, cs),
    0,
  ));

  for (let index = 0; index < layout.order.length; index++) {
    const section = layout.order[index];
    const defaultOrder = index + 1;
    if (!isHomeSectionVisible(config, section)) continue;
    switch (section) {
      case 'status_badges': {
        const domains = getStatusDomains(hass, config);
        if (domains.length > 0) {
          sections.push(resolveSlottedCard(
            config,
            'home.status_badges',
            extractCardHTML(buildStatusBadges(domains, tokens)),
            resolveCardSize('home_status_badges', layout.sizes.home_status_badges, cs),
            defaultOrder,
          ));
        }
        break;
      }
      case 'people': {
        const persons = getPersons(hass, getHiddenPersons(config));
        if (persons.length > 0) {
          sections.push(resolveSlottedCard(
            config,
            'home.people',
            extractCardHTML(buildPeopleCard(persons, tokens)),
            resolveCardSize('home_people', layout.sizes.home_people, cs),
            defaultOrder,
          ));
        }
        break;
      }
      case 'environment':
        sections.push(resolveSlottedCard(
          config,
          'home.environment',
          extractCardHTML(buildEnvironmentCard(hass, config, tokens)),
          resolveCardSize('home_environment', layout.sizes.home_environment, cs),
          defaultOrder,
        ));
        break;
      case 'power_usage': {
        const power = buildHousePowerUsage(hass, config);
        if (power.has_data) {
          sections.push(resolveSlottedCard(
            config,
            'home.power_usage',
            extractCardHTML(buildPowerCard(power, tokens)),
            resolveCardSize('home_power', layout.sizes.home_power, cs),
            defaultOrder,
          ));
        }
        break;
      }
      case 'favorites': {
        const favorites = getFavorites(hass, config);
        if (favorites.length > 0) {
          sections.push(resolveSlottedCard(
            config,
            'home.favorites',
            extractCardHTML(buildFavoritesCard(favorites, tokens)),
            resolveCardSize('home_favorites', layout.sizes.home_favorites, cs),
            defaultOrder,
          ));
        }
        break;
      }
      case 'summary':
        sections.push(resolveSlottedCard(
          config,
          'home.summary',
          extractCardHTML(buildSummaryCard(hass, tokens, config)),
          resolveCardSize('home_summary', layout.sizes.home_summary, cs),
          defaultOrder,
        ));
        break;
    }
  }

  return sortSlottedCards(sections)
    .map(card => bentoWrap(card.html, card.size))
    .join('\n');
}
/**
 * Extract the inner HTML content from a card config, stripping
 * the design token <style> block (the layout card provides tokens globally).
 */
function extractCardHTML(card: LovelaceCardConfig): string {
  const content = (card.content as string) || '';
  // Remove the design token style block (first <style>...</style> generated by generateDesignTokenCSS)
  return content.replace(/<style>[\s\S]*?<\/style>/, '').trim();
}

function isHomeSectionVisible(config: StrategyConfig, key: HomeSectionKey): boolean {
  return !getHiddenHomeSections(config).includes(key);
}

function getHomeLayout(config: StrategyConfig): { order: HomeSectionKey[]; sizes: HomeLayoutSizeMap } {
  const preset = config.hdp_config?.home?.layout_preset;
  if (preset && preset !== 'custom' && HOME_LAYOUT_PRESETS[preset]) {
    return HOME_LAYOUT_PRESETS[preset];
  }
  return {
    order: getOrderedHomeSections(config),
    sizes: HOME_LAYOUT_PRESETS.grid.sizes,
  };
}

function getHiddenHomeSections(config: StrategyConfig): HomeSectionKey[] {
  return (config.hdp_config?.home?.hidden_sections || []) as HomeSectionKey[];
}

function getOrderedHomeSections(config: StrategyConfig): HomeSectionKey[] {
  const configured = config.hdp_config?.home?.section_order || [];
  const order = configured.filter((key): key is HomeSectionKey =>
    DEFAULT_HOME_SECTION_ORDER.includes(key as HomeSectionKey));

  for (const key of DEFAULT_HOME_SECTION_ORDER) {
    if (!order.includes(key)) order.push(key);
  }

  return order;
}

function getHiddenInfoCards(config?: StrategyConfig): string[] {
  return config?.hdp_config?.home?.hidden_info_cards || [];
}

function getHiddenPersons(config: StrategyConfig): string[] {
  return getConfiguredHiddenPersons(config);
}

function getHeaderConfig(config: StrategyConfig): {
  showWeather: boolean;
  showNotifications: boolean;
  showTime: boolean;
  weatherEntity: string | undefined;
  alarmEntity: string | undefined;
} {
  const header = config.hdp_config?.header;
  return {
    showWeather: header?.show_weather !== false,
    showNotifications: header?.show_notifications !== false,
    showTime: header?.show_time !== false,
    weatherEntity: header?.weather_entity || config.weather_entity,
    alarmEntity: header?.alarm_entity || config.alarm_entity,
  };
}

// 鈹€鈹€鈹€ Greeting 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}

function getDateString(): string {
  const now = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
}

// 鈹€鈹€鈹€ 1. Welcome Card 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildWelcomeCard(hass: Hass, config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const header = getHeaderConfig(config);
  const greeting = getGreeting();
  const userName = hass.user?.name || '';
  const dateStr = header.showTime ? getDateString() : '';
  const weather = header.showWeather ? getWeather(hass, header.weatherEntity) : null;
  const alarm = header.showNotifications ? getAlarmStatus(hass, header.alarmEntity, config) : null;
  const alarmDisplay = alarm ? escapeHTML(alarm.display) : '';

  const dateHTML = dateStr ? `<span class="hw-date">${dateStr}</span>` : '';
  const weatherHTML = weather?.has_data
    ? `<div class="hw-weather">
        <span class="hw-w-icon">${weather.icon_svg}</span>
        <span class="hw-w-temp">${weather.temp}</span>
        <span class="hw-w-cond">${weather.condition_display}</span>
      </div>`
    : '';

  const alarmHTML = alarm?.has_alarm
    ? `<div class="hw-alarm hw-alarm--${alarm.badge_class}">
        <span class="hw-a-dot"></span>
        <span class="hw-a-text">${alarmDisplay}</span>
      </div>`
    : '';

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .hw {
    background: var(--hdp-gradient-primary);
    border-radius: var(--hdp-radius-lg);
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .hw::before {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 45%; height: 100%;
    background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 100%);
    pointer-events: none;
  }
  .hw::after {
    content: '';
    position: absolute;
    bottom: -20px; right: -20px;
    width: 120px; height: 120px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    pointer-events: none;
  }
  .hw-body { position: relative; z-index: 1; }
  .hw-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .hw-date {
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255,255,255,0.55);
    letter-spacing: 0.3px;
  }
  .hw-greeting {
    font: inherit;
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .hw-greeting-name {
    font-weight: 400;
    font-size: 18px;
    opacity: 0.85;
  }
  .hw-meta {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .hw-weather {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.12);
    border-radius: var(--hdp-radius-pill);
    padding: 6px 14px;
    backdrop-filter: blur(4px);
  }
  .hw-w-icon {
    width: 18px; height: 18px;
    display: flex; align-items: center;
    color: white;
  }
  .hw-w-icon svg { width: 18px; height: 18px; }
  .hw-w-temp {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: white;
  }
  .hw-w-cond {
    font: inherit;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
  }
  .hw-alarm {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: var(--hdp-radius-pill);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
  }
  .hw-a-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
  }
  .hw-alarm--ok { background: rgba(34,197,94,0.2); color: #86EFAC; }
  .hw-alarm--ok .hw-a-dot { background: #22C55E; }
  .hw-alarm--warn { background: rgba(245,158,11,0.2); color: #FCD34D; }
  .hw-alarm--warn .hw-a-dot { background: #F59E0B; }
  .hw-alarm--danger { background: rgba(239,68,68,0.2); color: #FCA5A5; }
  .hw-alarm--danger .hw-a-dot { background: #EF4444; }
  .hw-alarm--info { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); }
  .hw-alarm--info .hw-a-dot { background: rgba(255,255,255,0.5); }
  @media (max-width: 480px) {
    .hw { padding: 18px; }
    .hw-greeting { font-size: 20px; }
    .hw-greeting-name { font-size: 15px; }
  }
</style>
<div class="hw">
  <div class="hw-body">
    <div class="hw-top">
      ${dateHTML}
    </div>
    <div class="hw-greeting">${escapeHTML(greeting)}<span class="hw-greeting-name">${userName ? '，' + escapeHTML(userName) : ''}</span></div>
    <div class="hw-meta">
      ${weatherHTML}
      ${alarmHTML}
    </div>
  </div>
</div>`,
  };
}

// 鈹€鈹€鈹€ 2. Status Domain Badges 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildStatusBadges(domains: DomainStatus[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const badges = domains.map(d => {
    const countText = d.active > 0 ? `<span class="sd-cnt">${d.active}</span>` : '';
    const domainArg = escapeAttribute(JSON.stringify(d.domain));
    return `<button type="button" class="sd-badge sd-badge--${d.color_class}" data-domain="${escapeAttribute(d.domain)}" data-action="show-device-domain" onclick="hdpShowDeviceDomain(${domainArg})">
      <span class="sd-icon">${d.icon_svg}</span>
      <span class="sd-label">${d.label}</span>
      ${countText}
    </button>`;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .sd-wrap {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 2px 0;
  }
  .sd-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 14px;
    border-radius: var(--hdp-radius-pill);
    background: var(--hdp-card-bg);
    border: 1px solid var(--hdp-border);
    transition: all 0.2s ease;
    cursor: pointer;
    appearance: none;
    font: inherit;
  }
  .sd-badge:hover {
    transform: translateY(-1px);
    box-shadow: var(--hdp-shadow-card);
    border-color: var(--hdp-primary);
  }
  .sd-badge:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
  }
  .sd-icon {
    width: 14px; height: 14px;
    display: flex; align-items: center;
  }
  .sd-icon svg { width: 14px; height: 14px; }
  .sd-label {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text);
  }
  .sd-cnt {
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    color: white;
    background: var(--hdp-primary);
    border-radius: 8px;
    padding: 1px 6px;
    min-width: 16px;
    text-align: center;
    line-height: 14px;
  }
  .sd-badge--warning .sd-icon { color: var(--hdp-warning); }
  .sd-badge--info .sd-icon { color: var(--hdp-info); }
  .sd-badge--success .sd-icon { color: var(--hdp-success); }
  .sd-badge--danger .sd-icon { color: var(--hdp-danger); }
  .sd-badge--accent .sd-icon { color: var(--hdp-accent); }
</style>
<div class="sd-wrap">${badges}</div>`,
  };
}

// 鈹€鈹€鈹€ 3. People Card 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildPeopleCard(persons: PersonInfo[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const homeCount = persons.filter(p => p.is_home).length;
  const people = persons.map(p => {
    const avatarHTML = p.picture
      ? `<div class="pp-avatar" style="background-image: url('${escapeInlineStyleValue(escapeURLAttribute(p.picture))}')"></div>`
      : `<div class="pp-avatar pp-avatar--fallback">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>`;
    const stateCls = p.is_home ? 'pp-state--home' : 'pp-state--away';
    return `<div class="pp-item">
      ${avatarHTML}
      <div class="pp-name">${escapeHTML(p.name)}</div>
      <div class="pp-state ${stateCls}">${escapeHTML(p.display)}</div>
    </div>`;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .pp-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .pp-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .pp-count {
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    color: var(--hdp-success);
    background: var(--hdp-success-light);
    padding: 2px 10px;
    border-radius: var(--hdp-radius-pill);
  }
  .pp-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .pp-item {
    display: flex;
    flex: 1 1 64px;
    max-width: 96px;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
    text-align: center;
  }
  .pp-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    background-color: var(--hdp-divider);
  }
  .pp-avatar--fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--hdp-text-muted);
    background: var(--hdp-divider);
  }
  .pp-avatar--fallback svg { width: 22px; height: 22px; }
  .pp-name {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text);
    width: 100%;
    max-width: 96px;
    min-width: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.2;
  }
  .pp-state {
    font: inherit;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--hdp-radius-pill);
  }
  .pp-state--home { background: var(--hdp-success-light); color: var(--hdp-success); }
  .pp-state--away { background: var(--hdp-divider); color: var(--hdp-text-muted); }
</style>
<div class="pp-hdr">
  <span class="pp-title">瀹跺涵鎴愬憳</span>
  <span class="pp-count">${homeCount} 浜哄湪瀹?/span>
</div>
<div class="pp-grid">${people}</div>`,
  };
}

// 鈹€鈹€鈹€ 4. Environment Card (Climate + Security) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildEnvironmentCard(hass: Hass, config: StrategyConfig, tokens?: ResolvedTokens): LovelaceCardConfig {
  const header = getHeaderConfig(config);
  const climate = getClimateSummary(hass, config);
  const alarm = header.showNotifications ? getAlarmStatus(hass, header.alarmEntity, config) : null;
  const alarmDisplay = alarm ? escapeHTML(alarm.display) : '';
  const skinCls = cardSkinClass(tokens?.card_style);

  // Build stat items
  const items: string[] = [];

  if (climate.has_data) {
    items.push(`<button type="button" class="env-item ${skinCls}" data-action="show-environment-history" data-metric="temperature" onclick="hdpShowEnvironmentHistory('temperature')">
      <div class="env-icon env-icon--temp">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
      </div>
      <div class="env-data">
        <div class="env-val">${climate.avg_temp}</div>
        <div class="env-lbl">瀹ゅ唴娓╁害</div>
      </div>
    </button>`);
  }

  if (climate.has_data && climate.avg_humidity !== '--') {
    items.push(`<button type="button" class="env-item ${skinCls}" data-action="show-environment-history" data-metric="humidity" onclick="hdpShowEnvironmentHistory('humidity')">
      <div class="env-icon env-icon--hum">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8 8 4 12 4 16a8 8 0 0 0 16 0c0-4-4-8-8-14z"/></svg>
      </div>
      <div class="env-data">
        <div class="env-val">${climate.avg_humidity}</div>
        <div class="env-lbl">瀹ゅ唴婀垮害</div>
      </div>
    </button>`);
  }

  // Security summary
  if (alarm) {
    const secIcon = alarm.has_alarm
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

    items.push(`<div class="env-item ${skinCls}">
      <div class="env-icon env-icon--sec">
        ${secIcon}
      </div>
      <div class="env-data">
        <div class="env-val">${alarmDisplay}</div>
        <div class="env-lbl">瀹夐槻鐘舵€?/div>
      </div>
    </button>`);
  }

  // Active automations count
  const autoCount = countActiveAutomations(hass);
  if (autoCount > 0) {
    items.push(`<button type="button" class="env-item ${skinCls}" data-action="open-automation-config" onclick="hdpOpenAutomationConfig()">
      <div class="env-icon env-icon--auto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      </div>
      <div class="env-data">
        <div class="env-val">${autoCount}</div>
        <div class="env-lbl">自动化运行</div>
      </div>
    </button>`);
  }

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .env-hdr {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
  }
  .env-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .env-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
  }
  .env-item {
    appearance: none;
    font: inherit;
    width: 100%;
    display: flex;
    align-items: center;
    text-align: left;
    gap: 12px;
    background: var(--hdp-card-bg);
    color: inherit;
    border-radius: var(--hdp-radius);
    padding: 14px;
    border: 1px solid var(--hdp-border);
    transition: all 0.2s ease;
    cursor: default;
  }
  button.env-item { cursor: pointer; }
  .env-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-elevated);
  }
  button.env-item:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
  }
  .env-icon {
    width: 36px; height: 36px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .env-icon svg { width: 18px; height: 18px; }
  .env-icon--temp { background: var(--hdp-danger-light); color: var(--hdp-danger); }
  .env-icon--hum { background: var(--hdp-info-light); color: var(--hdp-info); }
  .env-icon--sec { background: var(--hdp-success-light); color: var(--hdp-success); }
  .env-icon--auto { background: rgba(124,110,247,0.1); color: var(--hdp-accent); }
  .env-data { min-width: 0; }
  .env-val {
    font: inherit;
    font-size: 18px;
    font-weight: 700;
    color: var(--hdp-text);
    line-height: 1.2;
  }
  .env-lbl {
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    color: var(--hdp-text-secondary);
  }
</style>
<div class="env-hdr">
  <span class="env-title">瀹跺眳鐜</span>
</div>
<div class="env-grid">${items.join('')}</div>`,
  };
}

// 鈹€鈹€鈹€ 5. Power Usage Card 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildPowerCard(power: ReturnType<typeof buildHousePowerUsage>, tokens?: ResolvedTokens): LovelaceCardConfig {
  const roomRows = power.rooms.slice(0, 6).map(r => {
    const percent = Number.isFinite(Number(r.percent)) ? Math.max(0, Math.min(100, Number(r.percent))) : 0;
    return `
      <div class="pw-room">
        <div class="pw-room-top">
          <span class="pw-room-name">${escapeHTML(r.area_name)}</span>
          <span class="pw-room-val">${escapeHTML(r.display)}</span>
        </div>
        <div class="pw-bar">
          <div class="pw-bar-fill" style="width: ${Math.max(percent, 2)}%"></div>
        </div>
        <div class="pw-room-pct">${percent}%</div>
      </div>
    `;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .pw-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .pw-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .pw-total {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pw-total-icon {
    width: 28px; height: 28px;
    border-radius: var(--hdp-radius-sm);
    background: var(--hdp-warning-light);
    color: var(--hdp-warning);
    display: flex; align-items: center; justify-content: center;
  }
  .pw-total-icon svg { width: 15px; height: 15px; }
  .pw-total-val {
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .pw-room {
    margin-bottom: 12px;
  }
  .pw-room:last-child { margin-bottom: 0; }
  .pw-room-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }
  .pw-room-name {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
  }
  .pw-room-val {
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--hdp-text-secondary);
  }
  .pw-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--hdp-divider);
    overflow: hidden;
  }
  .pw-bar-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--hdp-gradient-primary);
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 2px;
  }
  .pw-room-pct {
    font: inherit;
    font-size: 10px;
    color: var(--hdp-text-muted);
    text-align: right;
    margin-top: 2px;
  }
</style>
<div class="pw-hdr">
  <span class="pw-title">鍏ㄥ眿鍔熺巼</span>
  <div class="pw-total">
    <div class="pw-total-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
    </div>
    <span class="pw-total-val">${power.total_display}</span>
  </div>
</div>
${roomRows}`,
  };
}

// 鈹€鈹€鈹€ 6. Favorites Card 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildFavoritesCard(favorites: FavoriteEntity[], tokens?: ResolvedTokens): LovelaceCardConfig {
  const skinCls = cardSkinClass(tokens?.card_style);
  const items = favorites.map(f => {
    const iconSVG = getFavoriteIcon(f.domain, f.is_active);
    const stateCls = f.is_active ? 'fav-item--active fav--active' : '';
    return `<div class="fav-item ${stateCls} ${skinCls}" data-entity="${escapeAttribute(f.entity_id)}" data-action="toggle">
      <div class="fav-icon">${iconSVG}</div>
      <div class="fav-info">
        <div class="fav-name">${escapeHTML(f.name)}</div>
        <div class="fav-state">${escapeHTML(f.display)}</div>
      </div>
    </div>`;
  }).join('');

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .fav-hdr {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }
  .fav-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .fav-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--hdp-radius);
    background: var(--hdp-card-bg);
    border: 1px solid var(--hdp-border);
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .fav-item:hover {
    transform: translateY(-1px);
    box-shadow: var(--hdp-shadow-card);
  }
  .fav-item--active {
    border-color: var(--hdp-primary);
  }
  .fav-icon {
    width: 36px; height: 36px;
    border-radius: var(--hdp-radius-sm);
    display: flex; align-items: center; justify-content: center;
    background: var(--hdp-divider);
    color: var(--hdp-text-muted);
    flex-shrink: 0;
  }
  .fav-icon svg { width: 18px; height: 18px; }
  .fav--active .fav-icon {
    background: var(--hdp-primary-light);
    color: var(--hdp-primary);
  }
  .fav-info { min-width: 0; flex: 1; }
  .fav-name {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--hdp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fav-state {
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-secondary);
  }
</style>
<div class="fav-hdr">
  <span class="fav-title">鏀惰棌璁惧</span>
</div>
<div class="fav-list">${items}</div>`,
  };
}

function getFavoriteIcon(domain: string, active: boolean): string {
  const c = 'currentColor';
  switch (domain) {
    case 'light':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>`;
    case 'switch':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="${active ? 16 : 8}" cy="12" r="3"/></svg>`;
    case 'climate':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0z"/></svg>`;
    case 'cover':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`;
    case 'fan':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
    case 'media_player':
      return `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    case 'lock':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 'vacuum':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>`;
    case 'sensor':
    case 'binary_sensor':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="${c}" opacity="0.3"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}

// 鈹€鈹€鈹€ 7. Summary Card 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function buildSummaryCard(hass: Hass, tokens?: ResolvedTokens, config?: StrategyConfig): LovelaceCardConfig {
  const summaries = getHomeSummaries(hass, config);
  const skinCls = cardSkinClass(tokens?.card_style);
  const hiddenInfoCards = new Set(getHiddenInfoCards(config));
  const isInfoCardVisible = (key: string): boolean => !hiddenInfoCards.has(key);

  const items: string[] = [];

  if (summaries.updates_count > 0 && isInfoCardVisible('updates')) {
    items.push(`<div class="sum-item sum-item--info ${skinCls}" data-info-card="updates">
      <div class="sum-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </div>
      <div class="sum-val">${summaries.updates_count}</div>
      <div class="sum-lbl">鍙敤鏇存柊</div>
    </div>`);
  }

  if (summaries.repairs_count > 0 && isInfoCardVisible('repairs')) {
    items.push(`<div class="sum-item sum-item--warn ${skinCls}" data-info-card="repairs">
      <div class="sum-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div class="sum-val">${summaries.repairs_count}</div>
      <div class="sum-lbl">寰呬慨澶?/div>
    </div>`);
  }

  if (isInfoCardVisible('entities')) {
    items.push(`<div class="sum-item ${skinCls}" data-info-card="entities">
    <div class="sum-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3"/></svg>
    </div>
    <div class="sum-val">${summaries.total_entities}</div>
    <div class="sum-lbl">瀹炰綋</div>
  </div>`);
  }

  if (isInfoCardVisible('devices')) {
    items.push(`<div class="sum-item ${skinCls}" data-info-card="devices">
      <div class="sum-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </div>
      <div class="sum-val">${summaries.total_devices}</div>
      <div class="sum-lbl">璁惧</div>
    </div>`);
  }

  if (isInfoCardVisible('areas')) {
    items.push(`<div class="sum-item ${skinCls}" data-info-card="areas">
      <div class="sum-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>
      </div>
      <div class="sum-val">${summaries.total_areas}</div>
      <div class="sum-lbl">鍖哄煙</div>
    </div>`);
  }

  if (isInfoCardVisible('active')) {
    items.push(`<div class="sum-item ${skinCls}" data-info-card="active">
      <div class="sum-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h8l-1 8 11-13h-8l1-7z"/></svg>
      </div>
      <div class="sum-val">${summaries.active_entities}</div>
      <div class="sum-lbl">运行中</div>
    </div>`);
  }

  if (summaries.automations_count > 0 && isInfoCardVisible('automations')) {
    items.push(`<button type="button" class="sum-item ${skinCls}" data-info-card="automations" data-action="open-automation-config" onclick="hdpOpenAutomationConfig()">
      <div class="sum-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
      </div>
      <div class="sum-val">${summaries.automations_count}</div>
      <div class="sum-lbl">自动化</div>
    </button>`);
  }

  if (!items.length) {
    items.push(`<div class="sum-empty ${skinCls}">
      <div class="sum-empty-title">鏆傛棤姒傝淇℃伅</div>
      <div class="sum-empty-desc">鍙互鍦ㄨ缃腑閲嶆柊鏄剧ず绯荤粺姒傝椤圭洰</div>
    </div>`);
  }

  return {
    type: 'custom:html-pro-card',
    title: '',
    do_not_parse: true,
    content: /* html */ `
${generateDesignTokenCSS(tokens)}
<style>
  .sum-hdr {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
  }
  .sum-title {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .sum-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 10px;
  }
  .sum-item {
    appearance: none;
    width: 100%;
    min-width: 0;
    color: inherit;
    font: inherit;
    cursor: default;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 8px;
    border-radius: var(--hdp-radius);
    background: var(--hdp-card-bg);
    border: 1px solid var(--hdp-border);
    text-align: center;
    transition: all 0.2s ease;
  }
  .sum-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--hdp-shadow-card);
  }
  button.sum-item {
    cursor: pointer;
  }
  button.sum-item:focus-visible {
    outline: 2px solid var(--hdp-primary);
    outline-offset: 2px;
  }
  .sum-icon {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    color: var(--hdp-text-muted);
  }
  .sum-icon svg { width: 20px; height: 20px; }
  .sum-val {
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    color: var(--hdp-text);
    line-height: 1;
  }
  .sum-lbl {
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    color: var(--hdp-text-secondary);
  }
  .sum-item--info .sum-icon { color: var(--hdp-info); }
  .sum-item--warn .sum-icon { color: var(--hdp-warning); }
  .sum-item--info .sum-val { color: var(--hdp-info); }
  .sum-item--warn .sum-val { color: var(--hdp-warning); }
  .sum-empty {
    grid-column: 1 / -1;
    padding: 18px;
    border-radius: var(--hdp-radius);
    border: 1px dashed var(--hdp-border);
    background: var(--hdp-card-bg);
  }
  .sum-empty-title {
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    color: var(--hdp-text);
  }
  .sum-empty-desc {
    margin-top: 4px;
    font: inherit;
    font-size: 12px;
    color: var(--hdp-text-muted);
  }
</style>
<div class="sum-hdr">
  <span class="sum-title">绯荤粺姒傝</span>
</div>
<div class="sum-grid">${items.join('')}</div>`,
  };
}
