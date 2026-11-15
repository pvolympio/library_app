import { getDb } from "@/db";
import {
  DEFAULT_ANNUAL_GOAL,
  type DailyReadingStat,
  type HighlightColor,
  type ReadingBookReference,
  type ReadingHighlight,
  type ReadingHighlightDraft,
  type ReadingSessionHandle,
  type ReadingStatistics,
  isHighlightColor,
} from "../model/reading-activity";

interface BookIdRow { id: number }
interface HighlightRow {
  id: number;
  book_id: number;
  file_path: string;
  book_title: string;
  location: string;
  content: string;
  color: string | null;
  note_content: string | null;
  created_at: string;
  updated_at: string;
}
interface ScalarStatsRow {
  total_seconds: number;
  pages_today: number;
  books_completed: number;
  annual_goal: number;
}
interface DailyRow { reading_date: string; seconds: number }
interface StreakRow { reading_date: string }

const browserActivityKey = "library-app:reading-activity:v1";
const bookIdPromises = new Map<string, Promise<number>>();
const sessionWriteQueues = new Map<string, Promise<void>>();

interface BrowserActivity {
  highlights: ReadingHighlight[];
  sessions: Array<{
    id: string;
    bookStorageKey: string;
    startedAt: string;
    endedAt: string | null;
    pagesRead: number;
  }>;
  completions: Array<{ bookStorageKey: string; year: number; completedAt: string }>;
  goals: Record<string, number>;
}

function emptyBrowserActivity(): BrowserActivity {
  return { highlights: [], sessions: [], completions: [], goals: {} };
}

function loadBrowserActivity(): BrowserActivity {
  try {
    const value = window.localStorage.getItem(browserActivityKey);
    return value ? { ...emptyBrowserActivity(), ...JSON.parse(value) } : emptyBrowserActivity();
  } catch {
    return emptyBrowserActivity();
  }
}

