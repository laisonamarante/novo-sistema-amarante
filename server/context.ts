import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../drizzle/schema'
import { inferAsyncReturnType } from '@trpc/server'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET nao definido no .env')
  process.exit(1)
}

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'novo_sistema_amarante',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 5,
  idleTimeout: 60000,
})

export const db = drizzle(pool, { schema, mode: 'default' })

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const token = req.headers.authorization?.split(' ')[1]
  let usuario = null
  if (token) {
    try {
      usuario = jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch {}
  }
  return { db, usuario, req, res }
}

export type Context = inferAsyncReturnType<typeof createContext>
