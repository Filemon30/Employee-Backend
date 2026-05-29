const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'transactions';");
  console.log('constraints:', res.rows);
  const res2 = await client.query("SELECT constraint_name, column_name FROM information_schema.key_column_usage WHERE table_schema = 'public' AND table_name = 'transactions' ORDER BY constraint_name, ordinal_position;");
  console.log('keys:', res2.rows);
  await client.end();
})();
