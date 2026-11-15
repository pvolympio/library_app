import * as cheerio from "cheerio";

const DEFAULT_MIRRORS = [
  "https://annas-archive.se",
  "https://annas-archive.org",
  "https://annas-archive.li",
];

function getMirrors() {
  const envMirror = process.env.ANNAS_MIRROR?.trim();
  if (envMirror) {
    return [envMirror.replace(/\/+$/, ""), ...DEFAULT_MIRRORS];
  }
  return DEFAULT_MIRRORS;
}

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

function isCloudflareChallenge(html, status) {
  if (status === 403 || status === 503) {
    return (
      html.includes("Just a moment") ||
      html.includes("cf-browser-verification") ||
      html.includes("Attention Required") ||
      html.includes("Cloudflare")
    );
  }
  return false;
}

/**
 * Faz o parse do HTML de resultados de busca do Anna's Archive (compatível com o padrão bitesized/annas-archive-api).
 * @param {string} html
 * @param {string} baseUrl
 */
export function parseAnnasSearchResults(html, baseUrl) {
  const $ = cheerio.load(html);
  const results = [];
  const seenMd5 = new Set();

  $('a[href^="/md5/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href") || "";
    const md5Match = href.match(/\/md5\/([a-fA-F0-9]{32})/);
    if (!md5Match) return;

    const md5 = md5Match[1].toLowerCase();
    if (seenMd5.has(md5)) return;

    // Encontra o container do card
    const $card = $link.closest("div.flex, div.border-b, li, div").first();
    const rawTitle =
      $link.find("h3").text().trim() ||
      $link.text().trim();

    // Ignora links vazios ou que são apenas imagens
    if (!rawTitle || rawTitle.length < 2) return;

    seenMd5.add(md5);

    const coverUrl =
      $link.find("img").attr("src") ||
      $card.find("img").attr("src") ||
      null;

    // Extrai metadados de linha secundária (autor, extensão, tamanho, idioma)
    const metaText = $card.text().replace(/\s+/g, " ").trim();
    const authorText =
      $card.find("div.italic, .text-sm, .truncate").eq(1).text().trim() || "";

    const extMatch = metaText.match(/\b(epub|pdf|mobi|azw3|fb2)\b/i);
    const sizeMatch = metaText.match(/\b(\d+(?:[.,]\d+)?\s?(?:KB|MB|GB))\b/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : "epub";
    const fileSize = sizeMatch ? sizeMatch[1].toUpperCase() : undefined;

    results.push({
      id: `annas:${md5}`,
      md5,
      title: rawTitle,
      author: authorText && authorText !== rawTitle ? authorText : "Autor desconhecido",
      coverUrl: coverUrl && coverUrl.startsWith("http") ? coverUrl : null,
      extension,
      fileSize,
      source: "annas-archive",
      sourceLabel: "Anna's Archive",
      pageUrl: `${baseUrl}/md5/${md5}`,
      directDownloadAvailable: Boolean(process.env.ANNAS_SECRET_KEY),
    });
  });

  return results;
}

export async function searchAnnasArchive(query, options = {}) {
  const { lang = "", ext = "epub" } = options;
  const mirrors = getMirrors();
  let lastError = null;

  for (const baseUrl of mirrors) {
    try {
      const searchUrl = new URL(`${baseUrl}/search`);
      searchUrl.searchParams.set("q", query);
      if (ext) searchUrl.searchParams.set("ext", ext);
      if (lang) searchUrl.searchParams.set("lang", lang);

      const response = await fetch(searchUrl.toString(), {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(10000),
      });

      const html = await response.text();

      if (isCloudflareChallenge(html, response.status)) {
        lastError = new Error(`Cloudflare bloqueou o acesso em ${baseUrl}`);
        continue;
      }

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} em ${baseUrl}`);
        continue;
      }

      const items = parseAnnasSearchResults(html, baseUrl);
      return {
        ok: true,
        mirror: baseUrl,
        results: items.slice(0, 24),
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    error: lastError instanceof Error ? lastError.message : "Falha ao consultar Anna's Archive",
    results: [],
  };
}

/**
 * Tenta resolver um link de download direto pelo fast_download (se houver chave)
 * ou extrair links externos (LibGen / IPFS) da página /md5/{md5}.
 */
export async function resolveAnnasDownload(md5, userKey) {
  const key = userKey || process.env.ANNAS_SECRET_KEY || "";
  const mirrors = getMirrors();

  // 1. Se houver chave de membro configurada no servidor ou enviada pelo cliente
  if (key) {
    for (const baseUrl of mirrors) {
      try {
        const apiUrl = `${baseUrl}/dyn/api/fast_download.json?md5=${encodeURIComponent(md5)}&key=${encodeURIComponent(key)}`;
        const res = await fetch(apiUrl, {
          headers: REQUEST_HEADERS,
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.download_url) {
            return { ok: true, downloadUrl: data.download_url, method: "fast" };
          }
        }
      } catch {
        // Tenta próximo mirror
      }
    }
  }

  // 2. Sem chave: tenta extrair links diretos / parceiros da página /md5/{md5}
  for (const baseUrl of mirrors) {
    try {
      const pageUrl = `${baseUrl}/md5/${md5}`;
      const res = await fetch(pageUrl, {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(10000),
      });

      const html = await res.text();
      if (isCloudflareChallenge(html, res.status) || !res.ok) {
        continue;
      }

      const $ = cheerio.load(html);
      const externalLinks = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        // Procura links diretos de mirrors abertos (Libgen, IPFS, etc.) que não sejam /slow_download
        if (
          href.includes("libgen") ||
          href.includes("ipfs.io") ||
          href.includes("cloudflare-ipfs") ||
          href.includes("library.lol") ||
          href.endsWith(".epub")
        ) {
          externalLinks.push(href);
        }
      });

      if (externalLinks.length > 0) {
        return {
          ok: true,
          downloadUrl: externalLinks[0],
          fallbackPageUrl: pageUrl,
          method: "external-mirror",
        };
      }

      // Se só há slow downloads (com timer/captcha), devolve a URL amigável para abrir no navegador
      return {
        ok: false,
        requiresManualDownload: true,
        fallbackPageUrl: pageUrl,
        message:
          "Este livro precisa de confirmação humana no servidor parceiro. Clique para baixar o EPUB e solte o arquivo na sua estante.",
      };
    } catch {
      // Tenta próximo mirror
    }
  }

  return {
    ok: false,
    requiresManualDownload: true,
    fallbackPageUrl: `${mirrors[0]}/md5/${md5}`,
    message:
      "Não foi possível baixar automaticamente. Abra a página do livro para concluir o download do EPUB.",
  };
}

