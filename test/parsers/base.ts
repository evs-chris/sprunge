import {
  alt, chain, chars, map, not, opt, read1, seq, str, verify,
  Success, getCause, getLatestCause, detailedErrors,
} from '../../src/index';

const q = QUnit;

q.module('parsers/base');

const success: Success<any> = ['', 0];

q.test('opt', t => {
  const p = opt(str('foo'));
  t.equal(p.parse('foo', 0, success)[0], 'foo');
  t.equal(p.parse('bar', 0, success)[0], null);
});

q.test('not', t => {
  const p = map(seq(not(str('foo')), read1('abcdefghijklmnop')), ([, v]) => v);
  t.equal(p.parse('oofa', 0, success)[0].length, 4);
  t.equal(p.parse('fooa', 0, success).length, 0);
});

q.test('alt', t => {
  const a = read1('bar');
  const b = read1('fo');
  const p = alt(a, b);
  t.equal(p.parse('abcof', 0, success)[0], 'ab');
  t.equal(p.parse('oofab', 0, success)[0], 'oof');
  t.equal(p.parse('xyzyx', 0, success).length, 0);
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

q.test('verify', t => {
  const num = read1('0123456789');
  const p = verify(num, s => +s < 100 || 'number too large');
  t.equal(p.parse('17', 0, success)[0], '17');
  t.equal(p.parse('170', 0, success).length, 0);
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

q.test('deeper map with error', t => {
  const detailed = detailedErrors();
  detailedErrors(1);
  const p = alt<any>(
    str('foooo'),
    map(chars(3, '0123'), (s, e) => s[0] === '0' ? e('cannot start with 0') : +s),
    seq(str('0'), str('lala')),
  );
  t.equal(p.parse('120', 0, success)[0], 120);
  t.equal(p.parse('012', 0, success).length, 0);
  t.equal(getLatestCause()[1], 'cannot start with 0');
  detailedErrors(detailed);
});
