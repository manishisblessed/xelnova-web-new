const { Client } = require('pg');
require('dotenv').config({ path: process.env.HOME + '/xelnova-web-new/backend/.env' });

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r1 = await c.query(
    "SELECT COUNT(*) FROM users WHERE email LIKE '%@phone.user.xelnova.in'"
  );
  console.log('rows with @phone.user.xelnova.in email:', r1.rows[0].count);
  const r2 = await c.query("SELECT COUNT(*) FROM users WHERE email IS NULL");
  console.log('rows with null email:', r2.rows[0].count);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
