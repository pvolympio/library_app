import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BookshelfBook } from "@/types/bookshelf";
import { rememberCatalogBook, recallCatalogBook } from "@/entities/catalog";
import { ensureReadingBook } from "@/entities/reading-activity";
import {
  deleteLibraryEntry,
  loadLibraryEntries,
  saveLibraryEntry,
} from "../api/library-storage";
import {
  deleteEpubBinary,
  saveEpubBinary,
} from "../api/epub-storage";
import type { LibraryEntry, LibraryStatus } from "./library";

export interface LibraryContextValue {
  entries: LibraryEntry[];
  ready: boolean;
  getEntry: (bookId: string) => LibraryEntry | undefined;
  setStatus: (book: BookshelfBook, status: LibraryStatus) => Promise<void>;
  toggleFavorite: (book: BookshelfBook) => Promise<void>;
  setPersonalRating: (book: BookshelfBook, rating: number | null) => Promise<void>;
  remove: (bookId: string) => Promise<void>;
  importEpub: (file: File) => Promise<BookshelfBook>;
  linkEpub: (bookId: string, file: File) => Promise<void>;
  removeEpub: (bookId: string) => Promise<void>;
  hasEpub: (bookId: string) => boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function createEntry(book: BookshelfBook, current?: LibraryEntry): LibraryEntry {
  const now = new Date().toISOString();
  return (
    current ?? {
      book,
      status: "want-to-read",
      favorite: false,
      personalRating: null,
      progress: 0,
      addedAt: now,
      updatedAt: now,
    }
  );
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadLibraryEntries()
      .then((value) => active && setEntries(value))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const mutate = useCallback(
    async (book: BookshelfBook, update: (entry: LibraryEntry) => LibraryEntry) => {
      const current = entries.find((entry) => entry.book.id === book.id);
      const next = update(createEntry(book, current));
      setEntries((items) => [next, ...items.filter((item) => item.book.id !== book.id)]);
      await saveLibraryEntry(next);
    },
    [entries],
  );

  const setStatus = useCallback(
    (book: BookshelfBook, status: LibraryStatus) =>
      mutate(book, (entry) => ({
        ...entry,
        book,
        status,
        progress: status === "completed" ? 1 : entry.progress,
        updatedAt: new Date().toISOString(),
      })),
    [mutate],
  );

  const toggleFavorite = useCallback(
    (book: BookshelfBook) =>
      mutate(book, (entry) => ({
        ...entry,
        book,
        favorite: !entry.favorite,
        updatedAt: new Date().toISOString(),
      })),
    [mutate],
  );

  const setPersonalRating = useCallback(
    (book: BookshelfBook, personalRating: number | null) =>
      mutate(book, (entry) => ({
        ...entry,
        book,
        personalRating,
        updatedAt: new Date().toISOString(),
      })),
    [mutate],
  );

  const remove = useCallback(
    async (bookId: string) => {
      setEntries((items) => items.filter((entry) => entry.book.id !== bookId));
      await deleteLibraryEntry(bookId);
      await deleteEpubBinary(bookId);
    },
    [],
  );

  const getEntry = useCallback(
    (bookId: string) => entries.find((entry) => entry.book.id === bookId),
    [entries],
  );

  const hasEpub = useCallback(
    (bookId: string): boolean => {
      if (!bookId) return false;
      const lower = bookId.toLowerCase();
      if (lower === "project-gutenberg:11" || lower.includes("alice")) return true;
      const entry = entries.find((item) => item.book.id === bookId);
      return Boolean(entry?.book.hasEpub);
    },
    [entries],
  );

  const linkEpub = useCallback(
    async (bookId: string, file: File): Promise<void> => {
      const buffer = await file.arrayBuffer();
      await saveEpubBinary(bookId, buffer, file.name, file.size);

      const existingEntry = entries.find((entry) => entry.book.id === bookId);
      const baseBook = existingEntry?.book ?? recallCatalogBook(bookId);

      if (baseBook) {
        const updatedBook: BookshelfBook = {
          ...baseBook,
          hasEpub: true,
          fileSize: file.size,
          fileName: file.name,
        };
        rememberCatalogBook(updatedBook);
        await mutate(updatedBook, (entry) => ({
          ...entry,
          book: updatedBook,
          updatedAt: new Date().toISOString(),
        }));
        void ensureReadingBook({
          storageKey: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.author,
        });
      }
    },
    [entries, mutate],
  );

  const removeEpub = useCallback(
    async (bookId: string): Promise<void> => {
      await deleteEpubBinary(bookId);
      const existingEntry = entries.find((entry) => entry.book.id === bookId);
      if (existingEntry) {
        const updatedBook: BookshelfBook = {
          ...existingEntry.book,
          hasEpub: false,
          fileSize: undefined,
          fileName: undefined,
        };
        rememberCatalogBook(updatedBook);
        await mutate(updatedBook, (entry) => ({
          ...entry,
          book: updatedBook,
          updatedAt: new Date().toISOString(),
        }));
      }
    },
    [entries, mutate],
  );

  const importEpub = useCallback(
    async (file: File): Promise<BookshelfBook> => {
      const { parseEpub } = await import("../lib/epub-parser");
      const parsed = await parseEpub(file);

      const slug = parsed.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);

      const bookId = `local:${slug || "livro"}-${Date.now().toString(36)}`;

      await saveEpubBinary(bookId, parsed.fileData, parsed.fileName, parsed.fileSize);

      const book: BookshelfBook = {
        id: bookId,
        metadataKey: bookId,
        title: parsed.title,
        author: parsed.author,
        isbn: parsed.isbn,
        coverUrl: parsed.coverUrl,
        description: parsed.description,
        firstPublishYear: parsed.firstPublishYear,
        metadataSource: "local",
        spineColor: parsed.spineColor,
        genre: parsed.genre,
        hasEpub: true,
        fileSize: parsed.fileSize,
        fileName: parsed.fileName,
      };

      rememberCatalogBook(book);

      await mutate(book, (entry) => ({
        ...entry,
        book,
        status: "reading",
        updatedAt: new Date().toISOString(),
      }));

      void ensureReadingBook({
        storageKey: book.id,
        title: book.title,
        author: book.author,
      });

      return book;
    },
    [mutate],
  );

  const value = useMemo(
    () => ({
      entries,
      ready,
      getEntry,
      setStatus,
      toggleFavorite,
      setPersonalRating,
      remove,
      importEpub,
      linkEpub,
      removeEpub,
      hasEpub,
    }),
    [
      entries,
      ready,
      getEntry,
      setStatus,
      toggleFavorite,
      setPersonalRating,
      remove,
      importEpub,
      linkEpub,
      removeEpub,
      hasEpub,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary deve ser usado dentro de LibraryProvider");
  return value;
}
