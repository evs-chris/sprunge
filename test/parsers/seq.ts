import {
  andNot, bracket, check, readTo, seq, skip, str,
  Success,
} from '../../src/index';

const q = QUnit;

const success: Success<any> = ['', 0];

q.module('parsers/seq');

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

q.test('check', t => {
  const p = check(str('foo'));
  t.equal(p.parse('foo', 0, success)[1], 3);
  t.equal(p.parse('fOo', 0, success).length, 0);
});

q.test('andNot', t => {
  const p = andNot(str('{'), str('{'));
  t.equal(p.parse('{}', 0, success)[0], '{');
  t.equal(p.parse('{{', 0, success).length, 0);
});
