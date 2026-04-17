const { Client } = require('pg');
require('dotenv').config({ path: process.env.HOME + '/xelnova-web-new/backend/.env' });

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const r1 = await c.query(
    "SELECT is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='email'"
  );
  console.log('email column is_nullable:', r1.rows);

  const r2 = await c.query(
    "SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs FROM _prisma_migrations WHERE migration_name LIKE '20260417%' ORDER BY started_at"
  );
  console.log('migration rows:');
  for (const row of r2.rows) {
    console.log('---');
    console.log('name:', row.migration_name);
    console.log('started_at:', row.started_at);
    console.log('finished_at:', row.finished_at);
    console.log('rolled_back_at:', row.rolled_back_at);
    console.log('applied_steps_count:', row.applied_steps_count);
    console.log('logs (first 500 chars):', (row.logs || '').slice(0, 500));
  }

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
