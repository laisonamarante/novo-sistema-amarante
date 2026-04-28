import { z } from 'zod'
import { eq, and, desc, gte, lte, sql, or, inArray } from 'drizzle-orm'
import { router, protectedProcedure, requirePerm } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  tarefas, pontos, preAnalises, usuarios, avisos, advertencias,
  bancos, agencias, modalidades, fluxos, situacoes, etapas,
  construtoras, imobiliarias, corretores, parceiros, subestabelecidos, subestabelecidoBancos, bancoModalidades, parceiroBancos, fluxoDocumentos, fluxoEtapas,
  imoveis, simuladores, finEmpresas, finContas, finFornecedores,
  finDevedores, finTipoDespesas, finTipoReceitas, finNaturezas,
  processos,
  documentosTipos, arquivos, empreendimentos
} from '../../drizzle/schema'

const PERFIS_INTERNOS = ['Administrador', 'Analista', 'Gerente']
const PERFIS_EXTERNOS = ['Parceiro', 'Corretor', 'Imobiliária', 'Construtora', 'Subestabelecido']
const PRE_ANALISE_BANCOS_BASE = ['Banco do Brasil', 'Bradesco', 'Itaú']

function normalizarNomeBanco(valor?: string | null) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function isPerfilInterno(perfil?: string | null) {
  return !!perfil && PERFIS_INTERNOS.includes(perfil)
}

function isPerfilExterno(perfil?: string | null) {
  return !!perfil && PERFIS_EXTERNOS.includes(perfil)
}

function assertPodeGerenciarParceiro(usuario: any) {
  if (usuario?.perfil === 'Analista') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Analista possui acesso somente para visualização do parceiro' })
  }
}

function getProcessosScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId
        ? or(eq(processos.criadoPorId, usuario.id), eq(processos.parceiroId, usuario.parceiroId))
        : eq(processos.criadoPorId, usuario.id)
    case 'Corretor':
      return usuario?.corretorId
        ? or(eq(processos.criadoPorId, usuario.id), eq(processos.corretorId, usuario.corretorId))
        : eq(processos.criadoPorId, usuario.id)
    case 'Imobiliária':
      return usuario?.imobiliariaId
        ? or(eq(processos.criadoPorId, usuario.id), eq(processos.imobiliariaId, usuario.imobiliariaId))
        : eq(processos.criadoPorId, usuario.id)
    case 'Construtora':
      return usuario?.construtoraId
        ? or(eq(processos.criadoPorId, usuario.id), eq(processos.construtoraId, usuario.construtoraId))
        : eq(processos.criadoPorId, usuario.id)
    default:
      return eq(processos.id, -1)
  }
}

function getParceirosScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined
  return usuario?.parceiroId ? eq(parceiros.id, usuario.parceiroId) : eq(parceiros.id, -1)
}

function getConstrutorasScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId ? eq(construtoras.parceiroId, usuario.parceiroId) : eq(construtoras.id, -1)
    case 'Construtora':
      return usuario?.construtoraId
        ? or(eq(construtoras.id, usuario.construtoraId), eq(construtoras.usuarioId, usuario.id))
        : eq(construtoras.usuarioId, usuario.id)
    default:
      return eq(construtoras.id, -1)
  }
}

function getImobiliariasScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId ? eq(imobiliarias.parceiroId, usuario.parceiroId) : eq(imobiliarias.id, -1)
    case 'Imobiliária':
      return usuario?.imobiliariaId
        ? or(eq(imobiliarias.id, usuario.imobiliariaId), eq(imobiliarias.usuarioId, usuario.id))
        : eq(imobiliarias.usuarioId, usuario.id)
    case 'Corretor':
      return usuario?.imobiliariaId ? eq(imobiliarias.id, usuario.imobiliariaId) : eq(imobiliarias.id, -1)
    default:
      return eq(imobiliarias.id, -1)
  }
}

function getCorretoresScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId ? eq(corretores.parceiroId, usuario.parceiroId) : eq(corretores.id, -1)
    case 'Imobiliária':
      return usuario?.imobiliariaId ? eq(corretores.imobiliariaId, usuario.imobiliariaId) : eq(corretores.id, -1)
    case 'Corretor':
      return usuario?.corretorId
        ? or(eq(corretores.id, usuario.corretorId), eq(corretores.usuarioId, usuario.id))
        : eq(corretores.usuarioId, usuario.id)
    default:
      return eq(corretores.id, -1)
  }
}

function getSubestabelecidosScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
      return usuario?.parceiroId ? eq(subestabelecidos.parceiroId, usuario.parceiroId) : eq(subestabelecidos.id, -1)
    case 'Subestabelecido':
      return usuario?.subestabelecidoId ? eq(subestabelecidos.id, usuario.subestabelecidoId) : eq(subestabelecidos.id, -1)
    default:
      return eq(subestabelecidos.id, -1)
  }
}

function getImoveisScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId
        ? or(eq(imoveis.usuarioId, usuario.id), eq(imoveis.parceiroId, usuario.parceiroId))
        : eq(imoveis.usuarioId, usuario.id)
    case 'Corretor':
      return usuario?.corretorId
        ? or(eq(imoveis.usuarioId, usuario.id), eq(imoveis.corretorId, usuario.corretorId))
        : eq(imoveis.usuarioId, usuario.id)
    case 'Imobiliária':
      return usuario?.imobiliariaId
        ? or(eq(imoveis.usuarioId, usuario.id), eq(imoveis.imobiliariaId, usuario.imobiliariaId))
        : eq(imoveis.usuarioId, usuario.id)
    case 'Construtora':
      return usuario?.construtoraId
        ? or(eq(imoveis.usuarioId, usuario.id), eq(imoveis.construtoraId, usuario.construtoraId))
        : eq(imoveis.usuarioId, usuario.id)
    default:
      return eq(imoveis.id, -1)
  }
}

async function getConstrutorasIdsAcessiveis(db: any, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return null

  if (usuario?.perfil === 'Construtora') {
    return usuario?.construtoraId ? [usuario.construtoraId] : []
  }

  if (['Parceiro', 'Subestabelecido'].includes(usuario?.perfil)) {
    if (!usuario?.parceiroId) return []
    const rows = await db.select({ id: construtoras.id }).from(construtoras).where(and(eq(construtoras.ativo, true), eq(construtoras.parceiroId, usuario.parceiroId)))
    return rows.map((row: any) => row.id)
  }

  return []
}

async function assertScopedAccess(db: any, table: any, idColumn: any, id: number, scope: any, message: string) {
  const where = scope ? and(eq(idColumn, id), scope) : eq(idColumn, id)
  const [row] = await db.select({ id: idColumn }).from(table).where(where)

  if (!row) {
    throw new TRPCError({ code: 'FORBIDDEN', message })
  }
}

function applyConstrutoraOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input
  const scoped: Record<string, any> = { ...input }

  if (['Parceiro', 'Subestabelecido', 'Construtora'].includes(usuario?.perfil)) {
    scoped.parceiroId = usuario?.parceiroId || undefined
  }
  if (usuario?.perfil === 'Construtora') {
    scoped.usuarioId = usuario.id
  }

  return scoped
}

function applyImobiliariaOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input
  const scoped: Record<string, any> = { ...input }

  if (['Parceiro', 'Subestabelecido', 'Imobiliária'].includes(usuario?.perfil)) {
    scoped.parceiroId = usuario?.parceiroId || undefined
  }
  if (usuario?.perfil === 'Imobiliária') {
    scoped.usuarioId = usuario.id
  }

  return scoped
}

function applyCorretorOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input
  const scoped: Record<string, any> = { ...input }

  if (['Parceiro', 'Subestabelecido', 'Imobiliária', 'Corretor'].includes(usuario?.perfil)) {
    scoped.parceiroId = usuario?.parceiroId || undefined
  }
  if (usuario?.perfil === 'Imobiliária') {
    scoped.imobiliariaId = usuario?.imobiliariaId || undefined
  }
  if (usuario?.perfil === 'Corretor') {
    scoped.usuarioId = usuario.id
    scoped.imobiliariaId = usuario?.imobiliariaId || undefined
  }

  return scoped
}

function applySubestabelecidoOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input
  const scoped: Record<string, any> = { ...input }

  if (['Parceiro', 'Subestabelecido'].includes(usuario?.perfil)) {
    scoped.parceiroId = usuario?.parceiroId || undefined
  }

  return scoped
}

function applyImovelOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input
  const scoped: Record<string, any> = { ...input, usuarioId: usuario.id }

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      scoped.parceiroId = usuario?.parceiroId || undefined
      break
    case 'Corretor':
      scoped.parceiroId = usuario?.parceiroId || undefined
      scoped.corretorId = usuario?.corretorId || undefined
      scoped.imobiliariaId = usuario?.imobiliariaId || undefined
      break
    case 'Imobiliária':
      scoped.parceiroId = usuario?.parceiroId || undefined
      scoped.imobiliariaId = usuario?.imobiliariaId || undefined
      break
    case 'Construtora':
      scoped.parceiroId = usuario?.parceiroId || undefined
      scoped.construtoraId = usuario?.construtoraId || undefined
      break
  }

  return scoped
}

async function limparVinculosUsuario(db: any, usuarioId: number) {
  await db.update(parceiros).set({ usuarioId: null }).where(eq(parceiros.usuarioId, usuarioId))
  await db.update(corretores).set({ usuarioId: null }).where(eq(corretores.usuarioId, usuarioId))
  await db.update(imobiliarias).set({ usuarioId: null }).where(eq(imobiliarias.usuarioId, usuarioId))
  await db.update(construtoras).set({ usuarioId: null }).where(eq(construtoras.usuarioId, usuarioId))
}

async function validarDisponibilidadeDeVinculo(
  db: any,
  table: any,
  idColumn: any,
  usuarioColumn: any,
  id: number,
  usuarioId: number,
  entidadeLabel: string
) {
  const [row] = await db
    .select({ id: idColumn, usuarioId: usuarioColumn })
    .from(table)
    .where(eq(idColumn, id))

  if (!row) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `${entidadeLabel} não encontrado(a)` })
  }

  if (row.usuarioId && row.usuarioId !== usuarioId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `${entidadeLabel} já está vinculado(a) a outro usuário` })
  }
}

async function sincronizarVinculosDoUsuario(
  db: any,
  usuarioId: number,
  perfil: string,
  vinculos: {
    parceiroId?: number | null
    corretorId?: number | null
    imobiliariaId?: number | null
    construtoraId?: number | null
    subestabelecidoId?: number | null
  }
) {
  await limparVinculosUsuario(db, usuarioId)

  switch (perfil) {
    case 'Parceiro':
      if (!vinculos.parceiroId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione o parceiro deste usuário' })
      }
      await validarDisponibilidadeDeVinculo(db, parceiros, parceiros.id, parceiros.usuarioId, vinculos.parceiroId, usuarioId, 'Parceiro')
      await db.update(parceiros).set({ usuarioId }).where(eq(parceiros.id, vinculos.parceiroId))
      return { subestabelecidoId: null }

    case 'Corretor':
      if (!vinculos.corretorId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione o corretor deste usuário' })
      }
      await validarDisponibilidadeDeVinculo(db, corretores, corretores.id, corretores.usuarioId, vinculos.corretorId, usuarioId, 'Corretor')
      await db.update(corretores).set({ usuarioId }).where(eq(corretores.id, vinculos.corretorId))
      return { subestabelecidoId: null }

    case 'Imobiliária':
      if (!vinculos.imobiliariaId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione a imobiliária deste usuário' })
      }
      await validarDisponibilidadeDeVinculo(db, imobiliarias, imobiliarias.id, imobiliarias.usuarioId, vinculos.imobiliariaId, usuarioId, 'Imobiliária')
      await db.update(imobiliarias).set({ usuarioId }).where(eq(imobiliarias.id, vinculos.imobiliariaId))
      return { subestabelecidoId: null }

    case 'Construtora':
      if (!vinculos.construtoraId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione a construtora deste usuário' })
      }
      await validarDisponibilidadeDeVinculo(db, construtoras, construtoras.id, construtoras.usuarioId, vinculos.construtoraId, usuarioId, 'Construtora')
      await db.update(construtoras).set({ usuarioId }).where(eq(construtoras.id, vinculos.construtoraId))
      return { subestabelecidoId: null }

    case 'Subestabelecido':
      if (!vinculos.subestabelecidoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione o subestabelecido deste usuário' })
      }
      const [subestabelecido] = await db
        .select({ id: subestabelecidos.id })
        .from(subestabelecidos)
        .where(eq(subestabelecidos.id, vinculos.subestabelecidoId))

      if (!subestabelecido) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Subestabelecido não encontrado' })
      }

      return { subestabelecidoId: vinculos.subestabelecidoId }

    default:
      return { subestabelecidoId: null }
  }
}

async function validarUsuarioDoSistemaNoCadastroExterno(
  db: any,
  params: {
    usuarioId?: number | null
    perfilEsperado: 'Parceiro' | 'Corretor' | 'Imobiliária' | 'Construtora'
    entidadeLabel: string
    tabelaAtual: any
    colunaIdAtual: any
    idAtual?: number | null
  }
) {
  if (!params.usuarioId) return

  const [usuario] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, perfil: usuarios.perfil })
    .from(usuarios)
    .where(eq(usuarios.id, params.usuarioId))

  if (!usuario) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Usuário do sistema não encontrado' })
  }

  if (usuario.perfil !== params.perfilEsperado) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${usuario.nome} está com perfil ${usuario.perfil}. Para ${params.entidadeLabel}, selecione um usuário com perfil ${params.perfilEsperado}.`,
    })
  }

  const vinculacoes = await Promise.all([
    db.select({ id: parceiros.id }).from(parceiros).where(eq(parceiros.usuarioId, params.usuarioId)),
    db.select({ id: corretores.id }).from(corretores).where(eq(corretores.usuarioId, params.usuarioId)),
    db.select({ id: imobiliarias.id }).from(imobiliarias).where(eq(imobiliarias.usuarioId, params.usuarioId)),
    db.select({ id: construtoras.id }).from(construtoras).where(eq(construtoras.usuarioId, params.usuarioId)),
  ])

  const conflito = vinculacoes.some((rows, index) => {
    if (!rows.length) return false
    const row = rows[0]
    const mesmaTabela =
      (index === 0 && params.tabelaAtual === parceiros) ||
      (index === 1 && params.tabelaAtual === corretores) ||
      (index === 2 && params.tabelaAtual === imobiliarias) ||
      (index === 3 && params.tabelaAtual === construtoras)

    return !(mesmaTabela && params.idAtual && row.id === params.idAtual)
  })

  if (conflito) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${usuario.nome} já está vinculado a outro cadastro externo.`,
    })
  }
}

