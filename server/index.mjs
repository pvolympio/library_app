import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAnnasSearchUrl, resolveAnnasDownload, searchAnnasArchive } from "./annas.mjs";
import { searchGutendex, searchInternetArchive } from "./open-sources.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

// CORS liberado para desenvolvimento caso acesse de outra porta
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "entrelinhas-api",
    hasAnnasKey: Boolean(process.env.ANNAS_SECRET_KEY),
  });
});

/**
 * Busca unificada gratuita:
 * Consulta simultaneamente Anna's Archive, Gutendex (Project Gutenberg) e Internet Archive.
 */
app.get("/api/books/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const lang = String(req.query.lang || "").trim();

  if (!q) {
    res.status(400).json({ error: "Informe um termo de busca (q)." });
    return;
  }

  const [annasOutcome, gutenbergResults, archiveResults] = await Promise.all([
    searchAnnasArchive(q, { lang, ext: "epub" }),
    searchGutendex(q, lang),
    searchInternetArchive(q, lang),
  ]);

  // Prioriza fontes com download direto garantido primeiro, mesclando com Anna's Archive
  const combinedResults = [
    ...gutenbergResults,
    ...annasOutcome.results,
    ...archiveResults,
  ];

  res.json({
    query: q,
    total: combinedResults.length,
    results: combinedResults,
    sourcesStatus: {
      annasArchive: annasOutcome.ok ? "ok" : "unavailable",
      annasError: annasOutcome.ok ? undefined : annasOutcome.error,
      annasSearchUrl: getAnnasSearchUrl(q, lang),
      gutenbergCount: gutenbergResults.length,
      archiveCount: archiveResults.length,
    },
  });
});

function isSafeExternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    // Bloqueia endereços internos/privados (SSRF guard)
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Proxy de download de EPUB:
 * - Se receber ?url=... (Gutendex / Internet Archive / link direto), baixa o binário sem CORS.
 * - Se receber ?md5=... (Anna's Archive), resolve o link via fast_download ou mirror aberto.
 */
app.get("/api/books/download", async (req, res) => {
  const directUrl = String(req.query.url || "").trim();
  const md5 = String(req.query.md5 || "").trim();
  const rawTitle = String(req.query.title || "livro").trim();
  const authHeader = req.headers.authorization || "";
  const userKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  let targetUrl = directUrl;
  let fallbackPageUrl = null;

  if (!targetUrl && md5) {
    const resolution = await resolveAnnasDownload(md5, userKey);
    if (!resolution.ok) {
      res.status(422).json({
        ok: false,
        requiresManualDownload: Boolean(resolution.requiresManualDownload),
        fallbackPageUrl: resolution.fallbackPageUrl,
        message: resolution.message,
      });
      return;
    }
    targetUrl = resolution.downloadUrl;
    fallbackPageUrl = resolution.fallbackPageUrl || null;
  }

  if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
    res.status(400).json({ error: "URL ou MD5 de livro inválido." });
    return;
  }

  try {
    let upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });

    // Se for Internet Archive e o nome padrão {id}.epub deu 404, busca o nome real do .epub nos metadados
    if (upstream.status === 404 && targetUrl.startsWith("https://archive.org/download/")) {
      const match = targetUrl.match(/^https:\/\/archive\.org\/download\/([^/]+)\//);
      if (match) {
        const identifier = match[1];
        const metaRes = await fetch(
          `https://archive.org/metadata/${identifier}/files`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          const epubFile = Array.isArray(metaJson?.result)
            ? metaJson.result.find(
                (f) => typeof f?.name === "string" && f.name.toLowerCase().endsWith(".epub") && f.private !== "true",
              )
            : null;
          if (epubFile) {
            targetUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(epubFile.name)}`;
            upstream = await fetch(targetUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
              },
              redirect: "follow",
              signal: AbortSignal.timeout(30000),
            });
          }
        }
      }
    }

    if (!upstream.ok) {
      res.status(422).json({
        ok: false,
        requiresManualDownload: true,
        fallbackPageUrl: fallbackPageUrl || targetUrl,
        message: "O servidor externo recusou o download direto. Use o link alternativo.",
      });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "";
    // Se o servidor externo devolveu HTML (página de espera ou captcha) em vez de EPUB
    if (contentType.includes("text/html")) {
      res.status(422).json({
        ok: false,
        requiresManualDownload: true,
        fallbackPageUrl: fallbackPageUrl || targetUrl,
        message:
          "Este arquivo exige confirmação no site parceiro. Clique no link para baixar o EPUB e solte aqui.",
      });
      return;
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const safeFileName = rawTitle
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .trim()
      .slice(0, 60) || "livro";

    res.setHeader("Content-Type", "application/epub+zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(safeFileName)}.epub"`,
    );
    res.send(Buffer.from(arrayBuffer));
  } catch {
    res.status(502).json({
      ok: false,
      requiresManualDownload: true,
      fallbackPageUrl: fallbackPageUrl || targetUrl,
      message: "Tempo esgotado ao baixar o arquivo. Tente abrir o link diretamente.",
    });
  }
});

// Em produção, serve o frontend compilado (dist/)
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[entrelinhas-server] Rodando na porta ${PORT}`);
});

