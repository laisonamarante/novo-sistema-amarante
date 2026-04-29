import { z } from 'zod'
import { eq, and, desc, sql } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { advertencias, avisos, usuarios, permissoes } from '../../drizzle/schema'

export const advertenciasRouter = router({
  listar: protectedProcedure
    .input(z.object({
      usuarioId: z.number().optional(),
      status:    z.enum(['Pendente','Aceita','Contestada','Todos']).optional(),
      pagina:    z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const conds: any[] = []
      if (input.usuarioId) conds.push(eq(advertencias.usuarioId, input.usuarioId))
      if (input.status && input.status !== 'Todos') conds.push(eq(advertencias.status, input.status))

      return ctx.db.select({
        id:          advertencias.id,
        processoId:  advertencias.processoId,
        descricao:   advertencias.descricao,
        status:      advertencias.status,
        criadoEm:    advertencias.criadoEm,
        usuarioNome: usuarios.nome,
      })
      .from(advertencias)
      .leftJoin(usuarios, eq(advertencias.usuarioId, usuarios.id))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(advertencias.criadoEm))
      .limit(20).offset((input.pagina - 1) * 20)
    }),

  criar: protectedProcedure
    .input(z.object({
      usuarioId:   z.number(),
      processoId:  z.number().optional(),
      descricao:   z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(advertencias).values({
        ...input,
        criadoPorId: ctx.usuario.id,
        criadoEm: new Date(),
      })
      return { ok: true }
    }),

  atualizar: protectedProcedure
    .input(z.object({
      id:     z.number(),
      status: z.enum(['Pendente','Aceita','Contestada','Em Análise','Rejeitada']).optional(),
      motivoContestacao: z.string().optional(),
      justificativa:     z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...dados } = input
      const updates: any = { ...dados }
      if (dados.status && ['Aceita','Rejeitada','Encerrada'].includes(dados.status)) {
        updates.resolvidoEm = new Date()
      }
      await ctx.db.update(advertencias).set(updates).where(eq(advertencias.id, id))
      return { ok: true }
    }),
})

export const avisosRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(avisos)
      .orderBy(desc(avisos.criadoEm))
      .limit(50)
  }),

  criar: protectedProcedure
    .input(z.object({
      titulo:    z.string().min(1),
      mensagem:  z.string().min(1),
      perfil:    z.string().optional(),
      destinoId: z.number().optional(),
      dataInicio: z.string().optional(),
      dataFim:    z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(avisos).values({
        titulo:      input.titulo,
        mensagem:    input.mensagem,
        perfil:      input.perfil || 'Todos',
        dataInicio:  input.dataInicio || null,
        dataFim:     input.dataFim || null,
        destinoId:   input.destinoId,
        criadoPorId: ctx.usuario.id,
        criadoEm:    new Date(),
      } as any)
      return { ok: true }
    }),

  editar: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1),
      mensagem: z.string().min(1),
      perfil: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...dados } = input
      await ctx.db.update(avisos).set({ ...dados as any }).where(eq(avisos.id, id))
      return { ok: true }
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(avisos).where(eq(avisos.id, input.id))
      return { ok: true }
    }),

  marcarLido: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.update(avisos).set({ lido: true }).where(eq(avisos.id, input.id))
      return { ok: true }
    }),
})

export const permissoesRouter = router({
  listar: protectedProcedure
    .input(z.object({ usuarioId: z.number() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.select().from(permissoes)
        .where(eq(permissoes.usuarioId, input.usuarioId))
    }),

  salvar: protectedProcedure
    .input(z.object({
      usuarioId: z.number(),
      permissoes: z.array(z.object({
        modulo:  z.string(),
        ver:     z.boolean(),
        criar:   z.boolean(),
        editar:  z.boolean(),
        excluir: z.boolean(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Remove all existing permissions for this user
      await ctx.db.delete(permissoes).where(eq(permissoes.usuarioId, input.usuarioId))

      // Insert new permissions (only those with at least one true)
      const toInsert = input.permissoes
        .filter(p => p.ver || p.criar || p.editar || p.excluir)
        .map(p => ({
          usuarioId: input.usuarioId,
          modulo:    p.modulo,
          ver:       p.ver,
          criar:     p.criar,
          editar:    p.editar,
          excluir:   p.excluir,
        }))

      if (toInsert.length > 0) {
        await ctx.db.insert(permissoes).values(toInsert)
      }

      return { ok: true }
    }),
})

// ===================== PERMISSÕES PERFIL =====================
import { permissoesPerfil } from '../../drizzle/schema'

export const permissoesPerfilRouter = router({
  listarPorPerfil: protectedProcedure
    .input(z.object({ perfil: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.select().from(permissoesPerfil).where(eq(permissoesPerfil.perfil, input.perfil))
    }),

  listarTodos: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(permissoesPerfil)
  }),

  meuPerfil: protectedProcedure.query(async ({ ctx }) => {
    const perfil = ctx.usuario.perfil
    const perms = await ctx.db.select().from(permissoesPerfil).where(eq(permissoesPerfil.perfil, perfil))
    const map: Record<string, boolean> = {}
    perms.forEach(p => { map[p.recurso] = p.permitido })
    return {
      perfil,
      permissoes: map,
      parceiroId: ctx.usuario.parceiroId || null,
      corretorId: ctx.usuario.corretorId || null,
      imobiliariaId: ctx.usuario.imobiliariaId || null,
      construtoraId: ctx.usuario.construtoraId || null,
      subestabelecidoId: ctx.usuario.subestabelecidoId || null,
    }
  }),

  atualizar: protectedProcedure
    .input(z.object({ perfil: z.string(), recurso: z.string(), permitido: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      // Só admin pode alterar
      if (ctx.usuario.perfil !== 'Administrador') throw new Error('Sem permissão')
      const existing = await ctx.db.select().from(permissoesPerfil)
        .where(and(eq(permissoesPerfil.perfil, input.perfil), eq(permissoesPerfil.recurso, input.recurso)))
      if (existing.length > 0) {
        await ctx.db.update(permissoesPerfil).set({ permitido: input.permitido })
          .where(and(eq(permissoesPerfil.perfil, input.perfil), eq(permissoesPerfil.recurso, input.recurso)))
      } else {
        await ctx.db.insert(permissoesPerfil).values(input)
      }
      return { ok: true }
    }),

  salvarLote: protectedProcedure
    .input(z.object({
      perfil: z.string(),
      permissoes: z.array(z.object({
        recurso: z.string(),
        permitido: z.boolean(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.usuario.perfil !== 'Administrador') throw new Error('Sem permissão')

      await ctx.db.delete(permissoesPerfil).where(eq(permissoesPerfil.perfil, input.perfil))

      if (input.permissoes.length > 0) {
        await ctx.db.insert(permissoesPerfil).values(
          input.permissoes.map(p => ({
            perfil: input.perfil,
            recurso: p.recurso,
            permitido: p.permitido,
          }))
        )
      }

      return { ok: true }
    }),
})
