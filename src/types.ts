/**
 * Type definitions for hass-dashboard-pro
 * Compatible with HA dashboard strategy API
 */

// ─── HA Internal Types (subset) ───────────────────────────────────────────

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HassArea {
  area_id: string;
  name: string;
  picture: string | null;
  aliases?: string[];
  floor_id?: string | null;
}

export interface HassFloor {
  floor_id: string;
  name: string;
  level?: number;
  aliases?: string[];
}

export interface HassDevice {
  id: string;
  area_id: string | null;
  name_by_user?: string;
  name: string;
  manufacturer?: string;
  model?: string;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  device_id: string | null;
  area_id: string | null;
  platform: string;
  config_entry_id?: string;
  unique_id?: string;
  name?: string;
  icon?: string;
  disabled_by: string | null;
  hidden_by: string | null;
}

export interface Hass {
  states: Record<string, HassEntity>;
  areas: Record<string, HassArea>;
  devices: Record<string, HassDevice>;
  floors: Record<string, HassFloor>;
  entities: Record<string, HassEntityRegistryEntry>;
  user?: { name: string };
  themes?: { darkMode: boolean };
}

// ─── Visual Theme Presets ──────────────────────────────────────────────────

export type ThemePreset = 'light' | 'dark' | 'warm' | 'forest' | 'auto';

export interface VisualConfig {
  /** Theme preset: light | dark | warm | forest | auto */
  theme?: ThemePreset;

  /** Override individual color tokens */
  colors?: {
    page_bg?: string;
    card_bg?: string;
    sidebar_bg?: string;
    primary?: string;
    text_primary?: string;
    text_secondary?: string;
    text_muted?: string;
    border?: string;
  };

  /** Border radius override (px) — default 10 (html-pro-card spec) */
  border_radius?: number;

  /** Card padding (px) — default 16 */
  card_padding?: number;

  /** Sidebar width (px) — default 250 */
  sidebar_width?: number;

  /** Font family */
  font_family?: string;

  /** Enable/disable card shadows */
  shadows?: boolean;

  /** Card gap (px) — default 16 */
  card_gap?: number;

  /** Enable/disable page transitions */
  animations?: boolean;
}

export interface StrategyConfig {
  type: string;
  // User-configurable options
  title?: string;
  sidebar_title?: string;
  // Area filtering
  hidden_areas?: string[];
  hidden_domains?: string[];
  // Floor grouping
  floor_grouping?: boolean;
  // Favorites
  favorite_entities?: string[];
  // Custom cards per area
  custom_cards?: Record<string, LovelaceCardConfig[]>;
  // Visual design tokens — theme + overrides
  visual?: VisualConfig;
}

// ─── Theme Preset Definitions ─────────────────────────────────────────────

export const THEME_PRESETS: Record<ThemePreset, Omit<Required<VisualConfig>, 'theme'>> = {
  light: {
    colors: {
      page_bg: '#F8FAFC',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#1E40AF',
      text_primary: '#1E293B',
      text_secondary: '#64748B',
      text_muted: '#94A3B8',
      border: '#DBEAFE',
    },
    border_radius: 10,
    card_padding: 16,
    sidebar_width: 250,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 16,
    animations: true,
  },
  dark: {
    colors: {
      page_bg: '#0F172A',
      card_bg: '#1E293B',
      sidebar_bg: '#1E293B',
      primary: '#3B82F6',
      text_primary: '#F1F5F9',
      text_secondary: '#94A3B8',
      text_muted: '#64748B',
      border: '#334155',
    },
    border_radius: 10,
    card_padding: 16,
    sidebar_width: 250,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 16,
    animations: true,
  },
  warm: {
    colors: {
      page_bg: '#FFFBEB',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#D97706',
      text_primary: '#451A03',
      text_secondary: '#92400E',
      text_muted: '#B45309',
      border: '#FDE68A',
    },
    border_radius: 12,
    card_padding: 16,
    sidebar_width: 250,
    font_family: "Georgia, 'Noto Serif SC', serif",
    shadows: true,
    card_gap: 16,
    animations: true,
  },
  forest: {
    colors: {
      page_bg: '#ECFDF5',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#065F46',
      text_primary: '#022C22',
      text_secondary: '#047857',
      text_muted: '#6B7280',
      border: '#A7F3D0',
    },
    border_radius: 10,
    card_padding: 16,
    sidebar_width: 250,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 16,
    animations: true,
  },
  auto: {
    colors: {
      page_bg: '#F8FAFC',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#1E40AF',
      text_primary: '#1E293B',
      text_secondary: '#64748B',
      text_muted: '#94A3B8',
      border: '#DBEAFE',
    },
    border_radius: 10,
    card_padding: 16,
    sidebar_width: 250,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 16,
    animations: true,
  },
};

// ─── Lovelace View Types ──────────────────────────────────────────────────

export interface LovelaceViewConfig {
  title?: string;
  path?: string;
  icon?: string;
  badges?: LovelaceBadgeConfig[];
  cards?: LovelaceCardConfig[];
  type?: string;
  strategy?: StrategyConfig;
  panel?: boolean;
  theme?: string;
  visible?: boolean | { user: string };
  subview?: boolean;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

export interface LovelaceBadgeConfig {
  type?: string;
  entity?: string;
  [key: string]: unknown;
}

// ─── Dashboard Strategy Result ────────────────────────────────────────────

export interface DashboardStrategyResult {
  views: LovelaceViewConfig[];
}

export interface ViewStrategyResult {
  cards: LovelaceCardConfig[];
}

// ─── Internal Types ───────────────────────────────────────────────────────

export interface EntityInfo {
  entity_id: string;
  name: string;
  domain: string;
  icon: string | null;
  state: string;
  unit: string | null;
  area_name: string;
}

export interface GroupedEntities {
  area_id: string;
  area_name: string;
  floor_id: string | null;
  floor_name: string | null;
  entities: EntityInfo[];
}

export interface DomainGroup {
  domain: string;
  label: string;
  entities: EntityInfo[];
  badge_color: string;
}

// ─── Domain Classification ────────────────────────────────────────────────

export const DOMAIN_GROUPS: Record<string, { label: string; color: string }> = {
  light: { label: '灯光', color: '#FEF3C7' },
  switch: { label: '开关', color: '#EDE9FE' },
  climate: { label: '空调', color: '#DBEAFE' },
  fan: { label: '风扇', color: '#ECFDF5' },
  cover: { label: '窗帘', color: '#EDE9FE' },
  lock: { label: '门锁', color: '#FEE2E2' },
  sensor: { label: '传感器', color: '#F1F5F9' },
  binary_sensor: { label: '传感器', color: '#F1F5F9' },
  media_player: { label: '媒体', color: '#DBEAFE' },
  camera: { label: '摄像头', color: '#F1F5F9' },
  vacuum: { label: '扫地机', color: '#ECFDF5' },
  button: { label: '按钮', color: '#EDE9FE' },
  scene: { label: '场景', color: '#FEF3C7' },
  automation: { label: '自动化', color: '#FEE2E2' },
};

export const HIDDEN_DOMAINS = new Set(['automation', 'script', 'scene', 'group', 'zone', 'person', 'sun', 'weather', 'conversation', 'update', 'tts', 'stt']);
