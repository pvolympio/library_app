/**
 * Fontes gratuitas e abertas de EPUB (sem Cloudflare e sem necessidade de chave):
 * - Gutendex (Project Gutenberg)
 * - Internet Archive (apenas itens de acesso aberto, excluindo livros de empréstimo restrito 401)
 */

const IA_LANG_MAP = {
  pt: "por",
  en: "eng",
  es: "spa",
};

export async function searchGutendex(query, lang = "") {
  try {
    const url = new URL("https://gutendex.com/books");
    url.searchParams.set("search", query);
    url.searchParams.set("mime_type", "application/epub+zip");
    if (lang) {
      url.searchParams.set("languages", lang);
    }

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const books = Array.isArray(data?.results) ? data.results : [];

    return books
      .map((book) => {
        const epubUrl =
          book.formats?.["application/epub+zip"] ||
          book.formats?.["application/epub"] ||
          null;
        if (!epubUrl) return null;

        const author =
          book.authors?.map((a) => a.name).join(", ") || "Domínio Público";

        return {
          id: `gutenberg:${book.id}`,
          title: book.title || "Sem título",
          author,
          coverUrl: book.formats?.["image/jpeg"] || null,
          extension: "epub",
          source: "gutenberg",
          sourceLabel: "Domínio Público",
          downloadUrl: epubUrl,
          directDownloadAvailable: true,
        };
      })
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

export async function searchInternetArchive(query, lang = "") {
  try {
    const url = new URL("https://archive.org/advancedsearch.php");
    const langClause =
      lang && IA_LANG_MAP[lang] ? ` AND language:(${IA_LANG_MAP[lang]})` : "";
    const q = `(${query}) AND mediatype:(texts) AND format:(EPUB) AND NOT access-restricted-item:(true) AND NOT collection:(inlibrary)${langClause}`;

    url.searchParams.set("q", q);
    url.searchParams.append("fl[]", "identifier");
    url.searchParams.append("fl[]", "title");
    url.searchParams.append("fl[]", "creator");
    url.searchParams.set("rows", "10");
    url.searchParams.set("page", "1");
    url.searchParams.set("output", "json");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];

    return docs
      .filter((doc) => doc.identifier && doc.title)
      .map((doc) => {
        const id = String(doc.identifier);
        const author = Array.isArray(doc.creator)
          ? doc.creator[0]
          : doc.creator || "Internet Archive";

        return {
          id: `archive:${id}`,
          title: String(doc.title),
          author: String(author),
          coverUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          extension: "epub",
          source: "internet-archive",
          sourceLabel: "Internet Archive",
          downloadUrl: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(id)}.epub`,
          directDownloadAvailable: true,
        };
      });
  } catch {
    return [];
  }
}
