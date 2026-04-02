import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq, sql } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure, roleProcedure } from '../trpc'
import { usuarios } from '../../drizzle/schema'
import { TRPCError } from '@trpc/server'

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || (now - entry.lastAttempt) > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  entry.lastAttempt = now
  return true
}

function resetRateLimit(key: string) {
  loginAttempts.delete(key)
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of loginAttempts) {
    if (now - entry.lastAttempt > WINDOW_MS) loginAttempts.delete(key)
  }
}, 30 * 60 * 1000)

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ login: z.string().max(100), senha: z.string().max(200) }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || 'unknown'
      const rateLimitKey = ip + ':' + input.login.toLowerCase()

      if (!checkRateLimit(rateLimitKey)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Muitas tentativas de login. Aguarde 15 minutos.',
        })
      }

      const [user] = await ctx.db.select().from(usuarios).where(sql`LOWER(${usuarios.login}) = LOWER(${input.login})`)
      if (!user || !user.ativo) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario nao encontrado ou inativo' })

      const ok = await bcrypt.compare(input.senha, user.senha)
      if (!ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha incorreta' })

      resetRateLimit(rateLimitKey)

      const token = jwt.sign(
        { id: user.id, login: user.login, nome: user.nome, perfil: user.perfil },
        process.env.JWT_SECRET!,
        { expiresIn: '8h' }
      )
      return { token, usuario: { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil } }
    }),

  me: protectedProcedure.query(({ ctx }) => ctx.usuario),

  alterarSenha: protectedProcedure
    .input(z.object({ senhaAtual: z.string().max(200), novaSenha: z.string().min(6).max(200) }))
    .mutation(async ({ input, ctx }) => {
      const [user] = await ctx.db.select().from(usuarios).where(eq(usuarios.id, ctx.usuario.id))
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario nao encontrado' })
      const ok = await bcrypt.compare(input.senhaAtual, user.senha)
      if (!ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha atual incorreta' })
      const hash = await bcrypt.hash(input.novaSenha, 10)
      await ctx.db.update(usuarios).set({ senha: hash }).where(eq(usuarios.id, ctx.usuario.id))
      return { ok: true }
    }),

  resetarSenha: roleProcedure(['Administrador'])
    .input(z.object({ usuarioId: z.number(), novaSenha: z.string().min(6).max(200) }))
    .mutation(async ({ input, ctx }) => {
      const [user] = await ctx.db.select().from(usuarios).where(eq(usuarios.id, input.usuarioId))
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario nao encontrado' })
      const hash = await bcrypt.hash(input.novaSenha, 10)
      await ctx.db.update(usuarios).set({ senha: hash }).where(eq(usuarios.id, input.usuarioId))
      return { ok: true }
    }),
})
