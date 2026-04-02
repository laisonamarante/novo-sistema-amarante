import { z } from 'zod'
import { eq, and, gte, lte, desc, count, like } from 'drizzle-orm'
import { router, protectedProcedure, roleProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { contasPagar, contasReceber, fluxoCaixa, finEmpresas, finContas, finFornecedores, finDevedores, finTipoDespesas, finTipoReceitas, finNaturezas } from '../../drizzle/schema'

const formasPagamento = ['BOLETO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','DÉBITO EM CONTA','DINHEIRO','PIX','TRANSFERÊNCIA BANCÁRIA'] as const

// Helper: limpar campos vazios antes de inserir
function cleanEmpty(obj: any) {
  const cleaned = { ...obj };
  for (const k of Object.keys(cleaned)) {
    if (cleaned[k] === '') cleaned[k] = undefined;
    if (cleaned[k] === null) cleaned[k] = undefined;
  }
  return cleaned;
}
const financeiroAdmin = roleProcedure(['Administrador', 'Financeiro'])

export const financeiroRouter = router({
  // ─── CONTAS A PAGAR ───────────────────────────────────
  contasPagar: router({
    listar: financeiroAdmin
      .input(z.object({
        dataInicio:    z.string().optional(),
        dataFim:       z.string().optional(),
        valor:         z.string().optional(),
        codigo:        z.number().optional(),
        tipoDespesaId: z.number().optional(),
        fornecedorId:  z.number().optional(),
        formaPagamento: z.string().optional(),
        contaId:       z.number().optional(),
        numDocumento:  z.string().optional(),
        naturezaId:    z.number().optional(),
        empresaId:     z.number().optional(),
        status:        z.enum(['Pendente','Pago','Todos']).optional(),
        atrasadas:     z.boolean().optional(),
        despesaFixa:   z.boolean().optional(),
        pagina:        z.number().default(1),
      }))
      .query(async ({ input, ctx }) => {
        const conds: any[] = []
        if (input.dataInicio) conds.push(gte(contasPagar.vencimento, new Date(input.dataInicio) as any))
        if (input.dataFim)    conds.push(lte(contasPagar.vencimento, new Date(input.dataFim) as any))
        if (input.tipoDespesaId) conds.push(eq(contasPagar.tipoDespesaId, input.tipoDespesaId))
        if (input.fornecedorId)  conds.push(eq(contasPagar.fornecedorId, input.fornecedorId))
        if (input.contaId)       conds.push(eq(contasPagar.contaId, input.contaId))
        if (input.empresaId)     conds.push(eq(contasPagar.empresaId, input.empresaId))
        if (input.status && input.status !== 'Todos') conds.push(eq(contasPagar.status, input.status as any))
        if (input.despesaFixa !== undefined) conds.push(eq(contasPagar.despesaFixa, input.despesaFixa))
        if (input.formaPagamento) conds.push(eq(contasPagar.formaPagamento, input.formaPagamento as any))
        if (input.numDocumento)   conds.push(like(contasPagar.numDocumento, `%${input.numDocumento}%`))
        if (input.historico)      conds.push(like(contasPagar.historico, `%${input.historico}%`))
        if (input.codigo)         conds.push(eq(contasPagar.id, input.codigo))
        if (input.atrasadas)      conds.push(lte(contasPagar.vencimento, new Date() as any))

        const lista = await ctx.db
          .select({
            id: contasPagar.id,
            vencimento: contasPagar.vencimento,
            valor: contasPagar.valor,
            valorPago: contasPagar.valorPago,
            historico: contasPagar.historico,
            formaPagamento: contasPagar.formaPagamento,
            status: contasPagar.status,
            parcelaAtual: contasPagar.parcelaAtual,
            totalParcelas: contasPagar.totalParcelas,
            despesaFixa: contasPagar.despesaFixa,
            dataPagamento: contasPagar.dataPagamento,
            fornecedorNome: finFornecedores.nome,
            tipoDespesaNome: finTipoDespesas.nome,
            empresaNome: finEmpresas.nome,
          })
          .from(contasPagar)
          .leftJoin(finFornecedores, eq(contasPagar.fornecedorId, finFornecedores.id))
          .leftJoin(finTipoDespesas, eq(contasPagar.tipoDespesaId, finTipoDespesas.id))
          .leftJoin(finEmpresas, eq(contasPagar.empresaId, finEmpresas.id))
          .where(and(...conds))
          .orderBy(contasPagar.vencimento)
          .limit(10).offset((input.pagina - 1) * 10)

        const [cnt] = await ctx.db.select({ total: count() }).from(contasPagar).where(and(...conds))
        return { lista, totalPaginas: Math.ceil(cnt.total / 10) || 1 }
      }),

    criar: protectedProcedure
      .input(z.object({
        vencimento:    z.string(),
        valor:         z.string(),
        parcelas:      z.number().default(1),
        tipoDespesaId: z.number().optional(),
        fornecedorId:  z.number().optional(),
        contaId:       z.number().optional(),
        formaPagamento: z.enum(formasPagamento).optional(),
        empresaId:     z.number().optional(),
        historico: z.string().max(500).optional(),
        naturezaId:    z.number().optional(),
        despesaFixa:   z.boolean().optional(),
        observacao: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { parcelas, ...rawBase } = input; const base = cleanEmpty(rawBase)
        const inserts = Array.from({ length: parcelas }, (_, i) => {
          const dt = new Date(base.vencimento)
          dt.setMonth(dt.getMonth() + i)
          return {
            ...base as any,
            vencimento: dt,
            parcelaAtual: i + 1,
            totalParcelas: parcelas,
            usuarioId: ctx.usuario.id,
            criadoEm: new Date(),
          }
        })
        await ctx.db.insert(contasPagar).values(inserts)
        return { ok: true }
      }),


    editar: protectedProcedure
      .input(z.object({
        id:            z.number(),
        vencimento:    z.string().optional(),
        valor:         z.string().optional(),
        tipoDespesaId: z.number().optional(),
        fornecedorId:  z.number().optional(),
        contaId:       z.number().optional(),
        formaPagamento: z.enum(formasPagamento).optional(),
        empresaId:     z.number().optional(),
        historico:     z.string().optional(),
        despesaFixa:   z.boolean().optional(),
        alterarParcelasFuturas: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, alterarParcelasFuturas, vencimento, ...rest } = input
        const updates: any = { ...cleanEmpty(rest) }
        if (vencimento) updates.vencimento = new Date(vencimento)

        if (alterarParcelasFuturas) {
          // busca a conta atual para obter parcelaAtual
          const [atual] = await ctx.db.select().from(contasPagar).where(eq(contasPagar.id, id))
          if (atual && atual.totalParcelas && atual.totalParcelas > 1) {
            // atualiza todas as parcelas futuras do mesmo grupo (mesmo totalParcelas e criadas_em similar)
            // identifica parcelas futuras pelo vencimento >= atual e status Pendente
            await ctx.db.update(contasPagar).set(updates)
              .where(and(
                eq(contasPagar.totalParcelas, atual.totalParcelas),
                eq(contasPagar.status, 'Pendente'),
                eq(contasPagar.despesaFixa, atual.despesaFixa || false),
              ))
            return { ok: true }
          }
        }

        await ctx.db.update(contasPagar).set(updates).where(eq(contasPagar.id, id))
        return { ok: true }
      }),

    pagar: protectedProcedure
      .input(z.object({
        id:            z.number(),
        dataPagamento: z.string(),
        valorPago:     z.string(),
        formaPagamento: z.enum(formasPagamento).optional(),
        contaId:       z.number(),
        empresaId:     z.number(),
        naturezaId:    z.number().optional(),
        historico: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [existe] = await ctx.db.select().from(contasPagar).where(eq(contasPagar.id, input.id))
        if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta nao encontrada' })
        if (existe.status === 'Pago') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta ja esta paga' })
        await ctx.db.update(contasPagar).set({
          status: 'Pago',
          valorPago: input.valorPago,
          dataPagamento: new Date(input.dataPagamento) as any,
          formaPagamento: input.formaPagamento as any,
        }).where(eq(contasPagar.id, input.id))

        // Lança no fluxo de caixa
        await ctx.db.insert(fluxoCaixa).values({
          tipo: 'Debito',
          valor: input.valorPago,
          contaId: input.contaId,
          empresaId: input.empresaId,
          naturezaId: input.naturezaId,
          historico: input.historico,
          dataMovimento: new Date(input.dataPagamento) as any,
          contaPagarId: input.id,
          usuarioId: ctx.usuario.id,
          criadoEm: new Date(),
        })
        return { ok: true }
      }),

    estornar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [existe] = await ctx.db.select().from(contasPagar).where(eq(contasPagar.id, input.id))
        if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta nao encontrada' })
        if (existe.status !== 'Pago') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta nao esta paga' })
        await ctx.db.update(contasPagar).set({ status: 'Pendente', valorPago: '0.00', dataPagamento: null as any }).where(eq(contasPagar.id, input.id))
        await ctx.db.delete(fluxoCaixa).where(eq(fluxoCaixa.contaPagarId, input.id))
        return { ok: true }
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [existe] = await ctx.db.select().from(contasPagar).where(eq(contasPagar.id, input.id))
        if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta nao encontrada' })
        await ctx.db.delete(fluxoCaixa).where(eq(fluxoCaixa.contaPagarId, input.id))
        await ctx.db.delete(contasPagar).where(eq(contasPagar.id, input.id))
        return { ok: true }
      }),
  }),

  // ─── CONTAS A RECEBER ─────────────────────────────────
  contasReceber: router({
    listar: protectedProcedure
      .input(z.object({
        dataInicio:   z.string().optional(),
        dataFim:      z.string().optional(),
        tipoReceitaId: z.number().optional(),
        devedorId:    z.number().optional(),
        empresaId:    z.number().optional(),
        status:       z.enum(['Pendente','Recebido','Todos']).optional(),
        contaId:      z.number().optional(),
        formaPagamento: z.string().optional(),
        numDocumento: z.string().optional(),
        historico:    z.string().optional(),
        codigo:       z.number().optional(),
        valor:        z.number().optional(),
        protesto:     z.boolean().optional(),
        pagina:       z.number().default(1),
      }))
      .query(async ({ input, ctx }) => {
        const conds: any[] = []
        if (input.dataInicio) conds.push(gte(contasReceber.vencimento, new Date(input.dataInicio) as any))
        if (input.dataFim)    conds.push(lte(contasReceber.vencimento, new Date(input.dataFim) as any))
        if (input.tipoReceitaId) conds.push(eq(contasReceber.tipoReceitaId, input.tipoReceitaId))
        if (input.devedorId)     conds.push(eq(contasReceber.devedorId, input.devedorId))
        if (input.empresaId)     conds.push(eq(contasReceber.empresaId, input.empresaId))
        if (input.status && input.status !== 'Todos') conds.push(eq(contasReceber.status, input.status as any))
        if (input.contaId)       conds.push(eq(contasReceber.contaId, input.contaId))
        if (input.formaPagamento) conds.push(eq(contasReceber.formaPagamento, input.formaPagamento as any))
        if (input.numDocumento)  conds.push(like(contasReceber.numDocumento, `%${input.numDocumento}%`))
        if (input.historico)     conds.push(like(contasReceber.historico, `%${input.historico}%`))
        if (input.codigo)        conds.push(eq(contasReceber.id, input.codigo))
        if (input.valor)         conds.push(eq(contasReceber.valor, input.valor.toString() as any))
        if (input.protesto)      conds.push(eq(contasReceber.protesto, true as any))

        const lista = await ctx.db
          .select({
            id: contasReceber.id,
            vencimento: contasReceber.vencimento,
            valor: contasReceber.valor,
            valorRecebido: contasReceber.valorRecebido,
            historico: contasReceber.historico,
            status: contasReceber.status,
            formaPagamento: contasReceber.formaPagamento,
            numDocumento: contasReceber.numDocumento,
            dataRecebimento: contasReceber.dataRecebimento,
            devedorNome: finDevedores.nome,
            tipoReceitaNome: finTipoReceitas.nome,
            empresaNome: finEmpresas.nome,
            contaBanco: finContas.banco,
          })
          .from(contasReceber)
          .leftJoin(finDevedores, eq(contasReceber.devedorId, finDevedores.id))
          .leftJoin(finTipoReceitas, eq(contasReceber.tipoReceitaId, finTipoReceitas.id))
          .leftJoin(finEmpresas, eq(contasReceber.empresaId, finEmpresas.id))
          .leftJoin(finContas, eq(contasReceber.contaId, finContas.id))
          .where(and(...conds))
          .orderBy(contasReceber.vencimento)
          .limit(10).offset((input.pagina - 1) * 10)

        const [cnt] = await ctx.db.select({ total: count() }).from(contasReceber).where(and(...conds))
        return { lista, totalPaginas: Math.ceil(cnt.total / 10) || 1 }
      }),

    criar: protectedProcedure
      .input(z.object({
        vencimento:   z.string(),
        valor:        z.string(),
        tipoReceitaId: z.number().optional(),
        devedorId:    z.number().optional(),
        contaId:      z.number().optional(),
        empresaId:    z.number().optional(),
        processoId:   z.number().optional(),
        historico: z.string().max(500).optional(),
        formaPagamento: z.enum(formasPagamento).optional(),
        numDocumento: z.string().optional(),
        parcelas: z.number().default(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { parcelas, vencimento, ...rest } = input
        const base = cleanEmpty({ ...rest as any, usuarioId: ctx.usuario.id, criadoEm: new Date() })
        for (let i = 0; i < (parcelas || 1); i++) {
          const dt = new Date(vencimento)
          dt.setMonth(dt.getMonth() + i)
          await ctx.db.insert(contasReceber).values({ ...base, vencimento: dt as any })
        }
        return { ok: true }
      }),

    receber: protectedProcedure
      .input(z.object({
        id:              z.number(),
        dataRecebimento: z.string(),
        valorRecebido:   z.string(),
        formaPagamento: z.enum(formasPagamento).optional(),
        contaId:         z.number(),
        empresaId:       z.number(),
        naturezaId:      z.number().optional(),
        historico: z.string().max(500).optional(),
        observacao: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [existe] = await ctx.db.select().from(contasReceber).where(eq(contasReceber.id, input.id))
        if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta nao encontrada' })
        if (existe.status === 'Recebido') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta ja foi recebida' })
        await ctx.db.update(contasReceber).set({
          status: 'Recebido',
          valorRecebido: input.valorRecebido,
          dataRecebimento: new Date(input.dataRecebimento) as any,
        }).where(eq(contasReceber.id, input.id))

        await ctx.db.insert(fluxoCaixa).values({
          tipo: 'Credito',
          valor: input.valorRecebido,
          contaId: input.contaId,
          empresaId: input.empresaId,
          naturezaId: input.naturezaId,
          historico: input.historico,
          dataMovimento: new Date(input.dataRecebimento) as any,
          contaReceberId: input.id,
          usuarioId: ctx.usuario.id,
          criadoEm: new Date(),
        })
        return { ok: true }
      }),

    estornar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [existe] = await ctx.db.select().from(contasReceber).where(eq(contasReceber.id, input.id))
        if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta nao encontrada' })
        if (existe.status !== 'Recebido') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta nao esta recebida' })
        await ctx.db.update(contasReceber).set({ status: 'Pendente', valorRecebido: '0.00', dataRecebimento: null as any }).where(eq(contasReceber.id, input.id))
        await ctx.db.delete(fluxoCaixa).where(eq(fluxoCaixa.contaReceberId, input.id))
        return { ok: true }
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [existe] = await ctx.db.select().from(contasReceber).where(eq(contasReceber.id, input.id))
        if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta nao encontrada' })
        await ctx.db.delete(fluxoCaixa).where(eq(fluxoCaixa.contaReceberId, input.id))
        await ctx.db.delete(contasReceber).where(eq(contasReceber.id, input.id))
        return { ok: true }
      }),
  }),

  // ─── FLUXO DE CAIXA ───────────────────────────────────
  fluxoCaixa: router({
    listar: protectedProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim:    z.string().optional(),
        tipo:       z.enum(['Credito','Debito','Todos']).optional(),
        contaId:    z.number().optional(),
        empresaId:  z.number().optional(),
        naturezaId: z.number().optional(),
        historico: z.string().max(500).optional(),
        pagina:     z.number().default(1),
      }))
      .query(async ({ input, ctx }) => {
        const conds: any[] = []
        if (input.dataInicio) conds.push(gte(fluxoCaixa.dataMovimento, new Date(input.dataInicio) as any))
        if (input.dataFim)    conds.push(lte(fluxoCaixa.dataMovimento, new Date(input.dataFim) as any))
        if (input.tipo && input.tipo !== 'Todos') conds.push(eq(fluxoCaixa.tipo, input.tipo as any))
        if (input.contaId)  conds.push(eq(fluxoCaixa.contaId, input.contaId))
        if (input.empresaId) conds.push(eq(fluxoCaixa.empresaId, input.empresaId))

        const lista = await ctx.db.select().from(fluxoCaixa)
          .leftJoin(finContas, eq(fluxoCaixa.contaId, finContas.id))
          .leftJoin(finEmpresas, eq(fluxoCaixa.empresaId, finEmpresas.id))
          .leftJoin(finNaturezas, eq(fluxoCaixa.naturezaId, finNaturezas.id))
          .where(and(...conds))
          .orderBy(desc(fluxoCaixa.dataMovimento))
          .limit(20).offset((input.pagina - 1) * 20)

        const [cnt] = await ctx.db.select({ total: count() }).from(fluxoCaixa).where(and(...conds))
        return { lista, totalPaginas: Math.ceil(cnt.total / 20) || 1 }
      }),

    incluir: protectedProcedure
      .input(z.object({
        tipo:          z.enum(['Credito','Debito']),
        valor:         z.string(),
        contaId:       z.number(),
        empresaId:     z.number(),
        naturezaId:    z.number().optional(),
        historico: z.string().max(500).optional(),
        dataMovimento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await ctx.db.insert(fluxoCaixa).values({ ...input as any, usuarioId: ctx.usuario.id, criadoEm: new Date() })
        return { ok: true }
      }),

    transferencia: protectedProcedure
      .input(z.object({
        contaOrigemId:  z.number(),
        contaDestinoId: z.number(),
        valor:          z.string(),
        data:           z.string(),
        historico: z.string().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await ctx.db.insert(fluxoCaixa).values([
          { tipo: 'Debito', valor: input.valor, contaId: input.contaOrigemId, dataMovimento: new Date(input.data) as any, historico: `Transferência - ${input.historico || ''}`, usuarioId: ctx.usuario.id, criadoEm: new Date() },
          { tipo: 'Credito', valor: input.valor, contaId: input.contaDestinoId, dataMovimento: new Date(input.data) as any, historico: `Transferência - ${input.historico || ''}`, usuarioId: ctx.usuario.id, criadoEm: new Date() },
        ])
        return { ok: true }
      }),
  }),
})
