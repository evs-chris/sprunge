import { IParser, Success, fail, detailedFail } from '../base';
import { read1 } from './char';

/**
 * Creates a parser that reads one of the given strings.
 *
 * @param strings - the list of strings to match
 */
export function str(...strings: string[]): IParser<string> {
  const len = strings.length;
  if (len === 1) {
    const str = strings[0];
    const len = str.length;

    if (len === 1) {
      return {
        parse(s: string, p: number, res?: Success<string>) {
          if (s[p] === str) {
            res = res || ['', 0];
            res[0] = str;
            res[1] = p + 1;
            return res;
          } else return fail(p, detailedFail && `expected '${str}'`);
        }
      }
    } else if (len === 2) {
      return {
        parse(s: string, p: number, res?: Success<string>) {
          if (s[p] === str[0] && s[p + 1] === str[1]) {
            res = res || ['', 0];
            res[0] = str;
            res[1] = p + 2;
            return res;
          } else return fail(p, detailedFail && `expected '${str}'`);
        }
      }
    } else {
      let i: number, j: number;
      return {
        parse(s: string, p: number, res?: Success<string>) {
          for (i = 0, j = p + i; i < len; i++, j++) {
            if (str[i] !== s[j]) return fail(p, detailedFail && `expected '${str}'`);
          }
          res = res || ['', 0];
          res[0] = str;
          res[1] = p + len;
          return res;
        }
      }
    }
  } else {
    return {
      parse(s: string, p: number, res?: Success<string>) {
        outer: for (let i = 0; i < len; i++) {
          const n = strings[i];
          const nlen = n.length;
          if (nlen === 1) {
            if (s[p] === n) return [n, p + nlen];
            else continue outer;
          }
          for (let j = 0; j < nlen; j++) {
            if (n[j] !== s[p + j]) continue outer;
          }
          res = res || ['', 0];
          res[0] = n;
          res[1] = p + nlen;
          return res;
        }
        return fail(p, detailedFail && `expected ${strings.length > 1 ? 'one of ' : ''}${strings.map(s => `'${s}'`).join(', ')}`);
      }
    };
  }
}

/**
 * Creates a parser that reads one of the given strings in any case and returns it in the given case.
 * This is more expensive than str, as it involves matching any chars in the input strings in either
 * case and then verifying the matched content against the list using indexOf.
 *
 * @param strings - the list of strings to match
 */
export function istr(...strings: string[]): IParser<string> {
  const copy = strings.slice();
  const chars = read1(copy.map(s => s.toLowerCase() + s.toUpperCase()).join(''));
  const idx = copy.map(s => s.toLowerCase());
  return {
    parse(s: string, p: number, res?: Success<string>) {
      const r = chars.parse(s, p, res || ['', 0]);
      if (!r.length) return r;
      const i = idx.indexOf(r[0].toLowerCase());
      if (!~i) return fail(p, detailedFail && `expected ${copy.length > 1 ? 'one of ' : ''}${copy.map(s => `'${s}'`).join(', ')}`);
      r[0] = copy[i];
      return r;
    }
  };
}
