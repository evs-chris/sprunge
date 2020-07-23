import { parser, ErrorOptions, ParseError, concat, IParser, bracket, readTo, rep1sep, alt, map, repsep, rep, seq, skip, str, verify } from './index';

export interface CSVOptions {
  record?: string;
  field?: string;
  header?: boolean;
  quote?: string;
}

export const DEFAULTS = {
  record: '\n',
  field: ',',
  header: false,
  quote: '"',
};

export function csv(options?: CSVOptions) {
  const opts = Object.assign({}, DEFAULTS, options);

  const ws = skip(' \t');
  const quote = str(opts.quote || '"');
  const quotedField = bracket(seq(ws, quote), map(rep(alt(readTo(opts.quote), map(seq(quote, quote), () => ''))), r => concat(r)), seq(quote, ws));
  const unquotedField = readTo(opts.record + opts.field, true);
  const field: IParser<string> = alt(quotedField, unquotedField);
  const record = verify(rep1sep(field, seq(ws, str(opts.field), ws)), s => s.length > 1 || s[0].length > 0 || 'empty record');
  const csv: IParser<string[][]> = repsep(record, str(opts.record), 'allow');

  const _parse = parser(csv, { consumeAll: true });

  return function parse(input: string, options?: ErrorOptions) {
    const res: string[][]|ParseError = _parse(input, options);
    if (Array.isArray(res)) {
      if (opts.header) {
        const header: string[] = res.shift();
        for (let i = 0; i < res.length; i++) {
          for (let j = 0; j < header.length; j++) (res[i] as any)[header[j]] = res[i][j];
        }
      }
    }

    return res;
  }
}
