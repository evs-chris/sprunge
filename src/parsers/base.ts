import { IParser, Parser, Success, Result, NodeName, isNodeName, Cause, getCauseCopy, getLatestCause, suggestCauseName, overrideCauseName, fail, detailedFail, unwrap, lazy, ParseNode, openNode, closeNode, shared } from '../base';

/**
 * Creates a parser using the given parser that always succeeds, returning
 * the result if the given parser succeeds or `null` if it doesn't.
 *
 * @param parser - the parser to apply to the input
 */
export function opt<T>(parser: Parser<T>, name?: NodeName): IParser<null|T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, resin: Success<T>, tree?: ParseNode): Result<null|T> {
      const node = tree && openNode(p, name);
      const res = ps.parse(s, p, resin, node);
      if (res.length) {
        if (node) closeNode(node, tree, res);
        return res;
      } else {
        resin[0] = null;
        resin[1] = p;
        return resin;
      }
    }
  );
}

/**
 * Creates a parser using the given parser the fails if the given parser
 * succeeds. This will never advance the pointer in the input.
 *
 * @param parser - the parser to check for success
 */
export function not(parser: Parser<any>, message?: string): IParser<''> {
  let ps: IParser<''>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, resin: Success<''>): Result<''> {
      const res = ps.parse(s, p, resin);
      if (res.length) return fail(p, detailedFail & 1 && (message || `unexpected ${s.slice(p, res[1])}`));
      else {
        resin[0] = '';
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
export function alt<T>(name: NodeName, ...parsers: Array<Parser<T>>): IParser<T>;
/**
 * The underlying implementation for `alt(name, ...)` and `alt(...)`.
 */
export function alt<T>(name: NodeName|Parser<T>, ...parsers: Array<Parser<T>>): IParser<T> {
  const nm = isNodeName(name) ? name : undefined;
  const lps: Array<Parser<T>> = isNodeName(name) ? parsers : (name ? [name] : []).concat(parsers);
  let ps: Array<IParser<T>>;
  const len = lps.length;
  return lazy(
    () => ps = lps.map(unwrap),
    function parse(s: string, p: number, resin: Success<T>, tree?: ParseNode) {
      let fails: Cause[];
      const node = tree && openNode(p, nm);
      for (let i = 0; i < len; i++) {
        const res = ps[i].parse(s, p, resin, node);
        if (res.length) {
          if (node) closeNode(node, tree, res);
          return res;
        } else if (detailedFail & 2) (fails || (fails = [])).push(getCauseCopy(nm));
      }
      if (detailedFail & 2) {
        const cause = getLatestCause(fails, [p, `expected ${nm || 'alternate'}`, nm]);
        if (fails.length && fails.map(f => f[0]).reduce((a, c) => a + c, 0) === fails[0][0] * fails.length) cause[2] = nm;
        return fail(cause[0], cause[1], cause[2] || nm, cause[3], cause[4]);
      } else {
        if (detailedFail & 1 && getLatestCause()[0] === p && nm) overrideCauseName(nm && ((nm as any).name || nm));
        return fail(p, detailedFail & 1 && `expected ${nm || 'alternate'}`, nm);
      }
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
export function chain<T, U>(parser: Parser<T>, select: (t: T) => IParser<U>, name?: NodeName): IParser<U> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<U>, tree?: ParseNode): Result<U> {
      let c = p;
      const node = tree && openNode(p, name);
      const r = ps.parse(s, c, res as any, node);
      if (!r.length) return r as any;
      c = r[1];
      const n = select(r[0]);
      if (!n) return fail(c, detailedFail & 1 && `chain selection failed`, name);
      const rr = n.parse(s, c, res as any, node);
      if (rr.length && node) closeNode(node, tree, rr);
      return rr;
    }
  );
}

/**
 * Creates a parser that applies a verification function to another parser's result.
 * If the function returns true, the verify parser will succeed with the nested
 * parser's result. If the function returns a string, the verify parser will fail
 * with that as the message.
 *
 * @param parser - the nested parser to apply
 * @param verify - the verification function to apply
 */
export function verify<T>(parser: Parser<T>, verify: (t: T) => true|string, name?: NodeName): IParser<T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<T>, tree?: ParseNode) {
      const node = tree && openNode(p, name);
      const r = ps.parse(s, p, res, node);
      if (!r.length) return r;
      const v = verify(r[0]);
      if (v === true) {
        if (node) closeNode(node, tree, r);
        return r;
      }
      else return fail(r[1], v, name);
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
export function map<T, U>(parser: Parser<T>, fn: (t: T, f: (error: string) => void, start: number, end: number) => U, name?: NodeName): IParser<U> {
  let ps: IParser<T>;
  let err: string;
  const none = '';
  const error = (e: string) => err = e;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<U>, tree?: ParseNode): Result<U> {
      const node = tree && openNode(p, name);
      const r = ps.parse(s, p, res as any, node);
      if (r.length) {
        const last = err;
        err = none;
        (r as unknown[])[0] = fn(r[0], error, p, r[1]);
        const cur = err;
        err = last;
        if (cur) return fail(r[1], cur, name);
        if (node) closeNode(node, tree, r);
        return r as any;
      } else {
        suggestCauseName(name && ((name as any).name || name));
        return r as any;
      }
    }
  );
}

shared.map = map;

/**
 * Creates a parser that breaks before running a nested parser.
 *
 * @param parser - the nested parser
 * @param name = an optional name for context
 */
export function debug<T>(parser: Parser<T>, name?: NodeName): IParser<T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<T>, tree?: ParseNode): Result<T> {
      name;
      debugger;
      return ps.parse(s, p, res, tree);
    }
  );
}

/**
 * Wraps the given parser in a name if a parse tree is being produced.
 */
export function name<T>(parser: Parser<T>, name: NodeName): IParser<T> {
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, res: Success<T>, tree?: ParseNode): Result<T> {
      if (tree) {
        const node = openNode(p, name);
        const r = ps.parse(s, p, res, node);
        if (r.length) {
          if (node.children.length) {
            node.children[0].name = name;
            tree.children.push(node.children[0]);
          } else {
            closeNode(node, tree, r);
          }
        }
        if (detailedFail & 1) suggestCauseName(typeof name === 'string' ? name : name.name);
        return r;
      } else {
        const r = ps.parse(s, p, res);
        if (!r.length && detailedFail & 1) suggestCauseName(typeof name === 'string' ? name : name.name);
        return r;
      }
    }
  );
}
