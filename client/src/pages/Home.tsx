import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useAuth } from '../lib/auth'
import { usePermissoes } from '../lib/permissoes'
import { formatCpfCnpj } from '../lib/documento'
import { CheckCircle, Plus, ExternalLink, Trash2, Edit, UserPlus, Hand, Eye, MessageSquare, FilePlus } from 'lucide-react'
import { Btn, Modal, Input, Select, Badge, Spinner, Textarea } from '../components/ui'
import {
  PRE_ANALISE_BANCOS_FILTRO,
  PRE_ANALISE_SITUACOES_FILTRO,
  toggleFiltroLista,
} from './home/constants'

type FiltroStatus = 'pendente' | 'resolvida' | 'todas'

const normalizarSituacao = (situacao?: string | null) =>
  (situacao || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const preAnaliseResolvidaParaInterno = (situacao?: string | null) => {
  const valor = normalizarSituacao(situacao)
  return valor === 'apto' || valor === 'nao apto' || valor === 'concluida'
}

const preAnaliseConcluidaPeloSolicitante = (situacao?: string | null) =>
  normalizarSituacao(situacao) === 'concluida'

const preAnalisePodeConcluirSolicitante = (situacao?: string | null) => {
  const valor = normalizarSituacao(situacao)
  return valor === 'apto' || valor === 'nao apto'
}

const preAnalisePodeReenviarSolicitante = (item: any) =>
  normalizarSituacao(item?.situacao) === 'nao apto' && Boolean(item?.permitirReenvio)

export function Home() {
  const { pode, isExterno } = usePermissoes()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const podePreAnaliseHome = pode('home:pre_analise')
  const podeCriarPreAnalise = pode('pre_analise:criar')
  const podeEditarPreAnalise = pode('pre_analise:editar') || pode('pre_analise:concluir')
  const podeExcluirPreAnalise = usuario?.perfil === 'Administrador'
  const podeTarefasHome = pode('home:tarefas')
  const podeAnaliseCoban = pode('home:analise_coban')
  const podeMeusProcessos = pode('home:meus_processos')
  const podeCriarProcesso = pode('processo:criar')
  const podeAbrirProcesso = pode('menu:processos') || pode('processo:editar') || pode('processo:ver_todos') || podeCriarProcesso
  const [modalPreAnalise, setModalPreAnalise] = useState(false)
  const [modalEditarPA, setModalEditarPA] = useState<any>(null)
  const [modalTarefa, setModalTarefa] = useState(false)
  const [modalAtribuir, setModalAtribuir] = useState(false)
  const [processoSelecionado, setProcessoSelecionado] = useState<number | null>(null)
  const [modalResponderTarefa, setModalResponderTarefa] = useState<any>(null)
  const [respostaTarefaTexto, setRespostaTarefaTexto] = useState('')
  const [respostaTarefaStatus, setRespostaTarefaStatus] = useState<'Pendente' | 'Resolvida'>('Pendente')
  const [criandoProcessoPreAnaliseId, setCriandoProcessoPreAnaliseId] = useState<number | null>(null)

  // Filtros Pré-Análise
  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([])
  const [filtroBancos, setFiltroBancos] = useState<string[]>([])

  // Filtros Tarefas
  const [filtroCriadas, setFiltroCriadas] = useState<FiltroStatus>('pendente')

  const tarefasRecebidas = trpc.tarefas.minhasTarefas.useQuery(
    { filtroStatus: 'pendente' },
    { enabled: podeTarefasHome }
  )
  const tarefasCriadas = trpc.tarefas.minhasTarefas.useQuery(
    { filtroStatus: filtroCriadas },
    { enabled: podeTarefasHome }
  )
  const preAnalise = trpc.preAnalise.listar.useQuery(
    { pagina: 1 },
    { enabled: podePreAnaliseHome }
  )
  const preAnaliseBancosPermitidos = trpc.preAnalise.bancosPermitidos.useQuery(undefined, {
    enabled: podePreAnaliseHome,
  })
  const preAnaliseBancosFiltro: string[] = preAnaliseBancosPermitidos.data
    ? preAnaliseBancosPermitidos.data.map((b: { nome: string }) => b.nome)
    : [...PRE_ANALISE_BANCOS_FILTRO]
  const coban = trpc.processos.analiseCoban.useQuery(undefined, { enabled: podeAnaliseCoban })
  const meusProcessos = trpc.processos.meusProcessos.useQuery(undefined, { enabled: podeMeusProcessos })
  const utils = trpc.useUtils()

  const [tarefaDetalhe, setTarefaDetalhe] = useState<any>(null)
  const concluirTarefa = trpc.tarefas.concluir.useMutation({
    onSuccess: () => {
      utils.tarefas.minhasTarefas.invalidate()
      setModalResponderTarefa(null)
      setRespostaTarefaTexto('')
      setRespostaTarefaStatus('Pendente')
    }
  })
  const responderEncaminhamento = trpc.tarefas.responderEncaminhamento.useMutation({
    onSuccess: async () => {
      await utils.tarefas.minhasTarefas.invalidate()
      await utils.processos.meusProcessos.invalidate()
      setModalResponderTarefa(null)
      setRespostaTarefaTexto('')
      setRespostaTarefaStatus('Pendente')
    }
  })
  const excluirPreAnalise = trpc.preAnalise.excluir.useMutation({
    onSuccess: () => utils.preAnalise.listar.invalidate()
  })
  const criarProcessoPreAnalise = trpc.processos.criarDaPreAnalise.useMutation({
    onSuccess: async (d) => {
      await utils.preAnalise.listar.invalidate()
      navigate(`/financiamento/processos/${d.id}`)
    },
    onSettled: () => setCriandoProcessoPreAnaliseId(null),
  })
  const pegarProcesso = trpc.processos.pegarProcesso.useMutation({
    onSuccess: async () => {
      await utils.processos.analiseCoban.invalidate()
      await utils.processos.meusProcessos.invalidate()
    }
  })

  // Filtro client-side pre-analise
  const preAnaliseFiltrada = (preAnalise.data || []).filter(p => {
    if (p.processoId) return false
    if (isExterno && preAnaliseConcluidaPeloSolicitante(p.situacao)) return false
    if (!isExterno && preAnaliseResolvidaParaInterno(p.situacao)) return false
    if (filtroSituacao.length > 0 && !filtroSituacao.includes(p.situacao || 'Aguardando análise')) return false
    if (filtroBancos.length > 0) {
      const bancosItem = (p.bancos || '').split(',').map((b: string) => b.trim())
      if (!filtroBancos.some(fb => bancosItem.some((bi: string) => bi.toLowerCase().includes(fb.toLowerCase())))) return false
    }
    return true
  })

  const podeTransformarPreAnaliseEmProcesso = (item: any) =>
    normalizarSituacao(item?.situacao) === 'apto' && !item?.processoId && podeCriarProcesso

  const handleCriarProcessoPreAnalise = (item: any) => {
    if (!podeTransformarPreAnaliseEmProcesso(item)) return
    setCriandoProcessoPreAnaliseId(item.id)
    criarProcessoPreAnalise.mutate({ preAnaliseId: item.id })
  }

  const toggleFiltro = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(toggleFiltroLista(arr, val))
  }

  const calcularDias = (data?: string | Date | null) => {
    if (!data) return '-'
    const base = new Date(data)
    if (Number.isNaN(base.getTime())) return '-'
    const diff = Date.now() - base.getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  }

  const corSituacaoPreAnalise = (situacao?: string | null) => {
    const valor = normalizarSituacao(situacao)
    if (valor.includes('nao apto')) return 'bg-red-100 text-red-700'
    if (valor.includes('apto')) return 'bg-green-100 text-green-700'
    if (valor.includes('em analise') || valor.includes('em análise')) return 'bg-yellow-100 text-yellow-800'
    if (valor.includes('aguardando')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-600'
  }

  const abrirRespostaTarefa = (tarefa: any, status: 'Pendente' | 'Resolvida' = 'Pendente') => {
    setModalResponderTarefa(tarefa)
    setRespostaTarefaStatus(status)
    setRespostaTarefaTexto(tarefa.acompanhamento || '')
  }

  const salvarRespostaTarefa = () => {
    if (!modalResponderTarefa || !respostaTarefaTexto.trim()) return
    concluirTarefa.mutate({
      id: modalResponderTarefa.id,
      status: respostaTarefaStatus,
      acompanhamento: respostaTarefaTexto.trim(),
    })
  }

  const tarefaPropostaLabel = (tarefa: any) => tarefa.processoNumProposta || ''
  const isTarefaEncaminhamento = (tarefa: any) =>
    String(tarefa?.solicitacao || '').startsWith('Encaminhamento de processo:')
  const tarefaStatusVisual = (tarefa: any) => {
    const status = normalizarSituacao(tarefa?.status)
    if (status === 'resolvida') {
      return {
        label: 'Resolvida',
        row: 'bg-green-50/70 hover:bg-green-100/70',
        marker: 'border-l-4 border-green-400',
        badge: 'bg-green-100 text-green-700',
      }
    }
    if (status === 'encerrada') {
      return {
        label: 'Encerrada',
        row: 'bg-gray-50 hover:bg-gray-100',
        marker: 'border-l-4 border-gray-400',
        badge: 'bg-gray-100 text-gray-600',
      }
    }
    return {
      label: 'Pendente',
      row: 'bg-amber-50/70 hover:bg-amber-100/70',
      marker: 'border-l-4 border-amber-400',
      badge: 'bg-amber-100 text-amber-700',
    }
  }

  const responderEncaminhamentoProcesso = (decisao: 'Aceitar' | 'Recusar') => {
    if (!modalResponderTarefa) return
    responderEncaminhamento.mutate({
      id: modalResponderTarefa.id,
      decisao,
      acompanhamento: respostaTarefaTexto.trim() || undefined,
    })
  }

  return (
    <div className="space-y-6">
      {/* Saudacao */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
        <h2 className="text-lg font-bold">Olá, {usuario?.nome?.split(' ')[0]}!</h2>
        <p className="text-blue-200 text-sm mt-1">Bem-vindo ao Sistema Amarante — Serviços Financeiros e Imobiliários</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Pré-Análise ── */}
        {podePreAnaliseHome && <section className="bg-white rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Pré-Análise</h3>
            {podeCriarPreAnalise && (
              <Btn size="sm" onClick={() => setModalPreAnalise(true)} icon={<Plus size={13} />}>Incluir</Btn>
            )}
          </div>
          {!isExterno && (
            <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Situacao:</span>
                {PRE_ANALISE_SITUACOES_FILTRO.map(s => (
                  <label key={s} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={filtroSituacao.includes(s)} onChange={() => toggleFiltro(filtroSituacao, s, setFiltroSituacao)} className="rounded text-blue-600 w-3 h-3" />
                    <span className="text-gray-600">{s}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Banco:</span>
                {preAnaliseBancosFiltro.map(b => (
                  <label key={b} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={filtroBancos.includes(b)} onChange={() => toggleFiltro(filtroBancos, b, setFiltroBancos)} className="rounded text-blue-600 w-3 h-3" />
                    <span className="text-gray-600">{b}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  {isExterno && <th className="px-3 py-2 w-10"></th>}
                  <th className="px-3 py-2 text-left">Situacao</th>
                  <th className="px-3 py-2 text-left">CPF/CNPJ</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Banco</th>
                  {isExterno ? (
                    <th className="px-3 py-2 text-left">Observação</th>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left">Valor</th>
                      <th className="px-3 py-2 text-left">Solicitante</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-left">Responsavel</th>
                  <th className="px-3 py-2 text-center">Dias</th>
                  <th className="px-3 py-2 text-center">Cod.</th>
                  {!isExterno && <th className="px-3 py-2 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preAnalise.isLoading && (
                  <tr><td colSpan={isExterno ? 9 : 10} className="py-6 text-center"><Spinner size={16} /></td></tr>
                )}
                {!preAnalise.isLoading && preAnaliseFiltrada.length === 0 && (
                  <tr><td colSpan={isExterno ? 9 : 10} className="py-6 text-center text-gray-400">Nenhuma pre-analise encontrada</td></tr>
                )}
                {preAnaliseFiltrada.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {isExterno && (
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {podeEditarPreAnalise ? (
                            <button
                              onClick={() => setModalEditarPA(p)}
                              className="text-gray-700 hover:text-blue-700 p-1"
                              title="Ver pré-análise"
                            >
                              <Eye size={14} />
                            </button>
                          ) : null}
                          {p.processoId && podeAbrirProcesso && (
                            <button
                              type="button"
                              onClick={() => navigate(`/financiamento/processos/${p.processoId}`)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title={`Abrir proposta #${p.processoId}`}
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                          {podeTransformarPreAnaliseEmProcesso(p) && (
                            <button
                              type="button"
                              onClick={() => handleCriarProcessoPreAnalise(p)}
                              disabled={criandoProcessoPreAnaliseId === p.id && criarProcessoPreAnalise.isPending}
                              className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50"
                              title="Criar proposta a partir da pré-análise"
                            >
                              {criandoProcessoPreAnaliseId === p.id && criarProcessoPreAnalise.isPending ? <Spinner size={14} /> : <FilePlus size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <Badge label={p.situacao || 'Aguardando'} color={corSituacaoPreAnalise(p.situacao)} />
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">{formatCpfCnpj(p.cpfCnpj)}</td>
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[140px] truncate">{p.nome}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{p.bancos}</td>
                    {isExterno ? (
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">{p.observacao || '-'}</td>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-600">R$ {Number(p.valorFinanciamento || 0).toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2 text-gray-600">{(p as any).solicitanteNome || '-'}</td>
                      </>
                    )}
                    <td className="px-3 py-2 text-gray-600">{(p as any).responsavelNome || '-'}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{calcularDias((p as any).criadoEm)}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge label={String(p.id)} color="bg-gray-100 text-gray-600" />
                    </td>
                    {!isExterno && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {podeEditarPreAnalise && (
                            <button onClick={() => setModalEditarPA(p)} className="text-blue-600 hover:text-blue-800 p-1" title="Resolver">
                              <Edit size={14} />
                            </button>
                          )}
                          {podeExcluirPreAnalise && (
                            <button
                              onClick={() => { if (confirm('Excluir esta pre-analise?')) excluirPreAnalise.mutate({ id: p.id }) }}
                              className="text-red-500 hover:text-red-700 p-1" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>}

        {/* ── Tarefas Recebidas ── */}
        {podeTarefasHome && <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Tarefas Recebidas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 text-left">N</th>
                  <th className="px-3 py-2 text-left">Solicitante</th>
                  <th className="px-3 py-2 text-left">Proposta / Processo</th>
                  <th className="px-3 py-2 text-left">Tarefa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tarefasRecebidas.isLoading && (
                  <tr><td colSpan={5} className="py-6 text-center"><Spinner size={16} /></td></tr>
                )}
                {!tarefasRecebidas.isLoading && (tarefasRecebidas.data?.recebidas || []).length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhuma tarefa</td></tr>
                )}
                {(tarefasRecebidas.data?.recebidas || []).map(t => {
                  const visual = tarefaStatusVisual(t)
                  return (
                  <tr key={t.id} className={visual.row}>
                    <td className={`px-3 py-2 text-center ${visual.marker}`}>
                      <button onClick={() => setTarefaDetalhe(t)} className="text-blue-500 hover:text-blue-700 mr-1" title="Ver detalhes"><Eye size={16} /></button>
                      <button
                        onClick={() => abrirRespostaTarefa(t, 'Pendente')}
                        className="text-blue-500 hover:text-blue-700 mr-1" title="Responder">
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => abrirRespostaTarefa(t, 'Resolvida')}
                        className="text-green-500 hover:text-green-700" title="Resolver">
                        <CheckCircle size={16} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={String(t.id)} color={visual.badge} />
                    </td>
                    <td className="px-3 py-2 text-gray-700">{(t as any).solicitanteNome || t.solicitanteId}</td>
                    <td className="px-3 py-2">
                      {tarefaPropostaLabel(t) && <div className="text-gray-700 font-medium">{tarefaPropostaLabel(t)}</div>}
                      {(t as any).processoId && podeAbrirProcesso ? (
                        <Link to={`/financiamento/processos/${(t as any).processoId}`} className="text-blue-600 hover:underline">
                          #{(t as any).processoId}
                        </Link>
                      ) : (t as any).processoId ? <span className="text-gray-400">#{(t as any).processoId}</span> : <span className="text-amber-600 text-[11px]">Sem vínculo</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <Badge label={visual.label} color={visual.badge} />
                      <p className="line-clamp-2">{t.solicitacao}</p>
                      {t.acompanhamento && <p className="line-clamp-1 text-[11px] text-blue-600 mt-1">Resposta: {t.acompanhamento}</p>}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t text-xs font-medium text-gray-500">
            Somente tarefas pendentes aparecem aqui.
          </div>
        </section>}

        {/* ── Tarefas Criadas ── */}
        {podeTarefasHome && <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Tarefas Criadas</h3>
            <Btn size="sm" onClick={() => setModalTarefa(true)} icon={<Plus size={13} />}>Nova Tarefa</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 text-left">N</th>
                  <th className="px-3 py-2 text-left">Executante</th>
                  <th className="px-3 py-2 text-left">Proposta / Processo</th>
                  <th className="px-3 py-2 text-left">Tarefa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tarefasCriadas.isLoading && (
                  <tr><td colSpan={5} className="py-6 text-center"><Spinner size={16} /></td></tr>
                )}
                {!tarefasCriadas.isLoading && (tarefasCriadas.data?.criadas || []).length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhuma tarefa</td></tr>
                )}
                {(tarefasCriadas.data?.criadas || []).map(t => {
                  const visual = tarefaStatusVisual(t)
                  return (
                  <tr key={t.id} className={visual.row}>
                    <td className={`px-3 py-2 text-center ${visual.marker}`}>
                      <button onClick={() => setTarefaDetalhe(t)} className="text-blue-500 hover:text-blue-700 mr-1" title="Ver detalhes"><Eye size={16} /></button>
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={String(t.id)} color={visual.badge} />
                    </td>
                    <td className="px-3 py-2 text-gray-700">{(t as any).executanteNome || t.executanteId}</td>
                    <td className="px-3 py-2">
                      {tarefaPropostaLabel(t) && <div className="text-gray-700 font-medium">{tarefaPropostaLabel(t)}</div>}
                      {(t as any).processoId && podeAbrirProcesso ? (
                        <Link to={`/financiamento/processos/${(t as any).processoId}`} className="text-blue-600 hover:underline">
                          #{(t as any).processoId}
                        </Link>
                      ) : (t as any).processoId ? <span className="text-gray-400">#{(t as any).processoId}</span> : <span className="text-amber-600 text-[11px]">Sem vínculo</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <Badge label={visual.label} color={visual.badge} />
                      <p className="line-clamp-2">{t.solicitacao}</p>
                      {t.acompanhamento && <p className="line-clamp-1 text-[11px] text-blue-600 mt-1">Resposta: {t.acompanhamento}</p>}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t flex gap-3">
            {(['pendente', 'resolvida', 'todas'] as FiltroStatus[]).map((f, i) => (
              <span key={f} className="flex items-center gap-3">
                {i > 0 && <span className="text-gray-300">|</span>}
                <button
                  onClick={() => setFiltroCriadas(f)}
                  className={`text-xs font-medium ${filtroCriadas === f ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              </span>
            ))}
          </div>
        </section>}

        {podeAnaliseCoban && <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Análise COBAN</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left">Ações</th>
                  <th className="px-3 py-2 text-left">N</th>
                  <th className="px-3 py-2 text-left">Proponente</th>
                  <th className="px-3 py-2 text-left">Banco</th>
                  <th className="px-3 py-2 text-left">Parceiro</th>
                  <th className="px-3 py-2 text-center">Dias</th>
                  <th className="px-3 py-2 text-left">Responsavel</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coban.isLoading && (
                  <tr><td colSpan={7} className="py-6 text-center"><Spinner size={16} /></td></tr>
                )}
                {!coban.isLoading && (coban.data || []).length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">Nenhum processo na fila COBAN</td></tr>
                )}
                {(coban.data || []).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {!p.responsavelNome && (
                          <>
                            <button
                              onClick={() => pegarProcesso.mutate({ id: p.id })}
                              className="text-green-600 hover:text-green-800 text-[10px] flex items-center gap-0.5 font-medium"
                              title="Pegar Processo">
                              <Hand size={12} /> Pegar
                            </button>
                            <span className="text-gray-300 mx-0.5">|</span>
                          </>
                        )}
                        <button
                          onClick={() => { setProcessoSelecionado(p.id); setModalAtribuir(true) }}
                          className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-0.5 font-medium"
                          title="Atribuir Responsavel">
                          <UserPlus size={12} /> Atribuir
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Link to={`/financiamento/processos/${p.id}`} className="text-blue-600 hover:underline font-medium">
                        #{p.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-800 font-medium max-w-[150px] truncate">{(p as any).proponente || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.bancoNome}</td>
                    <td className="px-3 py-2 text-gray-600">{p.parceiroNome}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-medium ${((p as any).dias || 0) > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                        {(p as any).dias ?? '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{(p as any).responsavelNome || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>}
      </div>

      {/* ── Processos do Analista (full-width) ── */}
      {podeMeusProcessos && <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Processos do Analista</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-4 py-2 text-left">N</th>
                <th className="px-4 py-2 text-left">Proponente</th>
                <th className="px-4 py-2 text-left">Banco</th>
                <th className="px-4 py-2 text-left">Parceiro</th>
                <th className="px-4 py-2 text-left">Etapa</th>
                <th className="px-4 py-2 text-center">Dias</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {meusProcessos.isLoading && (
                <tr><td colSpan={6} className="py-6 text-center"><Spinner size={16} /></td></tr>
              )}
              {!meusProcessos.isLoading && (meusProcessos.data || []).length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">Nenhum processo atribuído a você</td></tr>
              )}
              {(meusProcessos.data || []).map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/financiamento/processos/${p.id}`} className="text-blue-600 hover:underline font-medium">
                      #{p.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-800 font-medium">{p.proponente || '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{p.bancoNome || '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{p.parceiroNome || '-'}</td>
                    <td className="px-4 py-2">
                      <Badge label={p.etapaNome || 'N/A'} />
                    </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`font-medium ${(p.dias || 0) > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                      {p.dias ?? '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {/* ── Modais ── */}
      {podeCriarPreAnalise && (
        <Modal title="Nova Pré-Análise" open={modalPreAnalise} onClose={() => setModalPreAnalise(false)} size="lg">
          <NovaPreAnalise onClose={() => setModalPreAnalise(false)} />
        </Modal>
      )}
{tarefaDetalhe && (        <Modal title={`Tarefa #${tarefaDetalhe.id}`} open={!!tarefaDetalhe} onClose={() => setTarefaDetalhe(null)}>          <div className="space-y-3">            <div><strong>Solicitante:</strong> {tarefaDetalhe.solicitanteNome || tarefaDetalhe.solicitanteId}</div>            {tarefaDetalhe.processoNumProposta && <div><strong>Nº Proposta:</strong> {tarefaDetalhe.processoNumProposta}</div>}            {tarefaDetalhe.processoId ? <div><strong>Processo:</strong> #{tarefaDetalhe.processoId}</div> : <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm">Sem vínculo com processo/proposta. A tarefa deve ser resolvida até a data limite informada.</div>}            <div><strong>Data:</strong> {new Date(tarefaDetalhe.criadoEm).toLocaleDateString("pt-BR")}</div>            {tarefaDetalhe.dataLimite && <div><strong>Limite:</strong> {new Date(tarefaDetalhe.dataLimite).toLocaleDateString("pt-BR")}</div>}            <div><strong>Solicitacao:</strong></div>            <p className="bg-gray-50 p-3 rounded text-gray-700">{tarefaDetalhe.solicitacao}</p>            {tarefaDetalhe.acompanhamento && (<>              <div><strong>Acompanhamento:</strong></div>              <p className="bg-gray-50 p-3 rounded text-gray-700">{tarefaDetalhe.acompanhamento}</p>            </>)}            <div className="flex justify-end"><Btn variant="ghost" onClick={() => setTarefaDetalhe(null)}>Fechar</Btn></div>          </div>        </Modal>      )}

      {modalResponderTarefa && (
        <Modal title={`Responder Tarefa #${modalResponderTarefa.id}`} open={!!modalResponderTarefa} onClose={() => setModalResponderTarefa(null)}>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Solicitação</div>
              <p className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{modalResponderTarefa.solicitacao}</p>
            </div>
            {modalResponderTarefa.processoId && (
              <div className="text-sm text-gray-600">
                <strong>Processo:</strong> #{modalResponderTarefa.processoId}
              </div>
            )}
            {modalResponderTarefa.processoNumProposta && (
              <div className="text-sm text-gray-600">
                <strong>Nº Proposta:</strong> {modalResponderTarefa.processoNumProposta}
              </div>
            )}
            {!modalResponderTarefa.processoId && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Esta tarefa não está vinculada a um processo. Use a data limite como prazo para resolver a pendência.
              </div>
            )}
            {isTarefaEncaminhamento(modalResponderTarefa) ? (
              <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                Este é um encaminhamento de processo. Ao aceitar, o processo passa a ficar sob sua responsabilidade.
                Ao recusar, a tarefa será encerrada com a sua observação.
              </div>
            ) : (
              <Select
                label="Status da tarefa"
                value={respostaTarefaStatus}
                onChange={e => setRespostaTarefaStatus(e.target.value as 'Pendente' | 'Resolvida')}
                options={[
                  { value: 'Pendente', label: 'Pendente' },
                  { value: 'Resolvida', label: 'Resolvida' },
                ]}
              />
            )}
            <Textarea
              label={isTarefaEncaminhamento(modalResponderTarefa) ? 'Observação' : 'Resposta / observação *'}
              value={respostaTarefaTexto}
              onChange={e => setRespostaTarefaTexto(e.target.value)}
              rows={4}
              placeholder="Explique o que foi feito, o que ainda falta ou por que a tarefa continua pendente..."
            />
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setModalResponderTarefa(null)}>Cancelar</Btn>
              {isTarefaEncaminhamento(modalResponderTarefa) ? (
                <>
                  <Btn
                    variant="danger"
                    loading={responderEncaminhamento.isPending}
                    onClick={() => responderEncaminhamentoProcesso('Recusar')}>
                    Recusar
                  </Btn>
                  <Btn
                    variant="success"
                    loading={responderEncaminhamento.isPending}
                    onClick={() => responderEncaminhamentoProcesso('Aceitar')}>
                    Aceitar
                  </Btn>
                </>
              ) : (
                <Btn loading={concluirTarefa.isPending} disabled={!respostaTarefaTexto.trim()} onClick={salvarRespostaTarefa}>
                  Salvar resposta
                </Btn>
              )}
            </div>
          </div>
        </Modal>
      )}

      {podeTarefasHome && (
        <Modal title="Nova Tarefa" open={modalTarefa} onClose={() => setModalTarefa(false)}>
          <NovaTarefa onClose={() => setModalTarefa(false)} />
        </Modal>
      )}

      {podeAnaliseCoban && (
        <Modal title="Atribuir Responsavel" open={modalAtribuir} onClose={() => setModalAtribuir(false)}>
          <AtribuirResponsavel processoId={processoSelecionado} onClose={() => { setModalAtribuir(false); setProcessoSelecionado(null) }} />
        </Modal>
      )}
      {podeEditarPreAnalise && modalEditarPA && (
        <Modal title={`Resolver Pre-Analise: ${modalEditarPA.nome}`} open={true} onClose={() => setModalEditarPA(null)} size="lg">
          <ResolverPreAnalise item={modalEditarPA} onClose={() => setModalEditarPA(null)} modoExterno={isExterno} />
        </Modal>
      )}
    </div>
  )
}

// ── Nova Pré-Análise form ──
function NovaPreAnalise({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({ bancos: '', nome: '', cpfCnpj: '', dataNascimento: '', valorFinanciamento: '', estadoCivil: 'Solteiro', cep: '' })
  const [bancosSel, setBancosSel] = useState<string[]>([])
  const bancosPermitidos = trpc.preAnalise.bancosPermitidos.useQuery()
  const bancosPreAnalise: string[] = (bancosPermitidos.data || []).map((b: { nome: string }) => b.nome)

  const criar = trpc.preAnalise.criar.useMutation({
    onSuccess: () => { utils.preAnalise.listar.invalidate(); onClose() }
  })

  const toggleBanco = (b: string) => setBancosSel(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Banco(s)</label>
        <div className="flex gap-3">
          {bancosPermitidos.isLoading && <span className="text-sm text-gray-400">Carregando bancos...</span>}
          {!bancosPermitidos.isLoading && bancosPreAnalise.length === 0 && (
            <span className="text-sm text-amber-700">Nenhum banco vinculado ao cadastro deste parceiro.</span>
          )}
          {bancosPreAnalise.map(b => (
            <label key={b} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={bancosSel.includes(b)} onChange={() => toggleBanco(b)} className="rounded" />
              {b}
            </label>
          ))}
        </div>
      </div>
      {criar.error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{criar.error.message}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
        <Input label="CPF/CNPJ" mask="cpfCnpj" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} />
        <Input label="Data Nascimento" type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} />
        <Input label="Valor Financiamento" value={form.valorFinanciamento} onChange={e => setForm(f => ({ ...f, valorFinanciamento: e.target.value }))} placeholder="0,00" />
        <Select label="Estado Civil" value={form.estadoCivil} onChange={e => setForm(f => ({ ...f, estadoCivil: e.target.value }))}
          options={[{ value: 'Solteiro', label: 'Solteiro' }, { value: 'Casado', label: 'Casado' }]} />
        <Input label="CEP" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!bancosSel.length} loading={criar.isPending} onClick={() => { var cleaned = { ...form, bancos: bancosSel.join(',') }; Object.keys(cleaned).forEach(function(k) { if ((cleaned as any)[k] === '') (cleaned as any)[k] = undefined; }); if (cleaned.valorFinanciamento) cleaned.valorFinanciamento = String(cleaned.valorFinanciamento).replace(',','.'); criar.mutate(cleaned as any); }}>Salvar</Btn>
      </div>
    </div>
  )
}

// ── Nova Tarefa form ──
function NovaTarefa({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const { isExterno } = usePermissoes()
  const usuarios = trpc.cadastros.usuarios.listar.useQuery()
  const usuariosExecutantes = (usuarios.data || []).filter((u: any) =>
    !isExterno || ['Administrador', 'Gerente', 'Analista'].includes(u.perfil)
  )
  const [form, setForm] = useState({ executanteId: 0, processoId: 0, propostaBusca: '', solicitacao: '', dataLimite: '' })
  const [erroTarefa, setErroTarefa] = useState('')
  const propostaBusca = form.propostaBusca.trim()
  const processosBusca = trpc.processos.listar.useQuery(
    { pagina: 1, busca: propostaBusca },
    { enabled: propostaBusca.length >= 2 }
  )
  const processosEncontrados = processosBusca.data?.lista || []
  const processoSelecionado = processosEncontrados.find((p: any) => p.id === form.processoId)

  const criar = trpc.tarefas.criar.useMutation({
    onSuccess: () => { utils.tarefas.minhasTarefas.invalidate(); onClose() },
    onError: (err) => setErroTarefa(err.message),
  })

  const salvarTarefa = () => {
    setErroTarefa('')
    if (!form.executanteId || !form.solicitacao.trim()) {
      setErroTarefa('Preencha o usuário e a solicitação da tarefa.')
      return
    }
    if (!form.processoId && !form.dataLimite) {
      setErroTarefa('Por favor, coloque a data limite para a resolução dessa tarefa quando ela não estiver vinculada a uma proposta.')
      return
    }
    criar.mutate({
      executanteId: form.executanteId,
      processoId: form.processoId || undefined,
      solicitacao: form.solicitacao.trim(),
      dataLimite: form.dataLimite || undefined,
    })
  }

  return (
    <div className="space-y-4">
      {erroTarefa && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erroTarefa}</div>}
      <Select label="Usuario" value={form.executanteId} onChange={e => setForm(f => ({ ...f, executanteId: Number(e.target.value) }))}
        placeholder="Selecione..."
        options={usuariosExecutantes.map((u: any) => ({ value: u.id, label: u.nome }))} />
      <div className="space-y-2">
        <Input
          label="Nº da proposta"
          value={form.propostaBusca}
          onChange={e => setForm(f => ({ ...f, propostaBusca: e.target.value, processoId: 0 }))}
          placeholder="Digite o número da proposta para pesquisar..."
        />
        {form.processoId ? (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            Vinculado ao processo #{form.processoId}{processoSelecionado?.numProposta ? ` - Proposta ${processoSelecionado.numProposta}` : ''}.
          </div>
        ) : (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Se a tarefa não for vinculada a uma proposta, informe a Data Limite para resolução.
          </div>
        )}
        {propostaBusca.length >= 2 && !form.processoId && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {processosBusca.isLoading && <div className="px-3 py-2 text-xs text-gray-500">Pesquisando proposta...</div>}
            {!processosBusca.isLoading && processosEncontrados.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">Nenhuma proposta encontrada. Você ainda pode salvar sem vínculo, informando a Data Limite.</div>
            )}
            {!processosBusca.isLoading && processosEncontrados.slice(0, 5).map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, processoId: p.id, propostaBusca: p.numProposta || String(p.id) }))}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-t first:border-t-0"
              >
                <span className="font-semibold text-gray-800">{p.numProposta ? `Proposta ${p.numProposta}` : `Processo #${p.id}`}</span>
                <span className="text-gray-500"> - Processo #{p.id}{p.compradorNome ? ` - ${p.compradorNome}` : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Input label="Solicitacao" value={form.solicitacao} onChange={e => setForm(f => ({ ...f, solicitacao: e.target.value }))} placeholder="Descreva a tarefa..." />
      <Input label="Data Limite" type="date" value={form.dataLimite} onChange={e => setForm(f => ({ ...f, dataLimite: e.target.value }))} />
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={criar.isPending} onClick={salvarTarefa}>Salvar</Btn>
      </div>
    </div>
  )
}

// ── Atribuir Responsavel form ──
function AtribuirResponsavel({ processoId, onClose }: { processoId: number | null; onClose: () => void }) {
  const utils = trpc.useUtils()
  const usuarios = trpc.cadastros.usuarios.listar.useQuery()
  const [usuarioId, setUsuarioId] = useState(0)

  const atribuir = trpc.processos.atribuirResponsavel.useMutation({
    onSuccess: () => { utils.processos.analiseCoban.invalidate(); onClose() }
  })

  if (!processoId) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Atribuir responsavel ao processo <strong>#{processoId}</strong></p>
      <Select
        label="Responsavel"
        value={usuarioId}
        onChange={e => setUsuarioId(Number(e.target.value))}
        placeholder="Selecione o usuario..."
        options={(usuarios.data || []).map(u => ({ value: u.id, label: u.nome }))}
      />
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={atribuir.isPending} onClick={() => atribuir.mutate({ processoId, responsavelId: usuarioId })}>Atribuir</Btn>
      </div>
    </div>
  )
}

function ResolverPreAnalise({ item, onClose, modoExterno = false }: { item: any; onClose: () => void; modoExterno?: boolean }) {
  const utils = trpc.useUtils()
  const navigate = useNavigate()
  const { pode } = usePermissoes()
  const podeReenviarSolicitante = modoExterno && preAnalisePodeReenviarSolicitante(item)
  const podeCriarProcesso = pode('processo:criar')
  const podeAbrirProcesso = pode('menu:processos') || pode('processo:editar') || pode('processo:ver_todos') || podeCriarProcesso
  const aptoSemProcesso = normalizarSituacao(item.situacao) === 'apto' && !item.processoId
  const podeConcluirSolicitante = modoExterno && preAnalisePodeConcluirSolicitante(item.situacao) && !aptoSemProcesso
  const podeCriarProcessoDaPreAnalise = aptoSemProcesso && podeCriarProcesso
  const [form, setForm] = useState({
    situacao: item.situacao || 'Em analise',
    observacao: item.observacao || '',
    retorno: item.retorno || '',
    permitirReenvio: item.permitirReenvio || false,
  })
  const atualizar = trpc.preAnalise.atualizar.useMutation({
    onSuccess: () => { utils.preAnalise.listar.invalidate(); onClose() }
  })
  const criarProcessoPreAnalise = trpc.processos.criarDaPreAnalise.useMutation({
    onSuccess: async (d) => {
      await utils.preAnalise.listar.invalidate()
      onClose()
      navigate(`/financiamento/processos/${d.id}`)
    },
  })
  const SITUACOES_PA = ['Em análise', 'Aguardando análise', 'Apto', 'Não apto']
  const concluirSolicitante = () => {
    atualizar.mutate({ id: item.id, situacao: 'Concluída', observacao: form.observacao })
  }
  const reenviarSolicitante = () => {
    atualizar.mutate({ id: item.id, situacao: 'Aguardando análise', observacao: form.observacao })
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div><span className="text-gray-500">Nome:</span> <strong>{item.nome}</strong></div>
        <div><span className="text-gray-500">CPF/CNPJ:</span> <strong>{formatCpfCnpj(item.cpfCnpj)}</strong></div>
        <div><span className="text-gray-500">Banco:</span> {item.bancos}</div>
        <div><span className="text-gray-500">Valor:</span> R$ {Number(item.valorFinanciamento || 0).toLocaleString('pt-BR')}</div>
        <div><span className="text-gray-500">Estado Civil:</span> {item.estadoCivil || '-'}</div>
        <div><span className="text-gray-500">CEP:</span> {item.cep || '-'}</div>
      </div>
      {!modoExterno && (
        <>
          <Select label="Situacao" value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))}
            options={SITUACOES_PA.map(s => ({ value: s, label: s }))} />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Retorno do Banco</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.retorno}
              onChange={e => setForm(f => ({ ...f, retorno: e.target.value }))} placeholder="Resposta do banco..." />
          </div>
        </>
      )}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Observacao</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.observacao}
          onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
      </div>
      {!modoExterno && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.permitirReenvio} onChange={e => setForm(f => ({ ...f, permitirReenvio: e.target.checked }))} className="rounded" />
          Permitir reenvio
        </label>
      )}
      {modoExterno && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {podeCriarProcessoDaPreAnalise
            ? 'Esta pré-análise está apta. Você pode criar a proposta agora; se não criar, ela continuará aqui até a proposta ser iniciada.'
            : podeConcluirSolicitante
            ? 'Confira o retorno da Amarante. Se estiver tudo certo, conclua para tirar esta pré-análise da sua Home.'
            : 'Esta pré-análise ainda está em análise pela Amarante.'}
          {podeReenviarSolicitante && (
            <p className="mt-1">Como o reenvio foi liberado, você também pode ajustar a observação e reenviar para análise.</p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        {item.processoId && podeAbrirProcesso && (
          <Btn icon={<ExternalLink size={14} />} onClick={() => navigate(`/financiamento/processos/${item.processoId}`)}>
            Abrir proposta #{item.processoId}
          </Btn>
        )}
        {podeCriarProcessoDaPreAnalise && (
          <Btn icon={<FilePlus size={14} />} loading={criarProcessoPreAnalise.isPending} onClick={() => criarProcessoPreAnalise.mutate({ preAnaliseId: item.id })}>
            Criar proposta
          </Btn>
        )}
        {modoExterno ? (
          <>
            {podeReenviarSolicitante && (
              <Btn variant="ghost" loading={atualizar.isPending} onClick={reenviarSolicitante}>
                Reenviar
              </Btn>
            )}
            {podeConcluirSolicitante ? (
              <Btn loading={atualizar.isPending} onClick={concluirSolicitante}>
                Concluir
              </Btn>
            ) : (
              <Btn loading={atualizar.isPending} onClick={() => atualizar.mutate({ id: item.id, observacao: form.observacao })}>
                Salvar
              </Btn>
            )}
          </>
        ) : (
          <Btn
            loading={atualizar.isPending}
            onClick={() => atualizar.mutate({ id: item.id, ...form })}
          >
            Salvar
          </Btn>
        )}
      </div>
    </div>
  )
}
