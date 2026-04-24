import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../drizzle/schema'
import { inferAsyncReturnType } from '@trpc/server'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'

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

async function resolverVinculosDoUsuario(usuario: any) {
  if (!usuario?.id || !usuario?.perfil) return usuario

  let parceiroId = null
  let corretorId = null
  let imobiliariaId = null
  let constutoraId = null
  let subestabelecidoId = usuario.subestabelecidoId || null

  if (usuario.perfil === 'Parceiro') {
    const [parceiro] = await db
      .select({ id: schema.parceiros.id })
      .from(schema.parceiros)
      .where(eq(schema.parceiros.usuarioId, usuario.id))

    if (parceiro) parceiroId = parceiro.id
  } else if (usuario.perfil === 'Corretor') {
    const [corretor] = await db
      .select({
        id: schema.corretores.id,
        parceiroId: schema.corretores.parceiroId,
        imobiliariaId: schema.corretores.imobiliariaId,
      })
      .from(schema.corretores)
      .where(eq(schema.corretores.usuarioId, usuario.id))

    if (corretor) {
      corretorId = corretor.id
      parceiroId = corretor.parceiroId
      imobiliariaId = corretor.imobiliariaId

      if (!parceiroId && corretor.imobiliariaId) {
        const [imobiliaria] = await db
          .select({ parceiroId: schema.imobiliarias.parceiroId })
          .from(schema.imobiliarias)
          .where(eq(schema.imobiliarias.id, corretor.imobiliariaId))

        parceiroId = imobiliaria?.parceiroId || null
      }
    }
  } else if (usuario.perfil === 'Imobiliária') {
    const [imobiliaria] = await db
      .select({ id: schema.imobiliarias.id, parceiroId: schema.imobiliarias.parceiroId })
      .from(schema.imobiliarias)
      .where(eq(schema.imobiliarias.usuarioId, usuario.id))

    if (imobiliaria) {
      imobiliariaId = imobiliaria.id
      parceiroId = imobiliaria.parceiroId
    }
  } else if (usuario.perfil === 'Construtora') {
    const [construtora] = await db
      .select({ id: schema.construtoras.id, parceiroId: schema.construtoras.parceiroId })
      .from(schema.construtoras)
      .where(eq(schema.construtoras.usuarioId, usuario.id))

    if (construtora) {
      constutoraId = construtora.id
      parceiroId = construtora.parceiroId
    }
  } else if (usuario.perfil === 'Subestabelecido' && usuario.subestabelecidoId) {
    const [subestabelecido] = await db
      .select({ id: schema.subestabelecidos.id, parceiroId: schema.subestabelecidos.parceiroId })
      .from(schema.subestabelecidos)
      .where(eq(schema.subestabelecidos.id, usuario.subestabelecidoId))

    if (subestabelecido) {
      subestabelecidoId = subestabelecido.id
      parceiroId = subestabelecido.parceiroId
    }
  }

  return {
    ...usuario,
    parceiroId,
    corretorId,
    imobiliariaId,
    constutoraId,
    subestabelecidoId,
  }
}

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const token = req.headers.authorization?.split(' ')[1]
  let usuario = null
  if (token) {
    try {
      usuario = jwt.verify(token, process.env.JWT_SECRET!) as any
      usuario = await resolverVinculosDoUsuario(usuario)
    } catch {}
  }
  return { db, usuario, req, res }
}

export type Context = inferAsyncReturnType<typeof createContext>
