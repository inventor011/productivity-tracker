import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const authSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'auth.js'), 'utf8');

function clickGoogle(origin, search) {
  const calls = [];
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

  const sandbox = {
    Promise,
    console,
    window: {
      localStorage: {},
      location: {
        origin,
        search,
        href: origin + '/' + (search || ''),
      },
      supabase: {
        createClient() {
          return {
            auth: {
              signInWithOAuth(opts) {
                calls.push(opts);
                return Promise.resolve({ data: {}, error: null });
              },
              onAuthStateChange() {},
              getSession() {
                return Promise.resolve({ data: { session: null } });
              },
              signOut() {
                return Promise.resolve();
              },
            },
            from() {
              return this;
            },
          };
        },
      },
    },
    document: { getElementById },
  };
  sandbox.window.window = sandbox.window;
  runInContext(authSource, createContext(sandbox));
  const click = elements['auth-google-btn'].listeners.click[0];
  return Promise.resolve(click()).then(() => calls[0]);
}

const pages = [
  ['http://127.0.0.1:4173', ''],
  ['http://localhost:3000', ''],
  ['https://productivity101.pages.dev', ''],
  ['https://feat-login.productivity101.pages.dev', ''],
  ['https://productivity101.vercel.app', ''],
  ['https://productivity101.pages.dev', '?redirect=https://evil.example&next=https://evil.example'],
];

for (const [origin, search] of pages) {
  test('Google sign-in sets redirectTo to ' + origin + (search ? ' and ignores ' + search : ''), async () => {
    const call = await clickGoogle(origin, search);
    assert.equal(call.provider, 'google');
    assert.equal(call.options.redirectTo, origin);
    assert.equal(call.options.redirectTo.includes('evil.example'), false);
  });
}
