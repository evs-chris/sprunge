import { skip, read, read1, chars, readTo, read1To, alt, rep, rep1, str, opt, repsep, rep1sep, chain, map, bracket, seq } from '../src/index';

const q = QUnit;

q.module('parsers');

q.test('skip', t => {
  const p = skip(' \t\r\n');
  t.equal(p.parse('  \t \n\ra  b', 0)[1], 6, 'skips 6 whitespace chars');
  t.equal(p.parse('asdfas', 0)[1], 0, 'does not skip non-whitespace chars');
});

q.test('read', t => {
  const p = read('fo');
  t.equal(p.parse('foo', 0)[0], 'foo');
  t.equal(p.parse(' foo', 0)[0], '');
  t.equal(p.parse('', 0)[0], '');
});

q.test('read1', t => {
  const p = read1('fo');
  t.equal(p.parse(' foo', 0).length, 0);
  t.equal(p.parse('foo', 0)[0], 'foo');
});

q.test('chars', t => {
  const p = chars(3);
  t.equal(p.parse('foobar', 0)[0], 'foo');
  t.equal(p.parse('fo', 0).length, 0);
  const q = chars(3, 'fo');
  t.equal(q.parse('foobar', 0)[0], 'foo');
  t.equal(q.parse('fo', 0).length, 0);
  t.equal(q.parse('barfoo', 0).length, 0);
});

q.test('readTo', t => {
  const p = readTo('fo');
  t.equal(p.parse('barfoo', 0)[0], 'bar');
  t.equal(p.parse('foobar', 0)[0], '');
});

q.test('read1To', t => {
  const p = read1To('fo');
  t.equal(p.parse('barfoo', 0)[0], 'bar');
  t.equal(p.parse('foobar', 0).length, 0);
});

q.test('alt', t => {
  const a = read1('bar');
  const b = read1('fo');
  const p = alt(a, b);
  t.equal(p.parse('abcof', 0)[0], 'ab');
  t.equal(p.parse('oofab', 0)[0], 'oof');
  t.equal(p.parse('xyzyx', 0).length, 0);
});

q.test('rep', t => {
  const a = seq(str('foo'), skip(' '));
  const p = rep(a);
  t.equal(p.parse('foo foo foo', 0)[0].map(r => r[0]).join('|'), 'foo|foo|foo');
  t.equal(p.parse('foofoofoo', 0)[0].map(r => r[0]).join('|'), 'foo|foo|foo');
  t.equal(p.parse('fooofoofoo', 0)[0].map(r => r[0]).join('|'), 'foo');
  t.equal(p.parse('abc def', 0)[0].length, 0);
});

q.test('rep1', t => {
  const a = str('foo');
  const p = rep1(a);
  t.equal(p.parse('oof', 0).length, 0);
  t.equal(p.parse('foo foo', 0)[0].join('|'), 'foo');
  t.equal(p.parse('foofoobar', 0)[0].join('|'), 'foo|foo');
});

q.test('str', t => {
  const p = str('foo', 'bar');
  t.equal(p.parse('foo', 0)[0], 'foo');
  t.equal(p.parse('bar', 0)[0], 'bar');
  t.equal(p.parse('oof', 0).length, 0);
});

q.test('opt', t => {
  const p = opt(str('foo'));
  t.equal(p.parse('foo', 0)[0], 'foo');
  t.equal(p.parse('bar', 0)[0], null);
});

q.test('repsep', t => {
  const p = repsep(str('foo'), read1(' '));
  t.equal(p.parse('foo foo foo', 0)[0].join('|'), 'foo|foo|foo');
  t.equal(p.parse('foofoofoo', 0)[0].join('|'), 'foo');
  t.equal(p.parse('fooofoofoo', 0)[0].join('|'), 'foo');
  t.equal(p.parse('abc def', 0)[0].length, 0);
});

q.test('rep1sep', t => {
  const p = rep1sep(str('foo'), read1(' '));
  t.equal(p.parse('foo foo foo', 0)[0].join('|'), 'foo|foo|foo');
  t.equal(p.parse('foofoofoo', 0)[0].join('|'), 'foo');
  t.equal(p.parse('fooofoofoo', 0)[0].join('|'), 'foo');
  t.equal(p.parse('abc def', 0).length, 0);
});

q.test('chain', t => {
  const a = str('a', 'b');
  const b = str('foo');
  const c = str('bar');
  const p = chain(a, s => s === 'a' ? b : c);
  t.equal(p.parse('afoo', 0)[0], 'foo');
  t.equal(p.parse('abar', 0).length, 0);
  t.equal(p.parse('bbar', 0)[0], 'bar');
  t.equal(p.parse('bfoo', 0).length, 0);
});

q.test('map', t => {
  const p = map(chars(2, '0123456789'), s => +s * 2);
  t.equal(p.parse('a', 0).length, 0);
  t.equal(p.parse('1', 0).length, 0);
  t.equal(p.parse('10', 0)[0], 20);
});

q.test('bracket', t => {
  const a = skip(' ');
  const p = bracket(seq(a, str('A'), a), str('foo'), seq(a, str('B'), a));
  t.equal(p.parse('AB', 0).length, 0);
  t.equal(p.parse('A  foo  B', 0)[0], 'foo');
  t.equal(p.parse('AfooB', 0)[0], 'foo');
  t.equal(p.parse('  Afoo  B', 0)[0], 'foo');
  t.equal(p.parse('  A  foo  B ', 0)[0], 'foo');
  t.equal(p.parse('A foo  B ', 0)[0], 'foo');
});

q.test('seq', t => {
  const p = seq(str('f'), str('o'), str('o'));
  t.equal(p.parse('foo', 0)[0].join(''), 'foo');
  t.equal(p.parse('fOo', 0).length, 0);
});
