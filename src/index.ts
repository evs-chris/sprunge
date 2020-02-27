/**
 * A parser result, which can be either a success or a failure
 */
export type Result<T> = Success<T>|Failure;
/**
 * A successful parse result, which is the result and the number of characters
 * consumed in producing the result in a tuple.
 */
export type Success<T> = [T, number, Cause?];
/**
 * A failure cause, used to convey failures that happened in a nested parser.
 * This is a tuple of the position in the input and an error message. These
 * should only be produced when `detailedErrors()` returns `true`.
 */
export type Cause = [number, string, Cause?, Cause[]?];

/**
 * Failure is signified by an empty array, but you should only ever return
 * Fail and not a new empty array.
 */
export type Failure = [];

// The canonical failure
const Fail: Failure = [];
let detailedFail: 1|2 = 1;
/**
 * Controls whether or not detailed error messages should be produced. It can
 * also be used for new combinators to be slightly more performant by not
 * generating error messages if a call without an argument returns `false`.
 *
 * @param on - true if detailed errors should be enabled
 */
export function detailedErrors(on?: boolean): boolean {
  return on === (undefined ? detailedFail : (detailedFail = on ? 2 : 1) === 2);
}

const _cause: Cause = [0, ''];

/**
 * Returns the shared cause for the last failure. This _will_ change at the
 * next fail().
 */
export function getCause(): Cause { return _cause; }
/**
 * Returns a copy of the shared cause for the last failure. This is safe
 * to hold on to for as long as you need, and should probably be gated
 * behind a check for detailedErrors().
 */
export function getCauseCopy(): Cause { return _cause.slice() as Cause; }

/**
 * Generates a failure by updating the canonical failure instance with the
 * given parameters. Message may be false, so you can skip producing detailed
 * messages with something like `fail(p, detailedErrors() && `expensive`)`
 *
 * @param pos - the index of the failure within the input string
 * @param message - the optional failure message
 * @param causes - an optional array of inner causes
 */
export function fail(pos: number, message: false|string, cause?: Cause, causes?: Cause[]): Failure {
  _cause[0] = pos;
  _cause[1] = message || '';
  _cause[2] = cause;
  _cause[3] = causes;
  return Fail;
}

/**
 * Check to see if the result is the canonical failure instance
 *
 * @param result - the result to check
 */
export function isFailure<T>(result: Result<T>): result is Failure {
  return result === Fail;
}

/**
 * The base parser interface that is consumed/produced by creators/combinators.
 */
export interface IParser<T> {
  /**
   * Parse input from position and return a Success or Failure
   *
   * @param input - the string to parse
   * @param position - the current position of parsing in the string
   */
  parse(input: string, position: number): Result<T>;
}

/**
 * Some parsers have cyclic references with themselves and/or other parsers,
 * and as such need to be able to be created after they exist. To accomplish
 * that, you can declare a lazy parser, which is just an object that has a
 * parser ref. Generally, combinators should accept a LazyParser rather than a
 * Parser. This makes building combinators slightly uncomfortable in TS
 * because you have to unwrap any passed in parsers, and to do so without
 * introducing extra overhead, something like
 * `((parser as any).parser || parser) as Parser<T>` is easy if not pretty.
 *
 * The `unwrap` method is provided as a convenience for safely unwrapping a
 * lazy parser.
 */
export type Parser<T> = IParser<T>|{ parser?: IParser<T> };

/**
 * A parse error produced by a ParseFn.
 */
export interface ParseError {
  /** The message produced by the parser that errored. */
  message: string;
  /** The position in the input string at which the error occurred. */
  position: number;
  /** The line number in the input string at which the error occurred. */
  line: number;
  /** The column within the line in the input string at which the error occurred. */
  column: number;
  /** The line within the input string in which the error occurred. */
  source: string;
  /** The lines surrounding the line within the input string in which the error occurred. */
  context: string[];
  /** A formatted string with a carat pointing at the location of the error within its context. */
  marked: string;
  /** A downstream cause. */
  cause?: ParseError;
  /** A list of upstream causes. */
  causes?: ParseError[];
}

