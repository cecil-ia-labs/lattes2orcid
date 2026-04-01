declare module "bibtex-parse" {
  export interface ParsedBibTeXEntry {
    key: string;
    type: string;
    [field: string]: string;
  }

  export function parse(input: string): unknown;
  export function entries(input: string): ParsedBibTeXEntry[];

  const bibtexParse: {
    parse: typeof parse;
    entries: typeof entries;
  };

  export default bibtexParse;
}
