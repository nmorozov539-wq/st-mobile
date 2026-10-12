import test from 'node:test';
import assert from 'node:assert/strict';
import * as ap from '../prototype/frontend/appearance.js';

test('defaults match the approved reading design', () => {
    assert.deepEqual(ap.normalizeAppearance(null), {textSize: 16, spacing: 'normal', background: 'gradient', details: {time: true, clock: false, model: false, tokens: false}});
});
test('invalid stored values fall back or clamp', () => {
    const value = ap.normalizeAppearance({textSize: 99, spacing: 'huge', background: 'x', details: {time: 'yes', clock: true}});
    assert.equal(value.textSize, 24); assert.equal(value.spacing, 'normal'); assert.equal(value.background, 'gradient');
    assert.equal(value.details.time, true); assert.equal(value.details.clock, true);
    assert.equal(ap.normalizeAppearance({textSize: 2}).textSize, 13);
    assert.equal(ap.normalizeAppearance({textSize: 'abc'}).textSize, 16);
});
test('load and save round-trip through storage and survive corruption', () => {
    const store = new Map(), storage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v)};
    assert.equal(ap.loadAppearance(storage).textSize, 16);
    ap.saveAppearance(storage, {textSize: 19, spacing: 'spacious', background: 'plain', details: {model: true}});
    const loaded = ap.loadAppearance(storage);
    assert.deepEqual([loaded.textSize, loaded.spacing, loaded.background, loaded.details.model, loaded.details.time], [19, 'spacious', 'plain', true, true]);
    store.set(ap.STORAGE_KEY, '{bad'); assert.equal(ap.loadAppearance(storage).textSize, 16);
    assert.equal(ap.loadAppearance({getItem() { throw new Error('blocked'); }}).spacing, 'normal');
});
test('message details only come from real metadata', () => {
    assert.equal(ap.modelName({extra: {model: ' gpt-x '}}), 'gpt-x');
    assert.equal(ap.modelName({extra: {}}), null);
    assert.equal(ap.tokenText({extra: {token_count: 1234}}), `${(1234).toLocaleString()} tokens`);
    assert.equal(ap.tokenText({extra: {token_count: 0}}), null);
    assert.equal(ap.tokenText({}), null);
    assert.equal(ap.clockText({send_date: 'nonsense'}), null);
    assert.equal(ap.clockText({}), null);
    assert.ok(ap.clockText({send_date: '2026-10-11T21:14:00Z'}));
});
test('applying sets the CSS variables and background flag', () => {
    const props = {}, root = {style: {setProperty: (k, v) => { props[k] = v; }}, dataset: {}};
    ap.applyAppearance({textSize: 18, spacing: 'compact', background: 'plain'}, root);
    assert.deepEqual(props, {'--chat-font': '18px', '--chat-line': '1.45'}); assert.equal(root.dataset.background, 'plain');
});
