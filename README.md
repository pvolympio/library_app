# Entrelinhas — Biblioteca & Leitor EPUB (Tauri + React)

Aplicativo de leitura EPUB e descoberta de livros para desktop e mobile, com catálogo mundial, estantes temáticas, anotações, estatísticas de leitura e persistência offline em SQLite e IndexedDB.

## Stack

- **Tauri 2**, **React 18**, **TypeScript** e **Vite**
- **SQLite** via `tauri-plugin-sql` (metadados, sessões, anotações, snapshots)
- **IndexedDB** (`entrelinhas_epub_store`) para armazenamento de binários EPUB locais
- **epub.js**, **Framer Motion** e **Recharts**
- **Open Library**, **Google Books** e **Hardcover**

## Importação e Leitura de EPUBs

1. **Importar Livros Próprios**:
   - Em **Minha Biblioteca**, use o botão **Importar EPUB** ou simplesmente **arraste e solte (`drag & drop`)** qualquer arquivo `.epub` na janela.
   - O aplicativo analisa o arquivo em segundo plano, extraindo título, autor, descrição, ano de publicação e a imagem de capa embutida.
   - Livros sem capa gráfica recebem automaticamente uma capa editorial procedural gerada em SVG de alta resolução.
2. **Vincular EPUB a Livros do Catálogo**:
   - Em qualquer ficha de livro em **Detalhes do Livro**, vincule um arquivo `.epub` local diretamente pela interface.
   - O botão de leitura é ativado imediatamente para *"Ler agora"* ou *"Continuar lendo"*.
3. **Persistência Total**:
   - O arquivo EPUB é armazenado localmente em banco binário persistente. O usuário pode ler o livro a qualquer momento, mesmo totalmente offline.
   - Destaques com cores, anotações, CFI de localização, progresso percentual e minutos de leitura são associados ao livro e sincronizados com a fonte de dados local (SQLite / localStorage).

## Catálogo e Metadados

- **Open Library:** Catálogo mundial, busca, recomendações por gênero e capa principal.
- **Google Books:** Fallback de capa e sinopse quando a Open Library não possui os campos.
- **Hardcover:** Avaliações sociais, popularidade e recomendações em alta via GraphQL (requer token pessoal).
- **SQLite local:** Materializa snapshots das estantes e livros consultados, garantindo navegação offline instantânea e respeitando os limites de requisição das APIs externas.

## Configuração

Copie `.env.example` para `.env.local` caso queira preencher as integrações opcionais:

```env
VITE_GOOGLE_BOOKS_API_KEY=
VITE_HARDCOVER_API_TOKEN=
```

Sem essas chaves, o catálogo, as buscas, a importação de EPUBs e as leituras continuam funcionando normalmente.

## Iniciar

```bash
npm install
npm run tauri:dev
```

Para trabalhar apenas no frontend (navegador):

```bash
npm run dev
```

Builds:

```bash
npm run build
npm run tauri:build
```

## Banco Local e Armazenamento

- **SQLite (`library.db`):** Migrações em `src/db/migrations/` criam as tabelas de livros, progresso de leitura, destaques, notas, sessões de leitura, preferências de tipografia por gênero, metas anuais e cache de catálogo.
- **IndexedDB (`entrelinhas_epub_store`):** Armazena os binários (`ArrayBuffer`) de todos os livros EPUB importados e vinculados pelo usuário.
