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

  /** Accent violet color */
  accent_violet?: string;

  /** Primary gradient CSS value */
  gradient_primary?: string;

  /** Card style preset: classic | glass | gradient */
  card_style?: 'classic' | 'glass' | 'gradient';

  /** Border radius override (px) — default 14 (html-pro-card spec) */
  border_radius?: number;

  /** Card padding (px) — default 18 */
  card_padding?: number;

  /** Sidebar width (px) — default 72 */
  sidebar_width?: number;

  /** Font family */
  font_family?: string;

  /** Enable/disable card shadows */
  shadows?: boolean;

  /** Card gap (px) — default 14 */
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
      page_bg: '#F4F6FA',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#4F6EF7',
      text_primary: '#1A1D26',
      text_secondary: '#6B7280',
      text_muted: '#9CA3AF',
      border: 'rgba(0, 0, 0, 0.06)',
    },
    accent_violet: '#7C6EF7',
    gradient_primary: 'linear-gradient(135deg, #4F6EF7 0%, #38BDF8 100%)',
    card_style: 'classic',
    border_radius: 14,
    card_padding: 18,
    sidebar_width: 72,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 14,
    animations: true,
  },
  dark: {
    colors: {
      page_bg: '#0C0E14',
      card_bg: '#161922',
      sidebar_bg: '#10121A',
      primary: '#6B85F9',
      text_primary: '#F1F3F8',
      text_secondary: '#8B92A5',
      text_muted: '#565D72',
      border: 'rgba(255, 255, 255, 0.06)',
    },
    accent_violet: '#9DA5FF',
    gradient_primary: 'linear-gradient(135deg, #6B85F9 0%, #60A5FA 100%)',
    card_style: 'classic',
    border_radius: 14,
    card_padding: 18,
    sidebar_width: 72,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 14,
    animations: true,
  },
  warm: {
    colors: {
      page_bg: '#FBF8F3',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#C2702E',
      text_primary: '#2C1810',
      text_secondary: '#8B6E5A',
      text_muted: '#B89B85',
      border: 'rgba(139, 110, 90, 0.1)',
    },
    accent_violet: '#B8860B',
    gradient_primary: 'linear-gradient(135deg, #C2702E 0%, #D97706 100%)',
    card_style: 'classic',
    border_radius: 16,
    card_padding: 18,
    sidebar_width: 72,
    font_family: "Georgia, 'Noto Serif SC', serif",
    shadows: true,
    card_gap: 14,
    animations: true,
  },
  forest: {
    colors: {
      page_bg: '#F0F7F2',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#2D7A4F',
      text_primary: '#1A2E22',
      text_secondary: '#5A7D6A',
      text_muted: '#8BA89A',
      border: 'rgba(45, 122, 79, 0.1)',
    },
    accent_violet: '#3D9A65',
    gradient_primary: 'linear-gradient(135deg, #2D7A4F 0%, #16A34A 100%)',
    card_style: 'classic',
    border_radius: 14,
    card_padding: 18,
    sidebar_width: 72,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 14,
    animations: true,
  },
  auto: {
    colors: {
      page_bg: '#F4F6FA',
      card_bg: '#FFFFFF',
      sidebar_bg: '#FFFFFF',
      primary: '#4F6EF7',
      text_primary: '#1A1D26',
      text_secondary: '#6B7280',
      text_muted: '#9CA3AF',
      border: 'rgba(0, 0, 0, 0.06)',
    },
    accent_violet: '#7C6EF7',
    gradient_primary: 'linear-gradient(135deg, #4F6EF7 0%, #38BDF8 100%)',
    card_style: 'classic',
    border_radius: 14,
    card_padding: 18,
    sidebar_width: 72,
    font_family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    shadows: true,
    card_gap: 14,
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
