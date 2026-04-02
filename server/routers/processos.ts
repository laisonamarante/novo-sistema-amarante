import { z } from 'zod'
import { eq, like, and, or, desc, inArray, sql, isNull } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  processos, processoCompradores, processoVendedores, processoImoveis,
  processoEtapas, processoHistorico, processoDocumentos, processoAtendimentos,
  tarefas, usuarios, bancos, agencias, modalidades, fluxos, situacoes,
  corretores, parceiros, imobiliarias, construtoras, clientes, imoveis, etapas,
  documentosTipos
} from '../../drizzle/schema'

const processoInput = z.object({
  bancoId:             z.number().optional(),
  agenciaId:           z.number().optional(),
  modalidadeId:        z.number().optional(),
  fluxoId:             z.number().optional(),
  situacaoId:          z.number().optional(),
  encaminhamento: z.string().max(200).optional(),
  responsavelId:       z.number().optional(),
  dataEmissaoContrato: z.string().optional(),
  dataAssinatura:      z.string().optional(),
  dataPagtoVendedor:   z.string().optional(),
  dataRemuneracao:     z.string().optional(),
  numProposta: z.string().max(50).optional(),
  numContrato: z.string().max(50).optional(),
  observacao: z.string().max(2000).optional(),
  reprovado:           z.boolean().optional(),
  valorCompraVenda:    z.string().optional(),
  valorAvaliacao:      z.string().optional(),
  valorRecursoProprio: z.string().optional(),
  valorSubsidio:       z.string().optional(),
  valorFgts:           z.string().optional(),
  valorIq:             z.string().optional(),
  valorFinanciado:     z.string().optional(),
  valorParcela:        z.string().optional(),
  numeroParcelas:      z.number().optional(),
  valorDespesas:       z.string().optional(),
  remuneracaoPerc:     z.string().optional(),
  remuneracaoValor:    z.string().optional(),
  parceiroId:          z.number().optional(),
  corretorId:          z.number().optional(),
  imobiliariaId:       z.number().optional(),
  constutoraId:        z.number().optional(),
  compradoresIds:      z.array(z.number()).optional(),
  vendedoresIds:       z.array(z.number()).optional(),
  imoveisIds:          z.array(z.number()).optional(),
})

