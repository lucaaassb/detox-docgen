# detox-docgen

Ferramenta em TypeScript que gera **documentação a partir de testes [Detox](https://wix.github.io/Detox/)** (E2E em React Native), arquivo único Markdown, saída por diretório, PDF opcional (Puppeteer) e seção opcional de **relatório de execução** a partir de arquivos **JUnit** (por exemplo `jest-junit`).

O **normalizador** (`src/normalizer/`) transforma o resultado do parser num modelo interno estável: textos e metadados JSDoc com espaços colapsados, *hooks* na ordem canónica (`beforeAll` → `beforeEach` → `afterEach` → `afterAll`), deduplicação de avisos, lista `its` alinhada à árvore de suítes, caminhos em POSIX, `sourceKind` (`javascript` / `typescript` / `tsx`) inferido pela extensão, e aviso quando um teste não tem passos nem `@description`.

## Instalação

```bash
npm install --save-dev detox-docgen
```

## Utilização (CLI)

No diretório do projeto (onde vivem `e2e/`, `package.json`, etc.):

```bash
# Um único spec-docs.md
npx detox-docgen
npx detox-docgen /caminho/para/app

# Um .md por pasta: spec-docs-folder/
npx detox-docgen-folder

# PDF único: spec-docs.pdf
npx detox-docgen-pdf

# Vários PDFs: spec-docs-pdf/
npx detox-docgen-pdf-folder
```

### Scripts (package.json do teu app)

```json
{
  "scripts": {
    "docs": "detox-docgen",
    "docs:folder": "detox-docgen-folder",
    "docs:pdf": "detox-docgen-pdf",
    "docs:pdf:folder": "detox-docgen-pdf-folder"
  }
}
```

## API programática

```ts
import {
  generateSingleDoc,
  generateFolderDocs,
  generateSinglePDF,
  generateFolderPDFs
} from 'detox-docgen';

await generateSingleDoc('/caminho/do/projeto');
```

## Configuração (opcional)

- Arquivo opcional: `detox-docgen.config.cjs` ou `.detox-docgenrc.cjs` com `module.exports = { testGlob, outputFile, folderOutputDir, pdfOutputDir, projectName, version, responsible, environment }`. Por omissão, o `testGlob` inclui `e2e/**/*.{js,jsx,ts,tsx}` e arquivos cujo nome segue `*.e2e.*`, `*.spec.*` ou `*.test.*`.
- `projectName` e `version` podem ser inferidos do `package.json`; `responsible` e `environment` enriquecem o cabeçalho do relatório para uso por QA/CI.
- `.detox-docgenignore` — padrão estilo `.gitignore` em caminhos relativos.

## JUnit (relatório de execução)

Se existirem arquivos `**/junit.xml`, `**/e2e-junit.xml` ou similares (muito comum com *jest-junit*), a seção inicial do Markdown agrega contagem, tabela e falhas. Sem esses arquivos, a documentação mostra só a parte extraída do **código-fonte** dos testes.

## O que é extraído

- `describe` / `it` / `test`, `beforeAll` / `afterEach` / etc. (estrutura)
- Comentários de bloco com `@description`, `@author`, `@screen`, `@priority`
- Passos heurísticos a partir de `element(…)`, `device(…)`, `expect(…)` (cadeias de chamadas, sem executar a app)

## Requisitos

- Node.js 20+

## Licença

MIT. Ver [LICENSE](LICENSE).
