const { Client } = require('pg');
require('dotenv').config({ path: process.env.HOME + '/xelnova-web-new/backend/.env' });

(async () => {
  const url = process.env.DATABASE_URL.replace('-pooler', '');
  const c = new Client({ connectionString: url });
  await c.connect();

  // Find pids holding the migration advisory lock
  const r1 = await c.query(`
    SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = 72707369
  `);
  console.log('pids holding lock:', r1.rows);

  for (const { pid } of r1.rows) {
    const r = await c.query('SELECT pg_terminate_backend($1) AS terminated', [pid]);
    console.log(`terminate pid=${pid}:`, r.rows);
  }

  // Re-check
  const r2 = await c.query(`
    SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = 72707369
  `);
  console.log('remaining pids holding lock:', r2.rows);

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
