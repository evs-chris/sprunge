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
export type Cause = [number, string, string?, Cause?, Cause[]?];

/**
 * Failure is signified by an empty array, but you should only ever return
 * Fail and not a new empty array.
 */
export type Failure = [];

// The canonical failure
export const Fail: Failure = [];
export type DetailedFail = 0|1|2|3;
export let detailedFail: DetailedFail = 0;
/**
 * Controls whether or not detailed error messages should be produced. It can
 * also be used for new combinators to be slightly more performant by not
 * generating error messages if a call without an argument returns `false`.
 *
 * @param on - true if detailed errors should be enabled
 */
export function detailedErrors(on?: DetailedFail): DetailedFail {
  return on === undefined ? detailedFail : (detailedFail = on);
}

const _cause: Cause = [0, ''];
const _latestCause: Cause = [0, ''];

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
export function getCauseCopy(name?: string): Cause {
  suggestCauseName(name);
  return _cause.slice() as Cause; 
}

/**
 * Resets the state of the automatically tracked latest cause.
 */
export function resetLatestCause() {
  _latestCause[0] = 0;
  _latestCause[1] = '';
  _latestCause[2] = undefined;
  _latestCause[3] = undefined;
  _latestCause[4] = undefined;
}

export function suggestCauseName(name?: string) {
  if (!_cause[2] && name) {
    if (_cause[0] === _latestCause[0] && _cause[2] === _latestCause[2]) _latestCause[2] = name;
    _cause[2] = name;
  }
}

export function overrideCauseName(name?: string) {
  if (name) {
    if (_cause[0] === _latestCause[0] && _cause[2] === _latestCause[2]) _latestCause[2] = name;
    _cause[2] = name;
  }
}

/**
 * Generates a failure by updating the canonical failure instance with the
 * given parameters. Message may be false, so you can skip producing detailed
 * messages with something like `fail(p, detailedErrors() && `expensive`)`
 *
 * @param pos - the index of the failure within the input string
 * @param message - the optional failure message
 * @param causes - an optional array of inner causes
 */
export function fail(pos: number, message: false|string, name?: string, cause?: Cause, causes?: Cause[]): Failure {
  _cause[0] = pos;
  _cause[1] = message || '';
  _cause[2] = name;
  _cause[3] = cause;
  _cause[4] = causes;
  if (detailedFail & 1 && _cause[0] >= _latestCause[0]) {
    _latestCause[0] = _cause[0];
    _latestCause[1] = _cause[1];
    _latestCause[2] = _cause[2];
    _latestCause[3] = _cause[3];
    _latestCause[4] = _cause[4];
  }
  return Fail;
}

/**
 * Add a cause to the last failure.
 *
 * @param cause - the cause to add
 */
