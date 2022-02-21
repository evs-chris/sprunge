import { IParser, Parser, Success, Result, Cause, addCause, getCauseCopy, getLatestCause, unwrap, fail, detailedFail, lazy, ParseNode, openNode, closeNode, shared, NodeName, isNodeName } from '../base';

/**
 * Creates a parser that parses bracketed content, ignoring the brackets in
 * the result.
 *
 * @param left - the left bracket parser
 * @param content - the primary content parser
 * @param right - the right bracket parser
 */
export function bracket<T>(left: Parser<any>, content: Parser<T>, right: Parser<any>, name?: NodeName): IParser<T>
/**
 * Creates a parser that parses bracketed content, ignoring the brackets in
 * the result. The first bracket that matches at the front must also match
 * at the end.
 *
 * @param ends - a list of possible bracket parsers
 * @param content - the content parser
 */
export function bracket<T>(ends: Array<Parser<any>>, content: Parser<T>, name?: NodeName): IParser<T>;

/**
 * The underlying implementation for bracket overloads.
 */
export function bracket<T>(first: Array<Parser<any>>|Parser<any>, content: Parser<T>, right?: NodeName|Parser<any>, name?: NodeName): IParser<T> {
  const nm = isNodeName(right) ? right : isNodeName(name) ? name : undefined;
  if (Array.isArray(first)) { // mirrored options
    let ends: IParser<any>[];
    let ps: IParser<T>;
    const len = first.length;
    return lazy(
      () => (ps = unwrap(content), ends = first.map(unwrap)),
      function parse(s: string, p: number, resin: Success<T>, tree?: ParseNode): Result<T> {
        const node = tree && openNode(p, nm);
        let cause: Cause;
        let end: IParser<any>;
        for (let i = 0; i < len; i++) {
          const res = ends[i].parse(s, p, resin as any);
          if (res.length) {
            end = ends[i];
            break;
          }
        }
        if (!end) return fail(p, detailedFail & 1 && `expected opening bracket`, name);
        const res = ps.parse(s, resin[1], resin, node);
        if (!res.length) return res;
        if (detailedFail & 2) cause = res[2];
        const v = res[0];
        const c = res[1];
        const fin = end.parse(s, c, resin as any);
        if (!fin.length) return fail(c, detailedFail & 1 && `expected matching end bracket`, name, detailedFail & 2 && cause);
        resin[0] = v;
        if (node) closeNode(node, tree, resin);
        return resin;
      }
    );
  } else if (!isNodeName(right)) { // individual start and end bracket parsers
    let ps1: IParser<any>;
    let ps2: IParser<T>;
    let ps3: IParser<any>;
    return lazy(
      () => (ps1 = unwrap(first), ps2 = unwrap(content), ps3 = unwrap(right)),
      function parse(s: string, p: number, resin: Success<T>, tree?: ParseNode): Result<T> {
        let cause: Cause;
        const node = tree && openNode(p, nm);
        const r1 = ps1.parse(s, p, resin as any);
        if (!r1.length) return r1;
        const r2 = ps2.parse(s, r1[1], resin, node);
        if (!r2.length) return r2;
        if (detailedFail & 2 && r2[2]) cause = r2[2];
        const r = r2[0];
        const r3 = ps3.parse(s, r2[1], resin as any);
        if (!r3.length) {
          if (detailedFail & 2 && cause) addCause(cause);
          return r3;
        }
        resin[0] = r;
        if (node) closeNode(node, tree, resin);
        return resin;
      }
    );
  }
}


type ExtractParserTypes<T> = {
  [P in keyof T] : T[P] extends Parser<infer U> ? U : never
}

/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are returned as a tuple.
 */
export function seq<U extends Parser<any>[]>(...parsers: U): IParser<ExtractParserTypes<U>> {
  let ps: Array<IParser<any>>;
  const len = parsers.length;
  return lazy(
    () => ps = parsers.map(unwrap),
    function parse(s: string, p: number, resin: Success<any[]>, tree?: ParseNode) {
      const node = tree && openNode(p);
      let res: any[];
      let c = p;
      let causes: Cause[];
      let r: Result<any>;

      // unroll the first pass to avoid weird allocation
      r = ps[0].parse(s, c, resin as any, node);
      if (!r.length) {
        if (detailedFail & 2) {
          const cause = getLatestCause(causes, getCauseCopy());
          return fail(cause[0], cause[1], cause[2], cause[3], cause[4]);
        } else return r;
      } else {
        if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
        (res = []).push(r[0]);
        c = r[1];

        // loop for the second on
        for (let i = 1; i < len; i++) {
          r = ps[i].parse(s, c, resin as any, node);
          if (!r.length) {
            if (detailedFail & 2) {
              const cause = getLatestCause(causes, getCauseCopy());
              return fail(cause[0], cause[1], cause[2], cause[3], cause[4]);
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
      if (detailedFail & 2) resin[2] = [p, 'error in seq', null, null, causes];
      if (node) closeNode(node, tree, resin);
      return resin;
    }
  );
}

shared.seq = seq;

/**
 * Creates a parser that applies the given parsers in sequence. If one fails,
 * the created parser will also fail. The results are discareded.
 */
export function check(name: string|Parser<any>, ...parsers: Array<Parser<any>>): IParser<null> {
  let ps: Array<IParser<any>>;
  let nm: string;

  if (typeof name !== 'string') parsers.unshift(name);
  else nm = name;

  const len = parsers.length;
  return lazy(
    () => ps = parsers.map(unwrap),
    function parse(s: string, p: number, resin: Success<null>, tree?: ParseNode) {
      const node = tree && openNode(p, nm);
      let c = p;
      let causes: Cause[];
      let r: Result<any>;

      // unroll once to avoid weird allocation
      r = ps[0].parse(s, c, resin as any);
      if (!r.length) {
        if (detailedFail & 2) {
          const cause = getLatestCause(causes, getCauseCopy(nm));
          return fail(cause[0], cause[1], cause[2], cause[3], cause[4]);
        } else return r;
      } else {
        if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
        c = r[1];

        for (let i = 1; i < len; i++) {
          r = ps[i].parse(s, c, resin as any);
          if (!r.length) {
            if (detailedFail & 2) {
              const cause = getLatestCause(causes, getCauseCopy(nm));
              return fail(cause[0], cause[1], cause[2], cause[3], cause[4]);
            } else return r;
          } else {
            if (detailedFail & 2 && r[2]) (causes || (causes = [])).push(r[2]);
            c = r[1];
          }
        }
      }

      resin[0] = null;
      resin[1] = c;
      if (node) closeNode(node, tree, resin);
      return resin;
    }
  );
}

/**
 * Creates a parser that matches a given parser only if the second given parser does not match.
 *
 * @param parser - the parser to match
 * @param not - the parser that must not match
 */
export function andNot<T>(parser: Parser<T>, not: Parser<any>, name?: NodeName): IParser<T> {
  let ps: IParser<T>;
  let np: IParser<any>;
  return lazy(
    () => (ps = unwrap(parser), np = unwrap(not)),
    function parse(s: string, p: number, resin: Success<T>, tree?: ParseNode): Result<T> {
      const node = tree && openNode(p, name);
      const res = ps.parse(s, p, resin, node);
      if (!res.length) return res;
      const c = res[1];
      const not = np.parse(s, c, resin);
      if (not.length) return fail(c, detailedFail & 1 && `unexpected ${s.slice(c, res[1])}`, name);
      else {
        if (node) closeNode(node, tree, res);
        return res;
      }
    }
  );
}
