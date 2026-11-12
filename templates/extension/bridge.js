// Storage bridge for «__APP_NAME__» (content script, all frames, document_start).
// The app inside the Gemini Canvas iframe cannot keep IndexedDB between sessions,
// so it mirrors its data here through window.postMessage. Data lives in
// chrome.storage.local (unlimitedStorage) under keys that start with "app:__APP_ID__:" (same keys as the Gemini Toolbox bridge).
(() => {
  "use strict";
  if (window.__sabaBridgeLoaded) return;
  window.__sabaBridgeLoaded = true;

  const NS = "__sabaBridge";
  const APP_ID = "__APP_ID__";
  const PREFIX = "app:__APP_ID__:";
  const META = "app-meta:__APP_ID__";
  const VERSION = "1.0.0";
  const STORES = ["kv", "decks", "fonts", "themes"];
  const local = chrome.storage && chrome.storage.local;
  let appSeen = false;

  const skey = (store, key) => PREFIX + JSON.stringify([store, key]);
  const parseKey = (k) => {
    try { const a = JSON.parse(k.slice(PREFIX.length)); return Array.isArray(a) && a.length === 2 ? a : null; } catch (e) { return null; }
  };
  const validStore = (s) => STORES.includes(s);

  async function allKeys() {
    if (local.getKeys) {
      try { return (await local.getKeys()).filter((k) => k.startsWith(PREFIX)); } catch (e) { /* older Chrome */ }
    }
    return Object.keys(await local.get(null)).filter((k) => k.startsWith(PREFIX));
  }

  async function touchMeta(extra) {
    const m = (await local.get(META))[META] || {};
    const next = { ...m, ...extra, updated: Date.now(), bridge: VERSION };
    await local.set({ [META]: next });
    return next;
  }

  const ops = {
    async ping() {
      // kept light so the app's 800 ms timeout is never hit by a large store
      const meta = (await local.get(META))[META] || null;
      return { version: VERSION, meta };
    },
    async get(m) {
      if (Array.isArray(m.keys)) {
        const ks = m.keys.filter((p) => Array.isArray(p) && validStore(p[0])).map((p) => skey(p[0], p[1]));
        const r = await local.get(ks);
        return { items: m.keys.map((p) => [p[0], p[1], r[skey(p[0], p[1])]]).filter((x) => x[2] !== undefined) };
      }
      if (!validStore(m.store)) throw new Error("bad store");
      const k = skey(m.store, m.key);
      return { value: (await local.get(k))[k] };
    },
    async set(m) {
      if (!validStore(m.store)) throw new Error("bad store");
      await local.set({ [skey(m.store, m.key)]: m.value });
      await touchMeta({});
      return {};
    },
    async del(m) {
      if (!validStore(m.store)) throw new Error("bad store");
      await local.remove(skey(m.store, m.key));
      await touchMeta({});
      return {};
    },
    async list(m) {
      const out = [];
      for (const k of await allKeys()) {
        const p = parseKey(k);
        if (p && (!m.store || p[0] === m.store)) out.push(p);
      }
      return { keys: out };
    },
    async getAll(m) {
      const keys = (await allKeys()).filter((k) => { const p = parseKey(k); return p && (!m.store || p[0] === m.store); });
      const r = keys.length ? await local.get(keys) : {};
      const items = [];
      for (const k of keys) { const p = parseKey(k); if (p) items.push([p[0], p[1], r[k]]); }
      return { items };
    },
    async batch(m) {
      const sets = Array.isArray(m.sets) ? m.sets : [];
      const dels = Array.isArray(m.dels) ? m.dels : [];
      const obj = {};
      for (const [s, k, v] of sets) if (validStore(s)) obj[skey(s, k)] = v;
      if (Object.keys(obj).length) await local.set(obj);
      const rm = dels.filter((p) => validStore(p[0])).map((p) => skey(p[0], p[1]));
      if (rm.length) await local.remove(rm);
      const meta = await touchMeta(m.full ? { fullSync: Date.now() } : {});
      return { written: Object.keys(obj).length, removed: rm.length, meta };
    },
    async clear() {
      const keys = await allKeys();
      if (keys.length) await local.remove(keys);
      await touchMeta({ cleared: Date.now() });
      return { removed: keys.length };
    }
  };

  function reply(id, payload) {
    window.postMessage({ [NS]: 1, dir: "res", app: APP_ID, id, ...payload }, "*");
  }

  function onMessage(e) {
    const m = e.data;
    if (e.source !== window || !m || typeof m !== "object" || m[NS] !== 1 || m.dir !== "req") return;
    if (m.app !== APP_ID) return; // only the infographic studio may use the bridge
    if (m.op === "ping") appSeen = true;
    if (!appSeen) return;
    const fn = ops[m.op];
    if (!fn) return reply(m.id, { ok: false, error: "unknown op" });
    if (!local) return reply(m.id, { ok: false, error: "storage unavailable" });
    Promise.resolve()
      .then(() => fn(m))
      .then((r) => reply(m.id, { ok: true, ...r }))
      .catch((err) => {
        const msg = String((err && err.message) || err);
        reply(m.id, {
          ok: false,
          error: msg,
          quota: /quota/i.test(msg),
          invalidated: /context invalidated/i.test(msg)
        });
      });
  }

  // document.open()/document.write() (used by some sandbox shims) erases window listeners,
  // so re-attach: addEventListener with the same function is a no-op when it is still attached.
  const attach = () => window.addEventListener("message", onMessage);
  attach();
  let n = 0;
  const iv = setInterval(() => { attach(); if (++n > 50) clearInterval(iv); }, 200);
  try { new MutationObserver(attach).observe(document, { childList: true }); } catch (e) { /* no document yet */ }
  document.addEventListener("DOMContentLoaded", attach);
})();
