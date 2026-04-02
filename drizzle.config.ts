import type { Config } from 'drizzle-kit'

export default {
  schema:    './drizzle/schema.ts',
  out:       './drizzle/migrations',
  driver:    'mysql2',
  dbCredentials: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME     || 'novo_sistema_amarante',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || '',
  },
} satisfies Config
