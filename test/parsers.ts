import { Success, skip, skip1, read, read1, chars, readTo, read1To, alt, rep, rep1, str, opt, repsep, rep1sep, chain, map, bracket, seq, andNot, check, getCause } from '../src/index';

const q = QUnit;

const success: Success<any> = ['', 0];

q.module('parsers');

q.test('skip', t => {
  const p = skip(' \t\r\n');
  t.equal(p.parse('  \t \n\ra  b', 0, success)[1], 6, 'skips 6 whitespace chars');
  t.equal(p.parse('asdfas', 0, success)[1], 0, 'does not skip non-whitespace chars');
});

q.test('skip1', t => {
  const p = skip1(' \t\r\n');
  t.equal(p.parse(' \ta', 0, success)[1], 2, 'skips 2 whitespace chars');
  t.equal(p.parse('foo  ', 0, success).length, 0, 'fails to not skip any chars');
  t.equal(p.parse('foo  ', 1, ['', 1]).length, 0, 'fails to not skip any chars with a previous success passed in');
})

q.test('read', t => {
  const p = read('fo');
  t.equal(p.parse('foo', 0, success)[0], 'foo');
  t.equal(p.parse(' foo', 0, success)[0], '');
  t.equal(p.parse('', 0, success)[0], '');
});

q.test('read1', t => {
  const p = read1('fo');
  t.equal(p.parse(' foo', 0, success).length, 0);
  t.equal(p.parse('foo', 0, success)[0], 'foo');
});

q.test('chars', t => {
  const p = chars(3);
  t.equal(p.parse('foobar', 0, success)[0], 'foo');
  t.equal(p.parse('fo', 0, success).length, 0);
  const q = chars(3, 'fo');
  t.equal(q.parse('foobar', 0, success)[0], 'foo');
  t.equal(q.parse('fo', 0, success).length, 0);
  t.equal(q.parse('barfoo', 0, success).length, 0);
});

q.test('readTo', t => {
  const p = readTo('fo');
  t.equal(p.parse('barfoo', 0, success)[0], 'bar');
  t.equal(p.parse('foobar', 0, success)[0], '');
});

q.test('read1To', t => {
  const p = read1To('fo');
  t.equal(p.parse('barfoo', 0, success)[0], 'bar');
  t.equal(p.parse('foobar', 0, success).length, 0);
});

q.test('alt', t => {
  const a = read1('bar');
  const b = read1('fo');
  const p = alt(a, b);
  t.equal(p.parse('abcof', 0, success)[0], 'ab');
  t.equal(p.parse('oofab', 0, success)[0], 'oof');
  t.equal(p.parse('xyzyx', 0, success).length, 0);
});

q.test('rep', t => {
  const a = seq(str('foo'), skip(' '));
  const p = rep(a);
  t.equal(p.parse('foo foo foo', 0, success)[0].map(r => r[0]).join('|'), 'foo|foo|foo');
  t.equal(p.parse('foofoofoo', 0, success)[0].map(r => r[0]).join('|'), 'foo|foo|foo');
  t.equal(p.parse('fooofoofoo', 0, success)[0].map(r => r[0]).join('|'), 'foo');
  t.equal(p.parse('abc def', 0, success)[0].length, 0);
});

q.test('rep1', t => {
  const a = str('foo');
  const p = rep1(a);
  t.equal(p.parse('oof', 0, success).length, 0);
  t.equal(p.parse('foo foo', 0, success)[0].join('|'), 'foo');
  t.equal(p.parse('foofoobar', 0, success)[0].join('|'), 'foo|foo');
});

q.test('str', t => {
  const p = str('foo', 'bar');
  t.equal(p.parse('foo', 0, success)[0], 'foo');
  t.equal(p.parse('bar', 0, success)[0], 'bar');
  t.equal(p.parse('oof', 0, success).length, 0);
});

q.test('opt', t => {
  const p = opt(str('foo'));
  t.equal(p.parse('foo', 0, success)[0], 'foo');
  t.equal(p.parse('bar', 0, success)[0], null);
});

