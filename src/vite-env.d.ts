/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_BOOKS_API_KEY?: string;
  readonly VITE_HARDCOVER_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
