import { z } from 'zod'
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import {
  tarefas, pontos, preAnalises, usuarios, avisos, advertencias,
  bancos, agencias, modalidades, fluxos, situacoes, etapas,
  construtoras, imobiliarias, corretores, parceiros, subestabelecidos, subestabelecidoBancos,
  imoveis, simuladores, finEmpresas, finContas, finFornecedores,
  finDevedores, finTipoDespesas, finTipoReceitas, finNaturezas,
  documentosTipos, arquivos, empreendimentos
} from '../../drizzle/schema'

// ─── TAREFAS ──────────────────────────────────────────────
export const tarefasRouter = router({
  minhasTarefas: protectedProcedure
    .input(z.object({
      filtroStatus: z.enum(['pendente','resolvida','todas']).default('pendente'),
    }).optional().default({ filtroStatus: 'pendente' }))
    .query(async ({ input, ctx }) => {
      const statusCond = input.filtroStatus !== 'todas'
        ? sql`AND LOWER(t.status) = LOWER(${input.filtroStatus})`
        : sql``

      const recebidas = await ctx.db.execute(sql`
        SELECT t.id, t.solicitacao, t.status, t.acompanhamento,
               t.processo_id as processoId, t.data_limite as dataLimite,
               t.criado_em as criadoEm, t.resolvido_em as resolvidoEm,
               sol.nome as solicitanteNome, exec.nome as executanteNome,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = t.processo_id LIMIT 1) as compradorNome
        FROM tarefas t
        LEFT JOIN usuarios sol ON sol.id = t.solicitante_id
        LEFT JOIN usuarios exec ON exec.id = t.executante_id
        WHERE t.executante_id = ${ctx.usuario.id} ${statusCond}
        ORDER BY t.criado_em DESC LIMIT 50
      `)

      const criadas = await ctx.db.execute(sql`
        SELECT t.id, t.solicitacao, t.status, t.acompanhamento,
               t.processo_id as processoId, t.data_limite as dataLimite,
               t.criado_em as criadoEm, t.resolvido_em as resolvidoEm,
               sol.nome as solicitanteNome, exec.nome as executanteNome,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = t.processo_id LIMIT 1) as compradorNome
        FROM tarefas t
        LEFT JOIN usuarios sol ON sol.id = t.solicitante_id
        LEFT JOIN usuarios exec ON exec.id = t.executante_id
        WHERE t.solicitante_id = ${ctx.usuario.id} ${statusCond}
        ORDER BY t.criado_em DESC LIMIT 50
      `)

      return { recebidas: recebidas[0] as unknown as any[], criadas: criadas[0] as unknown as any[] }
    }),

  listarTodas: protectedProcedure
    .input(z.object({
      id:            z.number().optional(),
      dataInicio:    z.string().optional(),
      dataFim:       z.string().optional(),
      status:        z.enum(['Pendente','Resolvida','Encerrada']).optional(),
      parceiroId:    z.number().optional(),
      solicitanteId: z.number().optional(),
      executanteId:  z.number().optional(),
      pagina:        z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const offset = (input.pagina - 1) * 20

      const result = await ctx.db.execute(sql`
        SELECT t.id, t.solicitacao, t.status, t.acompanhamento,
               t.processo_id as processoId, t.data_limite as dataLimite,
               t.criado_em as criadoEm, t.resolvido_em as resolvidoEm,
               sol.nome as solicitanteNome, exec.nome as executanteNome,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = t.processo_id LIMIT 1) as compradorNome
        FROM tarefas t
        LEFT JOIN usuarios sol ON sol.id = t.solicitante_id
        LEFT JOIN usuarios exec ON exec.id = t.executante_id
        LEFT JOIN processos p ON p.id = t.processo_id
        WHERE 1=1
          ${input.id ? sql`AND t.id = ${input.id}` : sql``}
          ${input.status ? sql`AND t.status = ${input.status}` : sql``}
          ${input.solicitanteId ? sql`AND t.solicitante_id = ${input.solicitanteId}` : sql``}
          ${input.executanteId ? sql`AND t.executante_id = ${input.executanteId}` : sql``}
          ${input.parceiroId ? sql`AND p.parceiro_id = ${input.parceiroId}` : sql``}
          ${input.dataInicio ? sql`AND t.criado_em >= ${input.dataInicio}` : sql``}
          ${input.dataFim ? sql`AND t.criado_em <= ${input.dataFim}` : sql``}
        ORDER BY t.criado_em DESC
        LIMIT 20 OFFSET ${offset}
      `)
      return result[0] as unknown as any[]
    }),

  criar: protectedProcedure
    .input(z.object({
      processoId:  z.number().optional(),
      executanteId: z.number(),
      solicitacao: z.string().min(1),
      dataLimite:  z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(tarefas).values({ ...input as any, solicitanteId: ctx.usuario.id, criadoEm: new Date() })
      return { ok: true }
    }),

  concluir: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['Pendente','Resolvida','Encerrada']).optional(),
      acompanhamento: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const novoStatus = input.status || 'Resolvida'
      const updates: any = { status: novoStatus, acompanhamento: input.acompanhamento }
      if (novoStatus !== 'Pendente') updates.resolvidoEm = new Date()
      await ctx.db.update(tarefas).set(updates).where(eq(tarefas.id, input.id))
      return { ok: true }
    }),

  concluirEmMassa: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      status: z.enum(['Pendente','Resolvida','Encerrada']).optional(),
      executanteId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updates: any = {}
      if (input.status) {
        updates.status = input.status
        if (input.status !== 'Pendente') updates.resolvidoEm = new Date()
      }
      if (input.executanteId) updates.executanteId = input.executanteId
      for (const id of input.ids) {
        await ctx.db.update(tarefas).set(updates).where(eq(tarefas.id, id))
      }
      return { ok: true }
    }),
})

