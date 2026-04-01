# Lattes2BibTeX

Webtool em `Next.js` para converter o XML da Plataforma Lattes em `BibTeX`, com foco em privacidade, interoperabilidade acadêmica e importação posterior no ORCID.

## Objetivo

O Lattes exporta o currículo em XML, mas não oferece um fluxo direto de exportação bibliográfica para serviços como ORCID e Web of Science. Este projeto usa o `BibTeX` como formato intermediário para diminuir a fricção entre essas plataformas.

## Escopo do v1

- Conversão `Lattes XML -> BibTeX`
- API `POST /api/convert/lattes-to-bibtex`
- Interface web única para upload, conversão e download
- Cobertura de todos os ramos atuais de `PRODUCAO-BIBLIOGRAFICA` do XSD local
- Sem cookies, sem autenticação e sem persistência de uploads

## Mapeamento bibliográfico

- `TRABALHO-EM-EVENTOS` -> `@inproceedings`
- `ARTIGO-PUBLICADO` -> `@article`
- `ARTIGO-ACEITO-PARA-PUBLICACAO` -> `@unpublished`
- `LIVRO-PUBLICADO-OU-ORGANIZADO` -> `@book`
- `CAPITULO-DE-LIVRO-PUBLICADO` -> `@incollection`
- `TEXTO-EM-JORNAL-OU-REVISTA` -> `@article`
- `OUTRA-PRODUCAO-BIBLIOGRAFICA`, `PARTITURA-MUSICAL`, `PREFACIO-POSFACIO` e `TRADUCAO` -> `@misc`

Quando um campo do Lattes não possui equivalente limpo em BibTeX, o valor é preservado em `note`, `keywords` ou em metadados internos do pipeline para não ser descartado silenciosamente.

## Modelo de privacidade

- O arquivo XML é processado apenas durante a requisição.
- Não há banco de dados.
- Não há armazenamento persistente do XML enviado nem do BibTeX gerado.
- Não há cookies.
- O limite padrão de upload é `25 MB`.
- O repositório mantém apenas fixtures sanitizados.

## Como usar

1. Exporte o currículo em XML na Plataforma Lattes.
2. Abra a aplicação e envie o arquivo `.xml`.
3. Aguarde a conversão e revise o resumo por categoria e os avisos gerados.
4. Baixe o `.bib`.
5. Importe o BibTeX na seção de trabalhos do ORCID.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Aplicação em desenvolvimento: `http://localhost:3000`

### Scripts úteis

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run sanitize:fixture
```

## Estrutura principal

- `src/app/` : App Router e rota HTTP de conversão
- `src/components/` : interface e tema visual
- `src/lib/lattes/` : decode, parsing, extração, mapeamento, serialização e sanitização
- `fixtures/lattes/` : fixture real sanitizado e fixtures sintéticos
- `assets/` : XSD e DTD de referência do Lattes
- `.codex/skills/` : skills locais para mapeamento do XSD, normalização BibTeX, sanitização e privacidade
- `AGENTS.md` : responsabilidades dos agentes do projeto

## Fixtures e dados sensíveis

- O XML bruto pessoal permanece em `source/` e é ignorado pelo Git.
- O fixture público principal está em `fixtures/lattes/real/sanitized-lattes.xml`.
- Fixtures sintéticos complementam categorias não presentes no XML real sanitizado.

## Validação e testes

A suíte atual cobre:

- parsing e serialização BibTeX
- categorias bibliográficas do XSD
- normalização de encoding `ISO-8859-1`
- colisões de citekey e identificadores duplicados
- erros da API para XML inválido, raiz incorreta, ausência de produção bibliográfica e upload grande
- fluxo E2E de upload, erro de validação, conversão e renderização de avisos

## Status do fluxo ORCID

- Verificação manual com uma conta ORCID descartável: `pendente`

Mesmo com o parser e os testes automatizados estáveis, a aceitação final do projeto depende dessa validação manual do fluxo real de importação.

## Limitações atuais

- `BibTeX -> Lattes XML` ainda não faz parte do v1.
- O upload aceita apenas XML bruto, não ZIP.
- A cobertura bibliográfica é guiada pelo XSD local versionado no repositório.
