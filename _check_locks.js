const { Client } = require('pg');
require('dotenv').config({ path: process.env.HOME + '/xelnova-web-new/backend/.env' });

(async () => {
  const url = process.env.DATABASE_URL.replace('-pooler', '');
  const c = new Client({ connectionString: url });
  await c.connect();

  // Look for advisory locks
  const r1 = await c.query(`
    SELECT l.locktype, l.classid, l.objid, l.granted, a.pid, a.usename, a.application_name,
           a.state, a.query_start, NOW() - a.query_start AS age, a.query
    FROM pg_locks l
    LEFT JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.locktype = 'advisory'
    ORDER BY a.query_start
  `);
  console.log('advisory locks:', JSON.stringify(r1.rows, null, 2));

  // Idle/long-running sessions on neondb
  const r2 = await c.query(`
    SELECT pid, usename, application_name, state, query_start,
           NOW() - query_start AS age, LEFT(query, 200) AS query
    FROM pg_stat_activity
    WHERE datname = 'neondb' AND pid <> pg_backend_pid()
    ORDER BY query_start
  `);
  console.log('---');
  console.log('all sessions on neondb:', JSON.stringify(r2.rows, null, 2));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
