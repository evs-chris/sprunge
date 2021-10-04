import { getSearch, SearchFn } from '../search';
import { IParser, Success, fail, detailedFail, shared, NodeName } from '../base';

/**
 * Returns a sorted unique list of characters from the input list.
 *
 * @param chars - the list of characters to sort and ensure are unique
 */
export function charList(chars: string): string {
  let res = '';
  const sorted = chars.split('').sort().join('');
  for (let i = 0; i < sorted.length; i++) {
    if (!~res.indexOf(sorted[i])) res += sorted[i];
  }
  return res;
}

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
  const sorted = charList(chars);
  const contains = getSearch(sorted);
  return {
    parse(s: string, p: number, res: Success<''>) {
      res[1] = seekWhileChar(s, p, sorted, contains);
      return res;
    }
  };
}

shared.skip = skip;

/**
 * Creates a parser that skips the given characters case insensitively.
 *
 * @param chars - the characters to skip
 *
 * This will successfully skip 0 character.
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function iskip(chars: string, name?: NodeName): IParser<''> {
  return skip(chars.toUpperCase() + chars.toLowerCase());
}

/**
 * Creates a parser that skips at least one of the given characters.
 *
 * @param chars - the charaters to skip
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function skip1(chars: string, name?: NodeName): IParser<''> {
  const sorted = charList(chars);
  const contains = getSearch(sorted);
  return {
    parse(s: string, p: number, res: Success<''>) {
      res[1] = seekWhileChar(s, p, sorted, contains);
      if (res[1] === p) return fail(p, detailedFail & 1 && `expected at least one of ${JSON.stringify(chars)}`, name);
      return res;
    }
  };
}

/**
 * Creates a parser that skips at least one of the given characters case insensitively.
 *
 * @param chars - the charaters to skip
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function iskip1(chars: string, name?: NodeName): IParser<''> {
  return skip1(chars.toUpperCase() + chars.toLowerCase(), name);
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
  const sorted = charList(chars);
  const contains = getSearch(sorted);
  return {
    parse(s: string, p: number, res: Success<string>) {
      const r = seekWhileChar(s, p, sorted, contains);
      res[0] = s.substring(p, r);
      res[1] = r;
      return res;
    }
  }
}

/**
 * Creates a parser that reads a string consisting of the given characters case insensitively.
 *
 * @param chars - the characters to read
 *
 * This will successfully read an empty string.
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function iread(chars: string): IParser<string> {
  return read(chars.toUpperCase() + chars.toLowerCase());
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
export function read1(chars: string, name?: NodeName): IParser<string> {
  const sorted = charList(chars);
  const contains = getSearch(sorted);
  return {
    parse(s: string, p: number, res: Success<string>) {
      const r = seekWhileChar(s, p, sorted, contains);
      if (r === p) return fail(p, detailedFail & 1 && `expected one of ${JSON.stringify(chars)}`, name);
      res[0] = s.substring(p, r);
      res[1] = r;
      return res;
    }
  };
}

/**
 * Creates a parser that reads a string consisting of at least one of the given
 * characters case insensitively.
 *
 * @param chars - the characters to read
 *
 * This will not successfully read an empty string.
 *
 * `chars` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function iread1(chars: string, name?: NodeName): IParser<string> {
  return read1(chars.toUpperCase() + chars.toLowerCase(), name);
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
export function chars(count: number, allowed?: string, name?: NodeName): IParser<string> {
  const sorted = allowed && charList(allowed);
  const search = getSearch(sorted || '');
  return {
    parse(s: string, p: number, res: Success<string>) {
      if (s.length - p >= count) {
        const str = s.substr(p, count);
        if (sorted) {
          for (let i = 0; i < count; i++) if (!search(sorted, str[i])) return fail(p + i, detailedFail & 1 && 'unexpected char', name);
        }
        res[0] = str;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail & 1 && 'unexpected end of input', name);
    }
  };
}

/**
 * Creates a parser that reads a string of a fixed length, optionally from a
 * specific set of allowed characters case insensitively.
 *
 * @param count - the number of characters to read
 * @param allowed - an optional list of characters that the parsed string must
 * match
 *
 * `allowed` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function ichars(count: number, allowed?: string, name?: NodeName): IParser<string> {
  return chars(count, allowed && allowed.toUpperCase() + allowed.toLowerCase(), name);
}

/**
 * Creates a parser that reads a string of a fixed length, excluding a
 * specific set of characters.
 *
 * @param count - the number of characters to read
 * @param disallowed - a list of characters that the parsed string must not match
 *
 * `disallowed` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function notchars(count: number, disallowed: string, name?: NodeName): IParser<string> {
  const sorted = charList(disallowed);
  const search = getSearch(sorted);
  return {
    parse(s: string, p: number, res: Success<string>) {
      if (s.length - p >= count) {
        const str = s.substr(p, count);
        for (let i = 0; i < count; i++) if (search(sorted, str[i])) return fail(p + i, detailedFail & 1 && 'unexpected char', name);
        res[0] = str;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail & 1 && 'unexpected end of input', name);
    }
  };
}

/**
 * Creates a parser that reads a string of a fixed length, excluding a
 * specific set of characters case insensitively.
 *
 * @param count - the number of characters to read
 * @param disallowed - a list of characters that the parsed string must not match
 *
 * `disallowed` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function notichars(count: number, disallowed: string, name?: NodeName): IParser<string> {
  return notchars(count, disallowed.toUpperCase() + disallowed.toLowerCase(), name);
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
export function readTo(stop: string, end?: true, name?: NodeName): IParser<string> {
  const sorted = charList(stop);
  const contains = getSearch(sorted);
  return {
    parse(s: string, p: number, res: Success<string>) {
      const skipped = seekUntilChar(s, p, sorted, contains);
      if (!end && skipped >= s.length) return fail(skipped - 1, detailedFail & 1 && `expected one of ${JSON.stringify(stop)} before end of input`, name);
      res[0] = skipped ? s.substring(p, skipped) : '';
      res[1] = skipped;
      return res;
    }
  };
}

/**
 * Creates a parser that reads a string until it encounters one of the given
 * characters case insensitively, optionally accepting the end of the input as 
 * a valid stopping point.
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
export function ireadTo(stop: string, end?: true, name?: NodeName): IParser<string> {
  return readTo(stop.toUpperCase() + stop.toLowerCase(), end, name);
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
export function read1To(stop: string, end?: true, name?: NodeName): IParser<string> {
  const op = readTo(stop, end);
  return {
    parse(s: string, p: number, resin: Success<string>) {
      const res = op.parse(s, p, resin);
      if (!res.length) return res;
      else if (res[1] > p) return res;
      else return fail(p, detailedFail & 1 && `expected at least one character`, name);
    }
  }
}

/**
 * Creates a parser that reads a string of at least one character until it
 * encounters one of the given characters case insensitively, optionally accepting
 * the end of the input as a valid stopping point.
 *
 * @param stop - the list of characaters that will end the string
 * @param end - if `true` will accept the end of input as a valid stopping
 * point
 *
 * This will _not_ successfully parse an empty string.
 *
 * `stop` will be sorted for use in the returned parser to work with a
 * somewhat faster binary search.
 */
