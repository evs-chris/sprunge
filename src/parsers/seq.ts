import { IParser, Parser, Success, Result, Cause, addCause, getCauseCopy, getLatestCause, unwrap, fail, detailedFail } from '../base';

/**
 * Creates a parser that parses bracketed content, ignoring the brackets in
 * the result.
 *
 * @param left - the left bracket parser
 * @param content - the primary content parser
 * @param right - the right bracket parser
 */
export function bracket<T>(left: Parser<any>, content: Parser<T>, right: Parser<any>): IParser<T>
/**
 * Creates a parser that parses bracketed content, ignoring the brackets in
 * the result. The first bracket that matches at the front must also match
 * at the end.
 *
 * @param ends - a list of possible bracket parsers
 * @param content - the content parser
 */
export function bracket<T>(ends: Array<Parser<any>>, content: Parser<T>): IParser<T>;

/**
 * The underlying implementation for bracket overloads.
 */
export function bracket<T>(first: Array<Parser<any>>|Parser<any>, content: Parser<T>, right?: Parser<any>): IParser<T> {
  if (Array.isArray(first)) { // mirrored options
    let ends: IParser<any>[];
    let ps: IParser<T>;
    const len = first.length;
    function parse(s: string, p: number, resin?: Success<T>): Result<T> {
      let cause: Cause;
      resin = resin || [null, 0];
      let end: IParser<any>;
      for (let i = 0; i < len; i++) {
        const res = ends[i].parse(s, p, resin as any);
        if (res.length) {
          end = ends[i];
          break;
        }
      }
      if (!end) return fail(p, detailedFail & 1 && `expected opening bracket`);
      const res = ps.parse(s, resin[1], resin);
      if (!res.length) return res;
      if (detailedFail & 2) cause = res[2];
      const v = res[0];
      const c = res[1];
      const fin = end.parse(s, c, resin as any);
      if (!fin.length) return fail(c, detailedFail & 1 && `expected matching end bracket`, detailedFail & 2 && cause);
      resin[0] = v;
      return resin;
    }
    let res: IParser<T>;
    res = {
      parse(s: string, p: number, resin?: Success<T>) {
        ps = unwrap(content);
        ends = first.map(p => unwrap(p));
        res.parse = parse;
        return parse(s, p, resin);
      }
    };
    return res;
  } else { // individual start and end bracket parsers
    let ps1: IParser<any>;
    let ps2: IParser<T>;
    let ps3: IParser<any>;
    function parse(s: string, p: number, resin?: Success<T>): Result<T> {
      let cause: Cause;
      resin = resin || [null, 0];
      const r1 = ps1.parse(s, p, resin as any);
      if (!r1.length) return r1;
      const r2 = ps2.parse(s, r1[1], resin);
      if (!r2.length) return r2;
      if (detailedFail & 2 && r2[2]) cause = r2[2];
      const r = r2[0];
      const r3 = ps3.parse(s, r2[1], resin as any);
      if (!r3.length) {
        if (detailedFail & 2 && cause) addCause(cause);
        return r3;
      }
      resin[0] = r;
      return resin;
    }
    let res: IParser<T>;
    res = {
      parse(s: string, p: number, resin?: Success<T>) {
        ps1 = unwrap(first);
        ps2 = unwrap(content);
        ps3 = unwrap(right);
        res.parse = parse;
        return parse(s, p, resin);
      }
    }
    return res;
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
  let ps: Array<IParser<any>>;
  const len = parsers.length;
  function parse(s: string, p: number, resin?: Success<any[]>) {
    resin = resin || [null, 0];
    let res: any[];
    let c = p;
    let causes: Cause[];
    let r: Result<any>;

    // unroll the first pass to avoid weird allocation
    r = ps[0].parse(s, c, resin as any);
    if (!r.length) {
      if (detailedFail & 2) {
        const cause = getLatestCause(causes, getCauseCopy());
        return fail(cause[0], cause[1], cause[2], cause[3]);
      } else return r;
    } else {
      if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
      (res = []).push(r[0]);
      c = r[1];

      // loop for the second on
      for (let i = 1; i < len; i++) {
        r = ps[i].parse(s, c, resin as any);
        if (!r.length) {
          if (detailedFail & 2) {
            const cause = getLatestCause(causes, getCauseCopy());
            return fail(cause[0], cause[1], cause[2], cause[3]);
          } else return r;
        } else {
          if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
          res.push(r[0]);
          c = r[1];
        }
      }
    }

    resin[0] = res;
    resin[1] = c;
    if (detailedFail & 2) resin[2] = [p, 'error in seq', null, causes];
    return resin;
  }
  let res: IParser<any[]>;
  res = {
    parse(s: string, p: number, resin?: Success<any[]>) {
      ps = parsers.map(unwrap);
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
}

/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are discareded.
 */
export function check(...parsers: Array<Parser<any>>): IParser<null> {
  let ps: Array<IParser<any>>;
  const len = parsers.length;
  function parse(s: string, p: number, resin?: Success<null>) {
    resin = resin || [null, 0];
    let c = p;
    let causes: Cause[];
    let r: Result<any>;

    // unroll once to avoid weird allocation
    r = ps[0].parse(s, c, resin as any);
    if (!r.length) {
      if (detailedFail & 2) {
        const cause = getLatestCause(causes, getCauseCopy());
        return fail(cause[0], cause[1], cause[2], cause[3]);
      } else return r;
    } else {
      if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
      c = r[1];

      for (let i = 1; i < len; i++) {
        r = ps[i].parse(s, c, resin as any);
        if (!r.length) {
          if (detailedFail & 2) {
            const cause = getLatestCause(causes, getCauseCopy());
            return fail(cause[0], cause[1], cause[2], cause[3]);
          } else return r;
        } else {
          if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
          c = r[1];
        }
      }
    }

    resin[0] = null;
    resin[1] = c;
    return resin;
  }
  let res: IParser<null>;
  res = {
    parse(s: string, p: number, resin?: Success<null>) {
      ps = parsers.map(unwrap);
      res.parse = parse;
      return parse(s, p, resin);
    }
  };
  return res;
}
