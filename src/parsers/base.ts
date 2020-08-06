import { IParser, Parser, Success, Result, Cause, getCauseCopy, getLatestCause, fail, detailedFail, unwrap } from '../base';

/**
 * Creates a parser using the given parser that always succeeds, returning
 * the result if the given parser succeeds or `null` if it doesn't.
 *
 * @param parser - the parser to apply to the input
 */
export function opt<T>(parser: Parser<T>): IParser<null|T> {
  let ps: IParser<T>;
  function parse(s: string, p: number, resin?: Success<T>): Result<null|T> {
    resin = resin || [null, 0];
    const res = ps.parse(s, p, resin);
    if (res.length) return res;
    else {
      resin[0] = null;
      resin[1] = p;
      return resin;
    }
  }
  let res: IParser<null|T>;
  res = {
    parse(s: string, p: number, resin?: Success<null|T>) {
      ps = unwrap(parser);
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
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
  function parse(s: string, p: number, resin?: Success<T>) {
    resin = resin || [null, 0];
    let fails: Cause[];
    for (let i = 0; i < len; i++) {
      const res = ps[i].parse(s, p, resin);
      if (res.length) return res;
      else if (detailedFail) (fails || (fails = [])).push(getCauseCopy());
    }
    if (detailedFail) {
      const cause = getLatestCause(fails, [p, `expected ${nm}`]);
      return fail(cause[0], cause[1], cause[2], cause[3]);
    } else return fail(p, false);
  }
  let res: IParser<T>;
  res = {
    parse(s: string, p: number, resin?: Success<T>) {
      ps = lps.map(p => unwrap(p));
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
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
  function parse(s: string, p: number, res?: Success<U>): Result<U> {
    res = res || [null, 0];
    let c = p;
    const r = ps.parse(s, c, res as any);
    if (!r.length) return r as any;
    c = r[1];
    const n = select(r[0]);
    if (!n) return fail(c, detailedFail && `chain selection failed`);
    return n.parse(s, c, res as any);
  }
  let res: IParser<U>;
  res = {
    parse(s: string, p: number, resin?: Success<U>) {
      ps = unwrap(parser);
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
}

export function verify<T>(parser: Parser<T>, verify: (t: T) => true|string): Parser<T> {
  let ps: IParser<T>;
  function parse(s: string, p: number, res?: Success<T>) {
    res = res || [null, 0];
    const r = ps.parse(s, p, res);
    if (!r.length) return r;
    const v = verify(r[0]);
    if (v === true) return r;
    else return fail(r[1], v);
  }
  let res: IParser<T>;
  res = {
    parse(s: string, p: number, resin?: Success<T>) {
      ps = unwrap(parser);
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
}

/**
 * Creates a parser that applies the given parser and then applies the given
 * transform if the parse was successful.
 *
 * @param parser - the parser to apply
 * @param fn - the transformer to apply to the result
 */
export function map<T, U>(parser: Parser<T>, fn: (t: T) => U): IParser<U> {
  let ps: IParser<T>;
  function parse(s: string, p: number, res?: Success<U>): Result<U> {
    res = res || [null, 0];
    const r = ps.parse(s, p, res as any);
    if (r.length) {
      (r as unknown[])[0] = fn(r[0]);
      return r as any;
    } else return r as any;
  }
  let res: IParser<U>;
  res = {
    parse(s: string, p: number, resin?: Success<U>) {
      ps = unwrap(parser);
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
}
