import { parser, Parser, IParser, bracket, chars, alt, map, repsep, rep, rep1, seq, opt, skip, str, read1, read, read1To } from './index';

const _hex = 'abcdefABCDEF';
export const digits = '0123456789';
export const alpha = _hex + 'ghijklmnopqrstuvwxyzGHIJKLMNOPQRSTUVWXYZ';
const identStart = _hex + alpha + '$_';
export const hex = _hex + digits;
export const space = ' \t\n\r';

const escmap: { [k: string]: string; } = { b: '\b', r: '\r', n: '\n', "'": "'", '"': '"', t: '\t', '\\': '\\' };

export type JSONValue = Array<JSONValue>|JSONObject|number|string|false|true|null;
export type JSONObject = { [k: string]: JSONValue; };

export function concat(strings: string[]): string {
  let res = '';
  const len = strings.length;
  for (let i = 0; i < len; i++) {
    if (strings[i]) res += strings[i];
  }
  return res;
}

export const JNum: IParser<number> = map(
  seq(
    opt(str('-', '+')),
    read1(digits), opt(str(".")), read(digits),
    map(opt(seq(str('e', 'E'), opt(str('+', '-')), read1(digits))), r => r && concat(r))
  ),
  r => +concat(r)
);

export const JStringEscape: IParser<string> = map(
  seq(str("\\"), chars(1)),
  r => escmap[r[1]] || r[1]
);

export const JStringUnicode: IParser<string> = map(
  seq(str("\\u"), chars(4, hex)),
  r => String.fromCharCode(parseInt(r[1], 16))
);

export const JString = alt(
  bracket(str('"'), map(rep(alt('string part', read1To('"\\'), JStringUnicode, JStringEscape)), r => concat(r)), str('"')),
  bracket(str('\''), map(rep(alt('string part', read1To('\'\\'), JStringUnicode, JStringEscape)), r => concat(r)), str('\''))
);
export const JBool = map(str('true', 'false'), v => v === 'true');
export const JNull = map(str('null'), () => null);
export const JIdentifier = map(seq(read1(identStart), opt(read(identStart + digits))), ([s, t]) => t !== null ? s + t : s);
export const ws = skip(space);
const JArray: Parser<Array<JSONValue>> = {};
const JObject: Parser<JSONObject> = {};
const JValue = alt('value', JString, JArray, JObject, JNum, JBool, JNull);
const JKeyPair = map(seq(ws, alt('key', JString, JIdentifier), ws, str(':'), ws, JValue), r => [r[1], r[5]] as [string, JSONValue]);
JArray.parser = map(seq(str('['), ws, repsep(JValue, seq(ws, str(','), ws), 'allow'), ws, str(']')), r => r[2]);
JObject.parser = map(seq(str('{'), ws, repsep(JKeyPair, seq(ws, str(','), ws), 'allow'), ws, str('}')), r => {
  const pairs = r[2];
  const len = pairs.length;
  const res: any = {};
  for (let i = 0; i < len; i++) {
    const pair = pairs[i];
    res[pair[0]] = pair[1];
  }
  return res;
});

export const parse = parser(map(seq(ws, JValue, ws), r => r[1]));
