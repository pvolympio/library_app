import type { BookMetadataInput, MetadataMatch } from "../model/book-metadata";
import { scoreBookMatch, stripBookDescription } from "../lib/book-match";
import { queuedJsonRequest } from "../lib/metadata-request-queue";

interface GoogleIndustryIdentifier { type?: string; identifier?: string }
interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  description?: string;
  averageRating?: number;
  ratingsCount?: number;
  industryIdentifiers?: GoogleIndustryIdentifier[];
  imageLinks?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
}
interface GoogleVolume { id?: string; volumeInfo?: GoogleVolumeInfo }
interface GoogleBooksResponse { items?: GoogleVolume[] }

export interface GoogleBooksMetadata {
  coverUrl: string | null;
  description: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
  volumeId: string | null;
  matchedBy: MetadataMatch;
}

async function searchGoogleBooks(query: string, priority: number): Promise<GoogleVolume[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("printType", "books");
  url.searchParams.set("projection", "full");
  const optionalApiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
  if (optionalApiKey) url.searchParams.set("key", optionalApiKey);
  const response = await queuedJsonRequest<GoogleBooksResponse>(url.toString(), priority);
  return response.items ?? [];
}

function toMetadata(volume: GoogleVolume, matchedBy: MetadataMatch): GoogleBooksMetadata {
  const info = volume.volumeInfo;
  const cover = info?.imageLinks?.extraLarge
    ?? info?.imageLinks?.large
    ?? info?.imageLinks?.medium
    ?? info?.imageLinks?.small
    ?? info?.imageLinks?.thumbnail;
  return {
    coverUrl: cover?.replace(/^http:/, "https:") ?? null,
    description: stripBookDescription(info?.description),
    averageRating: typeof info?.averageRating === "number" && info.averageRating > 0 ? info.averageRating : null,
    ratingsCount: typeof info?.ratingsCount === "number" && info.ratingsCount > 0 ? info.ratingsCount : null,
    volumeId: volume.id ?? null,
    matchedBy,
  };
}

export async function fetchGoogleBooksMetadata(
  input: BookMetadataInput,
  priority: number,
): Promise<GoogleBooksMetadata> {
  if (input.isbn) {
    const isbnResults = await searchGoogleBooks(`isbn:${input.isbn}`, priority);
    const exact = isbnResults.find((volume) => volume.volumeInfo?.industryIdentifiers?.some(
      (identifier) => identifier.identifier?.replace(/[^0-9Xx]/g, "") === input.isbn,
    )) ?? isbnResults[0];
    if (exact) {
      const isbnMetadata = toMetadata(exact, "isbn");
      if (isbnMetadata.description || isbnMetadata.averageRating != null) return isbnMetadata;
    }
  }

  const fallbackResults = await searchGoogleBooks(`intitle:"${input.title}" inauthor:"${input.author}"`, priority);
  const match = fallbackResults
    .map((volume) => ({
      volume,
      score: scoreBookMatch(input.title, input.author, volume.volumeInfo?.title ?? "", volume.volumeInfo?.authors ?? [])
        + (volume.volumeInfo?.description ? 2 : 0)
        + (typeof volume.volumeInfo?.averageRating === "number" ? 1 : 0),
    }))
    .sort((left, right) => right.score - left.score)[0];
  return match && match.score >= 5
    ? toMetadata(match.volume, "title-author")
    : { coverUrl: null, description: null, averageRating: null, ratingsCount: null, volumeId: null, matchedBy: "none" };
}