// ─── TAREFAS ──────────────────────────────────────────────
export const tarefasRouter = router({
  minhasTarefas: protectedProcedure
    .input(z.object({
      filtroStatus: z.enum(['pendente','resolvida','todas']).default('pendente'),
    }).optional().default({ filtroStatus: 'pendente' }))
    .query(async ({ input, ctx }) => {
      const statusCondCriadas = input.filtroStatus !== 'todas'
        ? sql`AND LOWER(t.status) = LOWER(${input.filtroStatus})`
        : sql``

      const recebidas = await ctx.db.execute(sql`
        SELECT t.id, t.solicitacao, t.status, t.acompanhamento,
               t.processo_id as processoId, t.data_limite as dataLimite,
               p.num_proposta as processoNumProposta,
               t.criado_em as criadoEm, t.resolvido_em as resolvidoEm,
               sol.nome as solicitanteNome, exec.nome as executanteNome,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = t.processo_id LIMIT 1) as compradorNome
        FROM tarefas t
        LEFT JOIN usuarios sol ON sol.id = t.solicitante_id
        LEFT JOIN usuarios exec ON exec.id = t.executante_id
        LEFT JOIN processos p ON p.id = t.processo_id
        WHERE t.executante_id = ${ctx.usuario.id}
          AND LOWER(t.status) = 'pendente'
        ORDER BY t.criado_em DESC LIMIT 50
      `)

      const criadas = await ctx.db.execute(sql`
        SELECT t.id, t.solicitacao, t.status, t.acompanhamento,
               t.processo_id as processoId, t.data_limite as dataLimite,
               p.num_proposta as processoNumProposta,
               t.criado_em as criadoEm, t.resolvido_em as resolvidoEm,
               sol.nome as solicitanteNome, exec.nome as executanteNome,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = t.processo_id LIMIT 1) as compradorNome
        FROM tarefas t
        LEFT JOIN usuarios sol ON sol.id = t.solicitante_id
        LEFT JOIN usuarios exec ON exec.id = t.executante_id
        LEFT JOIN processos p ON p.id = t.processo_id
        WHERE t.solicitante_id = ${ctx.usuario.id} ${statusCondCriadas}
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
               p.num_proposta as processoNumProposta,
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
          ${input.dataFim ? sql`AND t.criado_em <= ${input.dataFim + ' 23:59:59'}` : sql``}
        ORDER BY t.criado_em DESC
        LIMIT 20 OFFSET ${offset}
      `)
      return result[0] as unknown as any[]
    }),

  criar: requirePerm('tarefa:criar')
    .input(z.object({
      processoId:  z.number().optional(),
      executanteId: z.number(),
      solicitacao: z.string().min(1),
      dataLimite:  z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [executante] = await ctx.db
        .select({ id: usuarios.id, perfil: usuarios.perfil })
        .from(usuarios)
        .where(eq(usuarios.id, input.executanteId))

      if (!executante) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Usuário executante não encontrado' })
      }

      if (isPerfilExterno(ctx.usuario?.perfil) && !isPerfilInterno(executante.perfil)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Usuário externo só pode enviar tarefa para usuários internos.',
        })
      }

      if (input.processoId) {
        const scope = getProcessosScopeCondition(ctx.usuario)
        const [processo] = await ctx.db
          .select({ id: processos.id })
          .from(processos)
          .where(scope ? and(eq(processos.id, input.processoId), scope) : eq(processos.id, input.processoId))

        if (!processo) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado ao processo desta tarefa' })
        }

        if (isPerfilExterno(ctx.usuario?.perfil)) {
          const [pendente] = await ctx.db
            .select({ id: tarefas.id })
            .from(tarefas)
            .where(and(eq(tarefas.processoId, input.processoId), sql`LOWER(${tarefas.status}) = 'pendente'`))

          if (pendente) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Já existe uma tarefa pendente para este processo.',
            })
          }
        }
      }

      await ctx.db.insert(tarefas).values({ ...input as any, solicitanteId: ctx.usuario.id, criadoEm: new Date() })
      return { ok: true }
    }),

  concluir: requirePerm('tarefa:resolver')
    .input(z.object({
      id: z.number(),
      status: z.enum(['Pendente','Resolvida','Encerrada']).optional(),
      acompanhamento: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const novoStatus = input.status || 'Resolvida'
      const [tarefa] = await ctx.db.select({
        id: tarefas.id,
        solicitanteId: tarefas.solicitanteId,
        executanteId: tarefas.executanteId,
      }).from(tarefas).where(eq(tarefas.id, input.id))

      if (!tarefa) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' })
      }

      if (!isPerfilInterno(ctx.usuario?.perfil) && tarefa.executanteId !== ctx.usuario.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o executante pode responder esta tarefa' })
      }

      const updates: any = { status: novoStatus, acompanhamento: input.acompanhamento }
      if (novoStatus !== 'Pendente') updates.resolvidoEm = new Date()
      else updates.resolvidoEm = null
      await ctx.db.update(tarefas).set(updates).where(eq(tarefas.id, input.id))
      return { ok: true }
    }),

  responderEncaminhamento: protectedProcedure
    .input(z.object({
      id: z.number(),
      decisao: z.enum(['Aceitar', 'Recusar']),
      acompanhamento: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [tarefa] = await ctx.db.select({
        id: tarefas.id,
        processoId: tarefas.processoId,
        executanteId: tarefas.executanteId,
        solicitacao: tarefas.solicitacao,
        status: tarefas.status,
      }).from(tarefas).where(eq(tarefas.id, input.id))

      if (!tarefa) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' })
      }

      if (tarefa.executanteId !== ctx.usuario.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o executante pode responder este encaminhamento' })
      }

      if (!isPerfilInterno(ctx.usuario?.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas usuários internos podem assumir encaminhamentos de processo' })
      }

      if (!tarefa.processoId || !String(tarefa.solicitacao || '').startsWith('Encaminhamento de processo:')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta tarefa não é um encaminhamento de processo' })
      }

      if (tarefa.status !== 'Pendente') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este encaminhamento já foi respondido' })
      }

      await ctx.db.transaction(async (tx) => {
        if (input.decisao === 'Aceitar') {
          await tx.update(processos)
            .set({ responsavelId: ctx.usuario.id, atualizadoEm: new Date() })
            .where(eq(processos.id, tarefa.processoId!))
        }

        await tx.update(tarefas).set({
          status: input.decisao === 'Aceitar' ? 'Resolvida' : 'Encerrada',
          acompanhamento: [
            `${input.decisao} por ${ctx.usuario.nome}`,
            input.acompanhamento?.trim() ? `Observação: ${input.acompanhamento.trim()}` : '',
          ].filter(Boolean).join('\n'),
          resolvidoEm: new Date(),
        }).where(eq(tarefas.id, input.id))
      })

      return { ok: true }
    }),

  concluirEmMassa: requirePerm('tarefa:resolver')
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
async function listarBancosPreAnalisePermitidos(ctx: any) {
  const bancosBase = await ctx.db.select().from(bancos).where(eq(bancos.ativo, true))
  const nomesBase = new Set(PRE_ANALISE_BANCOS_BASE.map(normalizarNomeBanco))
  const bancosPreAnalise = bancosBase.filter((b: any) => nomesBase.has(normalizarNomeBanco(b.nome)))

  if (ctx.usuario?.perfil !== 'Parceiro') return bancosPreAnalise
  if (!ctx.usuario?.parceiroId) return []

  const vinculos = await ctx.db
    .select({ bancoId: parceiroBancos.bancoId })
    .from(parceiroBancos)
    .where(eq(parceiroBancos.parceiroId, ctx.usuario.parceiroId))
  const bancosVinculados = new Set(vinculos.map((v: any) => v.bancoId))

  return bancosPreAnalise.filter((b: any) => bancosVinculados.has(b.id))
}