/**
 * A wrapped parser that is produced by the parse function. This will return
 * either a successfully parsed result or an error. Depending on the error
 * options, it may also throw or produce detailed errors (much more slowly).
 */
export type ParseFn<T> = (input: string, error?: ErrorOptions) => T|ParseError;

/**
 * Options for controlling how errors are produced by a ParseFn.
 */
export interface ErrorOptions {
  /* The number of lines surrounding an error line that should be included in errors. This defaults to 0, and setting it to a number greater than 0 will produce up to 2x + 1 the number of lines, as it applies to lines both above and below the source line. */
  contextLines?: number;
  /* Turns on detailed errors for this parser or parse run. */
  detailed?: boolean;
  /* Throws an error rather than returning a ParseError. */
  throw?: boolean;
  /* Produces an error if all of the input is not consumed during parsing. */
  consumeAll?: boolean;
}

/**
 * Counts the number of lines that occur before pos.
 *
 * @param input
 * @param pos
 */
export function getLineNum(input: string, pos: number): number {
  let n = 1;
  while (~(pos = input.lastIndexOf('\n', pos))) { n++; pos-- };
  return n;
}

/**
 * Converts a cause into a ParseError using the original input.
 *
 * @param cause - the cause to base the error on
 * @param input - the original parser input
 * @param context - the number of lines around the error to include in the
 * ParseError.
 */
export function getParseError(cause: Cause, input: string, context: number): ParseError {
  const lines: string[] = [];
  const pos = cause[0];
  let n = pos;
  let first = n = input.lastIndexOf('\n', n);
  let t = input.lastIndexOf('\n', n - 1);
  for (let i = 0; i < context && ~n; i++) {
    lines.unshift(input.substring(t + 1, n));
    n = t;
    t = input.lastIndexOf('\n', n - 1);
  }
  const markerOffset = lines.length + 1;
  t = first;
  n = input.indexOf('\n', t + 1);
  if (n === -1 && t < input.length) n = input.length;
  for (let i = 0; i <= context && ~n; i++) {
    lines.push(input.substring(t + 1, n));
    t = n;
    n = input.indexOf('\n', t + 1);
    if (n === -1 && t < input.length) n = input.length;
  }

  const source = lines[markerOffset - 1];

  let marker = '';
  const len = pos - (!~first ? -2 : first) - 1;
  for (let i = 0; i < len; i++) marker += source[i] === '\t' ? '\t' : ' ';
  marker += '^--';

  return {
    context: lines,
    column: pos - first,
    line: getLineNum(input, pos),
    position: pos,
    source,
    message: cause[1],
    marked: `${lines.slice(0, markerOffset).join('\n')}\n${marker}\n${lines.slice(markerOffset).join('\n')}`,
    cause: cause[2] && getParseError(cause[2], input, context),
    causes: cause[3] && cause[3].map(c => getParseError(c, input, context))
  };
}

/**
 * Wraps a parser in a ParseFn.
 *
 * @param parser - the base parser to wrap
 * @param error - default ErrorOptions for the returned ParseFn
 */
export function parser<T>(parser: Parser<T>, error?: ErrorOptions): ParseFn<T> {
  let mps: IParser<T>;
  const oerror = error;
  const det = (error && 'detailed' in error) ? error.detailed === true ? 2 : 1 : 0;
  const consume = error && error.consumeAll;
  return function parse(input: string, error?: ErrorOptions) {
    let res: Result<T>;

    const d = (error && 'detailed' in error) ? (error.detailed ? 2 : 1) : det;
    if (d && d !== detailedFail) {
      const c = detailedFail;
      detailedFail = d;
      res = (mps || (mps = unwrap(parser))).parse(input, 0);
      detailedFail = c;
    } else {
      res = (mps || (mps = unwrap(parser))).parse(input, 0);
    }

    if ((error && 'consumeAll' in error ? error.consumeAll : consume) && res[1] < input.length) {
      res = fail(res[1], detailedFail & 2 && `expected to consume all input, but only ${res[1]} chars consumed`);
    }

    if (isFailure(res)) {
      const err = getParseError(getCause(), input, (error && 'contextLines' in error ? error.contextLines : oerror && oerror.contextLines) || 0);
      if (error && 'throw' in error ? error.throw : oerror && oerror.throw) {
        const ex = new Error(err.message);
        throw Object.assign(ex, err);
      } else return err;
    } else return res[0];
  }
}

