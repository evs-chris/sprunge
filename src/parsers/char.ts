import { getSearch, SearchFn } from '../search';
import { IParser, Success, fail, detailedFail } from '../base';

/**
 * Seeks through the input until a character within chars is encountered.
 *
 * @param s - the input to search
 * @param p - the index within `s` from which to start
 * @param chars - a sorted string of characters to search for
 */
export function seekUntilChar(s: string, p: number, chars: string, contains: SearchFn): number {
  const len = s.length;
  for (let i = p; i < len; i++) {
    if (contains(chars, s[i])) return i;
  }
  return len;
}

/**
 * Seeks through the input until a character _not_ within chars is encountered.
 *
 * @param s - the input to search
 * @param p - the index with `s` from which to start
 * @param chars - a sorted string of characters to search for
 */
export function seekWhileChar(s: string, p: number, chars: string, contains: SearchFn): number {
  const len = s.length;
  for (let i = p; i < len; i++) {
    if (!contains(chars, s[i])) return i;
  }
  return len;
}

/**
 * Creates a parser that skips the given characters.
 *
 * @param chars - the characters to skip
 *
 * This will successfully skip 0 character.
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function skip(chars: string): IParser<''> {
  const sorted = chars.split('').sort().join('');
  const contains = getSearch(chars);
  return {
    parse(s: string, p: number, res?: Success<''>) {
      res = res || ['', 0];
      res[1] = seekWhileChar(s, p, sorted, contains);
      return res;
    }
  };
}

/**
 * Creates a parser that skips at least one of the given characters.
 *
 * @param chars - the charaters to skip
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function skip1(chars: string): IParser<''> {
  const sorted = chars.split('').sort().join('');
  const contains = getSearch(chars);
  return {
    parse(s: string, p: number, res?: Success<''>) {
      res = res || ['', 0];
      res[1] = seekWhileChar(s, p, sorted, contains);
      if (res[1] === p) return fail(p, detailedFail && `expected at least one of ${JSON.stringify(chars)}`);
      return res;
    }
  };
}

/**
 * Creates a parser that reads a string consisting of the given characters.
 *
 * @param chars - the characters to read
 *
 * This will successfully read an empty string.
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function read(chars: string): IParser<string> {
  const sorted = chars.split('').sort().join('');
  const contains = getSearch(chars);
  return {
    parse(s: string, p: number, res?: Success<string>) {
      res = res || ['', 0];
      const r = seekWhileChar(s, p, sorted, contains);
      res[0] = s.substring(p, r);
      res[1] = r;
      return res;
    }
  }
}

/**
 * Creates a parser that reads a string consisting of at least one of the given
 * characters.
 *
 * @param chars - the characters to read
 *
 * This will not successfully read an empty string.
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function read1(chars: string): IParser<string> {
  const sorted = chars.split('').sort().join('');
  const contains = getSearch(chars);
  return {
    parse(s: string, p: number, res?: Success<string>) {
      res = res || ['', 0];
      const r = seekWhileChar(s, p, sorted, contains);
      if (r === p) return fail(p, detailedFail && `expected one of ${chars}`);
      res[0] = s.substring(p, r);
      res[1] = r;
      return res;
    }
  };
}

/**
 * Creates a parser that reads a string of a fixed length, optionally from a
 * specific set of allowed characters.
 *
 * @param count - the number of characters to read
 * @param allowed - an optional list of characters that the parsed string must
 * match
 *
 * `allowed` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function chars(count: number, allowed?: string): IParser<string> {
  const sorted = allowed && allowed.split('').sort().join('');
  const search = getSearch(sorted || '');
  return {
    parse(s: string, p: number, res?: Success<string>) {
      if (s.length - p >= count) {
        res = res || ['', 0];
        const str = s.substr(p, count);
        if (sorted) {
          for (let i = 0; i < count; i++) if (!search(sorted, str[i])) return fail(p + i, detailedFail && 'unexpected char');
        }
        res[0] = str;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail && 'unexpected end of input');
    }
  };
}

/**
 * Creates a parser that reads a string of a fixed length, optionally excluding a
 * specific set of characters.
 *
 * @param count - the number of characters to read
 * @param disallowed - a list of characters that the parsed string must not match
 *
 * `disallowed` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function notchars(count: number, disallowed: string): IParser<string> {
  const sorted = disallowed.split('').sort().join('');
  const search = getSearch(sorted);
  return {
    parse(s: string, p: number, res?: Success<string>) {
      if (s.length - p >= count) {
        res = res || ['', 0];
        const str = s.substr(p, count);
        for (let i = 0; i < count; i++) if (search(sorted, str[i])) return fail(p + i, detailedFail && 'unexpected char');
        res[0] = str;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail && 'unexpected end of input');
    }
  };
}

/**
 * Creates a parser that reads a string until it encounters one of the given
 * characters, optionally accepting the end of the input as a valid stopping
 * point.
 *
 * @param stop - the list of characaters that will end the string
 * @param end - if `true` will accept the end of enput as a valid stopping
 * point
 *
 * This will successfully parse an empty string.
 *
 * `stop` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function readTo(stop: string, end?: true): IParser<string> {
  const sorted = stop.split('').sort().join('');
  const contains = getSearch(stop);
  return {
    parse(s: string, p: number, res?: Success<string>) {
      res = res || ['', 0];
      const skipped = seekUntilChar(s, p, sorted, contains);
      if (!end && skipped >= s.length) return fail(skipped - 1, detailedFail && `expected one of '${stop}' before end of input`);
      res[0] = skipped ? s.substring(p, skipped) : '';
      res[1] = skipped;
      return res;
    }
  };
}

/**
 * Creates a parser that reads a string of at least one character until it
 * encounters one of the given characters, optionally accepting the end of the
 * input as a valid stopping point.
 *
 * @param stop - the list of characaters that will end the string
 * @param end - if `true` will accept the end of enput as a valid stopping
 * point
 *
 * This will _not_ successfully parse an empty string.
 *
 * `stop` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function read1To(stop: string, end?: true): IParser<string> {
  const op = readTo(stop, end);
  return {
    parse(s: string, p: number, resin?: Success<string>) {
      resin = resin || ['', 0];
      const res = op.parse(s, p, resin);
      if (!res.length) return res;
      else if (res[1] > p) return res;
      else return fail(p, detailedFail && `expected at least one character`);
    }
  }
}

export function readToDyn(state: { stop: string }, end?: true): IParser<string> {
  return {
    parse(s: string, p: number, res?: Success<string>) {
      res = res || ['', 0];
      const skipped = seekUntilChar(s, p, state.stop, getSearch(state.stop, false));
      if (!end && skipped >= s.length) return fail(skipped - 1, detailedFail && `expected one of '${state.stop}' before end of input`);
      res[0] = skipped ? s.substring(p, skipped) : '';
      res[1] = skipped;
      return res;
    }
  };
}

export function read1ToDyn(state: { stop: string }, end?: true): IParser<string> {
  const op = readToDyn(state, end);
  return {
    parse(s: string, p: number, res?: Success<string>) {
      const r = op.parse(s, p, res);
      if (!r.length) return r;
      else if (r[0].length < 1) return fail(p, detailedFail && `expected at least one characater`);
      else return res;
    }
  }
}

export function peek(count: number): IParser<string> {
  return {
    parse(s: string, p: number, res?: Success<string>) {
      const r = s.substr(p, count);
      if (r.length === count) {
        res = res || ['', 0];
        res[0] = r;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail && `unexpected end of input`);
    }
  }
}
