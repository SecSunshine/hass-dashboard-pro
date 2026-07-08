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
  name_by_user?: string;
  original_name?: string;
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
  user?: { name: string; is_admin?: boolean };
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

  /** Card style preset: classic | glass | gradient | aurora | soft | neon */
  card_style?: 'classic' | 'glass' | 'gradient' | 'aurora' | 'soft' | 'neon';

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

  /** Per-card Bento size overrides (card_id → 'sm' | 'md' | 'lg' | 'wide' | 'tall') */
  card_sizes?: Record<string, string>;

  /** Layout density preset: compact | standard | spacious */
  layout_density?: 'compact' | 'standard' | 'spacious';

  /** Phase 6: Auto mood switching based on time of day */
  auto_mood?: boolean;

  /** Phase 6: Custom mood per time period */
  time_moods?: {
    dawn?: string;      // 06:00-10:00
    day?: string;       // 10:00-17:00
    dusk?: string;      // 17:00-20:00
    night?: string;     // 20:00-23:00
    midnight?: string;  // 23:00-06:00
  };

  /** Phase 6: Per-area card skin overrides (area_id → skin name) */
  area_skins?: Record<string, string>;
}

export interface StrategyConfig {
  type: string;
  // View routing (injected by dashboard strategy)
  /** Current view path identifier (set by dashboard strategy) */
  view_path?: string;
  /** Area ID for area views (set by dashboard strategy) */
  area_id?: string;
  // User-configurable options
  title?: string;
  sidebar_title?: string;
  // Area filtering
  hidden_areas?: string[];
  hidden_domains?: string[];
  hidden_device_types?: string[];
  // Floor grouping
  floor_grouping?: boolean;
  // Favorites
  favorite_entities?: string[];
  // Custom cards per area
  custom_cards?: Record<string, LovelaceCardConfig[]>;
  // Visual design tokens — theme + overrides
  visual?: VisualConfig;
  // Weather entity for home page (auto-detected if not set)
  weather_entity?: string;
  // Person entities to hide from the people card
  hidden_persons?: string[];
  // Alarm entity override (auto-detected if not set)
  alarm_entity?: string;
  // v4.0: Persistent config (read from Lovelace config at generate time)
  hdp_config?: Partial<HDPConfig>;
  // v4.0: Blueprint pages (from Lovelace config)
  blueprint_pages?: BlueprintInstance[];
  // v4.0: Theme definition (resolved at generate time)
  theme_definition?: ThemeDefinition;
  // v4.0: Pre-computed area summaries (injected by dashboard strategy)
  area_summaries?: AreaSummary[];
  // v4.0: Pre-rendered area HTML sections (injected by dashboard strategy)
  area_html_sections?: Array<{ area_id: string; html: string }>;
}

// ─── Theme Preset Definitions ─────────────────────────────────────────────

export const THEME_PRESETS: Record<ThemePreset, Omit<Required<VisualConfig>, 'theme' | 'auto_mood' | 'time_moods' | 'area_skins' | 'card_sizes' | 'layout_density'>> = {
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

// ─── v4.0: Persistent Config (stored in Lovelace config via websocket) ───

export interface HDPConfig {
  dashboard: {
    name: string;
    icon: string;
  };
  home: {
    section_order: string[];
    hidden_sections: string[];
    hidden_info_cards: string[];
  };
  header: {
    show_time: boolean;
    show_weather: boolean;
    show_notifications: boolean;
    weather_entity: string;
    alarm_entity: string;
  };
  people: {
    hidden_persons: string[];
  };
  areas: {
    hidden_areas: string[];
    area_order: string[];
    hide_unavailable: boolean;
  };
  devices: {
    hidden_domains: string[];
    hidden_device_types: string[];
    hidden_keywords: string[];
    visible_keywords: string[];
  };
  blueprints: {
    pages: BlueprintInstance[];
    replacements: Record<string, string>;
  };
  visual: StoredVisualConfig;
  permissions: {
    restrict_non_admin: boolean;
    restrict_settings: boolean;
  };
}

export interface StoredVisualConfig {
  theme_id: string;            // built-in name or theme filename
  card_style: string;
  colors: Record<string, string>;
  border_radius: number;
  card_padding: number;
  card_gap: number;
  font_family: string;
  shadows: boolean;
  card_sizes?: Record<string, string>;
  layout_density?: 'compact' | 'standard' | 'spacious';
  time_moods?: {
    dawn?: string;
    day?: string;
    dusk?: string;
    night?: string;
    midnight?: string;
  };
  area_skins?: Record<string, string>;
}

// ─── v4.0: Blueprint Types ────────────────────────────────────────────────

export type BlueprintInputType =
  | 'text-field'
  | 'entity-picker'
  | 'icon-picker'
  | 'boolean'
  | 'number'
  | 'area-picker';

export interface BlueprintInput {
  name: string;
  description?: string;
  type: BlueprintInputType;
  default?: string | number | boolean;
  domain?: string;       // for entity-picker: restrict domain
}

export interface BlueprintMeta {
  name: string;
  description: string;
  version: string;
  type: 'page';
  custom_cards?: string[];
  inputs: Record<string, BlueprintInput>;
}

export interface BlueprintDefinition {
  meta: BlueprintMeta;
  card: LovelaceCardConfig;  // card template with $key$ placeholders
}

export interface BlueprintInstance {
  id: string;
  name: string;
  icon: string;
  blueprint_yaml: string;   // raw YAML for re-editing
  source?: string;           // GitHub URL for update checking
  inputs: Record<string, string | number | boolean>;
  card: LovelaceCardConfig;  // resolved card config
}

export interface BlueprintGalleryItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  source_url: string;        // raw GitHub URL to page.yaml
  preview_url?: string;
  tags?: string[];
}

// ─── v4.0: Theme Types ────────────────────────────────────────────────────

export interface ThemeDefinition {
  name: string;
  version: string;
  colors: {
    page_bg: string;
    card_bg: string;
    sidebar_bg: string;
    primary: string;
    text_primary: string;
    text_secondary: string;
    text_muted: string;
    border: string;
    accent?: string;
  };
  layout: {
    border_radius: number;
    card_padding: number;
    card_gap: number;
    sidebar_width: number;
  };
  font_family: string;
  gradient_primary?: string;
}

// ─── v4.0: Home Section Keys ──────────────────────────────────────────────

export type HomeSectionKey =
  | 'status_badges'
  | 'people'
  | 'environment'
  | 'power_usage'
  | 'favorites'
  | 'summary';

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  status_badges: '状态徽章',
  people: '家庭成员',
  environment: '家居环境',
  power_usage: '全屋功率',
  favorites: '收藏设备',
  summary: '系统概览',
};

// ─── v4.0: Area Summary (for sidebar display) ─────────────────────────────

export interface AreaSummary {
  area_id: string;
  area_name: string;
  icon: string;
  entity_count: number;
  active_count: number;
  temp: string | null;
  humidity: string | null;
  domain_counts: Record<string, number>;
}