/**
 * A parser that always fails. This is used by parsers that can wrap lazy
 * parsers when the lazy parsers are unitialized at first call.
 */
export const uninit: any = { parse: (_s: String, p: number) => fail(p, detailedFail & 2 && 'uninitialized lazy parser') };

/**
 * Unwraps a lazy parser or returns an immediately failing parser in case the
 * lazy parser is not yet initialized.
 */
export function unwrap<T>(parser: Parser<T>): IParser<T> {
  return (((parser as any).parser || parser) as IParser<T>) || uninit;
}

/**
 * Searches for x in str
 *
 * @param str - a sorted haystack
 * @param x - a needle
 *
 * Does a search for x in str using the most appropriate method based
 * on the length of str.
 */
export function contains(str: string, x: string): boolean { 
  let start = 0, end = str.length - 1; 
  if (end < 4) {
    if (end === 0) return str === x;
    else if (end === 1) return str[0] === x || str[1] === x;
    else if (end === 2) return str[0] === x || str[1] === x || str[2] === x;
    else if (end === 3) return str[0] === x || str[1] === x || str[2] === x || str[3] === x;
    else return false;
  } else if (end > 80) {
    let mid: number;
    let c: string;

    while (start <= end) { 
      mid = (start + end) >> 1; 
      c = str[mid];

      if (c === x) return true; 
      else if (c < x) start = mid + 1; 
      else end = mid - 1; 
    }
  } else {
    for (let i = 0; i <= end; i++) if (str[i] === x) return true;
  }

  return false; 
} 

/**
 * Seeks through the input until a character within chars is encountered.
 *
 * @param s - the input to search
 * @param p - the index within `s` from which to start
 * @param chars - a sorted string of characters to search for
 */