export function iread1To(stop: string, end?: true, name?: NodeName): IParser<string> {
  return read1To(stop.toUpperCase() + stop.toLowerCase(), end, name);
}

/**
 * Creates a parser that reads a string until of encounters one of the given characters.
 * The string of stop characters may change from parse to parse. This can also
 * optionally accept the end of input as a valid stopping point.
 *
 * @param state - an object with the list of characters that will end the string
 * @param end - if `true` will accept the end of input as a valid stopping point
 *
 * This will successfully parse an empty string.
 */
export function readToDyn(state: { stop: string }, end?: true, name?: NodeName): IParser<string> {
  return {
    parse(s: string, p: number, res: Success<string>) {
      const skipped = seekUntilChar(s, p, state.stop, getSearch(state.stop, false));
      if (!end && skipped >= s.length) return fail(skipped - 1, detailedFail & 1 && `expected one of '${JSON.stringify(state.stop)}' before end of input`, name);
      res[0] = skipped ? s.substring(p, skipped) : '';
      res[1] = skipped;
      return res;
    }
  };
}

/**
 * Creates a parser that reads a string of at least one character until encounters
 * one of the given characters.  The string of stop characters may change from parse
 * to parse. This can also optionally accept the end of input as a valid stopping point.
 *
 * @param state - an object with the list of characters that will end the string
 * @param end - if `true` will accept the end of input as a valid stopping point
 *
 * This will _not_ successfully parse an empty string.
 */
export function read1ToDyn(state: { stop: string }, end?: true, name?: NodeName): IParser<string> {
  const op = readToDyn(state, end);
  return {
    parse(s: string, p: number, res: Success<string>) {
      const r = op.parse(s, p, res);
      if (!r.length) return r;
      else if (r[0].length < 1) return fail(p, detailedFail & 1 && `expected at least one characater`, name);
      else return res;
    }
  }
}

/**
 * Creates a parser that reads the next `count` characters from input or fails.
 * This will not advance the position within the input.
 *
 * @param count - the number of characters to read
 */
export function peek(count: number, name?: NodeName): IParser<string> {
  return {
    parse(s: string, p: number, res: Success<string>) {
      const r = s.substr(p, count);
      if (r.length === count) {
        res[0] = r;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail & 1 && `unexpected end of input`, name);
    }
  }
}
