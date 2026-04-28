import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { eq, and } from 'drizzle-orm'
import type { Context } from './context'
import { permissoesPerfil } from '../drizzle/schema'

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

// Middleware: exige autenticação + recurso específico em permissoes_perfil.
// Uso: `requirePerm('processo:criar').input(...).mutation(...)`
export const requirePerm = (recurso: string) =>
  t.procedure.use(isAuthed).use(async ({ ctx, next }) => {
    if (!(await temPermissao(ctx, recurso))) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Permissão necessária: ${recurso}` })
    }
    return next({ ctx })
  })

// Middleware: exige autenticação + pelo menos UM dos recursos.
// Uso: `requireAnyPerm(['processo:editar', 'processo:ver_todos']).input(...).query(...)`
export const requireAnyPerm = (recursos: string[]) =>
  t.procedure.use(isAuthed).use(async ({ ctx, next }) => {
    for (const r of recursos) {
      if (await temPermissao(ctx, r)) return next({ ctx })
    }
    throw new TRPCError({ code: 'FORBIDDEN', message: `Permissão necessária: ${recursos.join(' | ')}` })
  })
