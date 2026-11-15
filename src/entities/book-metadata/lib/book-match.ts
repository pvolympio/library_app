export function normalizeBookText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function scoreBookMatch(
  expectedTitle: string,
  expectedAuthor: string,
  candidateTitle: string,
  candidateAuthors: string[],
): number {
  const title = normalizeBookText(expectedTitle);
  const candidate = normalizeBookText(candidateTitle);
  const author = normalizeBookText(expectedAuthor);
  const authors = normalizeBookText(candidateAuthors.join(" "));
  let score = 0;
  if (title === candidate) score += 8;
  else if (candidate.includes(title) || title.includes(candidate)) score += 4;
  if (authors.includes(author) || author.includes(authors)) score += 5;
  return score;
}

export function stripBookDescription(value?: string): string | null {
  if (!value) return null;
  const documentValue = new DOMParser().parseFromString(value, "text/html");
  return documentValue.body.textContent?.replace(/\s+/g, " ").trim() || null;
}
