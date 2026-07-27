export const BRAND_NAMES = Object.freeze({
  publicGuild: "Mōchirīī",
  publicShort: "Mōchī",
  publicSocial: "Mōchirīī Social",
  technical: "Mochirii",
  commerce: "Mochirii Cosmetics",
  game: "Mochi Pets",
} as const);

export function normalizePublicBrandText(value: string): string {
  return value.normalize("NFC");
}
