import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.mjs';
function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => db.prepare(sql).get(...args) || null,
    run: async () => ({ success: true, meta: db.prepare(sql).run(...args) })
  });
  const env = { COUNTER_SALT: 'test-only-not-a-production-secret', DB: {
    prepare: wrap,
    batch: async statements => {
      db.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  }};
  return { db, env };
}
const request = (method = 'POST', ip = '192.0.2.1', agent = 'Firefox visitor', origin = 'https://cuby3212.github.io') => new Request('https://counter.example/visits', {
  method, headers: { Origin: origin, 'CF-Connecting-IP': ip, 'User-Agent': agent }
});
test('Recargas y consultas no duplican la misma visita', async () => {
  const {db,env}=setup();
  assert.equal((await (await worker.fetch(request('GET'),env)).json()).count,0);
  for(let i=0;i<8;i++)assert.equal((await (await worker.fetch(request(),env)).json()).count,1);
  assert.equal((await (await worker.fetch(request('GET'),env)).json()).count,1);
  assert.equal(db.prepare('SELECT count(*) n FROM visits').get().n,1);db.close();
});
test('Distingue IP y navegador y descarta bots conocidos', async () => {
  const {db,env}=setup();
  for(const req of [request(),request('POST','192.0.2.2'),request('POST','192.0.2.1','Chrome visitor')])await worker.fetch(req,env);
  await worker.fetch(request('POST','192.0.2.3','Googlebot'),env);
  assert.equal((await (await worker.fetch(request('GET'),env)).json()).count,3);db.close();
});
test('Elimina identificadores antiguos sin perder el total', async () => {
 const {db,env}=setup();db.exec("INSERT INTO visits VALUES ('old-token','2000-01-01')");
 await worker.fetch(request(),env);
 assert.equal(db.prepare('SELECT value FROM totals').get().value,2);
 const rows=db.prepare('SELECT * FROM visits').all();assert.equal(rows.length,1);assert.match(rows[0].token,/^[a-f0-9]{64}$/);
 assert(!JSON.stringify(rows).includes('192.0.2.1'));assert(!JSON.stringify(rows).includes('Firefox'));db.close();
});
test('Rechaza otros orígenes y métodos, configura CORS y no revela fallos internos', async () => {
 const {db,env}=setup();assert.equal((await worker.fetch(request('POST','192.0.2.1','Firefox','https://other.example'),env)).status,403);
 assert.equal((await worker.fetch(request('DELETE'),env)).status,405);
 const pre=await worker.fetch(request('OPTIONS'),env);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),'https://cuby3212.github.io');
 const failed=await worker.fetch(request(),{COUNTER_SALT:'x',DB:{batch:async()=>{throw Error('private internal detail')}}});assert.equal(failed.status,503);assert(!(await failed.text()).includes('private internal'));
 assert.equal((await worker.fetch(request(),{DB:env.DB})).status,503);db.close();
});
