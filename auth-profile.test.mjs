import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const authSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'auth.js'), 'utf8');
const adaId = '11111111-1111-1111-1111-111111111111';

function boot(script) {
  const calls = [];
  const timers = [];
  const elements = {};
  function getElementById(id) {
    if (!elements[id]) {
      elements[id] = {
        style: {},
        textContent: '',
        src: '',
        listeners: {},
        addEventListener(type, fn) {
          (this.listeners[type] ||= []).push(fn);
        },
      };
    }
    return elements[id];
  }

  function answer(query) {
    const find = (name) => query.ops.find((op) => op[0] === name);
    const insert = find('insert');
    if (insert) {
      calls.push({ insert: insert[1] });
      return script.inserts.shift() || { error: null };
    }
    if (find('update')) {
      calls.push({ update: find('update')[1], eq: find('eq') });
      return { error: null };
    }
    const eq = find('eq');
    calls.push({ select: find('select') && find('select')[1], eq: eq && [eq[1], eq[2]] });
    if (eq && eq[1] === 'username') {
      return { data: null, error: null };
    }
    return script.own.shift() || { data: null, error: null };
  }

  const sandbox = {
    Promise,
    console,
    setTimeout(fn, ms) {
      timers.push({ fn, ms });
      return timers.length;
    },
    Math: { floor: Math.floor, random: () => 0 },
    window: {
      localStorage: {},
      location: { origin: 'http://127.0.0.1', href: 'http://127.0.0.1/', search: '' },
      supabase: {
        createClient() {
          return {
            auth: {
              onAuthStateChange() {},
              getSession() {
                return Promise.resolve({ data: { session: { user: script.user } } });
              },
              signOut() {
                return Promise.resolve();
              },
            },
            from() {
              const query = { ops: [] };
              const api = {
                select(cols) { query.ops.push(['select', cols]); return api; },
                eq(col, val) { query.ops.push(['eq', col, val]); return api; },
                update(payload) { query.ops.push(['update', payload]); return api; },
                insert(payload) { query.ops.push(['insert', payload]); return api; },
                maybeSingle() { query.ops.push(['maybeSingle']); return api; },
                then(resolve, reject) {
                  return Promise.resolve(answer(query)).then(resolve, reject);
                },
              };
              return api;
            },
            rpc(name, args) {
              calls.push({ rpc: name, args });
              return Promise.resolve(script.rpc);
            },
          };
        },
      },
    },
    document: { getElementById },
  };
  sandbox.window.window = sandbox.window;
  runInContext(authSource, createContext(sandbox));
  return new Promise((resolve) => {
    setTimeout(() => resolve({ calls, timers, elements }), 0);
  });
}

function ada(metadata) {
  return {
    id: adaId,
    email: 'ada@example.com',
    user_metadata: metadata || { full_name: 'Ada Lovelace', username: 'ada' },
  };
}

const usernameConflict = {
  error: {
    code: '23505',
    message: 'duplicate key value violates unique constraint "profiles_username_key"',
    details: 'Key (username)=(ada) already exists.',
  },
};

test('a returning user reads only their own profile', async () => {
  const result = await boot({
    user: ada(),
    own: [{ data: { id: adaId, display_name: 'Ada Lovelace' }, error: null }],
    inserts: [],
    rpc: { data: true, error: null },
  });
  assert.deepEqual(result.calls.filter((call) => call.rpc), []);
  assert.deepEqual(result.calls.filter((call) => call.insert), []);
  assert.equal(result.calls.some((call) => call.eq && call.eq[0] === 'username'), false);
  assert.equal(result.calls.some((call) => call.eq && call.eq[0] === 'id' && call.eq[1] === adaId), true);
});

test('a new user checks one username and inserts it when it is free', async () => {
  const result = await boot({
    user: ada(),
    own: [{ data: null, error: null }],
    inserts: [{ error: null }],
    rpc: { data: false, error: null },
  });
  assert.deepEqual(result.calls.find((call) => call.rpc), {
    rpc: 'username_taken',
    args: { candidate: 'ada' },
  });
  assert.equal(result.calls.some((call) => call.eq && call.eq[0] === 'username'), false);
  assert.deepEqual(result.calls.find((call) => call.insert).insert, {
    id: adaId,
    display_name: 'Ada Lovelace',
    username: 'ada',
  });
  result.timers.find((timer) => timer.ms === 600).fn();
  assert.equal(result.elements['welcome-modal'].style.display, 'flex');
});

test('a taken username is saved with the same four-digit suffix', async () => {
  const result = await boot({
    user: ada(),
    own: [{ data: null, error: null }],
    inserts: [{ error: null }],
    rpc: { data: true, error: null },
  });
  assert.deepEqual(result.calls.find((call) => call.rpc), {
    rpc: 'username_taken',
    args: { candidate: 'ada' },
  });
  assert.equal(result.calls.some((call) => call.eq && call.eq[0] === 'username'), false);
  assert.equal(result.calls.find((call) => call.insert).insert.username, 'ada1000');
  assert.equal(result.calls.filter((call) => call.insert).length, 1);
});

test('a unique username conflict retries once with that suffix', async () => {
  const result = await boot({
    user: ada(),
    own: [{ data: null, error: null }],
    inserts: [usernameConflict, { error: null }],
    rpc: { data: false, error: null },
  });
  const inserts = result.calls.filter((call) => call.insert).map((call) => call.insert.username);
  assert.deepEqual(inserts, ['ada', 'ada1000']);
  result.timers.find((timer) => timer.ms === 600).fn();
  assert.equal(result.elements['welcome-modal'].style.display, 'flex');
});

test('a second unique conflict does not count as a new profile', async () => {
  const result = await boot({
    user: ada(),
    own: [{ data: null, error: null }],
    inserts: [usernameConflict, usernameConflict],
    rpc: { data: false, error: null },
  });
  assert.equal(result.calls.filter((call) => call.insert).length, 2);
  assert.equal(result.timers.some((timer) => timer.ms === 600), false);
});