export function seekUntilChar(s: string, p: number, chars: string): number {
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
export function seekWhileChar(s: string, p: number, chars: string): number {
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
const skipRes: Success<''> = ['', 0];
export function skip(chars: string): IParser<''> {
  const sorted = chars.split('').sort().join('');
  return {
    parse(s: string, p: number) {
      skipRes[1] = seekWhileChar(s, p, sorted);
      return skipRes;
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
  const res: Success<string> = ['', 0];
  return {
    parse(s: string, p: number) {
      const r = seekWhileChar(s, p, sorted);
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
  const res: Success<string> = ['', 0];
  return {
    parse(s: string, p: number) {
      const r = seekWhileChar(s, p, sorted);
      if (r === p) return fail(p, detailedFail & 2 && `expected one of ${chars}`);
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
  const res: Success<string> = ['', 0];
  return {
    parse(s: string, p: number) {
      if (s.length - p >= count) {
        const str = s.substr(p, count);
        if (sorted) {
          for (let i = 0; i < count; i++) if (!contains(sorted, str[i])) return fail(p + i, detailedFail & 2 && 'unexpected char');
        }
        res[0] = str;
        res[1] = p + count;
        return res;
      } else return fail(p, detailedFail & 2 && 'unexpected end of input');
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
  const res: Success<string> = ['', 0];
  return {
    parse(s: string, p: number) {
      const skipped = seekUntilChar(s, p, sorted);
      if (!end && skipped >= s.length) return fail(p, detailedFail & 2 && `expected one of '${stop}' before end of input`);
      res[0] = s.substring(p, skipped);
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
  const sorted = stop.split('').sort().join('');
  const res: Success<string> = ['', 0];
  return {
    parse(s: string, p: number) {
      const skipped = seekUntilChar(s, p, sorted);
      if (skipped <= p) return fail(p, detailedFail & 2 && 'expected at least one character');
      if (!end && skipped >= s.length) return fail(p, detailedFail & 2 && `expected one of '${stop}' before end of input`);
      res[0] = s.substring(p, skipped);
      res[1] = skipped;
      return res;
    }
  }
}

/**
 * Creates a parser that applies the given parsers until one succeeds.
 *
 * @param parsers - the list of parsers to apply to the input
 */
export function alt<T>(...parsers: Array<Parser<T>>): IParser<T>;
/**
 * Creates a parser that applies the given parsers until one succeeds.
 *
 * @param name - the name to use for detailed error messages
 * @param parsers - the list of parsers to apply to the input
 */
export function alt<T>(name: string, ...parsers: Array<Parser<T>>): IParser<T>;
/**
 * The underlying implementation for `alt(name, ...)` and `alt(...)`.
 */
export function alt<T>(name?: string|Parser<T>, ...parsers: Array<Parser<T>>): IParser<T> {
  const nm = typeof name === 'string' ? name : 'alternate';
  const lps: Array<Parser<T>> = typeof name === 'string' ? parsers : (name ? [name] : []).concat(parsers);
  let mps: Array<IParser<T>>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = lps.map(p => unwrap(p)));
      let fails: Cause[];
      const len = ps.length;
      for (let i = 0; i < len; i++) {
        const parser = ps[i];
        const res = parser.parse(s, p);
        if (!isFailure(res)) return res;
        else if (detailedFail & 2) (fails || (fails = [])).push(getCauseCopy());
      }
      if (detailedFail & 2) {
        const cause = getLatestCause(fails, [p, `expected ${nm}`]);
        return fail(cause[0], cause[1], cause[2], cause[3]);
      } else return fail(p, false);
    }
  };
}

/**
 * Returns a cause that is composed of the cause furthest into the
 * input.
 *
 * @param causes - the causes to check
 * @param outer - the immediate cause
 */
export function getLatestCause(causes: Cause[], outer: Cause): Cause {
  let max = outer[0];
  outer[3] = causes;
  let f: Cause;
  const cs = causes || [];
  for (let i = 0; i < cs.length; i++) {
    if (cs[i][0] > max) {
      f = cs[i];
      max = f[0];
    }
  }
  if (f) return [f[0], f[1], outer];
  else return outer;
}

/**
 * Creates a parser that applies the given parser until it fails, producing
 * an array of results.
 *
 * @param parser - the parser to apply
 *
 * This will successfully parse an empty array.
 */
export function rep<T>(parser: Parser<T>): IParser<T[]> {
  let mps: IParser<T>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = unwrap(parser));
      const seq: T[] = [];
      let c = p;
      let res: Result<T>;
      while (1) {
        res = ps.parse(s, c);
        if (!isFailure(res)) {
          seq.push(res[0]);
          c = res[1];
        } else {
          return [seq, c, detailedFail & 2 && getCauseCopy()];
        }
      }
    }
  };
}

/**
 * Creates a parser that applies the given parser at least once until it fails,
 * producing an array of results.
 *
 * @param parser - the parser to apply
 *
 * This will _not_ successfully parse an empty array.
 */
export function rep1<T>(parser: Parser<T>, name?: string): IParser<T[]> {
  let mps: IParser<T>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = unwrap(parser));
      const seq: T[] = [];
      let c = p;
      let res: Result<T>;
      while (1) {
        res = ps.parse(s, c);
        if (!isFailure(res)) {
          seq.push(res[0]);
          c = res[1];
        } else {
          return seq.length > 0 ? [seq, c, detailedFail & 2 && getCauseCopy()] : fail(c, detailedFail & 2 && `expected at least one ${name || 'item'}`, detailedFail & 2 && getCauseCopy());
        }
      }
    }
  };
}

/**
 * Creates a parser that reads one of the given strings.
 *
 * @param strings - the list of strings to match
 */
export function str(...strings: string[]): IParser<string> {
  const len = strings.length;
  const res: Success<string> = ['', 0];
  if (len === 1) {
    const str = strings[0];
    const len = str.length;

    if (len === 1) {
      return {
        parse(s: string, p: number) {
          if (s[p] === str) {
            res[0] = str;
            res[1] = p + 1;
            return res;
          } else return fail(p, detailedFail & 2 && `expected '${str}'`);
        }
      }
    } else {
      let i: number, j: number;
      return {
        parse(s: string, p: number) {
          for (i = 0, j = p + i; i < len; i++, j++) {
            if (str[i] !== s[j]) return fail(p, detailedFail & 2 && `expected '${str}'`);
          }
          res[0] = str;
          res[1] = p + len;
          return res;
        }
      }
    }
  } else {
    return {
      parse(s: string, p: number) {
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
          res[0] = n;
          res[1] = p + nlen;
          return res;
        }
        return fail(p, detailedFail & 2 && `expected ${strings.length > 1 ? 'one of ' : ''}${strings.map(s => `'${s}'`).join(', ')}`);
      }
    };
  }
}

/**
 * Creates a parser using the given parser that always succeeds, returning
 * the result if the given parser succeeds or `null` if it doesn't.
 *
 * @param parser - the parser to apply to the input
 */
export function opt<T>(parser: Parser<T>): IParser<null|T> {
  let mps: IParser<T>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = unwrap(parser));
      const res = ps.parse(s, p);
      if (!isFailure(res)) return res;
      else return [null, p];
    }
  };
}

