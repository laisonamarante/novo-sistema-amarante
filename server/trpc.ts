import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { eq, and } from 'drizzle-orm'
import type { Context } from './context'
import { permissoesPerfil, auditoria } from '../drizzle/schema'

const t = initTRPC.context<Context>().create({ transformer: superjson })

export const router           = t.router
export const publicProcedure  = t.procedure
export const middleware        = t.middleware

const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.usuario) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, usuario: ctx.usuario } })
})

export const protectedProcedure = t.procedure.use(isAuthed)

export const roleProcedure = (roles: string[]) =>
  t.procedure.use(isAuthed).use(({ ctx, next }) => {
    if (!roles.includes(ctx.usuario.perfil)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' })
    }
    return next({ ctx })
  })

// Verifica se o perfil do usuário tem o recurso autorizado em permissoes_perfil.
// Admin sempre passa. Default-deny pra recursos não cadastrados.
async function temPermissao(ctx: any, recurso: string): Promise<boolean> {
  if (!ctx.usuario) return false
  if (ctx.usuario.perfil === 'Administrador') return true
  const [row] = await ctx.db.select({ permitido: permissoesPerfil.permitido })
    .from(permissoesPerfil)
    .where(and(
      eq(permissoesPerfil.perfil, ctx.usuario.perfil),
      eq(permissoesPerfil.recurso, recurso),
    ))
  return Boolean(row?.permitido)
}

// Best-effort: registra mutation bem-sucedida em `auditoria`. Nunca lança.
async function registrarAuditoria(
  ctx: any,
  recurso: string,
  path: string | undefined,
  rawInput: unknown,
) {
  try {
    let inputStr: string | null = null
    if (rawInput !== undefined && rawInput !== null) {
      try { inputStr = JSON.stringify(rawInput) } catch { inputStr = '[input nao serializavel]' }
      // Trunca input pra evitar TEXT enorme
      if (inputStr && inputStr.length > 8000) inputStr = inputStr.slice(0, 8000) + '...'
    }
    const ip = ctx.req?.ip
      || (ctx.req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || ctx.req?.socket?.remoteAddress
      || null
    await ctx.db.insert(auditoria).values({
      usuarioId:     ctx.usuario.id,
      usuarioNome:   ctx.usuario.nome || null,
      perfil:        ctx.usuario.perfil || null,
      recurso,
      procedurePath: path || 'unknown',
      inputJson:     inputStr,
      ip:            ip ? String(ip).slice(0, 45) : null,
    })
  } catch (e) {
    // Log na console mas não bloqueia a mutation
    console.error('[auditoria] falha ao registrar:', e)
  }
}

// Middleware: exige autenticação + recurso específico em permissoes_perfil.
// Em mutations bem-sucedidas, registra automaticamente em `auditoria`.
// Uso: `requirePerm('processo:criar').input(...).mutation(...)`
export const requirePerm = (recurso: string) =>
  t.procedure.use(isAuthed).use(async ({ ctx, next, path, type, rawInput }) => {
    if (!(await temPermissao(ctx, recurso))) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Permissão necessária: ${recurso}` })
    }
    const result = await next({ ctx })
    if (type === 'mutation' && result.ok) {
      // Fire-and-forget — não awaitar (mas mantém connection pool ocupado por ms)
      void registrarAuditoria(ctx, recurso, path, rawInput)
    }
    return result
  })

// Middleware: exige autenticação + pelo menos UM dos recursos.
// Não loga em auditoria (uso geralmente em queries).
// Uso: `requireAnyPerm(['processo:editar', 'processo:ver_todos']).input(...).query(...)`
export const requireAnyPerm = (recursos: string[]) =>
  t.procedure.use(isAuthed).use(async ({ ctx, next }) => {
    for (const r of recursos) {
      if (await temPermissao(ctx, r)) return next({ ctx })
    }
    throw new TRPCError({ code: 'FORBIDDEN', message: `Permissão necessária: ${recursos.join(' | ')}` })
  })