export const preAnaliseRouter = router({
  bancosPermitidos: protectedProcedure.query(async ({ ctx }) => listarBancosPreAnalisePermitidos(ctx)),

  listar: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      pagina: z.number().default(1),
      busca: z.string().optional(),
      cpfCnpj: z.string().optional(),
      nome: z.string().optional(),
      situacao: z.string().optional(),
      bancos: z.string().optional(),
      solicitanteId: z.number().optional(),
      responsavelId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const isExterno = ['Parceiro', 'Corretor', 'Imobiliária', 'Construtora', 'Subestabelecido'].includes(ctx.usuario.perfil)
      const result = await ctx.db.execute(sql`
        SELECT pa.id, pa.processo_id as processoId, pa.bancos, pa.nome, pa.cpf_cnpj as cpfCnpj, pa.valor_financiamento as valorFinanciamento, pa.situacao, pa.observacao, pa.retorno, pa.permitir_reenvio as permitirReenvio, pa.criado_em as criadoEm, pa.responsavel_id as responsavelId, pa.solicitante_id as solicitanteId, u1.nome as solicitanteNome, u2.nome as responsavelNome
        FROM pre_analises pa
        LEFT JOIN usuarios u1 ON u1.id = pa.solicitante_id
        LEFT JOIN usuarios u2 ON u2.id = pa.responsavel_id
        WHERE 1=1
        ${input.busca ? sql`AND (pa.nome LIKE ${'%'+input.busca+'%'} OR pa.cpf_cnpj LIKE ${'%'+input.busca+'%'})` : sql``}
        ${input.nome ? sql`AND pa.nome LIKE ${'%'+input.nome+'%'}` : sql``}
        ${input.cpfCnpj ? sql`AND REPLACE(REPLACE(REPLACE(pa.cpf_cnpj, '.', ''), '-', ''), '/', '') LIKE ${'%'+input.cpfCnpj.replace(/\D/g, '')+'%'}` : sql``}
        ${input.situacao ? sql`AND pa.situacao = ${input.situacao}` : sql``}
        ${input.bancos ? sql`AND pa.bancos LIKE ${'%'+input.bancos+'%'}` : sql``}
        ${!isExterno && input.solicitanteId ? sql`AND pa.solicitante_id = ${input.solicitanteId}` : sql``}
        ${!isExterno && input.responsavelId ? sql`AND pa.responsavel_id = ${input.responsavelId}` : sql``}
        ${ctx.usuario.perfil === 'Parceiro' ? sql`AND pa.solicitante_id = ${ctx.usuario.id}` : sql``}
        ${ctx.usuario.perfil === 'Corretor' ? sql`AND pa.solicitante_id = ${ctx.usuario.id}` : sql``}
        ${ctx.usuario.perfil === 'Imobiliária' ? sql`AND pa.solicitante_id = ${ctx.usuario.id}` : sql``}
        ${ctx.usuario.perfil === 'Construtora' ? sql`AND pa.solicitante_id = ${ctx.usuario.id}` : sql``}
        ${ctx.usuario.perfil === 'Subestabelecido' ? sql`AND pa.solicitante_id = ${ctx.usuario.id}` : sql``}
        ORDER BY pa.criado_em DESC
        LIMIT 100
      `)
      return result[0] as unknown as any[]
    }),

  criar: requirePerm('pre_analise:criar')
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
      const cleaned: any = { ...input }
      Object.keys(cleaned).forEach(k => { if (cleaned[k] === '') cleaned[k] = null })
      if (cleaned.valorFinanciamento) cleaned.valorFinanciamento = String(cleaned.valorFinanciamento).replace(',', '.')
      const bancosList = String(cleaned.bancos || '').split(',').map((b: string) => b.trim()).filter(Boolean)
      if (bancosList.length === 0) bancosList.push(cleaned.bancos || '')
      if (ctx.usuario.perfil === 'Parceiro') {
        const bancosPermitidos = await listarBancosPreAnalisePermitidos(ctx)
        const permitidos = new Set(bancosPermitidos.map((b: any) => normalizarNomeBanco(b.nome)))
        if (permitidos.size === 0) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Nenhum banco vinculado ao cadastro deste parceiro para pré-análise' })
        }
        const bancoInvalido = bancosList.find((banco: string) => !permitidos.has(normalizarNomeBanco(banco)))
        if (bancoInvalido) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `Banco não permitido para este parceiro: ${bancoInvalido}` })
        }
      }
      for (const banco of bancosList) {
        await ctx.db.insert(preAnalises).values({
          ...cleaned,
          bancos: banco,
          solicitanteId: ctx.usuario.id,
          criadoEm: new Date(),
          atualizadoEm: new Date()
        })
      }
      return { ok: true, count: bancosList.length }
    }),

  atualizar: requirePerm('pre_analise:editar')
    .input(z.object({
      id:             z.number(),
      situacao:       z.string().optional(),
      observacao:     z.string().optional(),
      retorno:        z.string().optional(),
      responsavelId:  z.number().optional(),
      permitirReenvio: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [registro] = await ctx.db
        .select({
          id: preAnalises.id,
          situacao: preAnalises.situacao,
          processoId: preAnalises.processoId,
          solicitanteId: preAnalises.solicitanteId,
          permitirReenvio: preAnalises.permitirReenvio,
        })
        .from(preAnalises)
        .where(eq(preAnalises.id, input.id))

      if (!registro) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pré-análise não encontrada' })
      }

      const isExterno = ['Parceiro', 'Corretor', 'Imobiliária', 'Construtora', 'Subestabelecido'].includes(ctx.usuario.perfil)
      if (isExterno && registro.solicitanteId !== ctx.usuario.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado à pré-análise' })
      }

      const { id, ...dados } = input
      let dadosPermitidos: Record<string, unknown> = dados
      const normalizarSituacao = (situacao?: string | null) =>
        (situacao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const situacaoCanonica = (situacao?: string | null) => {
        const valor = normalizarSituacao(situacao)
        if (valor === 'em analise') return 'Em análise'
        if (valor === 'aguardando analise') return 'Aguardando análise'
        if (valor === 'apto') return 'Apto'
        if (valor === 'nao apto') return 'Não apto'
        if (valor === 'concluida') return 'Concluída'
        return situacao
      }

      if (isExterno) {
        const situacaoAtual = normalizarSituacao(registro.situacao)
        const proximaSituacao = normalizarSituacao(dados.situacao)
        const aptoSemProcesso = situacaoAtual === 'apto' && !registro.processoId
        const podeConcluir = proximaSituacao === 'concluida' && (situacaoAtual === 'apto' || situacaoAtual === 'nao apto') && !aptoSemProcesso
        const podeReenviar = proximaSituacao === 'aguardando analise' && situacaoAtual === 'nao apto' && Boolean(registro.permitirReenvio)

        if (podeConcluir) {
          dadosPermitidos = { situacao: 'Concluída', observacao: dados.observacao }
        } else if (proximaSituacao === 'concluida' && aptoSemProcesso) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Crie a proposta antes de concluir uma pré-análise apta' })
        } else if (podeReenviar) {
          dadosPermitidos = { situacao: 'Aguardando análise', observacao: dados.observacao }
        } else {
          dadosPermitidos = { observacao: dados.observacao }
        }
      } else if (typeof dados.situacao === 'string') {
        dadosPermitidos = { ...dadosPermitidos, situacao: situacaoCanonica(dados.situacao) }
      }

      await ctx.db.update(preAnalises).set({ ...dadosPermitidos, atualizadoEm: new Date() }).where(eq(preAnalises.id, id))
      return { ok: true }
    }),

  excluir: requirePerm('pre_analise:excluir')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.usuario.perfil !== 'Administrador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente administradores podem excluir pré-análises' })
      }

      const [registro] = await ctx.db
        .select({ id: preAnalises.id, solicitanteId: preAnalises.solicitanteId })
        .from(preAnalises)
        .where(eq(preAnalises.id, input.id))

      if (!registro) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pré-análise não encontrada' })
      }

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
      if (!isPerfilInterno(ctx.usuario?.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Ponto é exclusivo para usuários internos' })
      }
      await ctx.db.insert(pontos).values({ ...input, usuarioId: ctx.usuario.id, dataHora: new Date(), criadoEm: new Date() })
      return { ok: true }
    }),

  meusDia: protectedProcedure
    .input(z.object({ data: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!isPerfilInterno(ctx.usuario?.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Ponto é exclusivo para usuários internos' })
      }
      const inicio = new Date(input.data); inicio.setHours(0,0,0,0)
      const fim    = new Date(input.data); fim.setHours(23,59,59,999)
      return ctx.db.select().from(pontos)
        .where(and(eq(pontos.usuarioId, ctx.usuario.id), gte(pontos.dataHora, inicio), lte(pontos.dataHora, fim)))
        .orderBy(pontos.dataHora)
    }),

  relatorio: protectedProcedure
    .input(z.object({ usuarioId: z.number().optional(), mes: z.number(), ano: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!isPerfilInterno(ctx.usuario?.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Ponto é exclusivo para usuários internos' })
      }
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
    listarPorParceiro: protectedProcedure.input(z.object({ parceiroId: z.number() })).query(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      const vinc = await ctx.db.select({ bancoId: parceiroBancos.bancoId }).from(parceiroBancos).where(eq(parceiroBancos.parceiroId, input.parceiroId))
      if (vinc.length === 0) return ctx.db.select().from(bancos).where(eq(bancos.ativo, true))
      const ids = vinc.map(v => v.bancoId)
      const todos = await ctx.db.select().from(bancos).where(eq(bancos.ativo, true))
      return todos.filter(b => ids.includes(b.id))
    }),
    modalidadesVinculadas: protectedProcedure.input(z.object({ bancoId: z.number() })).query(async ({ input, ctx }) => {
      const vinculadas = await ctx.db
        .select({
          bancoId: bancoModalidades.bancoId,
          modalidadeId: bancoModalidades.modalidadeId,
          modalidadeNome: modalidades.nome,
          fluxoId: modalidades.fluxoId,
          fluxoExterno: fluxos.externo,
        })
        .from(bancoModalidades)
        .leftJoin(modalidades, eq(bancoModalidades.modalidadeId, modalidades.id))
        .leftJoin(fluxos, eq(modalidades.fluxoId, fluxos.id))
        .where(eq(bancoModalidades.bancoId, input.bancoId))

      if (!isPerfilExterno(ctx.usuario?.perfil)) return vinculadas
      return vinculadas.filter((item) => !!item.fluxoExterno)
    }),
    vincularModalidade: protectedProcedure.input(z.object({ bancoId: z.number(), modalidadeId: z.number() })).mutation(async ({ input, ctx }) => {
      return ctx.db.insert(bancoModalidades).values({ bancoId: input.bancoId, modalidadeId: input.modalidadeId }).onDuplicateKeyUpdate({ set: { bancoId: input.bancoId } })
    }),
    desvincularModalidade: protectedProcedure.input(z.object({ bancoId: z.number(), modalidadeId: z.number() })).mutation(async ({ input, ctx }) => {
      return ctx.db.delete(bancoModalidades).where(and(eq(bancoModalidades.bancoId, input.bancoId), eq(bancoModalidades.modalidadeId, input.modalidadeId)))
    }),
  }),

  agencias: router({
    listar:  protectedProcedure.input(z.object({ bancoId: z.number().optional() })).query(({ input, ctx }) =>
      ctx.db.select().from(agencias).where(input.bancoId ? and(eq(agencias.ativo, true), eq(agencias.bancoId, input.bancoId)) : eq(agencias.ativo, true))),
    criar:   requirePerm('cadastro:agencia:criar').input(z.object({ bancoId: z.number(), nome: z.string(), codigo: z.string().optional(), cidade: z.string().optional(), uf: z.string().optional() }))
      .mutation(({ input, ctx }) => ctx.db.insert(agencias).values(input)),
    editar:  requirePerm('cadastro:agencia:editar').input(z.object({
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
    excluir: requirePerm('cadastro:agencia:excluir').input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(agencias).set({ ativo: false }).where(eq(agencias.id, input.id))),
  }),

  modalidades: router({
    listar: protectedProcedure.query(({ ctx }) => ctx.db.select().from(modalidades).where(eq(modalidades.ativo, true))),
    criar:  protectedProcedure.input(z.object({ nome: z.string(), fluxoId: z.number().optional() })).mutation(({ input, ctx }) => ctx.db.insert(modalidades).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      fluxoId: z.number().nullish(),
      ativo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(modalidades).set(dados).where(eq(modalidades.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(modalidades).set({ ativo: false }).where(eq(modalidades.id, input.id))),
  }),

  fluxos: router({
    listar: protectedProcedure.query(({ ctx }) => {
      const condicaoBase = eq(fluxos.ativo, true)
      return ctx.db
        .select()
        .from(fluxos)
        .where(isPerfilExterno(ctx.usuario?.perfil) ? and(condicaoBase, eq(fluxos.externo, true)) : condicaoBase)
    }),
    criar:  protectedProcedure.input(z.object({ nome: z.string(), externo: z.boolean().optional() })).mutation(({ input, ctx }) => ctx.db.insert(fluxos).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      externo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => {
      const { id, ...dados } = input
      return ctx.db.update(fluxos).set(dados).where(eq(fluxos.id, id))
    }),
    excluir: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) => ctx.db.update(fluxos).set({ ativo: false }).where(eq(fluxos.id, input.id))),
    listarEtapas: protectedProcedure.input(z.object({ fluxoId: z.number() })).query(async ({ input, ctx }) => {
      const todas = await ctx.db.select().from(etapas).where(eq(etapas.ativo, true)).orderBy(etapas.nome)
      const vincs = await ctx.db.select().from(fluxoEtapas).where(eq(fluxoEtapas.fluxoId, input.fluxoId)).orderBy(fluxoEtapas.ordem)
      const vincMap = new Map(vincs.map(v => [v.etapaId, v.ordem]))
      return todas.map(e => ({ ...e, vinculado: vincMap.has(e.id), fluxoOrdem: vincMap.get(e.id) ?? 0 }))
    }),
    vincularEtapa: protectedProcedure.input(z.object({ etapaId: z.number(), fluxoId: z.number() })).mutation(async ({ input, ctx }) => {
      const vincs = await ctx.db.select().from(fluxoEtapas).where(eq(fluxoEtapas.fluxoId, input.fluxoId))
      const nextOrdem = vincs.length > 0 ? Math.max(...vincs.map(v => v.ordem)) + 1 : 1
      return ctx.db.insert(fluxoEtapas).values({ fluxoId: input.fluxoId, etapaId: input.etapaId, ordem: nextOrdem })
    }),
    desvincularEtapa: protectedProcedure.input(z.object({ etapaId: z.number(), fluxoId: z.number() })).mutation(({ input, ctx }) =>
      ctx.db.delete(fluxoEtapas).where(and(eq(fluxoEtapas.fluxoId, input.fluxoId), eq(fluxoEtapas.etapaId, input.etapaId)))
    ),
    subirOrdemEtapa: protectedProcedure.input(z.object({ etapaId: z.number(), fluxoId: z.number() })).mutation(async ({ input, ctx }) => {
      const lista = await ctx.db.select().from(fluxoEtapas).where(eq(fluxoEtapas.fluxoId, input.fluxoId)).orderBy(fluxoEtapas.ordem)
      const idx = lista.findIndex(d => d.etapaId === input.etapaId)
      if (idx <= 0) return
      const curr = lista[idx], prev = lista[idx-1]
      await ctx.db.update(fluxoEtapas).set({ ordem: prev.ordem }).where(eq(fluxoEtapas.id, curr.id))
      await ctx.db.update(fluxoEtapas).set({ ordem: curr.ordem }).where(eq(fluxoEtapas.id, prev.id))
    }),
    descerOrdemEtapa: protectedProcedure.input(z.object({ etapaId: z.number(), fluxoId: z.number() })).mutation(async ({ input, ctx }) => {
      const lista = await ctx.db.select().from(fluxoEtapas).where(eq(fluxoEtapas.fluxoId, input.fluxoId)).orderBy(fluxoEtapas.ordem)
      const idx = lista.findIndex(d => d.etapaId === input.etapaId)
      if (idx < 0 || idx >= lista.length-1) return
      const curr = lista[idx], next = lista[idx+1]
      await ctx.db.update(fluxoEtapas).set({ ordem: next.ordem }).where(eq(fluxoEtapas.id, curr.id))
      await ctx.db.update(fluxoEtapas).set({ ordem: curr.ordem }).where(eq(fluxoEtapas.id, next.id))
    }),
    listarChecklist: protectedProcedure.input(z.object({ fluxoId: z.number(), categoria: z.string() })).query(async ({ input, ctx }) => {
      const rows = await ctx.db.select({
        id: fluxoDocumentos.id,
        documentoTipoId: fluxoDocumentos.documentoTipoId,
        ordem: fluxoDocumentos.ordem,
        obrigatorioPrimeiraEtapa: fluxoDocumentos.obrigatorioPrimeiraEtapa,
        docNome: documentosTipos.nome,
      }).from(fluxoDocumentos).leftJoin(documentosTipos, eq(fluxoDocumentos.documentoTipoId, documentosTipos.id)).where(and(eq(fluxoDocumentos.fluxoId, input.fluxoId), eq(fluxoDocumentos.categoria, input.categoria))).orderBy(fluxoDocumentos.ordem)
      return rows
    }),
    adicionarDocChecklist: protectedProcedure.input(z.object({
      fluxoId: z.number(),
      documentoTipoId: z.number(),
      categoria: z.string(),
      ordem: z.number(),
      obrigatorioPrimeiraEtapa: z.boolean().optional(),
    })).mutation(({ input, ctx }) =>
      ctx.db.insert(fluxoDocumentos).values(input)
    ),
    definirObrigatorioPrimeiraEtapaDoc: protectedProcedure.input(z.object({ id: z.number(), obrigatorioPrimeiraEtapa: z.boolean() })).mutation(({ input, ctx }) =>
      ctx.db.update(fluxoDocumentos).set({ obrigatorioPrimeiraEtapa: input.obrigatorioPrimeiraEtapa }).where(eq(fluxoDocumentos.id, input.id))
    ),
    removerDocChecklist: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) =>
      ctx.db.delete(fluxoDocumentos).where(eq(fluxoDocumentos.id, input.id))
    ),
    subirOrdemDoc: protectedProcedure.input(z.object({ id: z.number(), fluxoId: z.number(), categoria: z.string() })).mutation(async ({ input, ctx }) => {
      const lista = await ctx.db.select().from(fluxoDocumentos).where(and(eq(fluxoDocumentos.fluxoId, input.fluxoId), eq(fluxoDocumentos.categoria, input.categoria))).orderBy(fluxoDocumentos.ordem)
      const idx = lista.findIndex(d => d.id === input.id)
      if (idx <= 0) return
      const curr = lista[idx], prev = lista[idx-1]
      await ctx.db.update(fluxoDocumentos).set({ ordem: prev.ordem }).where(eq(fluxoDocumentos.id, curr.id))
      await ctx.db.update(fluxoDocumentos).set({ ordem: curr.ordem }).where(eq(fluxoDocumentos.id, prev.id))
    }),
    descerOrdemDoc: protectedProcedure.input(z.object({ id: z.number(), fluxoId: z.number(), categoria: z.string() })).mutation(async ({ input, ctx }) => {
      const lista = await ctx.db.select().from(fluxoDocumentos).where(and(eq(fluxoDocumentos.fluxoId, input.fluxoId), eq(fluxoDocumentos.categoria, input.categoria))).orderBy(fluxoDocumentos.ordem)
      const idx = lista.findIndex(d => d.id === input.id)
      if (idx < 0 || idx >= lista.length-1) return
      const curr = lista[idx], next = lista[idx+1]
      await ctx.db.update(fluxoDocumentos).set({ ordem: next.ordem }).where(eq(fluxoDocumentos.id, curr.id))
      await ctx.db.update(fluxoDocumentos).set({ ordem: curr.ordem }).where(eq(fluxoDocumentos.id, next.id))
    }),
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
    listar: protectedProcedure.input(z.object({}).optional()).query(({ ctx }) =>
      ctx.db.select().from(etapas).where(eq(etapas.ativo, true))),
    criar:  protectedProcedure.input(z.object({
      nome: z.string(),
      ordem: z.number().optional(),
      tolerancia: z.number().optional(),
      situacaoId: z.number().optional(),
      importante: z.boolean().optional(),
      atendente: z.boolean().optional(),
      externo: z.boolean().optional(),
    })).mutation(({ input, ctx }) => ctx.db.insert(etapas).values(input)),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
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
    listar: protectedProcedure.query(({ ctx }) => {
      const scope = getConstrutorasScopeCondition(ctx.usuario)
      return ctx.db.select().from(construtoras).where(and(eq(construtoras.ativo, true), scope))
    }),
    criar:  requirePerm('cadastro:construtora:criar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId,
        perfilEsperado: 'Construtora',
        entidadeLabel: 'Construtora',
        tabelaAtual: construtoras,
        colunaIdAtual: construtoras.id,
      })
      const dados = applyConstrutoraOwnership({ ...input }, ctx.usuario)
      return ctx.db.insert(construtoras).values(dados as any)
    }),
    editar: requirePerm('cadastro:construtora:editar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, construtoras, construtoras.id, input.id, getConstrutorasScopeCondition(ctx.usuario), 'Acesso negado à construtora')
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId ?? null,
        perfilEsperado: 'Construtora',
        entidadeLabel: 'Construtora',
        tabelaAtual: construtoras,
        colunaIdAtual: construtoras.id,
        idAtual: input.id,
      })
      const { id, ...dados } = input
      const scoped = applyConstrutoraOwnership({ ...dados }, ctx.usuario)
      return ctx.db.update(construtoras).set(scoped).where(eq(construtoras.id, id))
    }),
    excluir: requirePerm('cadastro:construtora:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, construtoras, construtoras.id, input.id, getConstrutorasScopeCondition(ctx.usuario), 'Acesso negado à construtora')
      return ctx.db.update(construtoras).set({ ativo: false }).where(eq(construtoras.id, input.id))
    }),
  }),

  imobiliarias: router({
    listar: protectedProcedure.query(({ ctx }) => {
      const scope = getImobiliariasScopeCondition(ctx.usuario)
      return ctx.db.select().from(imobiliarias).where(and(eq(imobiliarias.ativo, true), scope))
    }),
    criar:  requirePerm('cadastro:imobiliaria:criar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId,
        perfilEsperado: 'Imobiliária',
        entidadeLabel: 'Imobiliária',
        tabelaAtual: imobiliarias,
        colunaIdAtual: imobiliarias.id,
      })
      const dados = applyImobiliariaOwnership({ ...input }, ctx.usuario)
      return ctx.db.insert(imobiliarias).values(dados as any)
    }),
    editar: requirePerm('cadastro:imobiliaria:editar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, imobiliarias, imobiliarias.id, input.id, getImobiliariasScopeCondition(ctx.usuario), 'Acesso negado à imobiliária')
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId ?? null,
        perfilEsperado: 'Imobiliária',
        entidadeLabel: 'Imobiliária',
        tabelaAtual: imobiliarias,
        colunaIdAtual: imobiliarias.id,
        idAtual: input.id,
      })
      const { id, ...dados } = input
      const scoped = applyImobiliariaOwnership({ ...dados }, ctx.usuario)
      return ctx.db.update(imobiliarias).set(scoped).where(eq(imobiliarias.id, id))
    }),
    excluir: requirePerm('cadastro:imobiliaria:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, imobiliarias, imobiliarias.id, input.id, getImobiliariasScopeCondition(ctx.usuario), 'Acesso negado à imobiliária')
      return ctx.db.update(imobiliarias).set({ ativo: false }).where(eq(imobiliarias.id, input.id))
    }),
  }),

  corretores: router({
    listar: protectedProcedure.query(({ ctx }) => {
      const scope = getCorretoresScopeCondition(ctx.usuario)
      return ctx.db.select().from(corretores).where(and(eq(corretores.ativo, true), scope))
    }),
    criar:  requirePerm('cadastro:corretor:criar').input(z.object({
      nome: z.string(),
      cpf: z.string().optional(),
      creci: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      imobiliariaId: z.number().optional(),
      parceiroId: z.number().optional(),
      usuarioId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId,
        perfilEsperado: 'Corretor',
        entidadeLabel: 'Corretor',
        tabelaAtual: corretores,
        colunaIdAtual: corretores.id,
      })
      const dados = applyCorretorOwnership({ ...input }, ctx.usuario)
      return ctx.db.insert(corretores).values(dados as any)
    }),
    editar: requirePerm('cadastro:corretor:editar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, corretores, corretores.id, input.id, getCorretoresScopeCondition(ctx.usuario), 'Acesso negado ao corretor')
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId ?? null,
        perfilEsperado: 'Corretor',
        entidadeLabel: 'Corretor',
        tabelaAtual: corretores,
        colunaIdAtual: corretores.id,
        idAtual: input.id,
      })
      const { id, ...dados } = input
      const scoped = applyCorretorOwnership({ ...dados }, ctx.usuario)
      return ctx.db.update(corretores).set(scoped).where(eq(corretores.id, id))
    }),
    excluir: requirePerm('cadastro:corretor:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, corretores, corretores.id, input.id, getCorretoresScopeCondition(ctx.usuario), 'Acesso negado ao corretor')
      return ctx.db.update(corretores).set({ ativo: false }).where(eq(corretores.id, input.id))
    }),
  }),

  parceiros: router({
    listar: protectedProcedure.query(({ ctx }) => {
      const scope = getParceirosScopeCondition(ctx.usuario)
      return ctx.db.select().from(parceiros).where(and(eq(parceiros.ativo, true), scope))
    }),
    criar:  requirePerm('cadastro:parceiro:criar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      if (!isPerfilInterno(ctx.usuario?.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente usuários internos podem criar parceiros' })
      }
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId,
        perfilEsperado: 'Parceiro',
        entidadeLabel: 'Parceiro',
        tabelaAtual: parceiros,
        colunaIdAtual: parceiros.id,
      })
      return ctx.db.insert(parceiros).values(input as any)
    }),
    editar: requirePerm('cadastro:parceiro:editar').input(z.object({
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
    })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.id, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      await validarUsuarioDoSistemaNoCadastroExterno(ctx.db, {
        usuarioId: input.usuarioId ?? null,
        perfilEsperado: 'Parceiro',
        entidadeLabel: 'Parceiro',
        tabelaAtual: parceiros,
        colunaIdAtual: parceiros.id,
        idAtual: input.id,
      })
      const { id, ...dados } = input
      return ctx.db.update(parceiros).set(dados as any).where(eq(parceiros.id, id))
    }),
    excluir: requirePerm('cadastro:parceiro:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.id, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      return ctx.db.update(parceiros).set({ ativo: false }).where(eq(parceiros.id, input.id))
    }),
    bancosVinculados: protectedProcedure.input(z.object({ parceiroId: z.number() })).query(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      const todos = await ctx.db.select().from(bancos).where(eq(bancos.ativo, true))
      const vinc = await ctx.db.select().from(parceiroBancos).where(eq(parceiroBancos.parceiroId, input.parceiroId))
      const vincIds = new Set(vinc.map(v => v.bancoId))
      return todos.map(b => ({ ...b, vinculado: vincIds.has(b.id) }))
    }),
    vincularBanco: protectedProcedure.input(z.object({ parceiroId: z.number(), bancoId: z.number() })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      return ctx.db.insert(parceiroBancos).values({ parceiroId: input.parceiroId, bancoId: input.bancoId }).onDuplicateKeyUpdate({ set: { parceiroId: input.parceiroId } })
    }),
    desvincularBanco: protectedProcedure.input(z.object({ parceiroId: z.number(), bancoId: z.number() })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      return ctx.db.delete(parceiroBancos).where(and(eq(parceiroBancos.parceiroId, input.parceiroId), eq(parceiroBancos.bancoId, input.bancoId)))
    }),
    listarArquivos: protectedProcedure.input(z.object({ parceiroId: z.number() })).query(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      return ctx.db.select().from(arquivos).where(eq(arquivos.parceiroId, input.parceiroId)).orderBy(desc(arquivos.criadoEm))
    }),
    excluirArquivo: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      const [arquivo] = await ctx.db.select({ id: arquivos.id, parceiroId: arquivos.parceiroId }).from(arquivos).where(eq(arquivos.id, input.id))
      if (!arquivo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Arquivo não encontrado' })
      if (!isPerfilInterno(ctx.usuario?.perfil) && arquivo.parceiroId) {
        await assertScopedAccess(ctx.db, parceiros, parceiros.id, arquivo.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao arquivo do parceiro')
      }
      return ctx.db.delete(arquivos).where(eq(arquivos.id, input.id))
    }),
    registrarArquivo: protectedProcedure.input(z.object({
      parceiroId: z.number(),
      nomeOriginal: z.string(),
      nomeArquivo: z.string(),
      caminhoArquivo: z.string(),
      mimeType: z.string().optional(),
      tamanho: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      assertPodeGerenciarParceiro(ctx.usuario)
      await assertScopedAccess(ctx.db, parceiros, parceiros.id, input.parceiroId, getParceirosScopeCondition(ctx.usuario), 'Acesso negado ao parceiro')
      return ctx.db.insert(arquivos).values({ ...input, usuarioId: ctx.usuario.id, criadoEm: new Date() })
    }),
  }),

  subestabelecidos: router({
    listar: protectedProcedure.query(({ ctx }) => {
      const scope = getSubestabelecidosScopeCondition(ctx.usuario)
      return ctx.db.select().from(subestabelecidos).where(and(eq(subestabelecidos.ativo, true), scope))
    }),
    criar:  requirePerm('cadastro:subestabelecido:criar').input(z.object({
      nome: z.string(),
      cpf: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      parceiroId: z.number().optional(),
    })).mutation(({ input, ctx }) => {
      const dados = applySubestabelecidoOwnership({ ...input }, ctx.usuario)
      return ctx.db.insert(subestabelecidos).values(dados as any)
    }),
    editar: requirePerm('cadastro:subestabelecido:editar').input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cpf: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      parceiroId: z.number().nullish(),
    })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, subestabelecidos, subestabelecidos.id, input.id, getSubestabelecidosScopeCondition(ctx.usuario), 'Acesso negado ao subestabelecido')
      const { id, ...dados } = input
      const scoped = applySubestabelecidoOwnership({ ...dados }, ctx.usuario)
      return ctx.db.update(subestabelecidos).set(scoped).where(eq(subestabelecidos.id, id))
    }),
    excluir: requirePerm('cadastro:subestabelecido:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, subestabelecidos, subestabelecidos.id, input.id, getSubestabelecidosScopeCondition(ctx.usuario), 'Acesso negado ao subestabelecido')
      return ctx.db.update(subestabelecidos).set({ ativo: false }).where(eq(subestabelecidos.id, input.id))
    }),
    bancosVinculados: protectedProcedure.input(z.object({ subestabelecidoId: z.number() })).query(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, subestabelecidos, subestabelecidos.id, input.subestabelecidoId, getSubestabelecidosScopeCondition(ctx.usuario), 'Acesso negado ao subestabelecido')
      return ctx.db.select({ id: subestabelecidoBancos.id, bancoId: subestabelecidoBancos.bancoId, bancoNome: bancos.nome }).from(subestabelecidoBancos).leftJoin(bancos, eq(subestabelecidoBancos.bancoId, bancos.id)).where(eq(subestabelecidoBancos.subestabelecidoId, input.subestabelecidoId))
    }),
    vincularBanco: protectedProcedure.input(z.object({ subestabelecidoId: z.number(), bancoId: z.number() })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, subestabelecidos, subestabelecidos.id, input.subestabelecidoId, getSubestabelecidosScopeCondition(ctx.usuario), 'Acesso negado ao subestabelecido')
      return ctx.db.insert(subestabelecidoBancos).values(input)
    }),
    desvincularBanco: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const [vinculo] = await ctx.db.select({ id: subestabelecidoBancos.id, subestabelecidoId: subestabelecidoBancos.subestabelecidoId }).from(subestabelecidoBancos).where(eq(subestabelecidoBancos.id, input.id))
      if (!vinculo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vínculo não encontrado' })
      await assertScopedAccess(ctx.db, subestabelecidos, subestabelecidos.id, vinculo.subestabelecidoId, getSubestabelecidosScopeCondition(ctx.usuario), 'Acesso negado ao subestabelecido')
      return ctx.db.delete(subestabelecidoBancos).where(eq(subestabelecidoBancos.id, input.id))
    }),
  }),

  imoveis: router({
    listar: protectedProcedure.query(({ ctx }) => {
      const scope = getImoveisScopeCondition(ctx.usuario)
      return scope ? ctx.db.select().from(imoveis).where(scope) : ctx.db.select().from(imoveis)
    }),
    criar:  requirePerm('cadastro:imovel:criar').input(z.object({
      matricula: z.string().optional(),
      endereco: z.string(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string(),
      uf: z.string(),
      cep: z.string().optional(),
      tipo: z.enum(['Residencial','Comercial','Terreno','Galpão']).optional(),
      corretorId: z.number().optional(),
      imobiliariaId: z.number().optional(),
      parceiroId: z.number().optional(),
      construtoraId: z.number().optional(),
      usuarioId: z.number().optional(),
    })).mutation(({ input, ctx }) => {
      const dados = applyImovelOwnership({ ...input }, ctx.usuario)
      return ctx.db.insert(imoveis).values({ ...dados, criadoEm: new Date() } as any)
    }),
    editar: requirePerm('cadastro:imovel:editar').input(z.object({
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
      corretorId: z.number().nullish(),
      imobiliariaId: z.number().nullish(),
      parceiroId: z.number().nullish(),
      construtoraId: z.number().nullish(),
      usuarioId: z.number().nullish(),
    })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, imoveis, imoveis.id, input.id, getImoveisScopeCondition(ctx.usuario), 'Acesso negado ao imóvel')
      const { id, ...dados } = input
      const scoped = applyImovelOwnership({ ...dados }, ctx.usuario)
      return ctx.db.update(imoveis).set(scoped).where(eq(imoveis.id, id))
    }),
    excluir: requirePerm('cadastro:imovel:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertScopedAccess(ctx.db, imoveis, imoveis.id, input.id, getImoveisScopeCondition(ctx.usuario), 'Acesso negado ao imóvel')
      return ctx.db.delete(imoveis).where(eq(imoveis.id, input.id))
    }),
  }),

  usuarios: router({
    listar:  protectedProcedure.query(async ({ ctx }) => {
      const lista = await ctx.db.select({
        id: usuarios.id, nome: usuarios.nome, login: usuarios.login, email: usuarios.email,
        cpf: usuarios.cpf, pis: usuarios.pis, perfil: usuarios.perfil, status: usuarios.status,
        subestabelecidoId: usuarios.subestabelecidoId,
        bloqueioInicio: usuarios.bloqueioInicio, bloqueioFim: usuarios.bloqueioFim,
        ativo: usuarios.ativo,
      }).from(usuarios)

      if (!lista.length) return lista

      const ids = lista.map((u) => u.id)
      const [parceirosVinculados, corretoresVinculados, imobiliariasVinculadas, construtorasVinculadas] = await Promise.all([
        ctx.db.select({ usuarioId: parceiros.usuarioId, parceiroId: parceiros.id }).from(parceiros).where(inArray(parceiros.usuarioId, ids)),
        ctx.db.select({ usuarioId: corretores.usuarioId, corretorId: corretores.id }).from(corretores).where(inArray(corretores.usuarioId, ids)),
        ctx.db.select({ usuarioId: imobiliarias.usuarioId, imobiliariaId: imobiliarias.id }).from(imobiliarias).where(inArray(imobiliarias.usuarioId, ids)),
        ctx.db.select({ usuarioId: construtoras.usuarioId, construtoraId: construtoras.id }).from(construtoras).where(inArray(construtoras.usuarioId, ids)),
      ])

      const parceiroPorUsuario = new Map<number, number>()
      const corretorPorUsuario = new Map<number, number>()
      const imobiliariaPorUsuario = new Map<number, number>()
      const construtoraPorUsuario = new Map<number, number>()

      parceirosVinculados.forEach((row: any) => {
        if (row.usuarioId) parceiroPorUsuario.set(row.usuarioId, row.parceiroId)
      })
      corretoresVinculados.forEach((row: any) => {
        if (row.usuarioId) corretorPorUsuario.set(row.usuarioId, row.corretorId)
      })
      imobiliariasVinculadas.forEach((row: any) => {
        if (row.usuarioId) imobiliariaPorUsuario.set(row.usuarioId, row.imobiliariaId)
      })
      construtorasVinculadas.forEach((row: any) => {
        if (row.usuarioId) construtoraPorUsuario.set(row.usuarioId, row.construtoraId)
      })

      return lista.map((usuario) => ({
        ...usuario,
        parceiroId: usuario.perfil === 'Parceiro' ? parceiroPorUsuario.get(usuario.id) || null : null,
        corretorId: usuario.perfil === 'Corretor' ? corretorPorUsuario.get(usuario.id) || null : null,
        imobiliariaId: usuario.perfil === 'Imobiliária' ? imobiliariaPorUsuario.get(usuario.id) || null : null,
        construtoraId: usuario.perfil === 'Construtora' ? construtoraPorUsuario.get(usuario.id) || null : null,
      }))
    }),
    criar:   protectedProcedure.input(z.object({
      nome: z.string(), login: z.string(), senha: z.string(), email: z.string().optional(),
      cpf: z.string().optional(), pis: z.string().optional(),
      perfil: z.enum(['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Subestabelecido']),
      subestabelecidoId: z.number().optional(),
      status: z.enum(['Ativo','Bloqueado','Inativo']).optional(),
      bloqueioInicio: z.string().optional(), bloqueioFim: z.string().optional(),
    }))
      .mutation(async ({ input, ctx }) => {
        const bcryptMod = await import('bcryptjs')
        const bcrypt = bcryptMod.default || bcryptMod
        const hash = await bcrypt.hash(input.senha, 10)
        const { subestabelecidoId, ...dadosUsuario } = input
        await ctx.db.insert(usuarios).values({
          ...dadosUsuario as any,
          senha: hash,
          subestabelecidoId: input.perfil === 'Subestabelecido' ? subestabelecidoId || null : null,
          criadoEm: new Date(),
        })
        return { ok: true }
      }),
    editar: protectedProcedure.input(z.object({
      id: z.number(),
      nome: z.string().optional(), login: z.string().optional(), email: z.string().optional(),
      cpf: z.string().optional(), pis: z.string().optional(),
      perfil: z.enum(['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Subestabelecido']).optional(),
      subestabelecidoId: z.number().nullish(),
      status: z.enum(['Ativo','Bloqueado','Inativo']).optional(),
      bloqueioInicio: z.string().nullish(), bloqueioFim: z.string().nullish(),
    })).mutation(async ({ input, ctx }) => {
      const [usuarioAtual] = await ctx.db.select({ perfil: usuarios.perfil }).from(usuarios).where(eq(usuarios.id, input.id))
      if (!usuarioAtual) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' })
      }

      const { id, subestabelecidoId, ...dados } = input
      const perfilFinal = dados.perfil || usuarioAtual.perfil

      await ctx.db.update(usuarios).set({
        ...dados as any,
        subestabelecidoId: perfilFinal === 'Subestabelecido' ? subestabelecidoId ?? null : null,
      }).where(eq(usuarios.id, id))
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
    listar: protectedProcedure.query(async ({ ctx }) => {
      const construtorasIds = await getConstrutorasIdsAcessiveis(ctx.db, ctx.usuario)
      if (construtorasIds === null) return ctx.db.select().from(empreendimentos).where(eq(empreendimentos.ativo, true))
      if (!construtorasIds.length) return []
      return ctx.db.select().from(empreendimentos).where(and(eq(empreendimentos.ativo, true), inArray(empreendimentos.construtoraId, construtorasIds)))
    }),
    criar:  requirePerm('cadastro:empreendimento:criar').input(z.object({
      nome: z.string(),
      construtoraId: z.number().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      tipo: z.enum(['Comercial','Residencial']).optional(),
    })).mutation(async ({ input, ctx }) => {
      const construtorasIds = await getConstrutorasIdsAcessiveis(ctx.db, ctx.usuario)
      const construtoraId = isPerfilInterno(ctx.usuario?.perfil)
        ? input.construtoraId
        : (ctx.usuario?.perfil === 'Construtora' ? ctx.usuario.construtoraId : input.construtoraId)

      if (construtorasIds !== null) {
        if (!construtoraId || !construtorasIds.includes(construtoraId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Construtora fora do escopo deste usuário' })
        }
      }

      return ctx.db.insert(empreendimentos).values({ ...input, construtoraId })
    }),
    editar: requirePerm('cadastro:empreendimento:editar').input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      construtoraId: z.number().nullish(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      tipo: z.enum(['Comercial','Residencial']).optional(),
    })).mutation(async ({ input, ctx }) => {
      const construtorasIds = await getConstrutorasIdsAcessiveis(ctx.db, ctx.usuario)
      if (construtorasIds !== null) {
        const [registro] = await ctx.db.select({ id: empreendimentos.id, construtoraId: empreendimentos.construtoraId }).from(empreendimentos).where(eq(empreendimentos.id, input.id))
        if (!registro || !registro.construtoraId || !construtorasIds.includes(registro.construtoraId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado ao empreendimento' })
        }
        if (input.construtoraId && !construtorasIds.includes(input.construtoraId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Construtora fora do escopo deste usuário' })
        }
      }
      const { id, ...dados } = input
      return ctx.db.update(empreendimentos).set(dados).where(eq(empreendimentos.id, id))
    }),
    excluir: requirePerm('cadastro:empreendimento:excluir').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const construtorasIds = await getConstrutorasIdsAcessiveis(ctx.db, ctx.usuario)
      if (construtorasIds !== null) {
        const [registro] = await ctx.db.select({ id: empreendimentos.id, construtoraId: empreendimentos.construtoraId }).from(empreendimentos).where(eq(empreendimentos.id, input.id))
        if (!registro || !registro.construtoraId || !construtorasIds.includes(registro.construtoraId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado ao empreendimento' })
        }
      }
      return ctx.db.update(empreendimentos).set({ ativo: false }).where(eq(empreendimentos.id, input.id))
    }),
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
