/**
 * Modelo de exibição usado pela estante 3D (`Bookshelf`).
 *
 * Este tipo é intencionalmente separado de `types/index.ts` (que espelha as
 * tabelas do SQLite): a estante lida com dados já prontos para exibição
 * (cor da lombada, capa, gênero), enquanto o banco lida com dados brutos.
 */
export interface BookshelfBook {
  id: string;
  /** Stable cache key, normally derived from the imported file path. */
  metadataKey?: string;
  title: string;
  author: string;
  isbn?: string;
  /** URL da imagem de capa (proporção recomendada 2:3) */
  coverUrl: string;
  /** True while enrichment is looking for a definitive cover. */
  coverLoading?: boolean;
  description?: string;
  averageRating?: number;
  ratingsCount?: number;
  /** Popularidade agregada (leitores/logs), usada para ordenar recomendações. */
  popularityCount?: number;
  firstPublishYear?: number;
  openLibraryKey?: string;
  googleBooksId?: string;
  hardcoverBookId?: string;
  metadataSource?: "open-library" | "google-books" | "hardcover" | "local";
  /** Fields edited by the user and protected from automatic enrichment. */
  manualFields?: Array<"title" | "author" | "cover" | "description" | "rating">;
  /** Cor da lombada em hex (ex: "#7f1d1d") */
  spineColor: string;
  genre: string;
  /** Indica se um arquivo EPUB correspondente está salvo localmente para leitura */
  hasEpub?: boolean;
  /** Tamanho do arquivo EPUB local em bytes */
  fileSize?: number;
  /** Nome original do arquivo importado */
  fileName?: string;
  /** Usado apenas quando `groupBy="shelf"`; opcional nos demais casos */
  shelf?: string;
}

/** Critério de agrupamento vertical das prateleiras. */
export type BookshelfGroupBy = "genre" | "author" | "shelf";
