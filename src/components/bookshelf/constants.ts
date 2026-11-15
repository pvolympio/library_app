/** Dimensões compartilhadas entre Bookshelf, Shelf e BookSpine. */
export const MAX_BOOK_HEIGHT = 204;
export const COVER_WIDTH = 138;
export const SLOT_GAP = 10;
/** Espessura visual da tábua da prateleira */
export const PLANK_HEIGHT = 22;
/** Respiro acima dos livros, para o "tilt" e a sombra não serem cortados */
export const TOP_PADDING = 48;
/** Altura total de cada linha de prateleira (respiro + livro + tábua) */
export const SHELF_ROW_HEIGHT = TOP_PADDING + MAX_BOOK_HEIGHT + PLANK_HEIGHT;
/** Rotação (graus) aplicada ao livro inteiro ao abrir — a capa fica em (90 + este valor) */
export const OPEN_ROTATION_DEG = -96;
