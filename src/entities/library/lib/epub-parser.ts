import ePub from "epubjs";
import { spineColorFor } from "@/entities/catalog/lib/book-presentation";
import { generateProceduralCoverSvg } from "./procedural-cover";

export interface ParsedEpubMetadata {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  genre: string;
  firstPublishYear?: number;
  isbn?: string;
  fileData: ArrayBuffer;
  fileName: string;
  fileSize: number;
  spineColor: string;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(reader.error || new Error("Erro ao converter capa para base64"));
    reader.readAsDataURL(blob);
  });
}

function extractYear(pubdate?: string): number | undefined {
  if (!pubdate) return undefined;
  const match = pubdate.match(/\b(18|19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

/**
 * Lê e analisa um arquivo EPUB (seja via File ou ArrayBuffer),
 * extraindo metadados estruturados, capa permanente (embutida ou procedural)
 * e atributos prontos para inclusão na biblioteca e no leitor.
 */
export async function parseEpub(
  fileOrBuffer: File | ArrayBuffer,
  fallbackFileName = "livro.epub",
): Promise<ParsedEpubMetadata> {
  const fileName = fileOrBuffer instanceof File ? fileOrBuffer.name : fallbackFileName;
  const fileSize = fileOrBuffer instanceof File ? fileOrBuffer.size : fileOrBuffer.byteLength;
  const arrayBuffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;

  // Usa uma fatia defensiva para evitar desacoplamento do buffer original
  const book = ePub(arrayBuffer.slice(0));

  try {
    await book.opened;
    const metadata = await book.loaded.metadata;

    const rawTitle = metadata.title?.trim();
    const fallbackTitle = fileName.replace(/\.epub$/i, "").replace(/[_-]+/g, " ").trim();
    const title = rawTitle || fallbackTitle || "Livro Sem Título";

    const author = metadata.creator?.trim() || "Autor Desconhecido";
    const description = metadata.description?.replace(/<[^>]+>/g, "").trim() || "";
    const firstPublishYear = extractYear(metadata.pubdate);
    const isbn = metadata.identifier?.trim() || undefined;

    const spineColor = spineColorFor(title);

    let coverUrl = "";
    try {
      const coverResourceUrl = await book.coverUrl();
      if (coverResourceUrl) {
        const response = await fetch(coverResourceUrl);
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) {
            coverUrl = await blobToDataUrl(blob);
          }
        }
      }
    } catch {
      coverUrl = "";
    }

    if (!coverUrl) {
      coverUrl = generateProceduralCoverSvg(title, author, spineColor);
    }

    const genre = "Literatura";

    return {
      title,
      author,
      description,
      coverUrl,
      genre,
      firstPublishYear,
      isbn,
      fileData: arrayBuffer,
      fileName,
      fileSize,
      spineColor,
    };
  } finally {
    try {
      book.destroy();
    } catch {
      // Ignora erro de cleanup do leitor efêmero
    }
  }
}

