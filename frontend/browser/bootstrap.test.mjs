import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./bootstrap.js', import.meta.url), 'utf8');
const request = value => ({version: 1, id: 'theme', action: 'storage.set', session: false, key: 'theme', value});

function browser(theme = 'dark') {
  const subscriptions = new Set(), responses = [], writes = [], initialized = [];
  const node = {};
  const app = {ports: {
    resources: {subscribe() {}, unsubscribe() {}},
    browserEvents: {send() {}},
    browserRequest: {subscribe: callback => subscriptions.add(callback), unsubscribe: callback => subscriptions.delete(callback)},
    browserResponse: {send: response => responses.push(JSON.parse(JSON.stringify(response)))},
  }};
  const context = {
    document: {getElementById: () => node, documentElement: {dataset: {theme}}},
    Elm: {Main: {init: options => { initialized.push(options); return app; }}},
    localStorage: {setItem: (key, value) => writes.push([key, value])},
  };
  runInNewContext(source, context);
  const errors = [], connected = [];
  let ready = 0;
  const start = (connect = app => connected.push(app)) => context.PdfToolsBrowser.start(connect, () => ready++, message => errors.push(message));
  const send = value => { for (const callback of subscriptions) callback(value); };
  return {context, node, app, subscriptions, responses, writes, initialized, errors, connected, start, send, get ready() { return ready; }};
}

test('mounts Elm with the selected theme and connects storage before the resource adapter', () => {
  for (const [theme, expected] of [['light', 'light'], ['dark', 'dark'], ['invalid', 'dark'], [undefined, 'dark']]) {
    const b = browser(theme);
    b.start(app => {
      assert.equal(app, b.app);
      assert.equal(b.subscriptions.size, 1);
      assert.equal(b.ready, 0);
    });
    assert.equal(b.initialized[0].node, b.node);
    assert.equal(b.initialized[0].flags, expected);
    assert.equal(b.ready, 1);
    assert.deepEqual(b.errors, []);
  }
});

test('persists light and dark as raw preferences compatible with previous releases', () => {
  const b = browser();
  b.start();
  for (const value of ['light', 'dark']) b.send(request(value));
  assert.deepEqual(b.writes, [['pdf-tools-theme', 'light'], ['pdf-tools-theme', 'dark']]);
  assert.deepEqual(b.responses, ['light', 'dark'].map(value => ({version: 1, id: 'theme', kind: 'ok', value})));
  assert.equal(b.ready, 1);
  assert.deepEqual(b.errors, []);
});

test('reports blocked storage to Elm without turning it into a startup failure', () => {
  for (const blocked of ['getter', 'write']) {
    const b = browser();
    if (blocked === 'getter') Object.defineProperty(b.context, 'localStorage', {get() { throw new Error('Storage unavailable'); }});
    else b.context.localStorage.setItem = () => { throw new Error('Storage unavailable'); };
    b.start();
    b.send(request('light'));
    assert.equal(b.responses.length, 1);
    assert.equal(b.responses[0].version, 1);
    assert.equal(b.responses[0].id, 'theme');
    assert.equal(b.responses[0].kind, 'error');
    assert.equal(typeof b.responses[0].message, 'string');
    assert.ok(b.responses[0].message.length > 0);
    assert.deepEqual(b.writes, []);
    assert.equal(b.ready, 1);
    assert.deepEqual(b.errors, []);
  }
});

test('invalid requests cannot modify browser storage', () => {
  const b = browser();
  b.start();
  for (const change of [{version: 2}, {action: 'storage.clear'}, {key: 'other'}, {session: true}, {value: 'invalid'}]) b.send({...request('light'), ...change});
  b.send(null);
  b.send({});
  assert.deepEqual(b.writes, []);
  assert.equal(b.responses.length, 5);
  assert.ok(b.responses.every(response => response.kind === 'error'));
});

test('missing mount, Elm module, or required port reaches the startup error callback', () => {
  const broken = [
    b => { b.context.document.getElementById = () => null; },
    b => { delete b.context.Elm; },
    b => { b.context.Elm.Main.init = () => null; },
    ...['resources', 'browserRequest', 'browserEvents', 'browserResponse'].map(name => b => { delete b.app.ports[name]; }),
  ];
  for (const breakIt of broken) {
    const b = browser();
    breakIt(b);
    b.start();
    assert.equal(b.ready, 0);
    assert.equal(b.errors.length, 1);
    assert.deepEqual(b.connected, []);
    assert.equal(b.subscriptions.size, 0);
  }
});

test('resource adapter failure detaches storage before reporting the startup error', () => {
  const b = browser();
  b.start(() => { throw new Error('Resource adapter failed'); });
  assert.equal(b.ready, 0);
  assert.deepEqual(b.errors, ['Resource adapter failed']);
  assert.equal(b.subscriptions.size, 0);
  b.send(request('light'));
  assert.deepEqual(b.writes, []);
});

test('disconnect removes the storage subscription', () => {
  const b = browser();
  const disconnect = b.start();
  disconnect();
  b.send(request('light'));
  assert.equal(b.subscriptions.size, 0);
  assert.deepEqual(b.writes, []);
});
