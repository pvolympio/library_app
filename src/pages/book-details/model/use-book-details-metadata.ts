import { useEffect, useState } from "react";
import { enrichBookMetadata, type BookMetadata } from "@/entities/book-metadata";
import type { BookshelfBook } from "@/types/bookshelf";

export function useBookDetailsMetadata(book: BookshelfBook) {
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setMetadata(null);
    setIsLoading(true);
    setHasError(false);
    void enrichBookMetadata(book, { requestPriority: 10 })
      .then((value) => {
        if (active) setMetadata(value);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [book]);

  return { metadata, isLoading, hasError };
}
