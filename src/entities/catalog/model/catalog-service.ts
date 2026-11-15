import type { BookshelfBook } from "@/types/bookshelf";
import { deleteCatalogSnapshot, loadCatalogSnapshot, saveCatalogSnapshot } from "../api/catalog-storage";
import { enhanceWithHardcover, fetchHardcoverRecommendations, hasHardcoverToken } from "../api/hardcover-catalog";
import {
  fetchOpenLibrarySubject,
  fetchOpenLibraryTrending,
  searchOpenLibraryCatalog,
} from "../api/open-library-catalog";
import type {
  CatalogLoadOptions,
  CatalogSearchResult,
  CatalogShelf,
  CatalogSnapshot,
  CatalogSource,
} from "./catalog";

const DISCOVERY_KEY = "discovery:pt-BR:v2";

const SHELF_SPECS = [
  { id: "fantasy", title: "Fantasia que abre portais", subtitle: "Os mundos mais procurados pelos leitores", subject: "fantasy", genre: "Fantasia" },
  { id: "science-fiction", title: "Futuros possíveis", subtitle: "Ficção científica por popularidade", subject: "science_fiction", genre: "Ficção Científica" },
  { id: "romance", title: "Histórias para sentir", subtitle: "Romances que permanecem na memória", subject: "romance", genre: "Romance" },
  { id: "mystery", title: "Mistérios e suspense", subtitle: "Pistas, segredos e reviravoltas", subject: "mystery_and_detective_stories", genre: "Mistério" },
  { id: "non-fiction", title: "Ideias que mudam perspectivas", subtitle: "Não-ficção lida e recomendada", subject: "nonfiction", genre: "Não-ficção" },
  { id: "children", title: "Para pequenos grandes leitores", subtitle: "Aventuras infantis de todas as épocas", subject: "juvenile_fiction", genre: "Infantil" },
] as const;

function withShelf(books: BookshelfBook[], title: string): BookshelfBook[] {
  return books.map((book) => ({ ...book, shelf: title }));
}

async function enhanceShelfBooks(books: BookshelfBook[]): Promise<BookshelfBook[]> {
  if (!hasHardcoverToken()) return books;
  try {
    return await enhanceWithHardcover(books);
  } catch {
    return books;
  }
}

export async function loadCatalogDiscovery(
  options: CatalogLoadOptions = {},
  onProgress?: (snapshot: CatalogSnapshot) => void,
): Promise<CatalogSnapshot> {
  if (!options.forceRefresh) {
    const cached = await loadCatalogSnapshot(DISCOVERY_KEY);
    if (cached) return cached;
  } else {
    await deleteCatalogSnapshot(DISCOVERY_KEY);
  }

  const source: CatalogSource = hasHardcoverToken() ? "open-library+hardcover" : "open-library";
  const shelves: CatalogShelf[] = [];
  const publishProgress = () => onProgress?.({
    key: DISCOVERY_KEY,
    source,
    shelves: [...shelves],
    createdAt: new Date().toISOString(),
  });
  const trendingTitle = "Em alta entre leitores";
  let trending: BookshelfBook[] = [];
  if (hasHardcoverToken()) {
    try {
      trending = await fetchHardcoverRecommendations(16);
    } catch {
      trending = [];
    }
  }
  if (trending.length === 0) trending = await enhanceShelfBooks(await fetchOpenLibraryTrending(16));
  shelves.push({
    id: "trending",
    title: trendingTitle,
    subtitle: hasHardcoverToken()
      ? "Recomendações em movimento na comunidade Hardcover"
      : "Obras adicionadas às listas de leitura hoje",
    source: hasHardcoverToken() ? "open-library+hardcover" : "open-library",
    books: withShelf(trending, trendingTitle),
  });
  publishProgress();

  for (const spec of SHELF_SPECS) {
    const books = await enhanceShelfBooks(await fetchOpenLibrarySubject(spec.subject, spec.genre, 16));
    shelves.push({
      id: spec.id,
      title: spec.title,
      subtitle: spec.subtitle,
      source: hasHardcoverToken() ? "open-library+hardcover" : "open-library",
      books: withShelf(books, spec.title),
    });
    publishProgress();
  }

  const snapshot: CatalogSnapshot = {
    key: DISCOVERY_KEY,
    source,
    shelves,
    createdAt: new Date().toISOString(),
  };
  await saveCatalogSnapshot(snapshot);
  return snapshot;
}

function searchCacheKey(query: string, page: number): string {
  return `search:${query.trim().toLocaleLowerCase("pt-BR")}:page:${page}:v1`;
}

export async function searchCatalog(
  query: string,
  page = 1,
  options: CatalogLoadOptions = {},
): Promise<CatalogSearchResult> {
  const normalizedQuery = query.trim();
  const key = searchCacheKey(normalizedQuery, page);
  if (!options.forceRefresh) {
    const cached = await loadCatalogSnapshot(key);
    const cachedShelf = cached?.shelves[0];
    if (cachedShelf) {
      return {
        query: normalizedQuery,
        books: cachedShelf.books,
        total: Number(cachedShelf.subtitle) || cachedShelf.books.length,
        page,
        hasMore: cachedShelf.books.length >= 20,
        source: cached.source,
      };
    }
  } else {
    await deleteCatalogSnapshot(key);
  }

  const result = await searchOpenLibraryCatalog(normalizedQuery, page, 20);
  const books = await enhanceShelfBooks(result.books);
  const source: CatalogSource = hasHardcoverToken() ? "open-library+hardcover" : "open-library";
  await saveCatalogSnapshot({
    key,
    source,
    shelves: [{ id: "search", title: normalizedQuery, subtitle: String(result.total), source, books }],
    createdAt: new Date().toISOString(),
  });
  return {
    query: normalizedQuery,
    books,
    total: result.total,
    page,
    hasMore: page * 20 < result.total,
    source,
  };
}
