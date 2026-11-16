import * as cheerio from "cheerio";

const LIBGEN_MIRRORS = ["https://libgen.li", "https://libgen.bz"];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

const LANG_MATCHERS = {
  pt: ["portuguese", "português", "portugues", "pt"],
  en: ["english", "inglês", "ingles", "en"],
  es: ["spanish", "español", "espanhol", "es"],
};

function matchesLanguage(rowLang, targetLang) {
  if (!targetLang) return true;
  const normalized = rowLang.toLowerCase().trim();
  const patterns = LANG_MATCHERS[targetLang];
  if (!patterns) return true;
  return patterns.some((p) => normalized.includes(p));
}

async function fetchLibgenMirror(baseUrl, query, lang) {
  const url = new URL(`${baseUrl}/index.php`);
  url.searchParams.set("req", query);
  url.searchParams.set("res", "100");

  const res = await fetch(url.toString(), {
    headers: HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = $("#tablelibgen tbody tr");
  if (!rows.length) return [];

  const results = [];
  const seenMd5 = new Set();

  rows.each((_, el) => {
    const tds = $(el).find("td");
    const ext = tds.eq(7).text().trim().toLowerCase();
    if (ext !== "epub") return;

    const rowLang = tds.eq(4).text().trim();
    if (!matchesLanguage(rowLang, lang)) return;

    const adsHref = $(el).find('a[href*="ads.php?md5="]').attr("href") || "";
    const md5Match = adsHref.match(/md5=([a-fA-F0-9]{32})/);
    if (!md5Match) return;

    const md5 = md5Match[1].toLowerCase();
    if (seenMd5.has(md5)) return;
    seenMd5.add(md5);

    const titleLink = tds.eq(0).find("a").first();
    const title = titleLink.text().trim() || "Sem título";
    const author = tds.eq(1).text().trim() || "Autor desconhecido";
    const fileSize = tds.eq(6).text().trim() || undefined;
    const langLabel = rowLang || undefined;

    results.push({
      id: `libgen:${md5}`,
      md5,
      title,
      author,
      coverUrl: null,
      extension: "epub",
      fileSize,
      source: "libgen",
      sourceLabel: langLabel ? `Acervo Global · ${langLabel}` : "Acervo Global",
      directDownloadAvailable: true,
    });
  });

  return results;
}

/**
 * Busca livros em formato EPUB no Library Genesis (mesma base indexada pelo Anna's Archive),
 * com suporte completo a livros em Português e download direto sem chave ou Cloudflare.
 */
export async function searchLibgen(query, lang = "") {
  for (const baseUrl of LIBGEN_MIRRORS) {
    try {
      const primary = await fetchLibgenMirror(baseUrl, query, lang);
      if (primary === null) continue;

      if (lang === "pt" && primary.length < 3 && !query.toLowerCase().includes("portug")) {
        const ptBoost = await fetchLibgenMirror(baseUrl, `${query} Portuguese`, lang);
        if (ptBoost && ptBoost.length > 0) {
          const seen = new Set(primary.map((item) => item.md5));
          const merged = [...primary, ...ptBoost.filter((item) => !seen.has(item.md5))];
          return merged.slice(0, 25);
        }
      }

      return primary.slice(0, 25);
    } catch {
      // Tenta o próximo mirror
    }
  }

  return [];
}

/**
 * Baixa o binário EPUB diretamente do mirror LibGen usando o token temporário da página ads.php.
 */
export async function downloadLibgenEpub(md5) {
  for (const baseUrl of LIBGEN_MIRRORS) {
    try {
      const adsUrl = `${baseUrl}/ads.php?md5=${encodeURIComponent(md5)}`;
      const adsRes = await fetch(adsUrl, {
        headers: HEADERS,
        signal: AbortSignal.timeout(10000),
      });
      if (!adsRes.ok) continue;

      const cookie = adsRes.headers.get("set-cookie") || "";
      const adsHtml = await adsRes.text();
      const $ = cheerio.load(adsHtml);
      const getHref = $('a[href*="get.php?md5="]').attr("href");
      if (!getHref) continue;

      const dlUrl = `${baseUrl}/${getHref.replace(/^\/+/, "").replace(/&amp;/g, "&")}`;
      const dlRes = await fetch(dlUrl, {
        headers: {
          ...HEADERS,
          Referer: adsUrl,
          ...(cookie ? { Cookie: cookie.split(";")[0] } : {}),
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });

      if (!dlRes.ok) continue;

      const contentType = dlRes.headers.get("content-type") || "";
      if (contentType.includes("text/html")) continue;

      const buffer = Buffer.from(await dlRes.arrayBuffer());
      if (buffer.byteLength < 1024) continue;

      return { ok: true, buffer };
    } catch {
      // Tenta o próximo mirror
    }
  }

  return { ok: false };
}
