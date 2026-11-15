const SPINE_PALETTE = [
  "#285F86", "#7F1D1D", "#147D88", "#A44B12", "#334155",
  "#0F6B5F", "#51483F", "#713B19", "#8B2744", "#25633A",
  "#92630D", "#6C2B72", "#174C70", "#405C30",
] as const;

export function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function spineColorFor(value: string): string {
  return SPINE_PALETTE[hashText(value) % SPINE_PALETTE.length];
}

export function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function safeHttpsUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.startsWith("http://") ? `https://${value.slice(7)}` : value;
}
