import {
  istr, outer, read1, seq, str, readToParser, read1ToParser,
  Success,
} from '../../src/index';

const q = QUnit;

const success: Success<any> = ['', 0];

q.module('parsers');

q.test('str', t => {
  const p = str('foo', 'bar');
  t.equal(p.parse('foo', 0, success)[0], 'foo');
  t.equal(p.parse('bar', 0, success)[0], 'bar');
  t.equal(p.parse('oof', 0, success).length, 0);
});

q.test('istr', t => {
  const p = istr('foo', 'bar');
  t.equal(p.parse('fOo', 0, success)[0], 'foo');
  t.equal(p.parse('BAR', 0, success)[0], 'bar');
  t.equal(p.parse('oOf', 0, success).length, 0);
});

q.test('outer', t => {
  const p = outer(seq(str('\''), read1('0123456789abcdefABCDEF'), str('\'')));
  t.equal(p.parse(`'a1b2'`, 0, success)[0], `'a1b2'`);
  t.equal(p.parse(`'a1b2`, 0, success).length, 0);
});

q.test('readToParser', t => {
  const p = readToParser('-', str('-->'));
  t.equal(p.parse('asdf-fdsa', 0, success)[0], 'asdf-fdsa');
  t.equal(p.parse('asdf-->fdsa', 0, success)[0], 'asdf');
  t.equal(p.parse('-a->fdsa', 0, success)[0], '-a->fdsa');
  t.equal(p.parse('-->fdsa', 0, success)[0], '');
  t.equal(p.parse('asdf-->', 0, success)[0], 'asdf');
  t.equal(p.parse('', 0, success)[0], '');
});

q.test('read1ToParser', t => {
  const p = read1ToParser('-', str('-->'));
  t.equal(p.parse('asdf-fdsa', 0, success)[0], 'asdf-fdsa');
  t.equal(p.parse('asdf-->fdsa', 0, success)[0], 'asdf');
  t.equal(p.parse('-a->fdsa', 0, success)[0], '-a->fdsa');
  t.equal(p.parse('-->fdsa', 0, success).length, 0);
  t.equal(p.parse('asdf-->', 0, success)[0], 'asdf');
  t.equal(p.parse('', 0, success).length, 0);
});
