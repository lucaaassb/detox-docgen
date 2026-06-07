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
# Um único spec-docs.md ou spec-docs.mdx
npx detox-docgen
npx detox-docgen /caminho/para/app
npx detox-docgen --language en
npx detox-docgen --language pt-BR
npx detox-docgen --format mdx

# Um .md ou .mdx por pasta: spec-docs-folder/
npx detox-docgen-folder
npx detox-docgen-folder --language en
npx detox-docgen-folder --format mdx

# PDF único: spec-docs.pdf
npx detox-docgen-pdf
npx detox-docgen-pdf --language en

# Vários PDFs: spec-docs-pdf/
npx detox-docgen-pdf-folder
npx detox-docgen-pdf-folder --language en
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

- Arquivo opcional: `detox-docgen.config.cjs` ou `.detox-docgenrc.cjs` com `module.exports = { testGlob, outputFile, folderOutputDir, pdfOutputDir, projectName, version, responsible, environment, reportLanguage, reportTextOverrides, outputFormat }`. Por omissão, o `testGlob` inclui `e2e/**/*.{js,jsx,ts,tsx}` e arquivos cujo nome segue `*.e2e.*`, `*.spec.*` ou `*.test.*`.
- `projectName` e `version` podem ser inferidos do `package.json`; `responsible` e `environment` enriquecem o cabeçalho do relatório para uso por QA/CI.
- `.detox-docgenignore` — padrão estilo `.gitignore` em caminhos relativos.

### Idioma e textos do relatório

Por padrão, os textos gerados pelo relatório ficam em português. O usuário pode escolher o idioma na execução:

```bash
npx detox-docgen --language en
npx detox-docgen --language pt-BR
```

A opção `--language` também funciona nos comandos `detox-docgen-folder`, `detox-docgen-pdf` e `detox-docgen-pdf-folder`.

Se quiser deixar um idioma fixo sem precisar passar a flag, crie um arquivo de configuração na raiz do projeto:

```js
// detox-docgen.config.cjs
module.exports = {
  reportLanguage: 'en'
};
```

Também é possível sobrescrever só partes específicas da casca textual do relatório, sem alterar nomes de testes, `describe`, `@description`, `@screen` ou seletores vindos do código:

```js
module.exports = {
  reportLanguage: 'en',
  outputFormat: 'mdx',
  reportTextOverrides: {
    coverTitle: 'QA Evidence',
    scenarioLabel: 'Case'
  }
};
```

### Markdown ou MDX

Por padrão, a documentação é gerada em Markdown (`.md`). Para gerar arquivos com extensão MDX:

```bash
npx detox-docgen --format mdx
npx detox-docgen-folder --format mdx
```

O conteúdo gerado continua sendo Markdown compatível com MDX; a opção muda o formato de saída para `.mdx`. Também é possível combinar idioma e formato:

```bash
npx detox-docgen --language en --format mdx
```

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
