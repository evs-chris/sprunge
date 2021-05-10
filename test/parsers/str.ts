import {
  str,
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

// TODO: istr
// TODO: outer
