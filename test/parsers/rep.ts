import {
  seq, skip, str, read1, read1To, rep, rep1, repsep, rep1sep,
  Success,
} from '../../src/index';

const q = QUnit;

const success: Success<any> = ['', 0];

q.module('parsers');

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