// ─── PRÉ-ANÁLISE ──────────────────────────────────────────
export const preAnaliseRouter = router({
  listar: protectedProcedure
    .input(z.object({ status: z.string().optional(), pagina: z.number().default(1), busca: z.string().optional(), situacao: z.string().optional(), bancos: z.string().optional(), solicitanteId: z.number().optional(), responsavelId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.db.execute(sql`
        SELECT pa.id, pa.bancos, pa.nome, pa.cpf_cnpj as cpfCnpj, pa.valor_financiamento as valorFinanciamento, pa.situacao, pa.observacao, pa.retorno, pa.criado_em as criadoEm, pa.responsavel_id as responsavelId, pa.solicitante_id as solicitanteId, u1.nome as solicitanteNome, u2.nome as responsavelNome
        FROM pre_analises pa
        LEFT JOIN usuarios u1 ON u1.id = pa.solicitante_id
        LEFT JOIN usuarios u2 ON u2.id = pa.responsavel_id
        WHERE 1=1
        ${input.busca ? sql`AND (pa.nome LIKE ${'%'+input.busca+'%'} OR pa.cpf_cnpj LIKE ${'%'+input.busca+'%'})` : sql``}
        ${input.situacao ? sql`AND pa.situacao = ${input.situacao}` : sql``}
        ${input.bancos ? sql`AND pa.bancos LIKE ${'%'+input.bancos+'%'}` : sql``}
        ${input.solicitanteId ? sql`AND pa.solicitante_id = ${input.solicitanteId}` : sql``}
        ${input.responsavelId ? sql`AND pa.responsavel_id = ${input.responsavelId}` : sql``}
        ORDER BY pa.criado_em DESC
        LIMIT 100
      `)
      return result[0] as unknown as any[]
    }),

  criar: protectedProcedure
    .input(z.object({
      bancos:              z.string(),
      nome:                z.string().min(1),
      cpfCnpj:             z.string().min(1),
      dataNascimento:      z.string().optional(),
      valorFinanciamento:  z.string().optional(),
      estadoCivil:         z.enum(['Solteiro','Casado']).optional(),
      cpfConjuge:          z.string().optional(),
      nomeConjuge:         z.string().optional(),
      nomeMae:             z.string().optional(),
      cep:                 z.string().optional(),
      observacao:          z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const cleaned: any = { ...input }; Object.keys(cleaned).forEach(k => { if (cleaned[k] === '') cleaned[k] = null; }); if (cleaned.valorFinanciamento) cleaned.valorFinanciamento = String(cleaned.valorFinanciamento).replace(',', '.'); await ctx.db.insert(preAnalises).values({ ...cleaned, solicitanteId: ctx.usuario.id, criadoEm: new Date(), atualizadoEm: new Date() })
      return { ok: true }
    }),

  atualizar: protectedProcedure
    .input(z.object({
      id:             z.number(),
      situacao:       z.string().optional(),
      observacao:     z.string().optional(),
      retorno:        z.string().optional(),
      responsavelId:  z.number().optional(),
      permitirReenvio: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...dados } = input
      await ctx.db.update(preAnalises).set({ ...dados, atualizadoEm: new Date() }).where(eq(preAnalises.id, id))
      return { ok: true }
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(preAnalises).where(eq(preAnalises.id, input.id))
      return { ok: true }
    }),
})

// ─── BATER PONTO ──────────────────────────────────────────
export const pontoRouter = router({
  bater: protectedProcedure
    .input(z.object({
      tipo:       z.enum(['Entrada','SaidaAlmoco','RetornoAlmoco','Saida']),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(pontos).values({ ...input, usuarioId: ctx.usuario.id, dataHora: new Date(), criadoEm: new Date() })
      return { ok: true }
    }),

  meusDia: protectedProcedure
    .input(z.object({ data: z.string() }))
    .query(async ({ input, ctx }) => {
      const inicio = new Date(input.data); inicio.setHours(0,0,0,0)
      const fim    = new Date(input.data); fim.setHours(23,59,59,999)
      return ctx.db.select().from(pontos)
        .where(and(eq(pontos.usuarioId, ctx.usuario.id), gte(pontos.dataHora, inicio), lte(pontos.dataHora, fim)))
        .orderBy(pontos.dataHora)
    }),

  relatorio: protectedProcedure
    .input(z.object({ usuarioId: z.number().optional(), mes: z.number(), ano: z.number() }))
    .query(async ({ input, ctx }) => {
      const inicio = new Date(input.ano, input.mes - 1, 1)
      const fim    = new Date(input.ano, input.mes, 0, 23, 59, 59)
      const uid = input.usuarioId || ctx.usuario.id
      return ctx.db.select().from(pontos)
        .where(and(eq(pontos.usuarioId, uid), gte(pontos.dataHora, inicio), lte(pontos.dataHora, fim)))
        .orderBy(pontos.dataHora)
    }),
})

// ─── CADASTROS AUXILIARES (bancos, agências, etc.) ────────
export const cadastrosRouter = router({
  bancos: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(bancos).where(eq(bancos.ativo, true))),
    criar:   protectedProcedure.input(z.object({
      nome: z.string(),
      encaminhamento: z.enum(['CENOP','SICOB','CEHOP','INTERCERVICE','FUNCHAL','FINTECH','ITAÚ']).optional(),
      remuneracao: z.string().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(bancos).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      encaminhamento: z.enum(['CENOP','SICOB','CEHOP','INTERCERVICE','FUNCHAL','FINTECH','ITAÚ']).nullish(),
      remuneracao: z.string().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(bancos).set(dados).where(eq(bancos.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(bancos).set({ ativo: false }).where(eq(bancos.id, input.id))),
  }),

  agencias: router({
    listar:  protectedProcedure.input(z.object({ bancoId: z.number().optional() })).query(({ input, ctx }) =>
      ctx.db.select().from(agencias).where(input.bancoId ? and(eq(agencias.ativo, true), eq(agencias.bancoId, input.bancoId)) : eq(agencias.ativo, true))),
    criar:   protectedProcedure.input(z.object({ bancoId: z.number(), nome: z.string(), codigo: z.string().optional(), cidade: z.string().optional(), uf: z.string().optional() }))
      .mutation(({ input, ctx }) => ctx.db.insert(agencias).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      bancoId: z.number().optional(),
      nome: z.string().optional(),
      codigo: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(agencias).set(dados).where(eq(agencias.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(agencias).set({ ativo: false }).where(eq(agencias.id, input.id))),
  }),

  modalidades: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(modalidades).where(eq(modalidades.ativo, true))),
    criar:  protectedProcedure.input(z.object({ nome: z.string(), fluxoId: z.number().optional(), externo: z.boolean().optional() })).mutation(({ input, ctx }) => ctx.db.insert(modalidades).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      fluxoId: z.number().nullish(),
      externo: z.boolean().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(modalidades).set(dados).where(eq(modalidades.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(modalidades).set({ ativo: false }).where(eq(modalidades.id, input.id))),
  }),

  fluxos: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(fluxos).where(eq(fluxos.ativo, true))),
    criar:  protectedProcedure.input(z.object({ nome: z.string() })).mutation(({ input, ctx }) => ctx.db.insert(fluxos).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(fluxos).set(dados).where(eq(fluxos.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(fluxos).set({ ativo: false }).where(eq(fluxos.id, input.id))),
  }),

  situacoes: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(situacoes).where(eq(situacoes.ativo, true))),
    criar:  protectedProcedure.input(z.object({ nome: z.string(), ordem: z.number().optional() })).mutation(({ input, ctx }) => ctx.db.insert(situacoes).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      ordem: z.number().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(situacoes).set(dados).where(eq(situacoes.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(situacoes).set({ ativo: false }).where(eq(situacoes.id, input.id))),
  }),

  etapas: router({
    listar: protectedProcedure.input(z.object({ fluxoId: z.number().optional() })).query(({ input, ctx }) =>
      ctx.db.select().from(etapas).where(input.fluxoId ? and(eq(etapas.ativo, true), eq(etapas.fluxoId, input.fluxoId)) : eq(etapas.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      fluxoId: z.number(),
      nome: z.string(),
      ordem: z.number(),
      tolerancia: z.number().optional(),
      situacaoId: z.number().optional(),
      importante: z.boolean().optional(),
      atendente: z.boolean().optional(),
      externo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(etapas).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      fluxoId: z.number().optional(),
      nome: z.string().optional(),
      ordem: z.number().optional(),
      tolerancia: z.number().optional(),
      situacaoId: z.number().nullish(),
      importante: z.boolean().optional(),
      atendente: z.boolean().optional(),
      externo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(etapas).set(dados).where(eq(etapas.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(etapas).set({ ativo: false }).where(eq(etapas.id, input.id))),
  }),

  construtoras: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(construtoras).where(eq(construtoras.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      cnpj: z.string().optional(),
      contato: z.string().optional(),
      fone: z.string().optional(),
      fone2: z.string().optional(),
      email: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      usuarioId: z.number().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(construtoras).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cnpj: z.string().optional(),
      contato: z.string().optional(),
      fone: z.string().optional(),
      fone2: z.string().optional(),
      email: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      usuarioId: z.number().nullish(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(construtoras).set(dados).where(eq(construtoras.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(construtoras).set({ ativo: false }).where(eq(construtoras.id, input.id))),
  }),

  imobiliarias: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(imobiliarias).where(eq(imobiliarias.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      cnpj: z.string().optional(),
      contato: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      parceiroId: z.number().optional(),
      usuarioId: z.number().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(imobiliarias).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cnpj: z.string().optional(),
      contato: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      parceiroId: z.number().nullish(),
      usuarioId: z.number().nullish(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(imobiliarias).set(dados).where(eq(imobiliarias.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(imobiliarias).set({ ativo: false }).where(eq(imobiliarias.id, input.id))),
  }),

  corretores: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(corretores).where(eq(corretores.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      cpf: z.string().optional(),
      creci: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      imobiliariaId: z.number().optional(),
      parceiroId: z.number().optional(),
      usuarioId: z.number().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(corretores).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cpf: z.string().optional(),
      creci: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      imobiliariaId: z.number().nullish(),
      parceiroId: z.number().nullish(),
      usuarioId: z.number().nullish(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(corretores).set(dados).where(eq(corretores.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(corretores).set({ ativo: false }).where(eq(corretores.id, input.id))),
  }),

  parceiros: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(parceiros).where(eq(parceiros.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      nomeFantasia: z.string().optional(),
      razaoSocial: z.string().optional(),
      cnpj: z.string().optional(),
      representante: z.string().optional(),
      documento: z.string().optional(),
      contato: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      responsavel: z.string().optional(),
      chavePix: z.string().optional(),
      tipoChavePix: z.enum(['CPF','Celular','Email','Aleatória']).optional(),
      dataContrato: z.string().optional(),
      usuarioId: z.number().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(parceiros).values(input as any)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      nomeFantasia: z.string().optional(),
      razaoSocial: z.string().optional(),
      cnpj: z.string().optional(),
      representante: z.string().optional(),
      documento: z.string().optional(),
      contato: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      responsavel: z.string().optional(),
      chavePix: z.string().optional(),
      tipoChavePix: z.enum(['CPF','Celular','Email','Aleatória']).nullish(),
      dataContrato: z.string().optional(),
      usuarioId: z.number().nullish(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(parceiros).set(dados as any).where(eq(parceiros.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(parceiros).set({ ativo: false }).where(eq(parceiros.id, input.id))),
  }),

  subestabelecidos: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(subestabelecidos).where(eq(subestabelecidos.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      cpf: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      parceiroId: z.number().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(subestabelecidos).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cpf: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      parceiroId: z.number().nullish(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(subestabelecidos).set(dados).where(eq(subestabelecidos.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(subestabelecidos).set({ ativo: false }).where(eq(subestabelecidos.id, input.id))),
bancosVinculados: protectedProcedure.input(z.object({ subestabelecidoId: z.number() })).query(async ({ input, ctx }) => {      return ctx.db.select({ id: subestabelecidoBancos.id, bancoId: subestabelecidoBancos.bancoId, bancoNome: bancos.nome }).from(subestabelecidoBancos).leftJoin(bancos, eq(subestabelecidoBancos.bancoId, bancos.id)).where(eq(subestabelecidoBancos.subestabelecidoId, input.subestabelecidoId))    }),    vincularBanco: protectedProcedure.input(z.object({ subestabelecidoId: z.number(), bancoId: z.number() })).mutation(async ({ input, ctx }) => {      return ctx.db.insert(subestabelecidoBancos).values(input)    }),    desvincularBanco: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {      return ctx.db.delete(subestabelecidoBancos).where(eq(subestabelecidoBancos.id, input.id))    }),
  }),

  imoveis: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(imoveis)),
    criar:  protectedProcedure.input(z.object({
      matricula: z.string().optional(),
      endereco: z.string(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string(),
      uf: z.string(),
      cep: z.string().optional(),
      tipo: z.enum(['Residencial','Comercial','Terreno','Galpão']).optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(imoveis).values({ ...input, criadoEm: new Date() })),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      matricula: z.string().optional(),
      endereco: z.string().optional(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
      tipo: z.enum(['Residencial','Comercial','Terreno','Galpão']).optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(imoveis).set(dados).where(eq(imoveis.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.delete(imoveis).where(eq(imoveis.id, input.id))),
  }),

  usuarios: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select({
      id: usuarios.id, nome: usuarios.nome, login: usuarios.login, email: usuarios.email,
      cpf: usuarios.cpf, pis: usuarios.pis, perfil: usuarios.perfil, status: usuarios.status,
      subestabelecidoId: usuarios.subestabelecidoId,
      bloqueioInicio: usuarios.bloqueioInicio, bloqueioFim: usuarios.bloqueioFim,
      ativo: usuarios.ativo,
    }).from(usuarios)),
    criar:   protectedProcedure.input(z.object({
      nome: z.string(), login: z.string(), senha: z.string(), email: z.string().optional(),
      cpf: z.string().optional(), pis: z.string().optional(),
      perfil: z.enum(['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Financeiro','Engenheiro','Atendente','Subestabelecido']),
      subestabelecidoId: z.number().optional(),
      status: z.enum(['Ativo','Bloqueado','Inativo']).optional(),
      bloqueioInicio: z.string().optional(), bloqueioFim: z.string().optional(),
    }))
      .mutation(async ({ input, ctx }) => {
        const bcryptMod = await import('bcryptjs')
        const bcrypt = bcryptMod.default || bcryptMod
        const hash = await bcrypt.hash(input.senha, 10)
        await ctx.db.insert(usuarios).values({ ...input as any, senha: hash, criadoEm: new Date() })
        return { ok: true }
      }),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(), login: z.string().optional(), email: z.string().optional(),
      cpf: z.string().optional(), pis: z.string().optional(),
      perfil: z.enum(['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Financeiro','Engenheiro','Atendente','Subestabelecido']).optional(),
      subestabelecidoId: z.number().nullish(),
      status: z.enum(['Ativo','Bloqueado','Inativo']).optional(),
      bloqueioInicio: z.string().nullish(), bloqueioFim: z.string().nullish(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...dados } = input
      await ctx.db.update(usuarios).set(dados as any).where(eq(usuarios.id, id))
      return { ok: true }
    }),
  }),

  simuladores: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(simuladores).where(eq(simuladores.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      url: z.string(),
      logoUrl: z.string().optional(),
      tipo: z.enum(['Simulador','Portal']).optional(),
      ordem: z.number().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(simuladores).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      url: z.string().optional(),
      logoUrl: z.string().optional(),
      tipo: z.enum(['Simulador','Portal']).optional(),
      ordem: z.number().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(simuladores).set(dados).where(eq(simuladores.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(simuladores).set({ ativo: false }).where(eq(simuladores.id, input.id))),
  }),

  // Financeiro - cadastros auxiliares (full CRUD)
  finEmpresas: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finEmpresas).where(eq(finEmpresas.ativo, true))),
    criar:   protectedProcedure.input(z.object({ nome: z.string(), cnpj: z.string().optional() })).mutation(({ input, ctx }) => ctx.db.insert(finEmpresas).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cnpj: z.string().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finEmpresas).set(dados).where(eq(finEmpresas.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finEmpresas).set({ ativo: false }).where(eq(finEmpresas.id, input.id))),
  }),

  finContas: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finContas).where(eq(finContas.ativo, true))),
    criar:   protectedProcedure.input(z.object({
      empresaId: z.number().optional(),
      banco: z.string(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      titular: z.string().optional(),
      limite: z.string().optional(),
      saldo: z.string().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(finContas).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      empresaId: z.number().nullish(),
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      titular: z.string().optional(),
      limite: z.string().optional(),
      saldo: z.string().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finContas).set(dados).where(eq(finContas.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finContas).set({ ativo: false }).where(eq(finContas.id, input.id))),
  }),

  finFornecedores: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finFornecedores).where(eq(finFornecedores.ativo, true))),
    criar:   protectedProcedure.input(z.object({ nome: z.string(), cnpj: z.string().optional(), fone: z.string().optional(), email: z.string().optional() }))
      .mutation(({ input, ctx }) => ctx.db.insert(finFornecedores).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cnpj: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finFornecedores).set(dados).where(eq(finFornecedores.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finFornecedores).set({ ativo: false }).where(eq(finFornecedores.id, input.id))),
  }),

  finDevedores: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finDevedores).where(eq(finDevedores.ativo, true))),
    criar:   protectedProcedure.input(z.object({ nome: z.string(), cnpj: z.string().optional(), fone: z.string().optional(), email: z.string().optional() }))
      .mutation(({ input, ctx }) => ctx.db.insert(finDevedores).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cnpj: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finDevedores).set(dados).where(eq(finDevedores.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finDevedores).set({ ativo: false }).where(eq(finDevedores.id, input.id))),
  }),

  finTipoDespesas: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finTipoDespesas).where(eq(finTipoDespesas.ativo, true))),
    criar:   protectedProcedure.input(z.object({ nome: z.string() })).mutation(({ input, ctx }) => ctx.db.insert(finTipoDespesas).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finTipoDespesas).set(dados).where(eq(finTipoDespesas.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finTipoDespesas).set({ ativo: false }).where(eq(finTipoDespesas.id, input.id))),
  }),

  finTipoReceitas: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finTipoReceitas).where(eq(finTipoReceitas.ativo, true))),
    criar:   protectedProcedure.input(z.object({ nome: z.string() })).mutation(({ input, ctx }) => ctx.db.insert(finTipoReceitas).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finTipoReceitas).set(dados).where(eq(finTipoReceitas.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finTipoReceitas).set({ ativo: false }).where(eq(finTipoReceitas.id, input.id))),
  }),

  finNaturezas: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(finNaturezas).where(eq(finNaturezas.ativo, true))),
    criar:   protectedProcedure.input(z.object({ nome: z.string(), tipo: z.enum(['Despesa','Receita','Ambos']).optional() }))
      .mutation(({ input, ctx }) => ctx.db.insert(finNaturezas).values(input)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      tipo: z.enum(['Despesa','Receita','Ambos']).optional(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(finNaturezas).set(dados).where(eq(finNaturezas.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(finNaturezas).set({ ativo: false }).where(eq(finNaturezas.id, input.id))),
  }),

  documentosTipos: router({
    listar:  protectedProcedure.query(({ ctx }) => ctx.db.select().from(documentosTipos).where(eq(documentosTipos.ativo, true))),
    criar:   protectedProcedure.input(z.object({ fluxoId: z.number().optional(), nome: z.string(), categoria: z.string().optional(), ordem: z.number().optional(), obrigatorio: z.boolean().optional() }))
      .mutation(({ input, ctx }) => ctx.db.insert(documentosTipos).values(input as any)),
    editar:  protectedProcedure.input(z.object({
      id: z.number(),
      fluxoId: z.number().nullish(),
      nome: z.string().optional(),
      categoria: z.string().optional(),
      ordem: z.number().optional(),
      obrigatorio: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(documentosTipos).set(dados as any).where(eq(documentosTipos.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(documentosTipos).set({ ativo: false }).where(eq(documentosTipos.id, input.id))),
  }),

  // Empreendimentos
  empreendimentos: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(empreendimentos).where(eq(empreendimentos.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      constutoraId: z.number().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      tipo: z.enum(['Comercial','Residencial']).optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(empreendimentos).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      constutoraId: z.number().nullish(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      tipo: z.enum(['Comercial','Residencial']).optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(empreendimentos).set(dados).where(eq(empreendimentos.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(empreendimentos).set({ ativo: false }).where(eq(empreendimentos.id, input.id))),
  }),

  // Arquivos
  arquivos: router({
    listar: protectedProcedure.query(({ ctx }) =>
      ctx.db.select().from(arquivos).where(eq(arquivos.usuarioId, ctx.usuario.id)).orderBy(desc(arquivos.criadoEm))
    ),
    upload: protectedProcedure.input(z.object({
      nomeOriginal: z.string(),
      nomeArquivo: z.string(),
      caminhoArquivo: z.string(),
      mimeType: z.string().optional(),
      tamanho: z.number().optional(),
      descricao: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await ctx.db.insert(arquivos).values({ ...input as any, usuarioId: ctx.usuario.id, criadoEm: new Date() })
      return { ok: true }
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await ctx.db.delete(arquivos).where(and(eq(arquivos.id, input.id), eq(arquivos.usuarioId, ctx.usuario.id)))
      return { ok: true }
    }),
  }),
})