/**
 * Creates a parser that applies the two given parsers interleaved until one
 * fails, optionally allowing, disallowing, or requiring a trailing separator.
 *
 * @param parser - the primary parser to apply
 * @param sep - the separator parser to apply
 *
 * This will successfully parse an empty array.
 */
export function repsep<T>(parser: Parser<T>, sep: Parser<any>, trail: 'allow'|'disallow'|'require' = 'disallow'): IParser<T[]> {
  let mps1: IParser<T>;
  let mps2: IParser<any>;
  return {
    parse(s: string, p: number) {
      const ps1 = mps1 || (mps1 = unwrap(parser));
      const ps2 = mps2 || (mps2 = unwrap(sep));
      const seq: T[] = [];
      let c = p;
      while (1) {
        const res = ps1.parse(s, c);
        if (!isFailure(res)) {
          seq.push(res[0]);
          c = res[1];
          const r = ps2.parse(s, c);
          if (isFailure(r)) {
            if (trail === 'require') return fail(c, detailedFail & 2 && `expected separator`);
            break;
          } else c = r[1];
        } else if (trail === 'disallow' && seq.length) {
          if (detailedFail & 2) return fail(_cause[0], _cause[1], [c, `unexpected separator`]);
          else return fail(c, false);
        } else break;
      }
      return [seq, c, detailedFail & 2 && getCauseCopy()];
    }
  };
}

/**
 * Creates a parser that applies the two given parsers interleaved at least
 * once until one fails, optionally allowing, disallowing, or requiring a
 * trailing separator.
 *
 * @param parser - the primary parser to apply
 * @param sep - the separator parser to apply
 *
 * This will _not_ successfully parse an empty array.
 */
export function rep1sep<T>(parser: Parser<T>, sep: Parser<any>, name?: string, trail: 'allow'|'disallow'|'require' = 'disallow'): IParser<T[]> {
  let mps1: IParser<T>;
  let mps2: IParser<any>;
  return {
    parse(s: string, p: number) {
      const ps1 = mps1 || (mps1 = unwrap(parser));
      const ps2 = mps2 || (mps2 = unwrap(sep));
      const seq: T[] = [];
      let c = p;
      let res: Result<T>;
      while (1) {
        res = ps1.parse(s, c);
        if (!isFailure(res)) {
          seq.push(res[0]);
          c = res[1];
          const r = ps2.parse(s, c);
          if (isFailure(r)) {
            if (trail === 'require') return fail(c, detailedFail & 2 && `expected separator`);
            break;
          } else c = r[1];
        } else if (trail === 'disallow' && seq.length) {
          if (detailedFail & 2) return fail(_cause[0], _cause[1], [c, `unexpected separator`]);
          else return fail(c, false);
        } else break;
      }
      return seq.length > 0 ? [seq, c, detailedFail & 2 && getCauseCopy()] : fail(isFailure(res) ? _cause[0] : c, detailedFail & 2 && `expected at least one ${name || 'item'}${isFailure(res) ? `: ${_cause[1]}` : ''}`, detailedFail & 2 && getCauseCopy());
    }
  };
}

