import { parser, concat, map, rep1, rep, seq, str, alt, bracket } from './index';
import { JNum, JString, JIdentifier, JStringEscape } from './json';

export const Identifier = map(rep1(alt(JIdentifier, JStringEscape)), r => concat(r));
export const DotPath = map(seq(str('.'), Identifier), r => r[1]);
export const BracketPath = bracket(str('['), alt<number|string>(JNum, JString), str(']'))
export const Keypath = map(seq(JIdentifier, rep(alt(DotPath, BracketPath))), r => { r[1].unshift(r[0]); return r[1] });
export const parse = parser(Keypath, { consumeAll: true });