export function addCause(cause: Cause) {
  (_cause[4] || (_cause[4] = [])).push(cause);
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
 * Check to see if a ParseFn result was an error
 * @param result - the result to check
 */
export function isError<T>(result: T|ParseError): result is ParseError {
  return typeof result === 'object' && typeof (result as any).message === 'string' && typeof (result as any).position === 'number';
}

/**
 * A wrapped parse result that includes each level of parse result returned by
 * a parse tree.
 */
export interface ParseNode {
  /** The optional name of the parser that produced this result. */
  name?: string;
  /** The optional result of the parser. */
  result?: any;
  /** The starting position in the source string for this result. */
  start: number;
  /** The ending position in the source string for this result. */
  end: number;
  /** Any child parser matches that contributed to this result. */
  children: ParseNode[];
}

/**
 * Create a new ParseNode for a parser.
 *
 * @param start - the starting point for the parse
 * @param name - an optional name for the parser
 */
export function openNode(start: number, name?: string): ParseNode {
  return { start, end: start, children: [], name };
}

/**
 * Closes an open parse node. This will set the final result and end values for
 * the node, and add it to its parent.
 *
 * @param node - the node to close
 * @param parent - the parent node to which the node should be added
 * @param result - the result with which to close the node
 */
export function closeNode(node: ParseNode, parent: ParseNode, res: Success<any>) {
  node.end = res[1];
  node.result = res[0];
  parent && parent.children.push(node);
}

/**
 * Find the closest containing parse node path for a position within the source that
 * generated the parse node.
 *
 * @param node - the source node from which to start the search
 * @param pos - the position to find
 */
export function nodeForPosition(node: ParseNode, pos: number, onlyNamed?: true): ParseNode[] {
  const res: ParseNode[] = [];
  let n = node;
  let c: ParseNode;

  while (n) {
    if (n.start <= pos && n.end >= pos && (!onlyNamed || n.name)) res.unshift(n);
    c = null;
    for (let i = 0; i < n.children.length; i++) {
      c = n.children[i];
      if (c.start > pos || c.end < pos) c = null;
      else break;
    }
    n = c;
  }

  return res;
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
   * @param result - a success result to return
   * @param tree - if building a parse tree, the parent node
   */
  parse(input: string, position: number, result: Success<T>, tree?: ParseNode): Result<T>;
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
  /** The name of the parser that registered the error. */
  parser?: string;
}

/**
 * A wrapped parser that is produced by the parse function. This will return
 * either a successfully parsed result or an error. Depending on the parse
 * options, it may also produce a parse node, throw, or produce detailed errors
 * (much more slowly).
 */
export interface ParseFn<T> {
  (input: string): T|ParseError;
  (input: string, error: ParseErrorOptions): T|ParseError;
  (input: string, tree: ParseTreeOptions): ParseNode|ParseError;
}

export type ParseOptions = ParseErrorOptions | ParseTreeOptions;

/**
 * Basic parser options.
 */
export interface ParseBaseOptions {
  /** Whether the input should be trimmed before parsing. Defaults to false. */
  trim?: boolean
}

/**
 * Options for controlling how errors are produced by a ParseFn.
 */
export interface ParseErrorOptions extends ParseBaseOptions {
  /* The number of lines surrounding an error line that should be included in errors. This defaults to 0, and setting it to a number greater than 0 will produce up to 2x + 1 the number of lines, as it applies to lines both above and below the source line. */
  contextLines?: number;
  /* Turns on detailed errors for this parser or parse run. */
  detailed?: boolean;
  /* Turns on detailed error causes for this parser or parse run. */
  causes?: boolean;
  /* Throws an error rather than returning a ParseError. */
  throw?: boolean;
  /* Produces an error if all of the input is not consumed during parsing. */
  consumeAll?: boolean;
}

/**
 * Options for producing a parse node from a ParseFn.
 */
export interface ParseTreeOptions extends ParseErrorOptions {
  tree?: boolean;
}

/**
 * Counts the number of lines that occur before pos.
 *
 * @param input
 * @param pos
 */
export function getLineNum(input: string, pos: number): number {
  let n = 1;
  while (~(pos = input.lastIndexOf('\n', pos))) {
    if (!pos) break;
    n++;
    pos--;
  };
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
  const len = pos - (!~first ? -1 : first) - 1;
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
    cause: cause[3] && getParseError(cause[3], input, context),
    causes: cause[4] && cause[4].map(c => getParseError(c, input, context)),
    parser: cause[2],
  };
}

/**
 * Recursively searches for the latest cause in a tree.
 *
 * @param cause - the starting cause
 */
export function findLatestCause(cause: Cause): Cause {
  let res: Cause = cause;
  if (cause[3]) {
    const c = findLatestCause(cause[3]);
    if (c[0] > res[0]) res = c;
  }
  if (cause[4]) {
    const len = cause[4].length;
    for (let i = 0; i < len; i++) {
      const c = findLatestCause(cause[4][i]);
      if (c[0] > res[0]) res = c;
    }
  }
  if (_latestCause[0] >= _cause[0] && _latestCause[1] !== cause[1]) return _latestCause;
  return res;
}

const startSpace = /^\s*/;
export const shared: {
  skip?(chars: string): Parser<''>;
  seq?<A, B>(a: Parser<A>, b: Parser<B>): Parser<[A, B]>;
  map?<A, B>(a: Parser<A>, b: (a: A) => B): Parser<B>;
} = {};

