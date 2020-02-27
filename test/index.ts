import { parser, read, read1 } from '../src/index';

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
