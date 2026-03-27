import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` does not connect to the DB; a placeholder is enough when DATABASE_URL
// is unset (fresh clone, CI, turbo build). Runtime and migrations still require a real URL.
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://postgres:postgres@127.0.0.1:5432/prisma_generate_placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
