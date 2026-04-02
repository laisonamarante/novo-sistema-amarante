import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'

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
