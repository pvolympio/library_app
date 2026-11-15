export interface OnlineBookResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  extension: string;
  fileSize?: string;
  source: "annas-archive" | "gutenberg" | "internet-archive";
  sourceLabel: string;
  md5?: string;
  downloadUrl?: string;
  pageUrl?: string;
  directDownloadAvailable: boolean;
}

export interface OnlineSearchResponse {
  query: string;
  total: number;
  results: OnlineBookResult[];
  sourcesStatus: {
    annasArchive: "ok" | "unavailable";
    annasError?: string;
    gutenbergCount: number;
    archiveCount: number;
  };
}

export type DownloadBookOutcome =
  | { ok: true; file: File }
  | {
      ok: false;
      requiresManualDownload: boolean;
      fallbackPageUrl?: string;
      message: string;
    };

export async function searchOnlineBooks(
  query: string,
  lang = "",
): Promise<OnlineSearchResponse> {
  const url = new URL("/api/books/search", window.location.origin);
  url.searchParams.set("q", query);
  if (lang) url.searchParams.set("lang", lang);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Não foi possível consultar o acervo online.");
  }

  return (await response.json()) as OnlineSearchResponse;
}

export async function downloadOnlineBookAsFile(
  book: OnlineBookResult,
): Promise<DownloadBookOutcome> {
  const url = new URL("/api/books/download", window.location.origin);
  url.searchParams.set("title", book.title);

  if (book.downloadUrl) {
    url.searchParams.set("url", book.downloadUrl);
  } else if (book.md5) {
    url.searchParams.set("md5", book.md5);
  } else {
    return {
      ok: false,
      requiresManualDownload: true,
      fallbackPageUrl: book.pageUrl,
      message: "Link de download não encontrado para este livro.",
    };
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      let payload: {
        requiresManualDownload?: boolean;
        fallbackPageUrl?: string;
        message?: string;
      } = {};
      try {
        payload = await response.json();
      } catch {
        // Ignora erro ao parsear JSON
      }

      return {
        ok: false,
        requiresManualDownload: Boolean(payload.requiresManualDownload),
        fallbackPageUrl: payload.fallbackPageUrl || book.pageUrl,
        message:
          payload.message ||
          "Este livro precisa ser baixado manualmente no site parceiro.",
      };
    }

    const blob = await response.blob();
    const safeName =
      book.title
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .trim()
        .slice(0, 60) || "livro";
    const file = new File([blob], `${safeName}.epub`, {
      type: "application/epub+zip",
    });

    return { ok: true, file };
  } catch {
    return {
      ok: false,
      requiresManualDownload: true,
      fallbackPageUrl: book.pageUrl || book.downloadUrl,
      message: "Falha de conexão durante o download. Tente novamente.",
    };
  }
}

