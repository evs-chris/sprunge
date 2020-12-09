import { IParser, Parser, Success, Result, Cause, getCauseCopy, getLatestCause, fail, detailedFail, unwrap, lazy } from '../base';

/**
 * Creates a parser using the given parser that always succeeds, returning
 * the result if the given parser succeeds or `null` if it doesn't.
 *
 * @param parser - the parser to apply to the input
 */
export function opt<T>(parser: Parser<T>): IParser<null|T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, resin: Success<T>): Result<null|T> {
      const res = ps.parse(s, p, resin);
      if (res.length) return res;
      else {
        resin[0] = null;
        resin[1] = p;
        return resin;
      }
    }
  );
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
  let ps: Array<IParser<T>>;
  const len = lps.length;
  return lazy(
    () => ps = lps.map(unwrap),
    function parse(s: string, p: number, resin: Success<T>) {
      let fails: Cause[];
      for (let i = 0; i < len; i++) {
        const res = ps[i].parse(s, p, resin);
        if (res.length) return res;
        else if (detailedFail & 2) (fails || (fails = [])).push(getCauseCopy());
      }
      if (detailedFail & 2) {
        const cause = getLatestCause(fails, [p, `expected ${nm}`]);
        return fail(cause[0], cause[1], cause[2], cause[3]);
      } else return fail(p, detailedFail & 1 && `expected ${nm}`);
    }
  );
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
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<U>): Result<U> {
      let c = p;
      const r = ps.parse(s, c, res as any);
      if (!r.length) return r as any;
      c = r[1];
      const n = select(r[0]);
      if (!n) return fail(c, detailedFail & 1 && `chain selection failed`);
      return n.parse(s, c, res as any);
    }
  );
}

/**
 * Creates a parser that applies a verification function to another parser's result.
 * If the function returns true, the verify parser will succeed witht the nested
 * parser's result. If the function returns a string, the verify parser will fail
 * with that as the message.
 *
 * @param parser - the nested parser to apply
 * @param verify - the verification function to apply
 */
export function verify<T>(parser: Parser<T>, verify: (t: T) => true|string): Parser<T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<T>) {
      const r = ps.parse(s, p, res);
      if (!r.length) return r;
      const v = verify(r[0]);
      if (v === true) return r;
      else return fail(r[1], v);
    }
  );
}

/**
 * Creates a parser that applies the given parser and then applies the given
 * transform if the parse was successful.
 *
 * @param parser - the parser to apply
 * @param fn - the transformer to apply to the result
 */
export function map<T, U>(parser: Parser<T>, fn: (t: T, f: (error: string) => void) => U): IParser<U> {
  let ps: IParser<T>;
  let err: string;
  const none = '';
  const error = (e: string) => err = e;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<U>): Result<U> {
      const r = ps.parse(s, p, res as any);
      if (r.length) {
        const last = err;
        err = none;
        (r as unknown[])[0] = fn(r[0], error);
        const cur = err;
        err = last;
        if (cur) return fail(p, cur);
        return r as any;
      } else return r as any;
    }
  );
}

/**
 * Creates a parser that breaks before running a nested parser.
 *
 * @param parser - the nested parser
 * @param name = an optional name for context
 */
export function debug<T>(parser: Parser<T>, name?: string): IParser<T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<T>): Result<T> {
      name;
      debugger;
      return ps.parse(s, p, res);
    }
  );
}
