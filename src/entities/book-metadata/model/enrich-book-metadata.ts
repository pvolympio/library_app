import type { BookshelfBook } from "@/types/bookshelf";
import { fetchGoogleBooksMetadata } from "../api/google-books";
import { fetchOpenLibraryMetadata } from "../api/open-library";
import { loadCachedBookMetadata, saveCachedBookMetadata } from "../api/book-metadata-storage";
import {
  createIncompleteMetadata,
  toMetadataInput,
  type BookMetadata,
  type MetadataMatch,
} from "./book-metadata";

const inFlight = new Map<string, Promise<BookMetadata>>();

function strongestMatch(left: MetadataMatch, right: MetadataMatch): MetadataMatch {
  if (left === "isbn" || right === "isbn") return "isbn";
  if (left === "title-author" || right === "title-author") return "title-author";
  return "none";
}

export function enrichBookMetadata(
  book: BookshelfBook,
  options: { requestPriority?: number } = {},
): Promise<BookMetadata> {
  const input = toMetadataInput(book);
  const current = inFlight.get(input.bookKey);
  if (current) return current;

  const enrichment = (async () => {
    const cached = await loadCachedBookMetadata(input.bookKey);
    if (cached) return cached;

    // Cache the attempt before network I/O. If the process stops, it still
    // cannot silently refetch the same book on the next launch.
    const initial = createIncompleteMetadata(input);
    await saveCachedBookMetadata(initial);
    const priority = options.requestPriority ?? 0;
    let openLibrary: Awaited<ReturnType<typeof fetchOpenLibraryMetadata>> | null = null;
    try {
      openLibrary = await fetchOpenLibraryMetadata(input, priority);
    } catch {
      openLibrary = null;
    }
    const needsGoogleFallback = !openLibrary?.coverUrl || !openLibrary.description;
    let googleBooks: Awaited<ReturnType<typeof fetchGoogleBooksMetadata>> | null = null;
    if (needsGoogleFallback) {
      try {
        googleBooks = await fetchGoogleBooksMetadata(input, priority);
      } catch {
        googleBooks = null;
      }
    }
    const coverUrl = openLibrary?.coverUrl ?? googleBooks?.coverUrl ?? null;
    const description = openLibrary?.description ?? googleBooks?.description ?? null;
    const averageRating = openLibrary?.averageRating ?? googleBooks?.averageRating ?? null;
    const ratingsCount = openLibrary?.ratingsCount ?? googleBooks?.ratingsCount ?? null;
    const enriched: BookMetadata = {
      ...initial,
      coverUrl,
      description,
      averageRating,
      ratingsCount,
      openLibraryKey: openLibrary?.workKey ?? null,
      googleBooksId: googleBooks?.volumeId ?? null,
      matchedBy: strongestMatch(openLibrary?.matchedBy ?? "none", googleBooks?.matchedBy ?? "none"),
      status: coverUrl && description ? "complete" : "incomplete",
    };
    await saveCachedBookMetadata(enriched);
    return enriched;
  })();

  inFlight.set(input.bookKey, enrichment);
  void enrichment.then(
    () => inFlight.delete(input.bookKey),
    () => inFlight.delete(input.bookKey),
  );
  return enrichment;
}

export async function enrichBookCollection(
  books: BookshelfBook[],
  onBookEnriched?: (book: BookshelfBook, metadata: BookMetadata) => void,
): Promise<void> {
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < books.length) {
      const book = books[nextIndex];
      nextIndex += 1;
      try {
        const metadata = await enrichBookMetadata(book, { requestPriority: 0 });
        onBookEnriched?.(book, metadata);
      } catch {
        // Import and library rendering remain available if local cache fails.
        onBookEnriched?.(book, createIncompleteMetadata(toMetadataInput(book)));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, books.length) }, worker));
}