export const processosRouter = router({
  listar: protectedProcedure
    .input(z.object({
      busca:           z.string().optional(),
      bancoId:         z.number().optional(),
      situacaoId:      z.number().optional(),
      etapaId:         z.number().optional(),
      agenciaId:       z.number().optional(),
      modalidadeId:    z.number().optional(),
      corretorId:      z.number().optional(),
      imobiliariaId:   z.number().optional(),
      parceiroId:      z.number().optional(),
      constutoraId:    z.number().optional(),
      responsavelId:   z.number().optional(),
      codigo:          z.number().optional(),
      concluidos:      z.boolean().optional(),
      reprovados:      z.boolean().optional(),
      arquivados:      z.boolean().optional(),
      dataInicio:      z.string().optional(),
      dataFim:         z.string().optional(),
      pagina:          z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const limite = Math.min(input.pagina > 0 ? 10 : 10, 100)
      const offset = (input.pagina - 1) * limite

      const result = await ctx.db.execute(sql`
        SELECT p.id, p.num_proposta as numProposta, p.reprovado, p.arquivado,
               p.criado_em as criadoEm,
               p.data_emissao_contrato as dataEmissaoContrato,
               p.data_assinatura as dataAssinatura,
               p.data_pagto_vendedor as dataPagtoVendedor,
               p.valor_financiado as valorFinanciado,
               b.nome as bancoNome,
               ag.nome as agenciaNome,
               m.nome as modalidadeNome,
               u.nome as responsavelNome,
               par.nome as parceiroNome,
               cor.nome as corretorNome,
               imob.nome as imobiliariaNome,
               cons.nome as construtoraNome,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = p.id LIMIT 1) as compradorNome,
               (SELECT c.nome FROM processo_vendedores pv
                JOIN clientes c ON c.id = pv.cliente_id
                WHERE pv.processo_id = p.id LIMIT 1) as vendedorNome,
               (SELECT e.nome FROM processo_etapas pe
                JOIN etapas e ON e.id = pe.etapa_id
                WHERE pe.processo_id = p.id AND pe.concluido IS NULL
                ORDER BY pe.ordem ASC LIMIT 1) as etapaNome,
               (SELECT pe2.ordem FROM processo_etapas pe2
                WHERE pe2.processo_id = p.id AND pe2.concluido IS NULL
                ORDER BY pe2.ordem ASC LIMIT 1) as etapaAtual,
               (SELECT COUNT(*) FROM processo_etapas pe3
                WHERE pe3.processo_id = p.id) as totalEtapas
        FROM processos p
        LEFT JOIN bancos b ON b.id = p.banco_id
        LEFT JOIN agencias ag ON ag.id = p.agencia_id
        LEFT JOIN modalidades m ON m.id = p.modalidade_id
        LEFT JOIN usuarios u ON u.id = p.responsavel_id
        LEFT JOIN parceiros par ON par.id = p.parceiro_id
        LEFT JOIN corretores cor ON cor.id = p.corretor_id
        LEFT JOIN imobiliarias imob ON imob.id = p.imobiliaria_id
        LEFT JOIN construtoras cons ON cons.id = p.construtora_id
        WHERE 1=1
          ${['Parceiro','Corretor','Imobiliária','Construtora'].includes(ctx.usuario.perfil) ? sql`AND p.criado_por_id = ${ctx.usuario.id}` : sql``}
          ${!input.arquivados ? sql`AND p.arquivado = false` : sql``}
          ${input.bancoId ? sql`AND p.banco_id = ${input.bancoId}` : sql``}
          ${input.situacaoId ? sql`AND p.situacao_id = ${input.situacaoId}` : sql``}
          ${input.agenciaId ? sql`AND p.agencia_id = ${input.agenciaId}` : sql``}
          ${input.modalidadeId ? sql`AND p.modalidade_id = ${input.modalidadeId}` : sql``}
          ${input.corretorId ? sql`AND p.corretor_id = ${input.corretorId}` : sql``}
          ${input.imobiliariaId ? sql`AND p.imobiliaria_id = ${input.imobiliariaId}` : sql``}
          ${input.parceiroId ? sql`AND p.parceiro_id = ${input.parceiroId}` : sql``}
          ${input.constutoraId ? sql`AND p.construtora_id = ${input.constutoraId}` : sql``}
          ${input.responsavelId ? sql`AND p.responsavel_id = ${input.responsavelId}` : sql``}
          ${input.codigo ? sql`AND p.id = ${input.codigo}` : sql``}
          ${!input.reprovados ? sql`AND p.reprovado = false` : sql``}
          ${input.etapaId ? sql`AND EXISTS (SELECT 1 FROM processo_etapas pe2 WHERE pe2.processo_id = p.id AND pe2.etapa_id = ${input.etapaId} AND pe2.concluido IS NULL)` : sql``}
          ${input.dataInicio ? sql`AND p.criado_em >= ${input.dataInicio}` : sql``}
          ${input.dataFim ? sql`AND p.criado_em <= ${input.dataFim + ' 23:59:59'}` : sql``}
          ${input.busca ? sql`AND (p.num_proposta LIKE ${`%${input.busca}%`} OR p.num_contrato LIKE ${`%${input.busca}%`} OR EXISTS (SELECT 1 FROM processo_compradores pc2 JOIN clientes c2 ON c2.id = pc2.cliente_id WHERE pc2.processo_id = p.id AND (c2.nome LIKE ${`%${input.busca}%`} OR c2.cpf_cnpj LIKE ${`%${input.busca}%`})))` : sql``}
        ORDER BY p.criado_em DESC
        LIMIT ${limite} OFFSET ${offset}
      `)

      return { lista: result[0] as unknown as any[], pagina: input.pagina }
    }),

  buscar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const [p] = await ctx.db.select().from(processos).where(eq(processos.id, input.id))
      if (!p) throw new Error('Processo não encontrado')

      const compradores = await ctx.db
        .select({ cliente: clientes, proponente: processoCompradores.proponente })
        .from(processoCompradores)
        .leftJoin(clientes, eq(processoCompradores.clienteId, clientes.id))
        .where(eq(processoCompradores.processoId, input.id))

      const vendedores = await ctx.db
        .select({ cliente: clientes, proponente: processoVendedores.proponente })
        .from(processoVendedores)
        .leftJoin(clientes, eq(processoVendedores.clienteId, clientes.id))
        .where(eq(processoVendedores.processoId, input.id))

      const imoveisList = await ctx.db
        .select({ imovel: imoveis })
        .from(processoImoveis)
        .leftJoin(imoveis, eq(processoImoveis.imovelId, imoveis.id))
        .where(eq(processoImoveis.processoId, input.id))

      const etapasList = await ctx.db
        .select({ etapa: processoEtapas, etapaNome: etapas.nome })
        .from(processoEtapas)
        .leftJoin(etapas, eq(processoEtapas.etapaId, etapas.id))
        .where(eq(processoEtapas.processoId, input.id))
        .orderBy(processoEtapas.ordem)

      const documentos = await ctx.db
        .select().from(processoDocumentos)
        .where(eq(processoDocumentos.processoId, input.id))

      const tarefasList = await ctx.db
        .select().from(tarefas)
        .where(eq(tarefas.processoId, input.id))
        .orderBy(desc(tarefas.criadoEm))

      const historico = await ctx.db
        .select().from(processoHistorico)
        .where(eq(processoHistorico.processoId, input.id))
        .orderBy(desc(processoHistorico.criadoEm))

      const atendimentos = await ctx.db
        .select().from(processoAtendimentos)
        .where(eq(processoAtendimentos.processoId, input.id))
        .orderBy(desc(processoAtendimentos.criadoEm))

      return { ...p, compradores, vendedores, imoveis: imoveisList, etapas: etapasList, documentos, tarefas: tarefasList, historico, atendimentos }
    }),

  criar: protectedProcedure
    .input(processoInput)
    .mutation(async ({ input, ctx }) => {
      const { compradoresIds, vendedoresIds, imoveisIds, ...dados } = input
      const [r] = await ctx.db.insert(processos).values({
        ...dados as any,
        criadoPorId: ctx.usuario.id,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      })
      const id = (r as any).insertId

      if (compradoresIds?.length)
        await ctx.db.insert(processoCompradores).values(compradoresIds.map(cId => ({ processoId: id, clienteId: cId })))
      if (vendedoresIds?.length)
        await ctx.db.insert(processoVendedores).values(vendedoresIds.map(vId => ({ processoId: id, clienteId: vId })))
      if (imoveisIds?.length)
        await ctx.db.insert(processoImoveis).values(imoveisIds.map(iId => ({ processoId: id, imovelId: iId })))

      // Auto-populate etapas from fluxo
      if (dados.fluxoId) {
        const etapasList = await ctx.db.select().from(etapas)
          .where(and(eq(etapas.fluxoId, dados.fluxoId), eq(etapas.ativo, true)))
        if (etapasList.length > 0) {
          await ctx.db.insert(processoEtapas).values(
            etapasList.map(e => ({ processoId: id, etapaId: e.id, ordem: e.ordem }))
          )
        }
      }

      // Log no histórico
      await ctx.db.insert(processoHistorico).values({ processoId: id, usuarioId: ctx.usuario.id, descricao: 'Processo criado', criadoEm: new Date() })
      return { id }
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).merge(processoInput.partial()))
    .mutation(async ({ input, ctx }) => {
      const { id, compradoresIds, vendedoresIds, imoveisIds, ...dados } = input
      const [existe] = await ctx.db.select({ id: processos.id }).from(processos).where(eq(processos.id, id))
      if (!existe) throw new TRPCError({ code: 'NOT_FOUND', message: 'Processo nao encontrado' })
      await ctx.db.transaction(async (tx) => {
        await tx.update(processos).set({ ...dados as any, atualizadoEm: new Date() }).where(eq(processos.id, id))

        if (compradoresIds) {
          await tx.delete(processoCompradores).where(eq(processoCompradores.processoId, id))
          if (compradoresIds.length) await tx.insert(processoCompradores).values(compradoresIds.map(cId => ({ processoId: id, clienteId: cId })))
        }
        if (vendedoresIds) {
          await tx.delete(processoVendedores).where(eq(processoVendedores.processoId, id))
          if (vendedoresIds.length) await tx.insert(processoVendedores).values(vendedoresIds.map(vId => ({ processoId: id, clienteId: vId })))
        }
        if (imoveisIds) {
          await tx.delete(processoImoveis).where(eq(processoImoveis.processoId, id))
          if (imoveisIds.length) await tx.insert(processoImoveis).values(imoveisIds.map(iId => ({ processoId: id, imovelId: iId })))
        }

        // Auto-populate etapas if fluxoId changed
        if (dados.fluxoId) {
          const existingEtapas = await tx.select().from(processoEtapas).where(eq(processoEtapas.processoId, id))
          if (existingEtapas.length === 0) {
            const etapasList = await tx.select().from(etapas)
              .where(and(eq(etapas.fluxoId, dados.fluxoId), eq(etapas.ativo, true)))
            if (etapasList.length > 0) {
              await tx.insert(processoEtapas).values(
                etapasList.map(e => ({ processoId: id, etapaId: e.id, ordem: e.ordem }))
              )
            }
          }
        }

        await tx.insert(processoHistorico).values({ processoId: id, usuarioId: ctx.usuario.id, descricao: 'Processo atualizado', criadoEm: new Date() })
      })
      return { ok: true }
    }),

  arquivar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.update(processos).set({ arquivado: true, atualizadoEm: new Date() }).where(eq(processos.id, input.id))
      return { ok: true }
    }),

  adicionarAtendimento: protectedProcedure
    .input(z.object({ processoId: z.number(), descricao: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(processoAtendimentos).values({ ...input, usuarioId: ctx.usuario.id, criadoEm: new Date() })
      return { ok: true }
    }),

  avancarEtapa: protectedProcedure
    .input(z.object({ processoId: z.number(), etapaId: z.number(), observacao: z.string().max(2000).optional(), responsavelId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Concluir a etapa atual
      await ctx.db.update(processoEtapas)
        .set({ concluido: new Date() })
        .where(and(eq(processoEtapas.processoId, input.processoId), eq(processoEtapas.etapaId, input.etapaId)))

      // Se responsavelId fornecido, setar na próxima etapa pendente
      if (input.responsavelId) {
        const proxEtapas = await ctx.db.execute(sql`
          SELECT id FROM processo_etapas
          WHERE processo_id = ${input.processoId} AND concluido IS NULL
          ORDER BY ordem ASC LIMIT 1
        `)
        const proxList = proxEtapas[0] as unknown as any[]
        if (proxList.length > 0) {
          await ctx.db.update(processoEtapas)
            .set({ usuarioId: input.responsavelId })
            .where(eq(processoEtapas.id, proxList[0].id))
        }
      }

      // Buscar nome da etapa concluída
      const etapaInfo = await ctx.db.execute(sql`SELECT e.nome FROM etapas e WHERE e.id = ${input.etapaId} LIMIT 1`)
      const etapaNome = ((etapaInfo[0] as unknown as any[])[0]?.nome) || ''

      await ctx.db.insert(processoHistorico).values({
        processoId: input.processoId,
        usuarioId: ctx.usuario.id,
        titulo: `Etapa concluída: ${etapaNome}`,
        descricao: input.observacao || `Etapa "${etapaNome}" concluída`,
        tipo: 'historico',
        etapa: etapaNome,
        criadoEm: new Date(),
      })
      return { ok: true }
    }),

  adicionarDocumento: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      nomeArquivo: z.string(),
      caminhoArquivo: z.string(),
      mimeType: z.string().optional(),
      tamanho: z.number().optional(),
      secao: z.string().optional(),
      documentoTipoId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(processoDocumentos).values({ ...input as any, usuarioId: ctx.usuario.id, criadoEm: new Date() })
      return { ok: true }
    }),

  excluirDocumento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(processoDocumentos).where(eq(processoDocumentos.id, input.id))
      return { ok: true }
    }),


  setProponente: protectedProcedure
    .input(z.object({ processoId: z.number(), clienteId: z.number(), tipo: z.enum(['comprador','vendedor']), proponente: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (input.tipo === 'comprador') {
        await ctx.db.update(processoCompradores)
          .set({ proponente: input.proponente ? 1 : 0 } as any)
          .where(and(eq(processoCompradores.processoId, input.processoId), eq(processoCompradores.clienteId, input.clienteId)))
      } else {
        await ctx.db.update(processoVendedores)
          .set({ proponente: input.proponente ? 1 : 0 } as any)
          .where(and(eq(processoVendedores.processoId, input.processoId), eq(processoVendedores.clienteId, input.clienteId)))
      }
      return { ok: true }
    }),

  atualizarObsEtapa: protectedProcedure
    .input(z.object({ processoId: z.number(), etapaId: z.number(), observacao: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.update(processoEtapas)
        .set({ observacao: input.observacao })
        .where(and(eq(processoEtapas.processoId, input.processoId), eq(processoEtapas.etapaId, input.etapaId)))
      return { ok: true }
    }),

  // Dashboard COBAN - processos sem responsável
  analiseCoban: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      SELECT p.id, p.criado_em as criadoEm,
             b.nome as bancoNome, par.nome as parceiroNome,
             u.nome as responsavelNome,
             DATEDIFF(NOW(), p.criado_em) as dias,
             (SELECT c.nome FROM processo_compradores pc
              JOIN clientes c ON c.id = pc.cliente_id
              WHERE pc.processo_id = p.id LIMIT 1) as proponenteNome
      FROM processos p
      LEFT JOIN bancos b ON b.id = p.banco_id
      LEFT JOIN parceiros par ON par.id = p.parceiro_id
      LEFT JOIN usuarios u ON u.id = p.responsavel_id
      WHERE p.arquivado = false AND p.reprovado = false AND p.responsavel_id IS NULL
      ORDER BY p.criado_em DESC
      LIMIT 20
    `)
    return result[0] as unknown as any[]
  }),

  // Processos do analista logado
  meusProcessos: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      SELECT p.id, p.criado_em as criadoEm,
             b.nome as bancoNome, par.nome as parceiroNome,
             DATEDIFF(NOW(), p.criado_em) as dias,
             (SELECT e.nome FROM processo_etapas pe
              JOIN etapas e ON e.id = pe.etapa_id
              WHERE pe.processo_id = p.id AND pe.concluido IS NULL
              ORDER BY pe.ordem ASC LIMIT 1) as etapaNome
      FROM processos p
      LEFT JOIN bancos b ON b.id = p.banco_id
      LEFT JOIN parceiros par ON par.id = p.parceiro_id
      WHERE p.responsavel_id = ${ctx.usuario.id}
        AND p.arquivado = false AND p.reprovado = false
      ORDER BY p.criado_em DESC
      LIMIT 50
    `)
    return result[0] as unknown as any[]
  }),

  // Analista pega processo pra si
  pegarProcesso: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.update(processos).set({ responsavelId: ctx.usuario.id, atualizadoEm: new Date() }).where(eq(processos.id, input.id))
      await ctx.db.insert(processoHistorico).values({ processoId: input.id, usuarioId: ctx.usuario.id, descricao: 'Processo assumido', criadoEm: new Date() })
      return { ok: true }
    }),

  // Atribuir responsável a um processo
  atribuirResponsavel: protectedProcedure
    .input(z.object({ processoId: z.number(), responsavelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.update(processos).set({ responsavelId: input.responsavelId, atualizadoEm: new Date() }).where(eq(processos.id, input.processoId))
      await ctx.db.insert(processoHistorico).values({ processoId: input.processoId, usuarioId: ctx.usuario.id, descricao: 'Responsável atribuído', criadoEm: new Date() })
      return { ok: true }
    }),

  // Registrar pendência (salva no processoHistorico com tipo='pendencia')
  registrarPendencia: protectedProcedure
    .input(z.object({ processoId: z.number(), descricao: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(processoHistorico).values({
        processoId: input.processoId,
        usuarioId: ctx.usuario.id,
        titulo: 'Pendência',
        descricao: input.descricao,
        tipo: 'pendencia',
        criadoEm: new Date(),
      })
      return { ok: true }
    }),

  // Histórico - listar e criar
  historico: router({
    listar: protectedProcedure
      .input(z.object({ processoId: z.number() }))
      .query(async ({ input, ctx }) => {
        const result = await ctx.db.execute(sql`
          SELECT h.id, h.titulo, h.descricao, h.tipo, h.etapa,
                 h.criado_em as criadoEm, u.nome as usuarioNome
          FROM processo_historico h
          LEFT JOIN usuarios u ON u.id = h.usuario_id
          WHERE h.processo_id = ${input.processoId}
          ORDER BY h.criado_em DESC
        `)
        return result[0] as unknown as any[]
      }),

    criar: protectedProcedure
      .input(z.object({
        processoId: z.number(),
        titulo: z.string().min(1),
        descricao: z.string().min(1),
        etapa: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await ctx.db.insert(processoHistorico).values({
          processoId: input.processoId,
          usuarioId: ctx.usuario.id,
          titulo: input.titulo,
          descricao: input.descricao,
          tipo: 'historico',
          etapa: input.etapa || null,
          criadoEm: new Date(),
        })
        return { ok: true }
      }),
  }),

  // Documentos tipos por fluxo (para checklist)
  documentosTiposPorFluxo: protectedProcedure
    .input(z.object({ fluxoId: z.number() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.select().from(documentosTipos)
        .where(and(eq(documentosTipos.fluxoId, input.fluxoId), eq(documentosTipos.ativo, true)))
    }),
})
