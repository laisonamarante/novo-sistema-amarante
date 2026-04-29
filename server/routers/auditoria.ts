import { z } from 'zod'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { router, roleProcedure } from '../trpc'
import { auditoria } from '../../drizzle/schema'

export const auditoriaRouter = router({
  // Lista log de auditoria (admin only). Filtros opcionais + paginação.
  listar: roleProcedure(['Administrador'])
    .input(z.object({
      usuarioId: z.number().optional(),
      recurso:   z.string().optional(),
      busca:     z.string().optional(), // busca em procedure_path ou input_json
      desde:     z.string().optional(), // YYYY-MM-DD
      ate:       z.string().optional(),
      pagina:    z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const conds: any[] = []
      if (input.usuarioId) conds.push(eq(auditoria.usuarioId, input.usuarioId))
      if (input.recurso)   conds.push(eq(auditoria.recurso, input.recurso))
      if (input.busca) {
        conds.push(sql`(${auditoria.procedurePath} LIKE ${'%'+input.busca+'%'} OR ${auditoria.inputJson} LIKE ${'%'+input.busca+'%'})`)
      }
      if (input.desde) conds.push(gte(auditoria.criadoEm, new Date(input.desde + 'T00:00:00')))
      if (input.ate)   conds.push(lte(auditoria.criadoEm, new Date(input.ate   + 'T23:59:59')))

      const where = conds.length ? and(...conds) : undefined
      const pageSize = 50
      const offset = (input.pagina - 1) * pageSize

      const linhas = await ctx.db.select().from(auditoria)
        .where(where)
        .orderBy(desc(auditoria.criadoEm))
        .limit(pageSize).offset(offset)

      const [{ total } = { total: 0 }] = await ctx.db
        .select({ total: sql<number>`COUNT(*)` })
        .from(auditoria).where(where)

      return { linhas, total: Number(total), pagina: input.pagina, pageSize }
    }),

  // Lista de recursos distintos (pra dropdown de filtro)
  recursosDistintos: roleProcedure(['Administrador']).query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ recurso: auditoria.recurso })
      .from(auditoria)
      .groupBy(auditoria.recurso)
      .orderBy(auditoria.recurso)
    return rows.map(r => r.recurso)
  }),
})
