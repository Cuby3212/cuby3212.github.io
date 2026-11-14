/* Pruebas de comportamiento sin navegador ni dependencias: node --test tests/site.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/site.js'), 'utf8');

class Events {
  constructor() { this.listeners = {}; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  fire(type, values = {}) {
    const event = { target: this, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const callback of this.listeners[type] || []) callback(event);
    return event;
  }
}
class Classes {
  constructor(...names) { this.names = new Set(names); }
  contains(name) { return this.names.has(name); }
  add(...names) { names.forEach(name => this.names.add(name)); }
  remove(...names) { names.forEach(name => this.names.delete(name)); }
  toggle(name, enabled = !this.contains(name)) { enabled ? this.add(name) : this.remove(name); return enabled; }
}
class Element extends Events {
  constructor(tag = 'div') {
    super(); this.tag = tag; this.classList = new Classes(); this.dataset = {};
    this.attributes = {}; this.children = []; this.textContent = ''; this.open = false;
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.summary = tag === 'details' ? new Element('summary') : null;
    this.naturalHeight = 244;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  querySelector(selector) { return selector === 'summary' ? this.summary : selector === 'span' ? this.icon : null; }
  appendChild(child) {
    if (child.tag === '#fragment') child.children.forEach(node => this.appendChild(node));
    else { this.children.push(child); child.parent = this; }
    return child;
  }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  getBoundingClientRect() {
    const height = this.animation?.running ? this.animation.height :
      this.style.height ? parseFloat(this.style.height) : this.tag === 'details' ? (this.open ? this.naturalHeight : 44) : 44;
    return { left: 0, top: 0, width: 200, height };
  }
  animate(frames, options) {
    const animation = {
      frames, options, running: true, height: parseFloat(frames[0].height),
      cancel() { this.running = false; this.cancelled = true; },
      finish() { if (!this.running) return; this.running = false; this.onfinish?.(); },
      advance(fraction) { this.height = parseFloat(frames[0].height) + (parseFloat(frames[1].height) - parseFloat(frames[0].height)) * fraction; }
    };
    this.animation = animation;
    return animation;
  }
}
function boot(options = {}) {
  const document = new Events(), window = new Events();
  const body = new Element(), root = new Element('html');
  root.classList.add('theme-auto'); root.setAttribute('data-season', 'autumn');
  const nodes = Object.fromEntries(['year','clock-peninsula','clock-canarias','theme-toggle','motion-toggle','theme-color-meta','greeting','seasonal-fx','secret-trigger'].map(id => [id, new Element()]));
  nodes['theme-toggle'].icon = new Element('span'); nodes['motion-toggle'].icon = new Element('span');
  const heading = new Element('h1'), avatar = new Element(), button = new Element('a'), background = new Element();
  const outer = new Element('details'), inner = new Element('details');
  if (options.noAnimate) { outer.animate = undefined; inner.animate = undefined; }
  document.documentElement = root; document.body = body; document.hidden = !!options.hidden;
  document.getElementById = id => nodes[id] || null;
  document.createElement = tag => new Element(tag);
  document.createDocumentFragment = () => new Element('#fragment');
  document.querySelector = selector => ({ h1: heading, '.avatar-wrap': avatar }[selector] || (selector === '.toast' ? body.children.find(e => e.className === 'toast') : null));
  document.querySelectorAll = selector => ({ '.info-toggle, .faq-item': [outer, inner], '.bg-layer': [background], '.container .button': [button] }[selector] || []);
  const queries = {};
  window.matchMedia = query => {
    if (!queries[query]) {
      queries[query] = new Events();
      queries[query].matches = query.includes('reduced-motion') ? !!options.reduced : query.includes('pointer: fine') ? true : false;
    }
    return queries[query];
  };
  window.innerWidth = 1000; window.innerHeight = 800;
  const values = { ...options.storage }, writes = [];
  const localStorage = {
    getItem(key) { if (options.blockedStorage) throw Error('blocked'); return values[key] ?? null; },
    setItem(key, value) { if (options.blockedStorage) throw Error('blocked'); values[key] = value; writes.push([key,value]); }
  };
  const timers = new Map(), frames = new Map(); let nextId = 1, formatCalls = 0;
  const instant = options.date || '2026-11-14T12:34:25Z';
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new Date(instant).getTime(); }
  }
  const context = {
    document, window, localStorage, Date: FixedDate, console,
    Intl: { DateTimeFormat: function(locale, config) {
      if (options.noIntl) throw Error('unsupported');
      return { format(date) { formatCalls++; return new Intl.DateTimeFormat(locale, config).format(date); } };
    } },
    getComputedStyle: () => ({ paddingTop:'0', paddingBottom:'0', borderTopWidth:'0', borderBottomWidth:'0' }),
    setTimeout(callback, delay) { const id = nextId++; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  };
  vm.runInNewContext(source, context, { filename: 'site.js' });
  const runTimer = delay => { const pair = [...timers].find(([,timer]) => timer.delay === delay); assert.ok(pair, 'Debe existir el temporizador'); timers.delete(pair[0]); pair[1].callback(); };
  const flushFrames = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } };
  return { document, window, body, root, nodes, heading, avatar, button, outer, inner, queries, timers, frames, writes, values, runTimer, flushFrames, get formatCalls() { return formatCalls; } };
}

test('relojes por minuto y suspensión de temporizadores al ocultar la pestaña', () => {
  const app = boot(); assert.equal(app.formatCalls, 2);
  assert.equal([...app.timers.values()].filter(t => t.delay === 35000).length, 1);
  app.document.hidden = true; app.document.fire('visibilitychange');
  assert.equal(app.timers.size, 0); assert.equal(app.body.classList.contains('page-hidden'), true);
  app.document.hidden = false; app.document.fire('visibilitychange');
  assert.equal(app.formatCalls, 4); assert.equal(app.body.classList.contains('page-hidden'), false);
});
test('pausar termina el saludo y no guarda preferencias durante el arranque', () => {
  const app = boot(); assert.equal(app.writes.length, 0); app.runTimer(38);
  app.nodes['motion-toggle'].fire('click');
  assert.equal(app.body.classList.contains('motion-paused'), true);
  assert.ok(app.nodes.greeting.textContent.length > 3);
  assert.equal([...app.timers.values()].some(t => t.delay === 38), false);
});
test('almacenamiento bloqueado y zonas horarias no soportadas tienen recuperación', () => {
  const app = boot({ blockedStorage:true, noIntl:true });
  app.nodes['theme-toggle'].fire('click');
  assert.equal(app.root.classList.contains('theme-dark'), true);
  assert.equal(app.nodes['clock-canarias'].textContent, '--:--');
});
test('respeta las preferencias del sistema y los cambios de movimiento en directo', () => {
  const app = boot({ storage:{'cuby-motion':'on'}, reduced:true });
  assert.equal(app.body.classList.contains('motion-paused'), true);
  assert.equal(app.nodes['motion-toggle'].disabled, true);
  const media = app.queries['(prefers-reduced-motion: reduce)']; media.matches = false; media.fire('change');
  assert.equal(app.body.classList.contains('motion-paused'), false);
  assert.equal(app.nodes['motion-toggle'].disabled, false);
});
test('desplegables abren, cierran y sincronizan la flecha al inicio del cierre', () => {
  const app = boot(); const panel = app.outer;
  assert.equal(panel.summary.fire('click').defaultPrevented, true);
  assert.equal(panel.open, true); assert.equal(panel.dataset.expanded, 'true');
  panel.animation.finish(); assert.equal(panel.style.height, '');
  panel.summary.fire('click'); assert.equal(panel.open, true); assert.equal(panel.dataset.expanded, 'false');
  panel.animation.finish(); assert.equal(panel.open, false); assert.equal(panel.style.height, '');
});
test('pulsaciones rápidas revierten el desplegable sin ejecutar finales obsoletos', () => {
  const app = boot(), panel = app.outer;
  panel.summary.fire('click'); const first = panel.animation; first.advance(.5);
  panel.summary.fire('click'); assert.equal(first.cancelled, true); assert.equal(first.onfinish, null);
  panel.animation.finish(); assert.equal(panel.open, false); assert.equal(panel.dataset.expanded, 'false');
});
test('redimensionar y pausar completan cualquier despliegue pendiente', () => {
  const app = boot(); app.outer.summary.fire('click'); app.window.fire('resize');
  assert.equal(app.outer.open, true); assert.equal(app.outer.style.height, '');
  app.inner.summary.fire('click'); app.nodes['motion-toggle'].fire('click');
  assert.equal(app.inner.open, true); assert.equal(app.inner.style.height, '');
});
test('navegadores sin animate conservan el comportamiento nativo de details', () => {
  const app = boot({ noAnimate:true });
  assert.equal(app.outer.summary.fire('click').defaultPrevented, undefined);
  app.outer.open = true; app.outer.fire('toggle'); assert.equal(app.outer.dataset.expanded, 'true');
});
test('puntero agrupado por fotograma y limpieza de inclinación al cancelar', () => {
  const app = boot();
  for (let i = 0; i < 5; i++) app.window.fire('pointermove', { clientX:100, clientY:100 });
  assert.equal(app.frames.size, 1); app.flushFrames();
  app.button.fire('pointermove', { clientX:100, clientY:10 }); app.flushFrames();
  assert.ok(app.button.style.transform.includes('perspective'));
  app.button.fire('pointercancel'); assert.equal(app.button.style.transform, '');
  app.window.fire('pointermove', { clientX:150, clientY:150 });
  app.nodes['motion-toggle'].fire('click'); assert.equal(app.frames.size, 0);
});
test('se conservan las partículas de cada día especial y las ocho estacionales', () => {
  for (const [date, icon, css] of [['2026-12-25T12:00Z','🎁','holiday-xmas'],['2027-01-01T12:00Z','🎆','holiday-newyear'],['2026-10-31T12:00Z','🎃','holiday-halloween']]) {
    const app = boot({date}); assert.equal(app.nodes['seasonal-fx'].children.length, 8);
    assert.equal(app.nodes['seasonal-fx'].children[0].textContent, icon); assert.ok(app.heading.classList.contains(css));
  }
  assert.equal(boot().nodes['seasonal-fx'].children[0].textContent, '🍁');
});
test('el código secreto conserva su función y no intercepta campos de texto', () => {
  const app = boot(); const keys = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  keys.forEach(key => app.window.fire('keydown', {key, target:{closest:()=>true}}));
  assert.equal(app.body.classList.contains('secret-mode'), false);
  keys.forEach(key => app.window.fire('keydown', {key})); assert.equal(app.body.classList.contains('secret-mode'), true);
  assert.equal(app.body.children[0].attributes.role, 'status');
});
test('tres pulsaciones revelan la aurora y Escape recupera las ocho partículas originales', () => {
  const app = boot();
  for(let i=0;i<3;i++) app.nodes['secret-trigger'].fire('click');
  assert.equal(app.body.classList.contains('secret-mode'), true);
  assert.equal(app.nodes['seasonal-fx'].children.length, 8);
  assert.equal(app.nodes['seasonal-fx'].children[0].textContent, '🦋');
  app.window.fire('keydown', {key:'Escape'});
  assert.equal(app.body.classList.contains('secret-mode'), false);
  assert.equal(app.nodes['seasonal-fx'].children[0].textContent, '🍁');
});
test('la sorpresa funciona con movimiento reducido y se desactiva con otras tres pulsaciones', () => {
  const app = boot({reduced:true});
  for(let i=0;i<3;i++) app.nodes['secret-trigger'].fire('click');
  assert.equal(app.body.classList.contains('motion-paused'), true);
  for(let i=0;i<3;i++) app.nodes['secret-trigger'].fire('click');
  assert.equal(app.body.classList.contains('secret-mode'), false);
});

test('pausar y reanudar no vuelve a lanzar una entrada de la tarjeta', () => {
  const app = boot();
  const heading = app.nodes.greeting.textContent;
  for (let i = 0; i < 4; i++) app.nodes['motion-toggle'].fire('click');
  assert.equal(app.body.classList.contains('motion-paused'), false);
  assert.ok(app.nodes.greeting.textContent.length >= heading.length);
  const css = fs.readFileSync(path.join(__dirname, '../css/custom.css'), 'utf8');
  assert.doesNotMatch(css, /glassEnter/);
  assert.doesNotMatch(css, /body\.motion-paused \.container\s*\{[^}]*animation:/);
});

test('el fondo estacional y los eventos se seleccionan antes del primer pintado', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [date, season, event] of [
    ['2026-04-15', 'spring', 'none'], ['2026-07-15', 'summer', 'none'],
    ['2026-11-14', 'autumn', 'none'], ['2026-02-15', 'winter', 'none'],
    ['2026-12-23', 'winter', 'none'], ['2026-12-24', 'winter', 'xmas'],
    ['2026-12-26', 'winter', 'xmas'], ['2026-12-27', 'winter', 'none'],
    ['2026-12-31', 'winter', 'newyear'], ['2027-01-01', 'winter', 'newyear'],
    ['2027-01-02', 'winter', 'none'], ['2026-10-31', 'autumn', 'halloween']
  ]) {
    const root = new Element();
    class CalendarDate extends Date { constructor() { super(date + 'T12:00:00'); } }
    vm.runInNewContext(bootstrap, {document:{documentElement:root}, Date:CalendarDate, localStorage:{getItem:()=>null}});
    assert.equal(root.getAttribute('data-season'), season, date);
    assert.equal(root.getAttribute('data-event'), event, date);
  }
});
