/**
 * One-click dashboard design plan.
 *
 * Turns the registry-derived home profile into a user-confirmable preset:
 * style pack, layout density, and the visual config payload to persist.
 */

import type { Hass, StrategyConfig } from '../types';
import { buildHomeProfile, type EntitySemanticType, type HomeProfile } from './dashboard-model';
import { selectDefaultStylePack, STYLE_PACKS, type StylePack } from './style-packs';
import type { ResolvedTokens } from './visual-config';

export interface DashboardDesignPlan {
  pack_id: string;
  pack_label: string;
  density: 'compact' | 'standard' | 'spacious';
  visual: ResolvedTokens;
  profile: HomeProfile;
  headline: string;
  rationale: string[];
  focus: Array<{ key: EntitySemanticType | 'overview'; label: string }>;
}

const SEMANTIC_LABELS: Record<EntitySemanticType, string> = {
  lighting: '灯光',
  climate: '环境',
  opening: '门窗',
  security: '安防',
  media: '影音',
  cleaning: '清洁',
  environment: '环境传感',
  power: '能耗',
  presence: '家庭成员',
  control: '控制',
  sensor: '传感',
  other: '概览',
};

export function buildDashboardDesignPlan(
  hass: Hass,
  config: StrategyConfig,
  packId?: string,
): DashboardDesignPlan {
  const profile = buildHomeProfile(hass, config);
  const selected = packId && STYLE_PACKS[packId]
    ? { pack: STYLE_PACKS[packId], profile }
    : selectDefaultStylePack(hass, config);

  const visual = tokensToStoredVisual(selected.pack, profile);

  return {
    pack_id: selected.pack.id,
    pack_label: selected.pack.label,
    density: visual.layout_density || profile.density,
    visual,
    profile,
    headline: buildHeadline(selected.pack, profile),
    rationale: buildRationale(selected.pack, profile, hass),
    focus: buildFocus(profile),
  };
}

export function buildPlanAlternatives(hass: Hass, config: StrategyConfig): DashboardDesignPlan[] {
  return Object.keys(STYLE_PACKS).map(id => buildDashboardDesignPlan(hass, config, id));
}

function tokensToStoredVisual(pack: StylePack, profile: HomeProfile): ResolvedTokens {
  const tokens = pack.tokens;
  return {
    page_bg: tokens.page_bg,
    card_bg: tokens.card_bg,
    primary: tokens.primary,
    text_primary: tokens.text_primary,
    text_secondary: tokens.text_secondary,
    border: tokens.border,
    card_style: tokens.card_style,
    border_radius: tokens.border_radius,
    card_padding: tokens.card_padding,
    card_gap: tokens.card_gap,
    layout_density: profile.density === 'compact' ? 'compact' : tokens.layout_density || profile.density,
    shadows: tokens.shadows,
    mood_preset: pack.id,
  };
}

function buildHeadline(pack: StylePack, profile: HomeProfile): string {
  if (profile.entity_count === 0) return '先生成一套干净的空白仪表盘骨架';
  if (profile.area_count <= 2) return `为小户型生成 ${pack.label} 风格`;
  if (profile.entity_count > 120) return `为高设备量住宅生成紧凑 ${pack.label} 风格`;
  return `生成 ${pack.label} 风格的家庭仪表盘`;
}

function buildRationale(pack: StylePack, profile: HomeProfile, hass: Hass): string[] {
  const reasons: string[] = [];
  reasons.push(`${profile.area_count} 个区域、${profile.entity_count} 个可见实体`);

  if (hass.themes?.darkMode) {
    reasons.push('检测到 Home Assistant 深色模式，优先使用暗色玻璃风格');
  } else if (profile.entity_count < 30) {
    reasons.push('设备量较少，使用更舒展的居家布局');
  } else if (profile.entity_count > 120 || profile.area_count > 12) {
    reasons.push('设备或区域较多，自动切换为紧凑布局密度');
  }

  if (profile.dominant_semantics.length) {
    reasons.push(`重点设备：${profile.dominant_semantics.map(s => SEMANTIC_LABELS[s]).join('、')}`);
  }

  reasons.push(`应用 ${pack.label} 色彩、卡片样式和间距`);
  return reasons;
}

function buildFocus(profile: HomeProfile): DashboardDesignPlan['focus'] {
  const focus = profile.dominant_semantics.slice(0, 3).map(key => ({
    key,
    label: SEMANTIC_LABELS[key],
  }));
  return focus.length ? focus : [{ key: 'overview', label: '全屋概览' }];
}
