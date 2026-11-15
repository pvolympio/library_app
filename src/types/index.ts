/**
 * Tipos de domínio, espelhando as tabelas criadas na migration inicial
 * (ver src/db/migrations/001_init.sql).
 *
 * Observação: SQLite não tem tipo boolean/date nativo — datas são
 * armazenadas como string ISO-8601 (TEXT) e booleans como 0/1 (INTEGER).
 */

export interface Book {
  id: number;
  title: string;
  author: string | null;
  /** Identificador do tema/biblioteca ao qual o livro pertence (opcional) */
  theme_id: string | null;
  /** Caminho/URI do arquivo do livro (epub, pdf, etc.) */
  file_path: string | null;
  /** Caminho da capa do livro, se houver */
  cover_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  id: number;
  book_id: number;
  /** Localização no livro (ex: CFI de epub, número de página, %) */
  location: string;
  /** Progresso de 0 a 1 */
  percentage: number;
  updated_at: string;
}

export interface ReadingThemePreference {
  book_id: number;
  /** 1 usa o gênero do livro; 0 usa preset_id manualmente. */
  automatic_by_genre: 0 | 1;
  preset_id:
    | "fantasy"
    | "science-fiction"
    | "horror"
    | "romance"
    | "nonfiction"
    | "children";
  updated_at: string;
}

export interface Highlight {
  id: number;
  book_id: number;
  /** Localização/trecho destacado (formato depende do leitor, ex: CFI range) */
  location: string;
  /** Texto do trecho destacado */
  content: string;
  /** Cor do highlight, em hex (ex: "#ffef00") */
  color: string | null;
  created_at: string;
}

export interface Note {
  id: number;
  book_id: number;
  /** Referência opcional a um highlight relacionado */
  highlight_id: number | null;
  /** Localização no livro à qual a nota se refere */
  location: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}
