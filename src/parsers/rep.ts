import { Parser, IParser, Success, Result, fail, detailedFail, getCause, getCauseCopy, unwrap, lazy } from '../base';

/**
 * Creates a parser that applies the given parser until it fails, producing
 * an array of results.
 *
 * @param parser - the parser to apply
 *
 * This will successfully parse an empty array.
 */
export function rep<T>(parser: Parser<T>): IParser<T[]> {
  let ps: IParser<T>;
  const empty: T[] = [];
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, resin: Success<T[]>): Result<T[]> {
      let seq: T[];
      let c = p;
      let res: Result<T>;

      // unroll the first pass to avoid weird allocation
      res = ps.parse(s, c, resin as any);
      if (!res.length) {
        resin[0] = empty;
        resin[1] = c;
        if (detailedFail & 2) resin[2] = getCauseCopy();
        return resin;
      } else {
        c = res[1];
        seq = [res[0]];
      }

      while (1) {
        res = ps.parse(s, c, resin as any);
        if (res.length) {
          seq.push(res[0]);
          c = res[1];
        } else {
          return [seq || [], c, detailedFail & 2 && getCauseCopy()];
        }
      }
    }
  );
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
  let ps: IParser<T>;
  return lazy(
    () => ps = unwrap(parser),
    function parse(s: string, p: number, resin: Success<T[]>): Result<T[]> {
      let seq: T[];
      let c = p;
      let res: Result<T>;

      // unroll to avoid weird allocation
      res = ps.parse(s, c, resin as any);
      if (res.length) {
        (seq = []).push(res[0]);
        c = res[1];

        while (1) {
          res = ps.parse(s, c, resin as any);
          if (res.length) {
            seq.push(res[0]);
            c = res[1];
          } else {
            resin[0] = seq;
            resin[1] = c;
            if (detailedFail & 2) resin[2] = getCauseCopy();
            return resin;
          }
        }
      } else {
        return fail(c, detailedFail & 1 && `expected at least one ${name || 'item'}`, detailedFail & 2 && getCauseCopy());
      }

    }
  );
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
  let ps1: IParser<T>;
  let ps2: IParser<any>;
  const empty: T[] = [];
  return lazy(
    () => (ps1 = unwrap(parser), ps2 = unwrap(sep)),
    function parse(s: string, p: number, resin: Success<T[]>): Result<T[]> {
      let seq: T[];
      let c = p;
      let m = p;
      let rr: T;
      let res: Result<T>;
      let r: Result<any>;

      // unroll first iteration to avoid weird allocation
      res = ps1.parse(s, c, resin as any);
      if (res.length) {
        rr = res[0];
        m = c;
        c = res[1];
        r = ps2.parse(s, c, resin as any);
        if (!r.length) {
          if (trail === 'require') return fail(m, detailedFail & 1 && `expected separator`);
          resin[0] = [rr];
          resin[1] = c;
          return resin;
        } else {
          c = r[1];
        }

        seq = [rr];
      } else {
        resin[0] = empty;
        resin[1] = p;
        if (detailedFail & 2) resin[2] = getCauseCopy();
        return resin;
      }

      while (1) {
        res = ps1.parse(s, c, resin as any);
        if (res.length) {
          m = c;
          c = res[1];
          rr = res[0];
          r = ps2.parse(s, c, resin as any);
          if (!r.length) {
            if (trail === 'require') return fail(m, detailedFail & 1 && `expected separator`);
            seq.push(rr);
            break;
          } else c = r[1];
          seq.push(rr);
        } else if (trail === 'disallow' && seq && seq.length) {
          if (detailedFail & 2) {
            const cause = getCause();
            return fail(cause[0], cause[1], [c, `unexpected separator`]);
          }
          else return fail(c, detailedFail & 1 && `unexpected separator`);
        } else break;
      }
      return [seq, c, detailedFail & 2 && getCauseCopy()];
    }
  );
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
  let ps1: IParser<T>;
  let ps2: IParser<any>;
  return lazy(
    () => (ps1 = unwrap(parser), ps2 = unwrap(sep)),
    function parse(s: string, p: number, resin: Success<T[]>): Result<T[]> {
      let seq: T[];
      let c = p;
      let l = c;
      let res: Result<T>;

      // unroll to avoid weird allocation
      res = ps1.parse(s, c, resin as any);
      if (res.length) {
        (seq = []).push(res[0]);
        l = c = res[1];
        const r = ps2.parse(s, c, resin as any);
        if (!r.length) {
          if (trail === 'require') return fail(c, detailedFail & 1 && `expected separator`);
        } else {
          c = r[1];

          // loop for the rest
          while (1) {
            res = ps1.parse(s, c, resin as any);
            if (res.length) {
              seq.push(res[0]);
              l = c = res[1];
              const r = ps2.parse(s, c, resin as any);
              if (!r.length) {
                if (trail === 'require') return fail(c, detailedFail & 1 && `expected separator`);
                break;
              } else c = r[1];
            } else if (trail === 'disallow' && seq && seq.length) {
              resin[0] = seq;
              resin[1] = l;
              return resin;
            } else break;
          }
        }
      } else return fail(c, detailedFail & 1 && `expected at least one ${name || 'item'}`);

      resin[0] = seq;
      resin[1] = c;
      if (detailedFail & 2) resin[2] = getCauseCopy();
      return resin;
    }
  );
}
