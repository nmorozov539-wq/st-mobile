import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeLayoutPreferences, visibleDestinations, wideLayoutEligible} from '../prototype/frontend/layout-preferences.js';
import {createNavigation} from '../prototype/frontend/navigation.js';
import {readableError} from '../prototype/frontend/error-message.js';

test('layout preferences reject unknown/duplicate destinations and restore folded WI position', () => {
    const prefs = normalizeLayoutPreferences({order:['extensions','home','home','unknown','wi'],wiPlacement:'library',messageFormat:'cards'});
    assert.deepEqual(prefs.order,['extensions','home','wi','chats','library']);
    assert.deepEqual(visibleDestinations(prefs),['extensions','home','chats','library']);
    assert.equal(prefs.messageFormat,'reading');
    assert.deepEqual(normalizeLayoutPreferences({...prefs,wiPlacement:'destination'}).order,prefs.order);
});

test('navigation closes layers before topic/detail routes and preserves origins', () => {
    const nav=createNavigation();
    nav.go({name:'settings',topic:'presets',origin:'chat'});
    nav.openLayer({id:'native-popup'});
    assert.equal(nav.back().kind,'layer');
    assert.equal(nav.back().value.route.topic,null);
    assert.equal(nav.back().value.route.name,'chat');
    assert.equal(nav.back().value.route.origin,null);
});

test('Library fresh entries normalize to Characters and Home re-tap stays Home', () => {
    const nav=createNavigation({name:'home'});
    nav.go({name:'home'}); assert.equal(nav.snapshot().route.name,'home');
    nav.go({name:'library',section:'characters'}); assert.equal(nav.snapshot().route.section,'characters');
    nav.go({name:'library',section:'personas'}); assert.equal(nav.back().value.route.section,'characters');
});

test('wide panes collapse on resize and at 200% UI text scaling', () => {
    assert.equal(wideLayoutEligible(1024, 16), true);
    assert.equal(wideLayoutEligible(899, 16), false);
    assert.equal(wideLayoutEligible(1024, 32), false);
    assert.equal(wideLayoutEligible(1800, 32), false);
});

test('backend JSON errors become bounded human-readable composer messages', () => {
    assert.equal(readableError('{"error":{"message":"Text endpoint refused the request"}}'), 'Text endpoint refused the request');
    assert.equal(readableError({message:'{"detail":"Model unavailable"}'}), 'Model unavailable');
    assert.ok(readableError('x'.repeat(900)).length <= 700);
});

test('wide Chats mounts the shared chat controller instead of a limited transcript fork', () => {
    const source=readFileSync(new URL('../prototype/frontend/app.js',import.meta.url),'utf8');
    assert.doesNotMatch(source,/messages\.slice\(-40\)/);
    assert.match(source,/detail\.replaceChildren\(surface\)/);
    assert.match(source,/await workspace\('activate',\{target:current\}\)/);
});
