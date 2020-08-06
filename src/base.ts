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
export const Fail: Failure = [];
export let detailedFail = false;
/**
 * Controls whether or not detailed error messages should be produced. It can
 * also be used for new combinators to be slightly more performant by not
 * generating error messages if a call without an argument returns `false`.
 *
 * @param on - true if detailed errors should be enabled
 */
export function detailedErrors(on?: boolean): boolean {
  return on === (undefined ? detailedFail : (detailedFail = on) === true);
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
 * Add a cause to the last failure.
 *
 * @param cause - the cause to add
 */
export function addCause(cause: Cause) {
  (_cause[3] || (_cause[3] = [])).push(cause);
}

/**
 * Check to see if the result is the canonical failure instance
 *
 * @param result - the result to check
 */
export function isFailure<T>(result: Result<T>): result is Failure {
  return !result.length;
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
  parse(input: string, position: number, result?: Success<T>): Result<T>;
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
  line?: number;
  /** The column within the line in the input string at which the error occurred. */
  column?: number;
  /** The line within the input string in which the error occurred. */
  source?: string;
  /** The lines surrounding the line within the input string in which the error occurred. */
  context?: string[];
  /** A formatted string with a carat pointing at the location of the error within its context. */
  marked?: string;
  /** A downstream cause. */
  cause?: ParseError;
  /** A list of upstream causes. */
  causes?: ParseError[];
  /** The farthest processed cause. */
  latest?: ParseError;
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
    causes: cause[3] && cause[3].map(c => getParseError(c, input, context)),
  };
}

/**
 * Recursively searches for the latest cause in a tree.
 *
 * @param cause - the starting cause
 */
export function findLatestCause(cause: Cause): Cause {
  let res: Cause = cause;
  if (cause[2]) {
    const c = findLatestCause(cause[2]);
    if (c[0] > res[0]) res = c;
  }
  if (cause[3]) {
    for (let i = 0; i < cause[3].length; i++) {
      const c = findLatestCause(cause[3][i]);
      if (c[0] > res[0]) res = c;
    }
  }
  return res;
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
  const det = (error && 'detailed' in error) ? error.detailed : false;
  const consume = error && error.consumeAll;
  return function parse(input: string, error?: ErrorOptions) {
    let res: Result<T> = [null, 0];

    const d = (error && 'detailed' in error) ? error.detailed : det;
    if (d !== detailedFail) {
      const c = detailedFail;
      detailedFail = d;
      res = (mps || (mps = unwrap(parser))).parse(input, 0, res);
      detailedFail = c;
    } else {
      res = (mps || (mps = unwrap(parser))).parse(input, 0, res);
    }

    if (res.length && (error && 'consumeAll' in error ? error.consumeAll : consume) && res[1] < input.length) {
      res = fail(res[1], d && `expected to consume all input, but only ${res[1]} chars consumed`);
    }

    if (!res.length) {
      const cause = getCause();
      const ctx = (error && 'contextLines' in error ? error.contextLines : oerror && oerror.contextLines) || 0;
      const err = getParseError(getLatestCause(cause[3] || [], cause), input, ctx);
      const latest = findLatestCause(cause);
      if (cause !== latest) err.latest = getParseError(latest, input, ctx);
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
export const uninit: any = { parse: (_s: String, p: number) => fail(p, detailedFail && 'uninitialized lazy parser') };

/**
 * Unwraps a lazy parser or returns an immediately failing parser in case the
 * lazy parser is not yet initialized.
 */
export function unwrap<T>(parser: Parser<T>): IParser<T> {
  return (((parser as any).parser || parser) as IParser<T>) || uninit;
}

export function concat(strings: string[]): string {
  let res = '';
  const len = strings.length;
  for (let i = 0; i < len; i++) {
    if (strings[i]) res = res.concat(strings[i]);
  }
  return res;
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