/**
 * Creates a parser that applies the given parser and then if successful,
 * applies the parser returned from the given match function that is called
 * with the result of the initial parser.
 *
 * @param parser - the initial parser to apply
 * @param match - the matcher function applied to the result of the first
 */
export function chain<T, U>(parser: Parser<T>, select: (t: T) => IParser<U>): IParser<U> {
  let mps: IParser<T>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = unwrap(parser));
      let c = p;
      const r = ps.parse(s, c);
      if (isFailure(r)) return r;
      c = r[1];
      const n = select(r[0]);
      return n.parse(s, c);
    }
  };
}

/**
 * Creates a parser that applies the given parser and then applies the given
 * transform if the parse was successful.
 *
 * @param parser - the parser to apply
 * @param fn - the transformer to apply to the result
 */
export function map<T, U>(parser: Parser<T>, fn: (t: T) => U): IParser<U> {
  let mps: IParser<T>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = unwrap(parser));
      const r = ps.parse(s, p);
      if (!isFailure(r)) {
        (r as unknown[])[0] = fn(r[0]);
        return r as any;
      } else return r;
    }
  };
}

/**
 * Creates a parser that parses bracketed content, ignoring the brackets in
 * the result.
 *
 * @param left - the left bracket parser
 * @param content - the primary content parser
 * @param right - the right bracket parser
 */
export function bracket<T>(left: Parser<any>, content: Parser<T>, right: Parser<any>): IParser<T> {
  const o = seq(left, content, right);
  return {
    parse(s: string, p: number) {
      const r = o.parse(s, p);
      if (isFailure(r)) return r;
      else return [r[0][1], r[1]];
    }
  }
}

// this is a whole ball of meh

/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B>(p1: Parser<A>, p2: Parser<B>): IParser<[A, B]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>): IParser<[A, B, C]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>): IParser<[A, B, C, D]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>): IParser<[A, B, C, D, E]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>): IParser<[A, B, C, D, E, F]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>): IParser<[A, B, C, D, E, F, G]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>): IParser<[A, B, C, D, E, F, G, H]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>): IParser<[A, B, C, C, E, F, G, H, I]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I, J>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>, p10: Parser<J>): IParser<[A, B, C, D, E, F, G, H, I, J]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I, J, K>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>, p10: Parser<J>, p11: Parser<K>): IParser<[A, B, C, D, E, F, G, H, I, J, K]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I, J, K, L>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>, p10: Parser<J>, p11: Parser<K>, p12: Parser<L>): IParser<[A, B, C, D, E, F, G, H, I, J, K, L]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I, J, K, L, M>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>, p10: Parser<J>, p11: Parser<K>, p12: Parser<L>, p13: Parser<M>): IParser<[A, B, C, D, E, F, G, H, I, J, K, L, M]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>, p10: Parser<J>, p11: Parser<K>, p12: Parser<L>, p13: Parser<M>, p14: Parser<N>): IParser<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>;
/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(p1: Parser<A>, p2: Parser<B>, p3: Parser<C>, p4: Parser<D>, p5: Parser<E>, p6: Parser<F>, p7: Parser<G>, p8: Parser<H>, p9: Parser<I>, p10: Parser<J>, p11: Parser<K>, p12: Parser<L>, p13: Parser<M>, p14: Parser<N>, p15: Parser<O>): IParser<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>;
/**
 * The underlying implementation for the various arities of `seq`.
 */
export function seq(...parsers: Array<Parser<any>>): IParser<any[]> {
  let mps: Array<IParser<any>>;
  return {
    parse(s: string, p: number) {
      const ps = mps || (mps = parsers.map(unwrap));
      const res: any[] = [];
      let c = p;
      let causes: Cause[];
      const len = ps.length;
      for (let i = 0; i < len; i++) {
        const lps = ps[i];
        const r = lps.parse(s, c);
        if (isFailure(r)) {
          if (detailedFail & 2) {
            const cause = getLatestCause(causes, getCauseCopy());
            return fail(cause[0], cause[1], cause[2], cause[3]);
          } else return r;
        } else {
          if (r[2] && detailedFail & 2) (causes || (causes = [])).push(r[2]);
          res.push(r[0]);
          c = r[1];
        }
      }
      return [res, c];
    }
  };
}