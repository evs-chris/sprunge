import { parser, read, read1, str, readTo, nodeForPosition } from '../src/index';
import { alt, map } from '../src/parsers/base';
import { repsep } from '../src/parsers/rep';
import { bracket, seq } from '../src/parsers/seq';

import './parsers';

const q = QUnit;

q.module('parsefn');

q.test('basic wrapper', t => {
  const p = parser(read('abc'));
  t.equal(p('aabbcc'), 'aabbcc');
  t.equal(p('abcd'), 'abc');
  t.equal(p('dcba'), '');
});

q.test('wrapper consume all', t => {
  const p = parser(read1('abc'), { consumeAll: true });
  let res = p('abcd');
  t.ok(typeof res === 'object');
  t.equal(typeof res === 'object' && res.position, 3);
  res = p('abcd', { consumeAll: false });
  t.ok(typeof res === 'string');
  t.equal(res, 'abc');
});

q.test('wrapper throw', t => {
  const p = parser(read1('abc'), { throw: true });
  t.throws(() => p('eabcd'));
  t.throws(() => p('abcd', { consumeAll: true }));
  let res = p('abcd', { throw: false, consumeAll: true });
  t.ok(typeof res === 'object', 'error obj not thrown');
  t.equal(typeof res === 'object' && res.position, 3);
  res = p('abcd', { consumeAll: false });
  t.ok(typeof res === 'string', 'consume all turned off');
  t.equal(res, 'abc');
});

q.test('parse tree', t => {
  const n = map(read1('0123456789'), n => +n, 'number');
  const s = bracket(str('"'), readTo('"'), str('"'), 'string');
  const c = map(seq(read1('abcforz'), str('('), repsep(alt<string|number>(n, s), read1(', ')), str(')')), ([op, , args]) => ({ op, args }), 'call');
  const e = repsep(alt<any>(c, s, n), read1(' '), 'allow', 'expression');
  const p = parser(e);
  const r = p('"foo" 22 bar(69, 72)', { tree: true });
  t.ok('start' in r);
  if ('start' in r) {
    const path = nodeForPosition(r, 14, true)
    t.equal(path.length, 3);
    t.equal(path[0].start, 13);
    t.equal(path[0].result, 69);
    const names = ['number', 'call', 'expression'];
    for (let i = 0; i < path.length; i++) t.equal(path[i].name, names[i]);
  }
});

q.test('parse trim', t => {
  const n = map(read1('0123456789'), n => +n, 'number');
  const p1 = parser(n, { trim: true });
  const p2 = parser(n);
  
  t.equal(p1('  \r\n \t  42  \t'), 42);
  t.equal(typeof p1('  \r\n \t  42  \t', { trim: false }), 'object');
  t.equal(p2('  \r\n \t  42  \t', { trim: true }), 42);
  t.equal(typeof p2('  \r\n \t  42  \t'), 'object');
});
