import * as json from '../../src/json';
import { Success } from '../../src/index';

const q = QUnit;

q.module('parses/json');

const success: Success<any> = ['', 0];

q.test('num', t => {
  t.equal(json.JNum.parse('0b1000101', 0, success)[0], 69);
  t.equal(json.JNum.parse('0B1000101', 0, success)[0], 69);
  t.equal(json.JNum.parse('0B1000_101', 0, success)[0], 69);
  t.equal(json.JNum.parse('-0b1000101', 0, success)[0], -69);
  t.equal(json.JNum.parse('-0B1000101', 0, success)[0], -69);
  t.equal(json.JNum.parse('-0B1000_101', 0, success)[0], -69);
  t.equal(json.JNum.parse('0x0a', 0, success)[0], 10);
  t.equal(json.JNum.parse('-0x0a', 0, success)[0], -10);
  t.equal(json.JNum.parse('0xAA', 0, success)[0], 170);
  t.equal(json.JNum.parse('0xaa', 0, success)[0], 170);
  t.equal(json.JNum.parse('0xAa', 0, success)[0], 170);
  t.equal(json.JNum.parse('0XAA', 0, success)[0], 170);
  t.equal(json.JNum.parse('0Xaa', 0, success)[0], 170);
  t.equal(json.JNum.parse('0XAa', 0, success)[0], 170);
  t.equal(json.JNum.parse('-0xAA', 0, success)[0], -170);
  t.equal(json.JNum.parse('-0xaa', 0, success)[0], -170);
  t.equal(json.JNum.parse('-0xAa', 0, success)[0], -170);
  t.equal(json.JNum.parse('-0XAA', 0, success)[0], -170);
  t.equal(json.JNum.parse('-0Xaa', 0, success)[0], -170);
  t.equal(json.JNum.parse('-0XAa', 0, success)[0], -170);
  t.equal(json.JNum.parse('0o644', 0, success)[0], 420);
  t.equal(json.JNum.parse('-0o644', 0, success)[0], -420);
  t.equal(json.JNum.parse('1.50e2', 0, success)[0], 150);
  t.equal(json.JNum.parse('-1.50e2', 0, success)[0], -150);
  t.equal(json.JNum.parse('15000e-2', 0, success)[0], 150);
  t.equal(json.JNum.parse('-15000e-2', 0, success)[0], -150);
});
