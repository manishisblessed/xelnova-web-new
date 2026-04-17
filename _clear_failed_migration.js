const { Client } = require('pg');
require('dotenv').config({ path: process.env.HOME + '/xelnova-web-new/backend/.env' });

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(
    "DELETE FROM _prisma_migrations WHERE migration_name = '20260417000000_make_email_nullable' RETURNING migration_name, finished_at, rolled_back_at"
  );
  console.log('deleted rows:', r.rows);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