q.test('repsep', t => {
  const p = repsep(str('foo'), read1(' '));
  t.equal(p.parse('foo foo foo', 0, success)[0].join('|'), 'foo|foo|foo');
  t.equal(p.parse('foofoofoo', 0, success)[0].join('|'), 'foo');
  t.equal(p.parse('fooofoofoo', 0, success)[0].join('|'), 'foo');
  t.equal(p.parse('abc def', 0, success)[0].length, 0);
});

q.test('repsep optional follow', t => {
  const p = repsep(read1To(' ', true), str(' '), 'allow');
  t.equal(p.parse('foo foo foo', 0, success)[0].join('|'), 'foo|foo|foo');
  t.equal(p.parse('foo foo foo ', 0, success)[0].join('|'), 'foo|foo|foo');
});

q.test('repsep required follow', t => {
  const p = repsep(read1To(' ', true), str(' '), 'require');
  t.equal(p.parse('foo foo foo', 0, success).length, 0);
  t.equal(p.parse('foo foo foo ', 0, success)[0].join('|'), 'foo|foo|foo');
});

q.test('rep1sep', t => {
  const p = rep1sep(str('foo'), read1(' '));
  t.equal(p.parse('foo foo foo', 0, success)[0].join('|'), 'foo|foo|foo');
  t.equal(p.parse('foofoofoo', 0, success)[0].join('|'), 'foo');
  t.equal(p.parse('fooofoofoo', 0, success)[0].join('|'), 'foo');
  t.equal(p.parse('abc def', 0, success).length, 0);
});

q.test('chain', t => {
  const a = str('a', 'b');
  const b = str('foo');
  const c = str('bar');
  const p = chain(a, s => s === 'a' ? b : c);
  t.equal(p.parse('afoo', 0, success)[0], 'foo');
  t.equal(p.parse('abar', 0, success).length, 0);
  t.equal(p.parse('bbar', 0, success)[0], 'bar');
  t.equal(p.parse('bfoo', 0, success).length, 0);
});

q.test('map', t => {
  const p = map(chars(2, '0123456789'), s => +s * 2);
  t.equal(p.parse('a', 0, success).length, 0);
  t.equal(p.parse('1', 0, success).length, 0);
  t.equal(p.parse('10', 0, success)[0], 20);
});

q.test('map with error', t => {
  const p = map(chars(3, '0123'), (s, e) => s[0] === '0' ? e('cannot start with 0') : +s);
  t.equal(p.parse('120', 0, success)[0], 120);
  t.equal(p.parse('012', 0, success).length, 0);
  t.equal(getCause()[1], 'cannot start with 0');
});

q.test('bracket', t => {
  const a = skip(' ');
  const p = bracket(seq(a, str('A'), a), str('foo'), seq(a, str('B'), a));
  t.equal(p.parse('AB', 0, success).length, 0);
  t.equal(p.parse('A  foo  B', 0, success)[0], 'foo');
  t.equal(p.parse('AfooB', 0, success)[0], 'foo');
  t.equal(p.parse('  Afoo  B', 0, success)[0], 'foo');
  t.equal(p.parse('  A  foo  B ', 0, success)[0], 'foo');
  t.equal(p.parse('A foo  B ', 0, success)[0], 'foo');
});

q.test('bracket mirror', t => {
  const p = bracket([str(`'`), str(`"`)], readTo(`'"`));
  t.equal(p.parse(`"foo"`, 0, success)[0], 'foo');
  t.equal(p.parse(`"foo"`, 0, success)[0], 'foo');
  t.equal(p.parse(`"foo'`, 0, success).length, 0);
});

q.test('seq', t => {
  const p = seq(str('f'), str('o'), str('o'));
  t.equal(p.parse('foo', 0, success)[0].join(''), 'foo');
  t.equal(p.parse('fOo', 0, success).length, 0);
});

q.test('andNot', t => {
  const p = andNot(str('{'), str('{'));
  t.equal(p.parse('{}', 0, success)[0], '{');
  t.equal(p.parse('{{', 0, success).length, 0);
});

q.test('check', t => {
  const p = check(str('foo'));
  t.equal(p.parse('foo', 0, success)[1], 3);
  t.equal(p.parse('fOo', 0, success).length, 0);
});
