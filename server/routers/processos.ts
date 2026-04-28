import { z } from 'zod'
import { eq, like, and, or, desc, inArray, sql, isNull } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  processos, processoCompradores, processoVendedores, processoImoveis,
  processoEtapas, processoHistorico, processoDocumentos, processoAtendimentos,
  tarefas, usuarios, bancos, agencias, modalidades, fluxos, situacoes,
  corretores, parceiros, imobiliarias, construtoras, subestabelecidos, clientes, imoveis, etapas,
  documentosTipos, fluxoDocumentos, bancoModalidades, preAnalises
, fluxoEtapas} from '../../drizzle/schema'

const PERFIS_INTERNOS = ['Administrador', 'Analista', 'Gerente']
const PERFIS_EXTERNOS = ['Parceiro', 'Corretor', 'Imobiliária', 'Construtora', 'Subestabelecido']
const CATEGORIAS_COMPRADOR = ['Comprador - Pessoa Física', 'Comprador - Pessoa Jurídica']
const CATEGORIAS_VENDEDOR = ['Vendedor - Pessoa Física', 'Vendedor - Pessoa Jurídica']
const CAMPOS_DECIMAIS_PROCESSO = [
  'valorCompraVenda',
  'valorAvaliacao',
  'valorRecursoProprio',
  'valorSubsidio',
  'valorFgts',
  'valorIq',
  'valorFinanciado',
  'valorParcela',
  'valorDespesas',
  'remuneracaoPerc',
  'remuneracaoValor',
  'taxa',
]
const CAMPOS_USO_INTERNO_PROCESSO = [
  'valorSubsidio',
  'valorAvaliacao',
  'valorParcela',
  'taxa',
  'remuneracaoPerc',
  'remuneracaoValor',
]

function isPerfilInterno(perfil?: string | null) {
  return !!perfil && PERFIS_INTERNOS.includes(perfil)
}

function isPerfilExterno(perfil?: string | null) {
  return !!perfil && PERFIS_EXTERNOS.includes(perfil)
}

function assertPerfilInterno(usuario: any) {
  if (!isPerfilInterno(usuario?.perfil)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito aos usuários internos' })
  }
}

