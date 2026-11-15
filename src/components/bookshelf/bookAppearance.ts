import type { BookshelfBook } from "@/types/bookshelf";

export interface BookAppearance {
  width: number;
  height: number;
  lean: number;
  binding: number;
  ink: "#FFF9EC" | "#17130F";
  authorLabel: string;
  entranceDelay: number;
}

function hashBook(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0.2;
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    channelToLinear(Number.parseInt(normalized.slice(offset, offset + 2), 16)),
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function authorSurname(author: string): string {
  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] ?? author;
}

export function getBookAppearance(book: BookshelfBook): BookAppearance {
  const hash = hashBook(`${book.id}:${book.title}`);
  const titleWidth = Math.min(12, Math.floor(book.title.length / 12) * 3);
  const width = Math.min(64, 46 + titleWidth + (hash % 3) * 2);
  const height = 180 + ((hash >>> 4) % 5) * 6;
  const leanOptions = [-0.8, -0.35, 0, 0.35, 0.7];
  const lightInk = "#FFF9EC";
  const darkInk = "#17130F";
  return {
    width,
    height,
    lean: leanOptions[(hash >>> 8) % leanOptions.length],
    binding: (hash >>> 12) % 5,
    ink: contrastRatio(book.spineColor, lightInk) >= contrastRatio(book.spineColor, darkInk)
      ? lightInk
      : darkInk,
    authorLabel: authorSurname(book.author),
    entranceDelay: ((hash >>> 16) % 4) * 0.035,
  };
}
