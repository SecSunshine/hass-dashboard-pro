export const CARD_SKINS = ['classic', 'glass', 'gradient', 'aurora', 'soft', 'neon', 'soft-data'] as const;

export type CardSkin = typeof CARD_SKINS[number];

export function sanitizeCardSkin(value: unknown, fallback: CardSkin = 'classic'): CardSkin {
  return typeof value === 'string' && (CARD_SKINS as readonly string[]).includes(value)
    ? value as CardSkin
    : fallback;
}

export function cardSkinClass(value: unknown, fallback: CardSkin = 'classic'): string {
  const skin = sanitizeCardSkin(value, fallback);
  return `hdp-card hdp-card--${skin}`;
}