function getProcessoScopeSql(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return sql``

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.parceiro_id = ${usuario.parceiroId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    case 'Corretor':
      return usuario?.corretorId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.corretor_id = ${usuario.corretorId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    case 'Imobiliária':
      return usuario?.imobiliariaId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.imobiliaria_id = ${usuario.imobiliariaId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    case 'Construtora':
      return usuario?.construtoraId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.construtora_id = ${usuario.construtoraId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    default:
      return sql`AND 1 = 0`
  }
}

function getProcessoScopeCondition(usuario: any) {
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

function getClienteScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId ? eq(clientes.parceiroId, usuario.parceiroId) : eq(clientes.id, -1)
    case 'Corretor':
      return usuario?.corretorId ? eq(clientes.corretorId, usuario.corretorId) : eq(clientes.id, -1)
    case 'Imobiliária':
      return usuario?.imobiliariaId ? eq(clientes.imobiliariaId, usuario.imobiliariaId) : eq(clientes.id, -1)
    case 'Construtora':
      return usuario?.construtoraId ? eq(clientes.construtoraId, usuario.construtoraId) : eq(clientes.id, -1)
    default:
      return eq(clientes.id, -1)
  }
}

function getImovelScopeCondition(usuario: any) {
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

function applyProcessoOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input

  const scoped = { ...input }
  delete scoped.responsavelId

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

function applyClienteOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input

  const scoped = { ...input }

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

function normalizarTexto(valor?: string | null) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function normalizarDecimal(valor?: unknown) {
  if (valor === null || valor === undefined || valor === '') return undefined
  const texto = String(valor).trim().replace(/[^\d,.-]/g, '')
  if (!texto) return undefined
  return texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto
}

function prepararDadosProcesso(dados: Record<string, any>, usuario: any) {
  const prepared = { ...dados }

  if (isPerfilExterno(usuario?.perfil)) {
    for (const campo of CAMPOS_USO_INTERNO_PROCESSO) delete prepared[campo]
  }

  for (const campo of CAMPOS_DECIMAIS_PROCESSO) {
    if (prepared[campo] !== undefined && prepared[campo] !== null && prepared[campo] !== '') {
      prepared[campo] = normalizarDecimal(prepared[campo])
    }
  }

  return prepared
}

function formatarDataHoraBr(valor?: unknown) {
  if (!valor) return '-'
  const data = new Date(valor as any)
  if (Number.isNaN(data.getTime())) return String(valor)
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function estadoCivilClienteDaPreAnalise(valor?: string | null) {
  return valor === 'Casado' ? 'Casado Comunhão Parcial de Bens' : 'Solteiro'
}

async function encontrarBancoDaPreAnalise(db: any, nomeBanco?: string | null) {
  const bancoPreAnalise = String(nomeBanco || '').split(',')[0]?.trim()
  if (!bancoPreAnalise) return null

  const todos = await db.select({ id: bancos.id, nome: bancos.nome }).from(bancos).where(eq(bancos.ativo, true))
  const alvo = normalizarTexto(bancoPreAnalise)

  return todos.find((banco: any) => {
    const nome = normalizarTexto(banco.nome)
    return nome === alvo || nome.includes(alvo) || alvo.includes(nome)
  }) || null
}

async function resolverVinculosUsuario(db: any, usuario: any) {
  if (!usuario?.id || !usuario?.perfil) return usuario
  if (usuario.parceiroId || usuario.corretorId || usuario.imobiliariaId || usuario.construtoraId) return usuario

  let parceiroId = null
  let corretorId = null
  let imobiliariaId = null
  let construtoraId = null
  let subestabelecidoId = usuario.subestabelecidoId || null

  if (usuario.perfil === 'Parceiro') {
    const [parceiro] = await db.select({ id: parceiros.id }).from(parceiros).where(eq(parceiros.usuarioId, usuario.id))
    parceiroId = parceiro?.id || null
  } else if (usuario.perfil === 'Corretor') {
    const [corretor] = await db
      .select({ id: corretores.id, parceiroId: corretores.parceiroId, imobiliariaId: corretores.imobiliariaId })
      .from(corretores)
      .where(eq(corretores.usuarioId, usuario.id))

    if (corretor) {
      corretorId = corretor.id
      parceiroId = corretor.parceiroId
      imobiliariaId = corretor.imobiliariaId

      if (!parceiroId && corretor.imobiliariaId) {
        const [imobiliaria] = await db
          .select({ parceiroId: imobiliarias.parceiroId })
          .from(imobiliarias)
          .where(eq(imobiliarias.id, corretor.imobiliariaId))
        parceiroId = imobiliaria?.parceiroId || null
      }
    }
  } else if (usuario.perfil === 'Imobiliária') {
    const [imobiliaria] = await db
      .select({ id: imobiliarias.id, parceiroId: imobiliarias.parceiroId })
      .from(imobiliarias)
      .where(eq(imobiliarias.usuarioId, usuario.id))

    if (imobiliaria) {
      imobiliariaId = imobiliaria.id
      parceiroId = imobiliaria.parceiroId
    }
  } else if (usuario.perfil === 'Construtora') {
    const [construtora] = await db
      .select({ id: construtoras.id, parceiroId: construtoras.parceiroId })
      .from(construtoras)
      .where(eq(construtoras.usuarioId, usuario.id))

    if (construtora) {
      construtoraId = construtora.id
      parceiroId = construtora.parceiroId
    }
  } else if (usuario.perfil === 'Subestabelecido' && usuario.subestabelecidoId) {
    const [subestabelecido] = await db
      .select({ id: subestabelecidos.id, parceiroId: subestabelecidos.parceiroId })
      .from(subestabelecidos)
      .where(eq(subestabelecidos.id, usuario.subestabelecidoId))

    if (subestabelecido) {
      subestabelecidoId = subestabelecido.id
      parceiroId = subestabelecido.parceiroId
    }
  }

  return { ...usuario, parceiroId, corretorId, imobiliariaId, construtoraId, subestabelecidoId }
}

function montarHistoricoPreAnalise(preAnalise: any, bancoNome?: string) {
  const linhas = [
    `Origem: pré-análise #${preAnalise.id}`,
    `Quando foi feita: ${formatarDataHoraBr(preAnalise.criadoEm)}`,
    `Onde/Banco: ${bancoNome || preAnalise.bancos || '-'}`,
    `Situação da pré-análise: ${preAnalise.situacao || '-'}`,
    `Comprador: ${preAnalise.nome || '-'} (${preAnalise.cpfCnpj || '-'})`,
    preAnalise.valorFinanciamento ? `Valor informado: R$ ${Number(preAnalise.valorFinanciamento).toLocaleString('pt-BR')}` : '',
    preAnalise.retorno ? `Retorno: ${preAnalise.retorno}` : '',
    preAnalise.observacao ? `Observação: ${preAnalise.observacao}` : '',
  ].filter(Boolean)

  return linhas.join('\n')
}

async function assertProcessoAcesso(db: any, usuario: any, processoId: number) {
  const scope = getProcessoScopeCondition(usuario)
  const where = scope ? and(eq(processos.id, processoId), scope) : eq(processos.id, processoId)
  const [processo] = await db.select().from(processos).where(where)

  if (!processo) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado ao processo' })
  }

  return processo
}

async function assertClientesAcessiveis(db: any, usuario: any, ids?: number[]) {
  if (!ids?.length || isPerfilInterno(usuario?.perfil)) return

  const scope = getClienteScopeCondition(usuario)
  const where = scope ? and(inArray(clientes.id, ids), scope) : inArray(clientes.id, ids)
  const rows = await db.select({ id: clientes.id }).from(clientes).where(where)

  if (rows.length !== ids.length) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Cliente fora do escopo deste usuário' })
  }
}

async function assertImoveisAcessiveis(db: any, usuario: any, ids?: number[]) {
  if (!ids?.length || isPerfilInterno(usuario?.perfil)) return

  const scope = getImovelScopeCondition(usuario)
  const where = scope ? and(inArray(imoveis.id, ids), scope) : inArray(imoveis.id, ids)
  const rows = await db.select({ id: imoveis.id }).from(imoveis).where(where)

  if (rows.length !== ids.length) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Imóvel fora do escopo deste usuário' })
  }
}

async function validarRelacionamentosProcesso(db: any, usuario: any, dados: Record<string, any>) {
  if (dados.bancoId && dados.modalidadeId) {
    const [bancoModalidade] = await db
      .select({ modalidadeId: bancoModalidades.modalidadeId })
      .from(bancoModalidades)
      .where(and(eq(bancoModalidades.bancoId, dados.bancoId), eq(bancoModalidades.modalidadeId, dados.modalidadeId)))

    if (!bancoModalidade) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'A modalidade selecionada não pertence ao banco informado' })
    }
  }

  if (dados.modalidadeId) {
    const [modalidade] = await db
      .select({ id: modalidades.id, fluxoId: modalidades.fluxoId })
      .from(modalidades)
      .where(eq(modalidades.id, dados.modalidadeId))

    if (!modalidade) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Modalidade inválida' })
    }

    if (dados.fluxoId && modalidade.fluxoId && Number(dados.fluxoId) !== Number(modalidade.fluxoId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'O fluxo selecionado não corresponde à modalidade escolhida' })
    }
  }

  if (isPerfilInterno(usuario?.perfil)) return

  if (['Parceiro', 'Subestabelecido'].includes(usuario?.perfil)) {
    if (!usuario?.parceiroId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuário sem parceiro vinculado' })
    }
    if (dados.parceiroId && usuario?.parceiroId && dados.parceiroId !== usuario.parceiroId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Parceiro fora do escopo deste usuário' })
    }
    if (dados.corretorId) {
      const [corretor] = await db.select({ id: corretores.id }).from(corretores).where(and(eq(corretores.id, dados.corretorId), eq(corretores.parceiroId, usuario.parceiroId)))
      if (!corretor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Corretor fora do escopo deste usuário' })
    }
    if (dados.imobiliariaId) {
      const [imobiliaria] = await db.select({ id: imobiliarias.id }).from(imobiliarias).where(and(eq(imobiliarias.id, dados.imobiliariaId), eq(imobiliarias.parceiroId, usuario.parceiroId)))
      if (!imobiliaria) throw new TRPCError({ code: 'FORBIDDEN', message: 'Imobiliária fora do escopo deste usuário' })
    }
    if (dados.construtoraId) {
      const [construtora] = await db.select({ id: construtoras.id }).from(construtoras).where(and(eq(construtoras.id, dados.construtoraId), eq(construtoras.parceiroId, usuario.parceiroId)))
      if (!construtora) throw new TRPCError({ code: 'FORBIDDEN', message: 'Construtora fora do escopo deste usuário' })
    }
    return
  }

  if (usuario?.perfil === 'Corretor') {
    if (!usuario?.corretorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuário corretor sem vínculo configurado' })
    if (dados.corretorId && dados.corretorId !== usuario.corretorId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Corretor fora do escopo deste usuário' })
    if (usuario?.imobiliariaId && dados.imobiliariaId && dados.imobiliariaId !== usuario.imobiliariaId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Imobiliária fora do escopo deste usuário' })
    if (usuario?.parceiroId && dados.parceiroId && dados.parceiroId !== usuario.parceiroId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Parceiro fora do escopo deste usuário' })
  }

  if (usuario?.perfil === 'Imobiliária') {
    if (!usuario?.imobiliariaId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuário imobiliária sem vínculo configurado' })
    if (dados.imobiliariaId && dados.imobiliariaId !== usuario.imobiliariaId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Imobiliária fora do escopo deste usuário' })
    if (usuario?.parceiroId && dados.parceiroId && dados.parceiroId !== usuario.parceiroId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Parceiro fora do escopo deste usuário' })
    if (dados.corretorId) {
      const [corretor] = await db.select({ id: corretores.id }).from(corretores).where(and(eq(corretores.id, dados.corretorId), eq(corretores.imobiliariaId, usuario.imobiliariaId)))
      if (!corretor) throw new TRPCError({ code: 'FORBIDDEN', message: 'Corretor fora do escopo desta imobiliária' })
    }
  }

  if (usuario?.perfil === 'Construtora') {
    if (!usuario?.construtoraId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuário construtora sem vínculo configurado' })
    if (dados.construtoraId && dados.construtoraId !== usuario.construtoraId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Construtora fora do escopo deste usuário' })
    if (usuario?.parceiroId && dados.parceiroId && dados.parceiroId !== usuario.parceiroId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Parceiro fora do escopo deste usuário' })
  }

  if (dados.construtoraId && usuario?.parceiroId) {
    const [construtora] = await db.select({ id: construtoras.id }).from(construtoras).where(and(eq(construtoras.id, dados.construtoraId), eq(construtoras.parceiroId, usuario.parceiroId)))
    if (!construtora) throw new TRPCError({ code: 'FORBIDDEN', message: 'Construtora fora do escopo deste usuário' })
  }
}

async function listarEtapasOrdenadas(db: any, processoId: number) {
  return db
    .select()
    .from(processoEtapas)
    .where(eq(processoEtapas.processoId, processoId))
    .orderBy(processoEtapas.ordem)
}

function getEtapaAtual(etapasList: any[]) {
  return etapasList.find((etapa) => !etapa.concluido) || null
}

function primeiraEtapaConcluida(etapasList: any[]) {
  return !!etapasList[0]?.concluido
}

function getEtapaParaReabrir(etapasList: any[]) {
  const idxAtual = etapasList.findIndex((etapa) => !etapa.concluido)

  if (idxAtual === -1) {
    return etapasList[etapasList.length - 1] || null
  }

  if (idxAtual === 0) {
    return null
  }

  return etapasList[idxAtual - 1] || null
}

async function buscarNomeEtapa(db: any, etapaId: number) {
  const etapaInfo = await db.execute(sql`SELECT nome FROM etapas WHERE id = ${etapaId} LIMIT 1`)
  return ((etapaInfo[0] as unknown as any[])[0]?.nome as string) || ''
}

async function assertExternoPodeEditarProcesso(db: any, usuario: any, processoId: number) {
  if (!isPerfilExterno(usuario?.perfil)) return
  const etapasList = await listarEtapasOrdenadas(db, processoId)
  if (primeiraEtapaConcluida(etapasList)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Após concluir a primeira etapa, o usuário externo só pode gerenciar a documentação do processo',
    })
  }
}

async function validarDocumentosObrigatoriosPrimeiraEtapa(db: any, processo: any) {
  if (!processo?.fluxoId) return

  const requisitos = await db.select({
    documentoTipoId: fluxoDocumentos.documentoTipoId,
    categoria: fluxoDocumentos.categoria,
    nome: documentosTipos.nome,
  })
    .from(fluxoDocumentos)
    .leftJoin(documentosTipos, eq(fluxoDocumentos.documentoTipoId, documentosTipos.id))
    .where(and(eq(fluxoDocumentos.fluxoId, processo.fluxoId), eq(fluxoDocumentos.obrigatorioPrimeiraEtapa, true)))

  if (!requisitos.length) return

  const [compradores, vendedores, imoveisVinculados, documentos] = await Promise.all([
    db.select({ clienteId: processoCompradores.clienteId }).from(processoCompradores).where(eq(processoCompradores.processoId, processo.id)),
    db.select({ clienteId: processoVendedores.clienteId }).from(processoVendedores).where(eq(processoVendedores.processoId, processo.id)),
    db.select({ imovelId: processoImoveis.imovelId }).from(processoImoveis).where(eq(processoImoveis.processoId, processo.id)),
    db.select({
      documentoTipoId: processoDocumentos.documentoTipoId,
      clienteId: processoDocumentos.clienteId,
      status: processoDocumentos.status,
    }).from(processoDocumentos).where(eq(processoDocumentos.processoId, processo.id)),
  ])

  const compradorIds = compradores.map((item: any) => item.clienteId).filter(Boolean)
  const vendedorIds = vendedores.map((item: any) => item.clienteId).filter(Boolean)
  const imovelIds = imoveisVinculados.map((item: any) => item.imovelId).filter(Boolean)

  const faltantes: string[] = []
  const possuiDocumentoValido = (documentoTipoId: number, clienteId?: number) =>
    documentos.some((doc: any) =>
      doc.documentoTipoId === documentoTipoId &&
      (clienteId ? doc.clienteId === clienteId : !doc.clienteId) &&
      doc.status !== 'reprovado'
    )

  for (const requisito of requisitos) {
    const nomeDoc = requisito.nome || `Documento ${requisito.documentoTipoId}`

    if (CATEGORIAS_COMPRADOR.includes(requisito.categoria)) {
      if (!compradorIds.length) {
        faltantes.push(`${nomeDoc} (sem comprador vinculado)`)
        continue
      }
      if (compradorIds.some((clienteId: number) => !possuiDocumentoValido(requisito.documentoTipoId, clienteId))) {
        faltantes.push(nomeDoc)
      }
      continue
    }

    if (CATEGORIAS_VENDEDOR.includes(requisito.categoria)) {
      if (!vendedorIds.length) {
        faltantes.push(`${nomeDoc} (sem vendedor vinculado)`)
        continue
      }
      if (vendedorIds.some((clienteId: number) => !possuiDocumentoValido(requisito.documentoTipoId, clienteId))) {
        faltantes.push(nomeDoc)
      }
      continue
    }

    if (requisito.categoria === 'Imóvel') {
      if (!imovelIds.length) {
        faltantes.push(`${nomeDoc} (sem imóvel vinculado)`)
        continue
      }
      if (!possuiDocumentoValido(requisito.documentoTipoId)) {
        faltantes.push(nomeDoc)
      }
      continue
    }

    if (!possuiDocumentoValido(requisito.documentoTipoId)) {
      faltantes.push(nomeDoc)
    }
  }

  if (faltantes.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Documentos obrigatórios da 1ª etapa pendentes: ${Array.from(new Set(faltantes)).join(', ')}`,
    })
  }
}

async function criarEtapasDoFluxo(db: any, processoId: number, fluxoId?: number | null) {
  if (!fluxoId) return

  const fluxoEtapasList = await db.select().from(fluxoEtapas)
    .where(eq(fluxoEtapas.fluxoId, fluxoId))
    .orderBy(fluxoEtapas.ordem)

  if (!fluxoEtapasList.length) return

  await db.insert(processoEtapas).values(
    fluxoEtapasList.map((fe: any) => ({ processoId, etapaId: fe.etapaId, ordem: fe.ordem }))
  )
}

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
  taxa:                 z.string().optional(),
  tipoAmortizacao:      z.enum(['SAC','PRICE']).optional(),
  tipoImovel:           z.enum(['Novo','Usado']).optional(),
  parceiroId:          z.number().optional(),
  corretorId:          z.number().optional(),
  imobiliariaId:       z.number().optional(),
  construtoraId:        z.number().optional(),
  compradoresIds:      z.array(z.number()).optional(),
  vendedoresIds:       z.array(z.number()).optional(),
  imoveisIds:          z.array(z.number()).optional(),
  finalizarCadastroInicial: z.boolean().optional(),
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
      construtoraId:    z.number().optional(),
      responsavelId:   z.number().optional(),
      codigo:          z.number().optional(),
      concluidos:      z.boolean().optional(),
      somenteConcluidos: z.boolean().optional(),
      reprovados:      z.boolean().optional(),
      somenteReprovados: z.boolean().optional(),
      arquivados:      z.boolean().optional(),
      pendente:        z.boolean().optional(),
      atrasados:       z.boolean().optional(),
      dataInicio:      z.string().optional(),
      dataFim:         z.string().optional(),
      dataEmissaoInicio: z.string().optional(),
      dataEmissaoFim:    z.string().optional(),
      dataAssinaturaInicio: z.string().optional(),
      dataAssinaturaFim:    z.string().optional(),
      dataPagtoInicio: z.string().optional(),
      dataPagtoFim:    z.string().optional(),
      pagina:          z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const limite = Math.min(input.pagina > 0 ? 10 : 10, 100)
      const offset = (input.pagina - 1) * limite
      const busca = input.busca?.trim()
      const buscaNumerica = busca && /^\d+$/.test(busca) ? Number(busca) : -1
      const buscaDocumento = busca ? busca.replace(/\D/g, '') : ''
      const filtroConcluidoSql = sql`EXISTS (SELECT 1 FROM processo_etapas pec WHERE pec.processo_id = p.id) AND NOT EXISTS (SELECT 1 FROM processo_etapas pea WHERE pea.processo_id = p.id AND pea.concluido IS NULL)`
      const filtrarConcluidos = Boolean(input.concluidos || input.somenteConcluidos)

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
               par.usuario_id as parceiroUsuarioId,
               par.nome as parceiroNome,
               cor.usuario_id as corretorUsuarioId,
               cor.nome as corretorNome,
               imob.usuario_id as imobiliariaUsuarioId,
               imob.nome as imobiliariaNome,
               cons.usuario_id as construtoraUsuarioId,
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
                WHERE pe3.processo_id = p.id) as totalEtapas,
               (SELECT pa.descricao FROM processo_atendimentos pa
                WHERE pa.processo_id = p.id
                ORDER BY pa.criado_em DESC LIMIT 1) as ultimoAtendimento
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
          ${getProcessoScopeSql(ctx.usuario)}
          ${input.arquivados ? sql`AND p.arquivado = true` : sql`AND p.arquivado = false`}
          ${input.bancoId ? sql`AND p.banco_id = ${input.bancoId}` : sql``}
          ${input.situacaoId ? sql`AND p.situacao_id = ${input.situacaoId}` : sql``}
          ${input.agenciaId ? sql`AND p.agencia_id = ${input.agenciaId}` : sql``}
          ${input.modalidadeId ? sql`AND p.modalidade_id = ${input.modalidadeId}` : sql``}
          ${input.corretorId ? sql`AND p.corretor_id = ${input.corretorId}` : sql``}
          ${input.imobiliariaId ? sql`AND p.imobiliaria_id = ${input.imobiliariaId}` : sql``}
          ${input.parceiroId ? sql`AND p.parceiro_id = ${input.parceiroId}` : sql``}
          ${input.construtoraId ? sql`AND p.construtora_id = ${input.construtoraId}` : sql``}
          ${input.responsavelId ? sql`AND p.responsavel_id = ${input.responsavelId}` : sql``}
          ${input.codigo ? sql`AND p.id = ${input.codigo}` : sql``}
          ${input.reprovados || input.somenteReprovados ? sql`AND p.reprovado = true` : sql`AND p.reprovado = false`}
          ${filtrarConcluidos ? sql`AND ${filtroConcluidoSql}` : sql`AND NOT (${filtroConcluidoSql})`}
          ${input.pendente ? sql`AND EXISTS (SELECT 1 FROM processo_etapas pep WHERE pep.processo_id = p.id AND pep.concluido IS NULL AND pep.observacao IS NOT NULL AND pep.observacao <> '')` : sql``}
          ${input.atrasados ? sql`AND DATEDIFF(NOW(), p.criado_em) > 30` : sql``}
          ${input.etapaId ? sql`AND (SELECT pe2.etapa_id FROM processo_etapas pe2 WHERE pe2.processo_id = p.id AND pe2.concluido IS NULL ORDER BY pe2.ordem ASC LIMIT 1) = ${input.etapaId}` : sql``}
          ${input.dataInicio ? sql`AND p.criado_em >= ${input.dataInicio}` : sql``}
          ${input.dataFim ? sql`AND p.criado_em <= ${input.dataFim + ' 23:59:59'}` : sql``}
          ${input.dataEmissaoInicio ? sql`AND p.data_emissao_contrato >= ${input.dataEmissaoInicio}` : sql``}
          ${input.dataEmissaoFim ? sql`AND p.data_emissao_contrato <= ${input.dataEmissaoFim}` : sql``}
          ${input.dataAssinaturaInicio ? sql`AND p.data_assinatura >= ${input.dataAssinaturaInicio}` : sql``}
          ${input.dataAssinaturaFim ? sql`AND p.data_assinatura <= ${input.dataAssinaturaFim}` : sql``}
          ${input.dataPagtoInicio ? sql`AND p.data_pagto_vendedor >= ${input.dataPagtoInicio}` : sql``}
          ${input.dataPagtoFim ? sql`AND p.data_pagto_vendedor <= ${input.dataPagtoFim}` : sql``}
          ${busca ? sql`AND (
            p.id = ${buscaNumerica}
            OR p.num_proposta LIKE ${`%${busca}%`}
            OR p.num_contrato LIKE ${`%${busca}%`}
            OR EXISTS (
              SELECT 1
              FROM processo_compradores pc2
              JOIN clientes c2 ON c2.id = pc2.cliente_id
              WHERE pc2.processo_id = p.id
                AND (
                  c2.nome LIKE ${`%${busca}%`}
                  OR c2.cpf_cnpj LIKE ${`%${busca}%`}
                  OR REPLACE(REPLACE(REPLACE(c2.cpf_cnpj, '.', ''), '-', ''), '/', '') LIKE ${`%${buscaDocumento}%`}
                )
            )
            OR EXISTS (
              SELECT 1
              FROM processo_vendedores pv2
              JOIN clientes v2 ON v2.id = pv2.cliente_id
              WHERE pv2.processo_id = p.id
                AND (
                  v2.nome LIKE ${`%${busca}%`}
                  OR v2.cpf_cnpj LIKE ${`%${busca}%`}
                  OR REPLACE(REPLACE(REPLACE(v2.cpf_cnpj, '.', ''), '-', ''), '/', '') LIKE ${`%${buscaDocumento}%`}
                )
            )
          )` : sql``}
        ORDER BY p.criado_em DESC
        LIMIT ${limite} OFFSET ${offset}
      `)

      return { lista: result[0] as unknown as any[], pagina: input.pagina }
    }),

  buscar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const p = await assertProcessoAcesso(ctx.db, ctx.usuario, input.id)

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

      const atendimentos = isPerfilInterno(ctx.usuario?.perfil)
        ? await ctx.db
            .select().from(processoAtendimentos)
            .where(eq(processoAtendimentos.processoId, input.id))
            .orderBy(desc(processoAtendimentos.criadoEm))
        : []

      return { ...p, compradores, vendedores, imoveis: imoveisList, etapas: etapasList, documentos, tarefas: tarefasList, historico, atendimentos }
    }),

  criar: protectedProcedure
    .input(processoInput)
    .mutation(async ({ input, ctx }) => {
      const { compradoresIds, vendedoresIds, imoveisIds, ...dadosIniciais } = input
      delete (dadosIniciais as any).finalizarCadastroInicial
      const dados = applyProcessoOwnership(prepararDadosProcesso(dadosIniciais, ctx.usuario), ctx.usuario)
      await validarRelacionamentosProcesso(ctx.db, ctx.usuario, dados)
      await assertClientesAcessiveis(ctx.db, ctx.usuario, compradoresIds)
      await assertClientesAcessiveis(ctx.db, ctx.usuario, vendedoresIds)
      await assertImoveisAcessiveis(ctx.db, ctx.usuario, imoveisIds)
      const [r] = await ctx.db.insert(processos).values({
        ...dados as any,
        tipoAmortizacao: (dados as any).tipoAmortizacao || 'PRICE',
        cadastroInicialCompleto: true,
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

      // Auto-populate etapas from fluxo (using fluxoEtapas junction)
      if (dados.fluxoId) {
        await criarEtapasDoFluxo(ctx.db, id, dados.fluxoId)
      }

      // Log no histórico
      await ctx.db.insert(processoHistorico).values({ processoId: id, usuarioId: ctx.usuario.id, descricao: 'Processo criado', criadoEm: new Date() })
      return { id }
    }),

  criarDaPreAnalise: protectedProcedure
    .input(z.object({ preAnaliseId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const wherePreAnalise = isPerfilInterno(ctx.usuario?.perfil)
        ? eq(preAnalises.id, input.preAnaliseId)
        : and(eq(preAnalises.id, input.preAnaliseId), eq(preAnalises.solicitanteId, ctx.usuario.id))

      const [preAnalise] = await ctx.db.select().from(preAnalises).where(wherePreAnalise)
      if (!preAnalise) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pré-análise não encontrada' })
      }

      if (normalizarTexto(preAnalise.situacao) !== 'apto') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Somente pré-análises aptas podem virar proposta' })
      }

      if (preAnalise.processoId) {
        await assertProcessoAcesso(ctx.db, ctx.usuario, preAnalise.processoId)
        return { id: preAnalise.processoId, existente: true }
      }

      const banco = await encontrarBancoDaPreAnalise(ctx.db, preAnalise.bancos)
      if (!banco) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Banco da pré-análise não encontrado no cadastro: ${preAnalise.bancos}` })
      }

      const [solicitante] = preAnalise.solicitanteId
        ? await ctx.db.select().from(usuarios).where(eq(usuarios.id, preAnalise.solicitanteId))
        : []
      const usuarioDono = await resolverVinculosUsuario(
        ctx.db,
        isPerfilInterno(ctx.usuario?.perfil) && solicitante ? solicitante : ctx.usuario
      )

      const dadosProcesso = applyProcessoOwnership({
        bancoId: banco.id,
        responsavelId: preAnalise.responsavelId || undefined,
        tipoAmortizacao: 'PRICE',
        valorFinanciado: normalizarDecimal(preAnalise.valorFinanciamento),
        observacao: `Proposta criada a partir da pré-análise #${preAnalise.id}.`,
      }, usuarioDono)

      await validarRelacionamentosProcesso(ctx.db, usuarioDono, dadosProcesso)

      return ctx.db.transaction(async (tx) => {
        const [registroAtual] = await tx.select().from(preAnalises).where(wherePreAnalise)
        if (!registroAtual) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pré-análise não encontrada' })
        }
        if (registroAtual.processoId) {
          return { id: registroAtual.processoId, existente: true }
        }

        const clienteScope = getClienteScopeCondition(usuarioDono)
        const clienteWhere = and(
          eq(clientes.tipo, 'Comprador'),
          eq(clientes.cpfCnpj, preAnalise.cpfCnpj),
          clienteScope
        )
        const [clienteExistente] = await tx
          .select({ id: clientes.id })
          .from(clientes)
          .where(clienteWhere)
          .limit(1)

        let compradorId = clienteExistente?.id
        if (!compradorId) {
          const dadosCliente = applyClienteOwnership({
            tipo: 'Comprador',
            nome: preAnalise.nome,
            cpfCnpj: preAnalise.cpfCnpj,
            dataNascimento: preAnalise.dataNascimento ? String(preAnalise.dataNascimento).substring(0, 10) : undefined,
            estadoCivil: estadoCivilClienteDaPreAnalise(preAnalise.estadoCivil),
            cpfConjuge: preAnalise.cpfConjuge || undefined,
            nomeConjuge: preAnalise.nomeConjuge || undefined,
            nomeMae: preAnalise.nomeMae || undefined,
            cep: preAnalise.cep || undefined,
          }, usuarioDono)
          const [clienteCriado] = await tx.insert(clientes).values({
            ...dadosCliente as any,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          })
          compradorId = (clienteCriado as any).insertId
        }

        const [processoCriado] = await tx.insert(processos).values({
          ...dadosProcesso as any,
          tipoAmortizacao: (dadosProcesso as any).tipoAmortizacao || 'PRICE',
          cadastroInicialCompleto: false,
          criadoPorId: ctx.usuario.id,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        })
        const processoId = (processoCriado as any).insertId

        await tx.insert(processoCompradores).values({ processoId, clienteId: compradorId, proponente: true })

        await tx.insert(processoHistorico).values([
          {
            processoId,
            usuarioId: ctx.usuario.id,
            titulo: 'Proposta criada',
            descricao: `Proposta criada a partir da pré-análise #${preAnalise.id}.`,
            tipo: 'historico',
            criadoEm: new Date(),
          },
          {
            processoId,
            usuarioId: preAnalise.solicitanteId || ctx.usuario.id,
            titulo: 'Pré-análise de origem',
            descricao: montarHistoricoPreAnalise(preAnalise, banco.nome),
            tipo: 'pre_analise',
            etapa: 'Pré-Análise',
            criadoEm: preAnalise.criadoEm ? new Date(preAnalise.criadoEm as any) : new Date(),
          },
        ])

        await tx.update(preAnalises)
          .set({ processoId, atualizadoEm: new Date() })
          .where(eq(preAnalises.id, preAnalise.id))

        return { id: processoId, existente: false }
      })
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).merge(processoInput.partial()))
    .mutation(async ({ input, ctx }) => {
      const { id, compradoresIds, vendedoresIds, imoveisIds, ...dadosIniciais } = input
      const finalizarCadastroInicial = Boolean((dadosIniciais as any).finalizarCadastroInicial)
      delete (dadosIniciais as any).finalizarCadastroInicial
      const usuarioExterno = isPerfilExterno(ctx.usuario?.perfil)
      await assertProcessoAcesso(ctx.db, ctx.usuario, id)
      await assertExternoPodeEditarProcesso(ctx.db, ctx.usuario, id)
      const dados = applyProcessoOwnership(prepararDadosProcesso(dadosIniciais, ctx.usuario), ctx.usuario)
      if (finalizarCadastroInicial) {
        ;(dados as any).cadastroInicialCompleto = true
      }
      await validarRelacionamentosProcesso(ctx.db, ctx.usuario, dados)
      await assertClientesAcessiveis(ctx.db, ctx.usuario, compradoresIds)
      await assertClientesAcessiveis(ctx.db, ctx.usuario, vendedoresIds)
      await assertImoveisAcessiveis(ctx.db, ctx.usuario, imoveisIds)
      await ctx.db.transaction(async (tx) => {
        await tx.update(processos).set({ ...dados as any, atualizadoEm: new Date() }).where(eq(processos.id, id))

        if (compradoresIds) {
          await tx.delete(processoCompradores).where(eq(processoCompradores.processoId, id))
          if (compradoresIds.length) await tx.insert(processoCompradores).values(compradoresIds.map(cId => ({ processoId: id, clienteId: cId })))
        }
        if (vendedoresIds) {
          if (usuarioExterno) {
            const existentes = await tx.select({ clienteId: processoVendedores.clienteId })
              .from(processoVendedores)
              .where(eq(processoVendedores.processoId, id))
            const existentesIds = new Set(existentes.map((item: any) => Number(item.clienteId)))
            const novosIds = vendedoresIds.filter(vId => !existentesIds.has(Number(vId)))
            if (novosIds.length) await tx.insert(processoVendedores).values(novosIds.map(vId => ({ processoId: id, clienteId: vId })))
          } else {
            await tx.delete(processoVendedores).where(eq(processoVendedores.processoId, id))
            if (vendedoresIds.length) await tx.insert(processoVendedores).values(vendedoresIds.map(vId => ({ processoId: id, clienteId: vId })))
          }
        }
        if (imoveisIds) {
          if (usuarioExterno) {
            const existentes = await tx.select({ imovelId: processoImoveis.imovelId })
              .from(processoImoveis)
              .where(eq(processoImoveis.processoId, id))
            const existentesIds = new Set(existentes.map((item: any) => Number(item.imovelId)))
            const novosIds = imoveisIds.filter(iId => !existentesIds.has(Number(iId)))
            if (novosIds.length) await tx.insert(processoImoveis).values(novosIds.map(iId => ({ processoId: id, imovelId: iId })))
          } else {
            await tx.delete(processoImoveis).where(eq(processoImoveis.processoId, id))
            if (imoveisIds.length) await tx.insert(processoImoveis).values(imoveisIds.map(iId => ({ processoId: id, imovelId: iId })))
          }
        }

        // Auto-populate etapas if fluxoId changed
        if (dados.fluxoId) {
          const existingEtapas = await tx.select().from(processoEtapas).where(eq(processoEtapas.processoId, id))
          if (existingEtapas.length === 0) {
            await criarEtapasDoFluxo(tx, id, dados.fluxoId)
          }
        }

        await tx.insert(processoHistorico).values({ processoId: id, usuarioId: ctx.usuario.id, descricao: 'Processo atualizado', criadoEm: new Date() })
      })
      return { ok: true }
    }),

  adicionarVendedor: protectedProcedure
    .input(z.object({ processoId: z.number(), clienteId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await assertClientesAcessiveis(ctx.db, ctx.usuario, [input.clienteId])

      const [cliente] = await ctx.db
        .select({ id: clientes.id, tipo: clientes.tipo, nome: clientes.nome })
        .from(clientes)
        .where(eq(clientes.id, input.clienteId))

      if (!cliente || cliente.tipo !== 'Vendedor') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione um cadastro de vendedor válido' })
      }

      const [existente] = await ctx.db
        .select({ clienteId: processoVendedores.clienteId })
        .from(processoVendedores)
        .where(and(eq(processoVendedores.processoId, input.processoId), eq(processoVendedores.clienteId, input.clienteId)))

      if (!existente) {
        await ctx.db.transaction(async (tx) => {
          await tx.insert(processoVendedores).values({ processoId: input.processoId, clienteId: input.clienteId })
          await tx.insert(processoHistorico).values({
            processoId: input.processoId,
            usuarioId: ctx.usuario.id,
            titulo: 'Vendedor incluído',
            descricao: `Vendedor incluído no processo: ${cliente.nome}`,
            tipo: 'historico',
            criadoEm: new Date(),
          })
        })
      }

      return { ok: true }
    }),

  adicionarImovel: protectedProcedure
    .input(z.object({ processoId: z.number(), imovelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await assertImoveisAcessiveis(ctx.db, ctx.usuario, [input.imovelId])

      const [imovel] = await ctx.db
        .select({ id: imoveis.id, endereco: imoveis.endereco, cidade: imoveis.cidade, uf: imoveis.uf })
        .from(imoveis)
        .where(eq(imoveis.id, input.imovelId))

      if (!imovel) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione um imóvel válido' })
      }

      const [existente] = await ctx.db
        .select({ imovelId: processoImoveis.imovelId })
        .from(processoImoveis)
        .where(and(eq(processoImoveis.processoId, input.processoId), eq(processoImoveis.imovelId, input.imovelId)))

      if (!existente) {
        await ctx.db.transaction(async (tx) => {
          await tx.insert(processoImoveis).values({ processoId: input.processoId, imovelId: input.imovelId })
          await tx.insert(processoHistorico).values({
            processoId: input.processoId,
            usuarioId: ctx.usuario.id,
            titulo: 'Imóvel incluído',
            descricao: `Imóvel incluído no processo: ${[imovel.endereco, imovel.cidade, imovel.uf].filter(Boolean).join(' - ')}`,
            tipo: 'historico',
            criadoEm: new Date(),
          })
        })
      }

      return { ok: true }
    }),

  arquivar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.id)
      await ctx.db.update(processos).set({ arquivado: true, atualizadoEm: new Date() }).where(eq(processos.id, input.id))
      return { ok: true }
    }),

  adicionarAtendimento: protectedProcedure
    .input(z.object({ processoId: z.number(), descricao: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      assertPerfilInterno(ctx.usuario)
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await ctx.db.insert(processoAtendimentos).values({ ...input, usuarioId: ctx.usuario.id, criadoEm: new Date() })
      return { ok: true }
    }),

  registrarVisualizacao: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      assertPerfilInterno(ctx.usuario)
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await ctx.db.insert(processoAtendimentos).values({
        processoId: input.processoId,
        usuarioId: ctx.usuario.id,
        descricao: 'Processo visualizado',
        criadoEm: new Date(),
      })
      return { ok: true }
    }),

  avancarEtapa: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      etapaId: z.number(),
      observacao: z.string().max(2000).optional(),
      proximoResponsavelId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const processoAtual = await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      const etapasList = await listarEtapasOrdenadas(ctx.db, input.processoId)
      const etapaAtual = getEtapaAtual(etapasList)
      if (!etapaAtual) throw new TRPCError({ code: "BAD_REQUEST", message: "Todas as etapas ja foram concluidas" })
      if (etapaAtual.etapaId !== input.etapaId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "So a etapa atual pode ser concluida. Conclua as etapas em ordem." })
      }
      if (isPerfilExterno(ctx.usuario?.perfil)) {
        const idxAtual = etapasList.findIndex((etapa: any) => etapa.id === etapaAtual.id)
        if (idxAtual !== 0) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuário externo só pode concluir a primeira etapa do processo' })
        }
        await validarDocumentosObrigatoriosPrimeiraEtapa(ctx.db, processoAtual)
      }
      let proximoResponsavelInterno: { id: number; nome: string } | undefined
      if (isPerfilInterno(ctx.usuario?.perfil)) {
        if (!input.proximoResponsavelId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Informe o próximo responsável interno para concluir a etapa' })
        }
        const [usuarioInterno] = await ctx.db
          .select({ id: usuarios.id, nome: usuarios.nome, perfil: usuarios.perfil })
          .from(usuarios)
          .where(eq(usuarios.id, input.proximoResponsavelId))

        if (!usuarioInterno || !isPerfilInterno(usuarioInterno.perfil)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'O próximo responsável precisa ser um usuário interno' })
        }
        proximoResponsavelInterno = { id: usuarioInterno.id, nome: usuarioInterno.nome }
      }
      const agora = new Date()

      await ctx.db.update(processoEtapas)
        .set({
          concluido: agora,
          usuarioId: ctx.usuario.id,
          observacao: input.observacao ?? etapaAtual.observacao ?? null,
        })
        .where(eq(processoEtapas.id, etapaAtual.id))

      const etapaNome = await buscarNomeEtapa(ctx.db, input.etapaId)

      await ctx.db.insert(processoHistorico).values({
        processoId: input.processoId,
        usuarioId: ctx.usuario.id,
        titulo: `Etapa concluída: ${etapaNome}`,
        descricao: input.observacao || `Etapa "${etapaNome}" concluída`,
        tipo: 'historico',
        etapa: etapaNome,
        criadoEm: new Date(),
      })

      if (proximoResponsavelInterno) {
        await ctx.db.insert(tarefas).values({
          processoId: input.processoId,
          solicitanteId: ctx.usuario.id,
          executanteId: proximoResponsavelInterno.id,
          solicitacao: [
            `Encaminhamento de processo: #${input.processoId}`,
            `Etapa concluída: ${etapaNome}`,
            input.observacao ? `Observação: ${input.observacao}` : '',
            'Aceite ou recuse este encaminhamento para assumir a responsabilidade pelo processo.',
          ].filter(Boolean).join('\n'),
          status: 'Pendente',
          criadoEm: new Date(),
        })
      }
      return { ok: true }
    }),

  reabrirEtapa: protectedProcedure
    .input(z.object({ processoId: z.number(), etapaId: z.number(), observacao: z.string().max(2000).optional() }))
    .mutation(async ({ input, ctx }) => {
      assertPerfilInterno(ctx.usuario)
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      const etapasList = await listarEtapasOrdenadas(ctx.db, input.processoId)
      const etapaAlvo = getEtapaParaReabrir(etapasList)

      if (!etapaAlvo || !etapaAlvo.concluido) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nao ha etapa para reabrir' })
      }

      if (etapaAlvo.etapaId !== input.etapaId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'So a ultima etapa concluida pode ser reaberta' })
      }

      const idxAlvo = etapasList.findIndex((etapa: any) => etapa.id === etapaAlvo.id)
      const etapaSeguinte = idxAlvo >= 0 ? etapasList[idxAlvo + 1] : null

      await ctx.db.transaction(async (tx) => {
        await tx.update(processoEtapas)
          .set({
            iniciado: null,
            concluido: null,
            usuarioId: null,
            observacao: input.observacao ?? etapaAlvo.observacao ?? null,
          })
          .where(eq(processoEtapas.id, etapaAlvo.id))

        if (etapaSeguinte && !etapaSeguinte.concluido) {
          await tx.update(processoEtapas)
            .set({
              iniciado: null,
              usuarioId: null,
            })
            .where(eq(processoEtapas.id, etapaSeguinte.id))
        }

        const etapaNome = await buscarNomeEtapa(tx, input.etapaId)
        await tx.insert(processoHistorico).values({
          processoId: input.processoId,
          usuarioId: ctx.usuario.id,
          titulo: `Etapa reaberta: ${etapaNome}`,
          descricao: input.observacao || `Etapa "${etapaNome}" reaberta para retorno ao passo anterior`,
          tipo: 'historico',
          etapa: etapaNome,
          criadoEm: new Date(),
        })
      })

      return { ok: true }
    }),

  marcarEtapaPendente: protectedProcedure
    .input(z.object({ processoId: z.number(), etapaId: z.number(), observacao: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      assertPerfilInterno(ctx.usuario)
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      const etapasList = await listarEtapasOrdenadas(ctx.db, input.processoId)
      const etapaAtual = getEtapaAtual(etapasList)

      if (!etapaAtual) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Todas as etapas ja foram concluidas' })
      if (etapaAtual.etapaId !== input.etapaId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'So a etapa atual pode ser marcada como pendente' })
      }

      const etapaNome = await buscarNomeEtapa(ctx.db, input.etapaId)

      await ctx.db.transaction(async (tx) => {
        await tx.update(processoEtapas)
          .set({ observacao: input.observacao })
          .where(eq(processoEtapas.id, etapaAtual.id))

        await tx.insert(processoHistorico).values({
          processoId: input.processoId,
          usuarioId: ctx.usuario.id,
          titulo: `Etapa pendente: ${etapaNome}`,
          descricao: input.observacao,
          tipo: 'pendencia',
          etapa: etapaNome,
          criadoEm: new Date(),
        })
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
      clienteId: z.number().optional(),
      tipoVinculo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      if (isPerfilExterno(ctx.usuario?.perfil) && input.documentoTipoId) {
        const conflitoAprovado = await ctx.db.select({ id: processoDocumentos.id })
          .from(processoDocumentos)
          .where(and(
            eq(processoDocumentos.processoId, input.processoId),
            eq(processoDocumentos.documentoTipoId, input.documentoTipoId),
            input.clienteId ? eq(processoDocumentos.clienteId, input.clienteId) : isNull(processoDocumentos.clienteId),
            eq(processoDocumentos.status, 'aprovado'),
          ))
        if (conflitoAprovado.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Documento aprovado não pode ser substituído pelo usuário externo' })
        }
      }
      await ctx.db.insert(processoDocumentos).values({
        ...input as any,
        status: 'pendente',
        usuarioId: ctx.usuario.id,
        criadoEm: new Date()
      })
      return { ok: true }
    }),

  excluirDocumento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [doc] = await ctx.db.select().from(processoDocumentos).where(eq(processoDocumentos.id, input.id))
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento nao encontrado' })
      await assertProcessoAcesso(ctx.db, ctx.usuario, doc.processoId)
      const perfil = (ctx as any).usuario?.perfil
      const isAdmin = ['Administrador','Analista','Gerente'].includes(perfil)
      if (doc.status === 'aprovado' && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Documento aprovado nao pode ser excluido' })
      }
      await ctx.db.delete(processoDocumentos).where(eq(processoDocumentos.id, input.id))
      return { ok: true }
    }),


  setProponente: protectedProcedure
    .input(z.object({ processoId: z.number(), clienteId: z.number(), tipo: z.enum(['comprador','vendedor']), proponente: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await assertExternoPodeEditarProcesso(ctx.db, ctx.usuario, input.processoId)
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
      assertPerfilInterno(ctx.usuario)
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await ctx.db.update(processoEtapas)
        .set({ observacao: input.observacao })
        .where(and(eq(processoEtapas.processoId, input.processoId), eq(processoEtapas.etapaId, input.etapaId)))
      return { ok: true }
    }),

  // Dashboard COBAN - processos sem responsável
  analiseCoban: protectedProcedure.query(async ({ ctx }) => {
    assertPerfilInterno(ctx.usuario)
    // Fila de Analise COBAN: so processos cuja etapa ATUAL seja uma etapa de Analise Coban
    const result = await ctx.db.execute(sql`
      SELECT p.id, p.criado_em as criadoEm,
             b.nome as bancoNome, par.nome as parceiroNome,
             u.nome as responsavelNome,
             DATEDIFF(NOW(), p.criado_em) as dias,
             (SELECT c.nome FROM processo_compradores pc
              JOIN clientes c ON c.id = pc.cliente_id
              WHERE pc.processo_id = p.id LIMIT 1) as proponenteNome,
             (SELECT e.nome FROM processo_etapas pe
              JOIN etapas e ON e.id = pe.etapa_id
              WHERE pe.processo_id = p.id AND pe.concluido IS NULL
              ORDER BY pe.ordem ASC LIMIT 1) as etapaAtualNome
      FROM processos p
      LEFT JOIN bancos b ON b.id = p.banco_id
      LEFT JOIN parceiros par ON par.id = p.parceiro_id
      LEFT JOIN usuarios u ON u.id = p.responsavel_id
      WHERE p.arquivado = false AND p.reprovado = false
        AND p.responsavel_id IS NULL
        AND (SELECT e.nome FROM processo_etapas pe
             JOIN etapas e ON e.id = pe.etapa_id
             WHERE pe.processo_id = p.id AND pe.concluido IS NULL
             ORDER BY pe.ordem ASC LIMIT 1) LIKE '%nalise Coban%'
      ORDER BY p.criado_em DESC
      LIMIT 20
    `)
    return result[0] as unknown as any[]
  }),

  // Processos do analista logado
  meusProcessos: protectedProcedure.query(async ({ ctx }) => {
    assertPerfilInterno(ctx.usuario)
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
      assertPerfilInterno(ctx.usuario)
      await ctx.db.update(processos).set({ responsavelId: ctx.usuario.id, atualizadoEm: new Date() }).where(eq(processos.id, input.id))
      await ctx.db.insert(processoHistorico).values({ processoId: input.id, usuarioId: ctx.usuario.id, descricao: 'Processo assumido', criadoEm: new Date() })
      return { ok: true }
    }),

  // Atribuir responsável a um processo
  atribuirResponsavel: protectedProcedure
    .input(z.object({ processoId: z.number(), responsavelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      assertPerfilInterno(ctx.usuario)
      await ctx.db.update(processos).set({ responsavelId: input.responsavelId, atualizadoEm: new Date() }).where(eq(processos.id, input.processoId))
      await ctx.db.insert(processoHistorico).values({ processoId: input.processoId, usuarioId: ctx.usuario.id, descricao: 'Responsável atribuído', criadoEm: new Date() })
      return { ok: true }
    }),

  // Registrar pendência (salva no processoHistorico com tipo='pendencia')
  registrarPendencia: protectedProcedure
    .input(z.object({ processoId: z.number(), descricao: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
      await assertExternoPodeEditarProcesso(ctx.db, ctx.usuario, input.processoId)
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
        await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
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
        await assertProcessoAcesso(ctx.db, ctx.usuario, input.processoId)
        await assertExternoPodeEditarProcesso(ctx.db, ctx.usuario, input.processoId)
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

  // Aprovar documento
  aprovarDocumento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const perfil = (ctx as any).usuario?.perfil
      if (!['Administrador','Analista','Gerente'].includes(perfil)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao' })
      return ctx.db.update(processoDocumentos).set({ status: 'aprovado', motivoRecusa: null }).where(eq(processoDocumentos.id, input.id))
    }),

  // Reprovar documento
  reprovarDocumento: protectedProcedure
    .input(z.object({ id: z.number(), motivo: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const perfil = (ctx as any).usuario?.perfil
      if (!['Administrador','Analista','Gerente'].includes(perfil)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissao' })
      return ctx.db.update(processoDocumentos).set({ status: 'reprovado', motivoRecusa: input.motivo }).where(eq(processoDocumentos.id, input.id))
    }),

  // Documentos tipos por fluxo (para checklist) - usa tabela fluxo_documentos
  documentosTiposPorFluxo: protectedProcedure
    .input(z.object({ fluxoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.select({
        id: documentosTipos.id,
        nome: documentosTipos.nome,
        obrigatorio: documentosTipos.obrigatorio,
        obrigatorioPrimeiraEtapa: fluxoDocumentos.obrigatorioPrimeiraEtapa,
        categoria: fluxoDocumentos.categoria,
        ordem: fluxoDocumentos.ordem,
      })
      .from(fluxoDocumentos)
      .leftJoin(documentosTipos, eq(fluxoDocumentos.documentoTipoId, documentosTipos.id))
      .where(eq(fluxoDocumentos.fluxoId, input.fluxoId))
      .orderBy(fluxoDocumentos.categoria, fluxoDocumentos.ordem)
      return rows
    }),
})
