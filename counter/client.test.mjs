import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../js/visits.js", import.meta.url), "utf8");

function setup({ production = true, hidden = false } = {}) {
  let now = 100000;
  let nextId = 0;
  let intersect;
  let result = { count: 7 };
  let failure = false;
  const tasks = new Map();
  const requests = [];
  const events = {};
  const elements = Object.fromEntries(["visit-counter", "visit-count", "visit-status", "visit-refresh"].map(id => [id, {
    textContent: "—", disabled: true,
    classList: { add() {}, remove() {} },
    setAttribute() {}, removeAttribute() {},
    addEventListener: (name, listener) => { events[id + name] = listener; }
  }]));
  const document = {
    hidden, readyState: "complete", getElementById: id => elements[id],
    addEventListener: (name, listener) => { events[name] = listener; }
  };
  const window = { IntersectionObserver: true };
  runInNewContext(source, {
    window, document, location: { origin: production ? "https://cuby3212.github.io" : "http://localhost" },
    Date: { now: () => now }, Intl, AbortController,
    IntersectionObserver: class { constructor(callback) { intersect = callback; } observe() {} },
    setTimeout: (fn, ms) => { const id = ++nextId; tasks.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: id => tasks.delete(id), requestAnimationFrame: fn => fn(),
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      if (failure) throw new Error("offline");
      return { ok: true, json: async () => result };
    }
  });
  const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  return {
    requests, elements, settle,
    setResult: value => { result = value; },
    fail: () => { failure = true; },
    click: () => events["visit-refreshclick"](),
    visible: value => intersect([{ isIntersecting: value }]),
    hidden: value => { document.hidden = value; events.visibilitychange(); },
    advance: async ms => {
      now += ms;
      const ready = [...tasks].filter(([, task]) => task.at <= now);
      for (const [id, task] of ready) { if (tasks.delete(id)) task.fn(); }
      await settle();
    }
  };
}

test("Registra una vez y actualiza con GET, sin contar cada consulta", async () => {
  const page = setup();
  await page.settle();
  assert.equal(page.requests[0].method, "POST");
  assert.equal(page.requests[0].credentials, "omit");
  assert.equal(page.elements["visit-count"].textContent, "7");
  await page.click();
  assert.equal(page.requests.length, 1);
  await page.advance(10000);
  page.setResult({ count: 8 });
  await page.click();
  assert.equal(page.requests[1].method, "GET");
  assert.equal(page.elements["visit-count"].textContent, "8");
});

test("Solo consulta periódicamente si está visible y pausa al ocultar la pestaña", async () => {
  const page = setup();
  await page.settle();
  await page.advance(60000);
  assert.equal(page.requests.length, 1);
  page.visible(true);
  await page.advance(10000);
  assert.equal(page.requests.length, 2);
  page.hidden(true);
  await page.advance(120000);
  assert.equal(page.requests.length, 2);
  page.hidden(false);
  await page.advance(10000);
  assert.equal(page.requests.length, 3);
});

test("Mantiene el último total al fallar y espacía los reintentos", async () => {
  const page = setup();
  await page.settle();
  page.visible(true);
  page.fail();
  await page.advance(60000);
  assert.equal(page.elements["visit-count"].textContent, "7");
  assert.match(page.elements["visit-status"].textContent, /Sin conexión/);
  await page.advance(60000);
  assert.equal(page.requests.length, 2);
  await page.advance(240000);
  assert.equal(page.requests.length, 3);
});

test("Una respuesta inválida no inventa cifras y los avances locales no registran visitas", async () => {
  const page = setup({ production: false, hidden: true });
  assert.equal(page.requests.length, 0);
  page.setResult({ count: -1 });
  page.hidden(false);
  await page.settle();
  assert.equal(page.requests[0].method, "GET");
  assert.equal(page.elements["visit-count"].textContent, "—");
  assert.equal(page.elements["visit-status"].textContent, "Contador no disponible");
});
