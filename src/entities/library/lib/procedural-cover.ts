function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxCharsPerLine = 18): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxCharsPerLine) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 5);
}

/**
 * Gera uma capa procedural elegante em SVG (formato Data URI) para livros
 * importados que não possuem imagem de capa embutida no arquivo EPUB.
 */
export function generateProceduralCoverSvg(
  title: string,
  author: string,
  spineColor = "#334155",
): string {
  const safeTitle = escapeXml(title || "Sem Título");
  const safeAuthor = escapeXml(author || "Autor Desconhecido");
  const titleLines = wrapLines(safeTitle, 16);

  const startY = 380 - (titleLines.length * 36) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${spineColor}" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="70%" stop-color="#000000" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.65" />
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#fef3c7" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.8" />
    </linearGradient>
  </defs>

  <!-- Fundo com gradiente e vinheta -->
  <rect width="600" height="900" fill="url(#bg)" />
  <rect width="600" height="900" fill="url(#vignette)" />

  <!-- Moldura externa dourada dupla -->
  <rect x="28" y="28" width="544" height="844" rx="6" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.65" />
  <rect x="36" y="36" width="528" height="828" rx="4" fill="none" stroke="url(#gold)" stroke-width="0.8" opacity="0.45" />

  <!-- Detalhes de cantos ornamentais -->
  <path d="M 46 64 L 64 64 L 64 46" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity="0.7" />
  <path d="M 554 64 L 536 64 L 536 46" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity="0.7" />
  <path d="M 46 836 L 64 836 L 64 854" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity="0.7" />
  <path d="M 554 836 L 536 836 L 536 854" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity="0.7" />

  <!-- Ornamento de cabeçalho -->
  <g transform="translate(300, 160)" text-anchor="middle">
    <path d="M -60 0 C -20 -8, 20 -8, 60 0 C 20 8, -20 8, -60 0 Z" fill="url(#gold)" opacity="0.75" />
    <circle cx="0" cy="0" r="3.5" fill="#fef3c7" />
  </g>

  <!-- Autor -->
  <text x="300" y="220" text-anchor="middle" font-family="'Cinzel', 'Playfair Display', 'Georgia', serif" font-size="20" font-weight="600" fill="#fef3c7" letter-spacing="3" opacity="0.9">
    ${safeAuthor.toUpperCase()}
  </text>

  <!-- Linha divisória fina -->
  <line x1="220" y1="250" x2="380" y2="250" stroke="url(#gold)" stroke-width="1" opacity="0.5" />

  <!-- Título principal -->
  <g font-family="'Playfair Display', 'Cormorant Garamond', 'Georgia', serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">
    ${titleLines
      .map(
        (line, idx) =>
          `<text x="300" y="${startY + idx * 46}" letter-spacing="-0.5">${line}</text>`,
      )
      .join("\n    ")}
  </g>

  <!-- Ornamento central inferior -->
  <g transform="translate(300, 720)" text-anchor="middle">
    <line x1="-70" y1="0" x2="70" y2="0" stroke="url(#gold)" stroke-width="1" opacity="0.5" />
    <polygon points="0,-6 6,0 0,6 -6,0" fill="url(#gold)" opacity="0.8" />
  </g>

  <!-- Marca discreta da biblioteca -->
  <text x="300" y="800" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#fef3c7" letter-spacing="4" opacity="0.6">
    ENTRELINHAS · ACERVO DIGITAL
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