function saveBrowserActivity(value: BrowserActivity) {
  try {
    window.localStorage.setItem(browserActivityKey, JSON.stringify(value));
  } catch {
    // O preview web continua funcional mesmo sem localStorage.
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function ensureReadingBook(book: ReadingBookReference): Promise<number> {
  const cached = bookIdPromises.get(book.storageKey);
  if (cached) return cached;

  const pending = (async () => {
    const db = await getDb();
    const rows = await db.select<BookIdRow[]>(
      "SELECT id FROM books WHERE file_path = $1 ORDER BY id DESC LIMIT 1",
      [book.storageKey],
    );
    if (rows[0]) return rows[0].id;

    const inserted = await db.execute(
      "INSERT INTO books (title, author, file_path) VALUES ($1, $2, $3)",
      [book.title, book.author, book.storageKey],
    );
    if (inserted.lastInsertId == null) throw new Error("SQLite nao retornou o id do livro.");
    return inserted.lastInsertId;
  })();

  bookIdPromises.set(book.storageKey, pending);
  pending.catch(() => bookIdPromises.delete(book.storageKey));
  return pending;
}

function mapHighlight(row: HighlightRow): ReadingHighlight {
  return {
    id: row.id,
    bookId: row.book_id,
    bookStorageKey: row.file_path,
    bookTitle: row.book_title,
    location: row.location,
    excerpt: row.content,
    color: isHighlightColor(row.color ?? "") ? row.color as HighlightColor : "#FFE066",
    note: row.note_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReadingHighlights(
  book?: ReadingBookReference,
): Promise<ReadingHighlight[]> {
  if (!isTauriRuntime()) {
    const rows = loadBrowserActivity().highlights;
    return book ? rows.filter((item) => item.bookStorageKey === book.storageKey) : rows;
  }

  const db = await getDb();
  const params: unknown[] = [];
  let where = "";
  if (book) {
    const bookId = await ensureReadingBook(book);
    where = "WHERE h.book_id = $1";
    params.push(bookId);
  }
  const rows = await db.select<HighlightRow[]>(
    `SELECT h.id, h.book_id, b.file_path, b.title AS book_title,
            h.location, h.content, h.color, h.created_at,
            COALESCE(n.updated_at, h.created_at) AS updated_at,
            n.content AS note_content
       FROM highlights h
       JOIN books b ON b.id = h.book_id
       LEFT JOIN notes n ON n.id = (
         SELECT n2.id FROM notes n2
          WHERE n2.highlight_id = h.id
          ORDER BY n2.updated_at DESC, n2.id DESC LIMIT 1
       )
       ${where}
      ORDER BY COALESCE(n.updated_at, h.created_at) DESC, h.id DESC`,
    params,
  );
  return rows.map(mapHighlight);
}

export async function createReadingHighlight(
  book: ReadingBookReference,
  draft: ReadingHighlightDraft,
): Promise<ReadingHighlight> {
  const now = new Date().toISOString();
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    const highlight: ReadingHighlight = {
      id: crypto.randomUUID(),
      bookId: null,
      bookStorageKey: book.storageKey,
      bookTitle: book.title,
      location: draft.location,
      excerpt: draft.excerpt,
      color: draft.color,
      note: draft.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    activity.highlights.unshift(highlight);
    saveBrowserActivity(activity);
    return highlight;
  }

  const db = await getDb();
  const bookId = await ensureReadingBook(book);
  const inserted = await db.execute(
    "INSERT INTO highlights (book_id, location, content, color) VALUES ($1, $2, $3, $4)",
    [bookId, draft.location, draft.excerpt, draft.color],
  );
  if (inserted.lastInsertId == null) throw new Error("Nao foi possivel criar o destaque.");

  const note = draft.note?.trim();
  if (note) {
    await db.execute(
      "INSERT INTO notes (book_id, highlight_id, location, content) VALUES ($1, $2, $3, $4)",
      [bookId, inserted.lastInsertId, draft.location, note],
    );
  }

  return {
    id: inserted.lastInsertId,
    bookId,
    bookStorageKey: book.storageKey,
    bookTitle: book.title,
    location: draft.location,
    excerpt: draft.excerpt,
    color: draft.color,
    note: note || null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteReadingHighlight(highlight: ReadingHighlight): Promise<void> {
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    activity.highlights = activity.highlights.filter((item) => item.id !== highlight.id);
    saveBrowserActivity(activity);
    return;
  }
  const db = await getDb();
  await db.execute("DELETE FROM highlights WHERE id = $1", [highlight.id]);
}

export async function updateReadingHighlightNote(highlight: ReadingHighlight, note: string): Promise<void> {
  const normalized = note.trim();
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    const current = activity.highlights.find((item) => item.id === highlight.id);
    if (current) { current.note = normalized || null; current.updatedAt = new Date().toISOString(); }
    saveBrowserActivity(activity);
    return;
  }
  const db = await getDb();
  if (normalized) {
    await db.execute(
      `INSERT INTO notes (book_id, highlight_id, location, content)
       VALUES ($1,$2,$3,$4)`,
      [highlight.bookId, highlight.id, highlight.location, normalized],
    );
  } else {
    await db.execute("DELETE FROM notes WHERE highlight_id = $1", [highlight.id]);
  }
}

export async function beginReadingSession(
  book: ReadingBookReference,
): Promise<ReadingSessionHandle> {
  const startedAt = new Date().toISOString();
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    const id = crypto.randomUUID();
    activity.sessions.push({ id, bookStorageKey: book.storageKey, startedAt, endedAt: null, pagesRead: 0 });
    saveBrowserActivity(activity);
    return { id, bookStorageKey: book.storageKey, startedAt };
  }

  const db = await getDb();
  const bookId = await ensureReadingBook(book);
  await db.execute(
    `UPDATE reading_sessions
        SET ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            duration_seconds = MAX(0, CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER))
      WHERE book_id = $1 AND ended_at IS NULL`,
    [bookId],
  );
  const inserted = await db.execute("INSERT INTO reading_sessions (book_id) VALUES ($1)", [bookId]);
  if (inserted.lastInsertId == null) throw new Error("Nao foi possivel iniciar a sessao.");
  return { id: inserted.lastInsertId, bookStorageKey: book.storageKey, startedAt };
}

export function incrementSessionPage(session: ReadingSessionHandle) {
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    const current = activity.sessions.find((item) => item.id === session.id);
    if (current) current.pagesRead += 1;
    saveBrowserActivity(activity);
    return;
  }

  const queueKey = String(session.id);
  const previous = sessionWriteQueues.get(queueKey) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const db = await getDb();
    await db.execute("UPDATE reading_sessions SET pages_read = pages_read + 1 WHERE id = $1", [session.id]);
  });
  sessionWriteQueues.set(queueKey, next);
}

export async function endReadingSession(session: ReadingSessionHandle): Promise<void> {
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    const current = activity.sessions.find((item) => item.id === session.id);
    if (current && !current.endedAt) current.endedAt = new Date().toISOString();
    saveBrowserActivity(activity);
    return;
  }

  await (sessionWriteQueues.get(String(session.id)) ?? Promise.resolve()).catch(() => undefined);
  const db = await getDb();
  await db.execute(
    `UPDATE reading_sessions
        SET ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            duration_seconds = MAX(0, CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER))
      WHERE id = $1 AND ended_at IS NULL`,
    [session.id],
  );
}

