import {
  chars, ichars, iskip, iskip1, iread, iread1, iread1To, ireadTo, notchars, notichars, skip, skip1, read, read1, read1To, readTo,
  Success,
} from '../../src/index';

const q = QUnit;

const success: Success<any> = ['', 0];

q.module('parsers/char');

q.test('skip', t => {
  const p = skip(' \t\r\n');
  t.equal(p.parse('  \t \n\ra  b', 0, success)[1], 6, 'skips 6 whitespace chars');
  t.equal(p.parse('asdfas', 0, success)[1], 0, 'does not skip non-whitespace chars');
});

q.test('iskip', t => {
  const p = iskip('abcd');
  t.equal(p.parse('aAacDBi', 0, success)[1], 6, 'skips 6 chars');
  t.equal(p.parse('rsdfas', 0, success)[1], 0, 'does not skip non-matching chars');
});

q.test('skip1', t => {
  const p = skip1(' \t\r\n');
  t.equal(p.parse(' \ta', 0, success)[1], 2, 'skips 2 whitespace chars');
  t.equal(p.parse('foo  ', 0, success).length, 0, 'fails to not skip any chars');
  t.equal(p.parse('foo  ', 1, ['', 1]).length, 0, 'fails to not skip any chars with a previous success passed in');
})

q.test('iskip1', t => {
  const p = iskip1('abcd');
  t.equal(p.parse('aBi', 0, success)[1], 2, 'skips 2 whitespace chars');
  t.equal(p.parse('foo  ', 0, success).length, 0, 'fails to not skip any chars');
  t.equal(p.parse('foo  ', 1, ['', 1]).length, 0, 'fails to not skip any chars with a previous success passed in');
})

q.test('read', t => {
  const p = read('fo');
  t.equal(p.parse('foo', 0, success)[0], 'foo');
  t.equal(p.parse(' foo', 0, success)[0], '');
  t.equal(p.parse('', 0, success)[0], '');
});

q.test('iread', t => {
  const p = iread('fo');
  t.equal(p.parse('FOo', 0, success)[0], 'FOo');
  t.equal(p.parse(' foo', 0, success)[0], '');
  t.equal(p.parse('', 0, success)[0], '');
});

q.test('read1', t => {
  const p = read1('fo');
  t.equal(p.parse(' foo', 0, success).length, 0);
  t.equal(p.parse('foo', 0, success)[0], 'foo');
});

q.test('iread1', t => {
  const p = iread1('fo');
  t.equal(p.parse(' FOo', 0, success).length, 0);
  t.equal(p.parse('FOo', 0, success)[0], 'FOo');
});

q.test('chars', t => {
  const p = chars(3);
  t.equal(p.parse('foobar', 0, success)[0], 'foo');
  t.equal(p.parse('fo', 0, success).length, 0);
});

q.test('chars allowed', t => {
  const q = chars(3, 'fo');
  t.equal(q.parse('foobar', 0, success)[0], 'foo');
  t.equal(q.parse('fo', 0, success).length, 0);
  t.equal(q.parse('barfoo', 0, success).length, 0);
});

q.test('ichars', t => {
  const p = ichars(3);
  t.equal(p.parse('FOobar', 0, success)[0], 'FOo');
  t.equal(p.parse('FO', 0, success).length, 0);
});

q.test('ichars allowed', t => {
  const q = ichars(3, 'fo');
  t.equal(q.parse('FOobar', 0, success)[0], 'FOo');
  t.equal(q.parse('FO', 0, success).length, 0);
  t.equal(q.parse('barfoo', 0, success).length, 0);
});

q.test('readTo', t => {
  const p = readTo('fo');
  t.equal(p.parse('barfoo', 0, success)[0], 'bar');
  t.equal(p.parse('foobar', 0, success)[0], '');
});

q.test('ireadTo', t => {
  const p = ireadTo('fo');
  t.equal(p.parse('barFOo', 0, success)[0], 'bar');
  t.equal(p.parse('FOobar', 0, success)[0], '');
});

q.test('read1To', t => {
  const p = read1To('fo');
  t.equal(p.parse('barfoo', 0, success)[0], 'bar');
  t.equal(p.parse('foobar', 0, success).length, 0);
});

q.test('iread1To', t => {
  const p = iread1To('fo');
  t.equal(p.parse('barFOo', 0, success)[0], 'bar');
  t.equal(p.parse('FOobar', 0, success).length, 0);
});

q.test('notchars', t => {
  const p = notchars(5, 'abcd');
  t.equal(p.parse('yozzle', 0, success)[0], 'yozzl');
  t.equal(p.parse('yAzzle', 0, success)[0], 'yAzzl');
  t.equal(p.parse('yazzle', 0, success).length, 0);
});

q.test('notichars', t => {
  const p = notichars(5, 'abcd');
  t.equal(p.parse('yozzle', 0, success)[0], 'yozzl');
  t.equal(p.parse('yAzzle', 0, success).length, 0);
  t.equal(p.parse('yazzle', 0, success).length, 0);
});
