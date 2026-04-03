# Lattes2BibTeX

Webtool em `React 18 + Vite` para converter o XML da Plataforma Lattes em `BibTeX` diretamente no navegador, com foco em privacidade, interoperabilidade acadêmica e importação posterior no ORCID.

## Objetivo

O Lattes exporta o currículo em XML, mas não oferece um fluxo direto de exportação bibliográfica para serviços como ORCID e Web of Science. Este projeto usa o `BibTeX` como formato intermediário para diminuir a fricção entre essas plataformas sem exigir backend.

## Escopo do v1

- Conversão `Lattes XML -> BibTeX`
- Processamento 100% client-side
- Interface web única para upload, conversão e download
- `Web Worker` como caminho padrão de conversão, com fallback local no main thread
- Cobertura de todos os ramos atuais de `PRODUCAO-BIBLIOGRAFICA` do XSD local
- Sem cookies, sem autenticação, sem banco de dados e sem persistência de uploads

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

- O arquivo XML é processado localmente no navegador.
- O arquivo não é enviado para servidor.
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

Aplicação em desenvolvimento: `http://127.0.0.1:5173/lattes2orcid/`

### Scripts úteis

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run preview
npm run sanitize:fixture
```

## Deploy estático

- Alvo padrão: `GitHub Pages`
- Base path: `/lattes2orcid/`
- O build gerado em `dist/` é próprio para hospedagem estática

## Estrutura principal

- `src/components/` : interface e tema visual
- `src/lib/lattes/` : decode, parsing DOM, extração, mapeamento, serialização, worker e sanitização
- `fixtures/lattes/` : fixture real sanitizado e fixtures sintéticos
- `assets/` : XSD e DTD de referência do Lattes
- `.codex/skills/` : skills locais para schema mapping, BibTeX, sanitização, DOM XML e worker
- `AGENTS.md` : responsabilidades dos agentes do projeto

## Fixtures e dados sensíveis

- O fixture público principal está em `fixtures/lattes/real/sanitized-lattes.xml`.
- Fixtures sintéticos complementam categorias não presentes no XML real sanitizado.
- O script `npm run sanitize:fixture` existe apenas para manutenção offline de fixtures.

## Validação e testes

A suíte atual cobre:

- parsing e serialização BibTeX sem parser externo
- categorias bibliográficas do XSD
- normalização de encoding `ISO-8859-1`
- colisões de citekey e identificadores duplicados
- erros de XML inválido, raiz incorreta, ausência de produção bibliográfica e upload grande
- caminho via `Web Worker` e fallback local
- fluxo E2E de upload, erro de validação, conversão e renderização de avisos

## Status do fluxo ORCID

- Verificação manual com uma conta ORCID descartável: `OK`
- Verificação manual com uma conta ORCID real: `OK`

Mesmo com o parser e os testes automatizados estáveis, a aceitação final do projeto depende dessa validação manual do fluxo real de importação.

## Licença e isenção de responsabilidade

Este projeto é distribuído sob a licença `MIT`. Em termos práticos:

- o software é gratuito e open-source
- o uso acontece por conta e risco de quem o utiliza
- não há qualquer garantia de funcionamento contínuo, precisão total dos dados convertidos ou adequação a um caso específico
- os mantenedores não se responsabilizam por perda de dados, falhas de importação, inconsistências bibliográficas, indisponibilidade, danos diretos ou indiretos, ou qualquer consequência decorrente do uso do software

Antes de importar dados em qualquer plataforma, mantenha uma cópia do XML original, revise o `BibTeX` gerado e valide manualmente os registros mais sensíveis.

## Limitações atuais

### To-do:

- [ ] `BibTeX -> Lattes XML` ainda não faz parte do v1.
- [ ] O upload aceita apenas XML bruto, não ZIP.
- [ ] A cobertura bibliográfica é guiada pelo XSD local versionado no repositório.
- [ ] No momento, a única seção que pode ser importada para o ORCID é o BibTeX com os dados das publicações e artigos, enquanto as demais do XML ainda não são suportadas e podem ser igualmente extensas e tediosas, como formação acadêmica, experiência profissional, orientações, participações em eventos, prêmios e títulos.
- [ ] O fluxo de importação para o ORCID continua manual: o usuário baixa o BibTeX e importa na plataforma do ORCID, onde ainda pode haver ajustes manuais de parsing ou mapeamento.