/**
 * Wraps a parser in a ParseFn.
 *
 * @param parser - the base parser to wrap
 * @param options - default ParseOptions for the resulting ParseFn
 */
export function parser<T>(parser: Parser<T>, error?: ParseOptions): ParseFn<T> {
  let mps: IParser<T>;
  const oerror = error;
  const det = (error ? (error.detailed ? 1 : 0) + (error.causes ? 2 : 0) : 0) as DetailedFail;
  const consume = error && error.consumeAll;
  return function parse(input: string, error?: ParseOptions) {
    const trim = error && 'trim' in error ? error.trim : oerror && oerror.trim;
    const start = trim ? startSpace.exec(input)[0].length : 0;
    if (trim) parser = shared.map(shared.seq(parser, shared.skip(' \t\r\n')), ([a]) => a);
    const d = (error ? (error.detailed ? 1 : 0) + (error.causes ? 2 : 0) : det) as DetailedFail;
    let res: Result<T> = [null, 0];

    if (d & 1) resetLatestCause();

    const node = (error && 'tree' in error && error.tree) && openNode(0);
    if (d !== detailedFail) {
      const c = detailedFail;
      detailedFail = d;
      res = (mps || (mps = unwrap(parser))).parse(input, start, res, node);
      detailedFail = c;
    } else {
      res = (mps || (mps = unwrap(parser))).parse(input, start, res, node);
    }

    if (res.length && (error && 'consumeAll' in error ? error.consumeAll : consume) && res[1] < input.length) {
      res = fail(res[1], d & 1 && `expected to consume all input, but only ${res[1]} chars consumed`);
    }

    if (!res.length) {
      const cause = getCause();
      const ctx = (error && 'contextLines' in error ? error.contextLines : oerror && oerror.contextLines) || 0;
      const err = getParseError(getLatestCause(cause[4] || [], cause), input, ctx);
      const latest = findLatestCause(cause);
      if (cause !== latest) err.latest = getParseError(latest, input, ctx);
      if (error && 'throw' in error ? error.throw : oerror && oerror.throw) {
        const ex = new Error(err.message);
        throw Object.assign(ex, err);
      } else return err;
    } else {
      if (node) {
        closeNode(node, null, res);
        if (trim) {
          const n = node.children[0].children[0];
          n.result = res[0];
          return n;
        }
        return node;
      }
      return res[0];
    }
  } as ParseFn<T>;
}

/**
 * A parser that always fails. This is used by parsers that can wrap lazy
 * parsers when the lazy parsers are unitialized at first call.
 */
export const uninit: any = { parse: (_s: String, p: number) => fail(p, detailedFail & 1 && 'uninitialized lazy parser') };

/**
 * Unwraps a lazy parser or returns an immediately failing parser in case the
 * lazy parser is not yet initialized.
 */
export function unwrap<T>(parser: Parser<T>): IParser<T> {
  return (((parser as any).parser || parser) as IParser<T>) || uninit;
}

/**
 * Set up a lazily initializing parser. On the first parse, the init function
 * can unwrap any nested parsers. The parse function is then replaced with 
 * the passed-in function.
 *
 * @param init - initialization function for first parse
 * @param parse - replacement parse function
 */
export function lazy<T>(init: () => void, parse: (s: string, p: number, r: Success<T>, tree?: ParseNode) => Result<T>): IParser<T> {
  let res: IParser<T>;
  res = {
    parse(s: string, p: number, r: Success<T>, tree?: ParseNode): Result<T> {
      init();
      res.parse = parse;
      return parse(s, p, r, tree);
    }
  }
  return res;
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
export function getLatestCause(causes?: Cause[], outer?: Cause): Cause {
  if (!causes || !outer) return _latestCause;
  let max = outer[0];
  outer[4] = causes;
  let f: Cause;
  const cs = causes || [];
  for (let i = 0; i < cs.length; i++) {
    if (cs[i][0] > max) {
      f = cs[i];
      max = f[0];
    }
  }
  if (f) return [f[0], f[1], f[2], outer];
  else return outer;
}