export async function markBookCompleted(book: ReadingBookReference): Promise<void> {
  const year = new Date().getFullYear();
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    if (!activity.completions.some((item) => item.bookStorageKey === book.storageKey && item.year === year)) {
      activity.completions.push({ bookStorageKey: book.storageKey, year, completedAt: new Date().toISOString() });
      saveBrowserActivity(activity);
    }
    return;
  }
  const db = await getDb();
  const bookId = await ensureReadingBook(book);
  await db.execute(
    "INSERT OR IGNORE INTO book_completions (book_id, year) VALUES ($1, $2)",
    [bookId, year],
  );
}

export async function setAnnualReadingGoal(targetBooks: number): Promise<void> {
  const year = new Date().getFullYear();
  const safeTarget = Math.max(1, Math.round(targetBooks));
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    activity.goals[String(year)] = safeTarget;
    saveBrowserActivity(activity);
    return;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO reading_goals (year, target_books) VALUES ($1, $2)
     ON CONFLICT(year) DO UPDATE SET target_books = excluded.target_books`,
    [year, safeTarget],
  );
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateStreak(dateKeys: string[]): number {
  const dates = new Set(dateKeys);
  const cursor = new Date();
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function lastThirtyDays(secondsByDate: Map<string, number>): DailyReadingStat[] {
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    const key = localDateKey(date);
    return { date: key, label: formatter.format(date).replace(" de ", " "), minutes: Math.round((secondsByDate.get(key) ?? 0) / 60) };
  });
}

export async function loadReadingStatistics(): Promise<ReadingStatistics> {
  const year = new Date().getFullYear();
  if (!isTauriRuntime()) {
    const activity = loadBrowserActivity();
    const today = localDateKey(new Date());
    const secondsByDate = new Map<string, number>();
    let totalSeconds = 0;
    let pagesToday = 0;
    for (const session of activity.sessions) {
      const endedAt = session.endedAt ?? new Date().toISOString();
      const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(session.startedAt)) / 1000));
      const day = localDateKey(new Date(session.startedAt));
      totalSeconds += seconds;
      secondsByDate.set(day, (secondsByDate.get(day) ?? 0) + seconds);
      if (day === today) pagesToday += session.pagesRead;
    }
    const dateKeys = [...secondsByDate.keys()];
    return {
      totalSeconds,
      pagesToday,
      currentStreak: calculateStreak(dateKeys),
      booksCompletedThisYear: activity.completions.filter((item) => item.year === year).length,
      annualGoal: activity.goals[String(year)] ?? DEFAULT_ANNUAL_GOAL,
      daily: lastThirtyDays(secondsByDate),
    };
  }

  const db = await getDb();
  await db.execute("INSERT OR IGNORE INTO reading_goals (year, target_books) VALUES ($1, $2)", [year, DEFAULT_ANNUAL_GOAL]);
  const [scalarRows, dailyRows, streakRows] = await Promise.all([
    db.select<ScalarStatsRow[]>(
      `SELECT
         COALESCE((SELECT SUM(CASE
           WHEN ended_at IS NULL THEN MAX(0, CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER))
           ELSE duration_seconds END) FROM reading_sessions), 0) AS total_seconds,
         COALESCE((SELECT SUM(pages_read) FROM reading_sessions WHERE date(started_at, 'localtime') = date('now', 'localtime')), 0) AS pages_today,
         COALESCE((SELECT COUNT(*) FROM book_completions WHERE year = $1), 0) AS books_completed,
         COALESCE((SELECT target_books FROM reading_goals WHERE year = $1), $2) AS annual_goal`,
      [year, DEFAULT_ANNUAL_GOAL],
    ),
    db.select<DailyRow[]>(
      `SELECT date(started_at, 'localtime') AS reading_date,
              SUM(CASE WHEN ended_at IS NULL
                  THEN MAX(0, CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER))
                  ELSE duration_seconds END) AS seconds
         FROM reading_sessions
        WHERE started_at >= datetime('now', '-29 days', 'start of day')
        GROUP BY date(started_at, 'localtime')`,
    ),
    db.select<StreakRow[]>(
      `SELECT DISTINCT date(started_at, 'localtime') AS reading_date
         FROM reading_sessions
        WHERE duration_seconds > 0 OR ended_at IS NULL
        ORDER BY reading_date DESC`,
    ),
  ]);
  const scalar = scalarRows[0] ?? { total_seconds: 0, pages_today: 0, books_completed: 0, annual_goal: DEFAULT_ANNUAL_GOAL };
  const secondsByDate = new Map(dailyRows.map((row) => [row.reading_date, Number(row.seconds)]));
  return {
    totalSeconds: Number(scalar.total_seconds),
    pagesToday: Number(scalar.pages_today),
    currentStreak: calculateStreak(streakRows.map((row) => row.reading_date)),
    booksCompletedThisYear: Number(scalar.books_completed),
    annualGoal: Number(scalar.annual_goal),
    daily: lastThirtyDays(secondsByDate),
  };
}
