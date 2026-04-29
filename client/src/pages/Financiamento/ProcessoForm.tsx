import { usePermissoes } from '../../lib/permissoes'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { getStoredAuthToken } from '../../lib/auth-storage'
import { Input, Select, Textarea, Btn, Card, Spinner, Alert, Badge, Table } from '../../components/ui'
import { formatCpfCnpj } from '../../lib/documento'
import { ArrowLeft, Save, Printer, CheckCircle, Upload, Plus, MessageSquare, Trash2, FileText, AlertTriangle } from 'lucide-react'
import {
  type Aba,
  EMPTY_HISTORICO_FORM,
  EMPTY_IMOVEL_FORM,
  EMPTY_TAREFA_FORM,
  PROCESSO_FORM_ABAS,
  PROCESSO_FORM_CURRENCY_FIELDS,
  PROCESSO_FORM_DECIMAL_FIELDS,
  PROCESSO_FORM_DOCUMENTO_CATEGORIAS_COMPRADOR,
  PROCESSO_FORM_DOCUMENTO_CATEGORIAS_VENDEDOR,
  PROCESSO_FORM_INTERNAL_ONLY_FIELDS,
  PROCESSO_FORM_PERCENT_FIELDS,
  PROCESSO_FORM_PRINT_STYLES,
  PROCESSO_FORM_REVISOR_PERFIS,
  PROCESSO_FORM_SECOES_DOC,
  PROCESSO_FORM_TAREFA_STATUS,
} from './processo-form/constants'
import {
  buildDocumentoUrl,
  filtrarDocumentosPorSecao,
  formatCurrencyBr,
  formatDateBr,
  formatDateTimeBr,
  formatDecimalBr,
  parseDecimalBr,
} from './processo-form/utils'
import { RelatorioImpressao } from './processo-form/RelatorioImpressao'
import { DocumentoPreview } from './processo-form/DocumentoPreview'
import { ModalNovoAtendimento } from './processo-form/ModalNovoAtendimento'
import { ModalConcluirEtapa } from './processo-form/ModalConcluirEtapa'
import { ModalPendenteEtapa } from './processo-form/ModalPendenteEtapa'
import { ModalNovaTarefa } from './processo-form/ModalNovaTarefa'
import { ModalReprovarDocumento } from './processo-form/ModalReprovarDocumento'
import { ModalAtendimentoObrigatorio } from './processo-form/ModalAtendimentoObrigatorio'
import { ModalHistorico } from './processo-form/ModalHistorico'
import { ModalIncluirCliente } from './processo-form/ModalIncluirCliente'
import { ModalIncluirImovel } from './processo-form/ModalIncluirImovel'
import { ModalObsEtapa } from './processo-form/ModalObsEtapa'

const PROCESSO_FORM_ABAS_CADASTRO_INICIAL = new Set<Aba>(['dadosGerais', 'valores', 'comprador', 'vendedor', 'imovel'])

export function ProcessoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdicao = Boolean(id && id !== 'novo')
  const { pode, parceiroId: meuParceiroId, perfil, isExterno } = usePermissoes()
  const podeSalvarProcesso = isEdicao ? pode('processo:editar') : pode('processo:criar')
  const podeGerenciarProcesso = isEdicao ? pode('processo:editar') : pode('processo:criar')
  const [aba, setAba] = useState<Aba>('dadosGerais')
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modalNovaObs, setModalNovaObs] = useState(false)
  const [novaObs, setNovaObs]           = useState('')
  const [atendimentoAlteracaoPendente, setAtendimentoAlteracaoPendente] = useState(false)
  const [modalAtendimentoObrigatorio, setModalAtendimentoObrigatorio] = useState(false)
  const [atendimentoObrigatorioTexto, setAtendimentoObrigatorioTexto] = useState('')
  const [saidaPendente, setSaidaPendente] = useState<string|null>(null)
  const visualizacaoRegistradaRef = useRef<number|null>(null)

  // --- Comprador/Vendedor modals ---
  const [modalComprador, setModalComprador] = useState(false)
  const [modalVendedor, setModalVendedor]   = useState(false)
  const [buscaCliente, setBuscaCliente]     = useState('')
  const [clienteManualNome, setClienteManualNome] = useState('')
  const [clienteManualCpf, setClienteManualCpf]   = useState('')
  const [modoManual, setModoManual]               = useState(false)

  // --- Imóvel modal ---
  const [modalImovel, setModalImovel]         = useState(false)
  const [buscaImovel, setBuscaImovel]         = useState('')
  const [modoManualImovel, setModoManualImovel] = useState(false)
  const [imovelForm, setImovelForm] = useState(EMPTY_IMOVEL_FORM)

  // --- Etapa modals ---
  const [modalObsEtapa, setModalObsEtapa] = useState(false)
  const [etapaObsTarget, setEtapaObsTarget] = useState<{processoId:number;etapaId:number}|null>(null)
  const [etapaObsTexto, setEtapaObsTexto]   = useState('')

  // --- Concluir Etapa modal ---
  const [modalConcluirEtapa, setModalConcluirEtapa] = useState(false)
  const [concluirEtapaTarget, setConcluirEtapaTarget] = useState<{processoId:number;etapaId:number}|null>(null)
  const [concluirEtapaObs, setConcluirEtapaObs] = useState('')
  const [proximoResponsavelEtapaId, setProximoResponsavelEtapaId] = useState(0)
  const [modalPendenteEtapa, setModalPendenteEtapa] = useState(false)
  const [pendenteEtapaTarget, setPendenteEtapaTarget] = useState<{processoId:number;etapaId:number}|null>(null)
  const [pendenteEtapaObs, setPendenteEtapaObs] = useState('')

  // --- Tarefa modal ---
  const [modalTarefa, setModalTarefa]   = useState(false)
  const [tarefaForm, setTarefaForm]     = useState(EMPTY_TAREFA_FORM)
  const [filtroStatusTarefa, setFiltroStatusTarefa] = useState<string|null>(null)

  // --- Pendência ---
  const [novaPendencia, setNovaPendencia] = useState('')

  // --- Histórico modal ---
  const [modalHistorico, setModalHistorico] = useState(false)
  const [historicoForm, setHistoricoForm] = useState(EMPTY_HISTORICO_FORM)

  // --- Documentação: status e recusa ---
  const [reprovarModal, setReprovarModal] = useState<{id:number,nome:string}|null>(null)
  const [reprovarMotivo, setReprovarMotivo] = useState('')
  const [documentoPreview, setDocumentoPreview] = useState<{nome:string; url:string}|null>(null)
  const marcarAlteracaoAtendimento = (opcoes?: { exigirAgora?: boolean; irParaAtendimento?: boolean }) => {
    if (!isEdicao || isExterno) return
    setAtendimentoAlteracaoPendente(true)
    if (opcoes?.irParaAtendimento) setAba('atendimento')
    if (opcoes?.exigirAgora) setModalAtendimentoObrigatorio(true)
  }
  const aprovarDoc = trpc.processos.aprovarDocumento.useMutation({ onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}) } })
  const reprovarDoc = trpc.processos.reprovarDocumento.useMutation({ onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); setReprovarModal(null); setReprovarMotivo('') } })
  const isRevisor = PROCESSO_FORM_REVISOR_PERFIS.includes(perfil as (typeof PROCESSO_FORM_REVISOR_PERFIS)[number])
  // --- Documentação: seção selecionada para upload ---
  const [uploadSecao, setUploadSecao] = useState('Formulários')

  const [form, setForm] = useState({
    bancoId:0, agenciaId:0, modalidadeId:0, fluxoId:0, situacaoId:0,
    encaminhamento:'', responsavelId:0, dataEmissaoContrato:'', dataAssinatura:'',
    dataPagtoVendedor:'', dataRemuneracao:'', dataPagtoComissao:'', numProposta:'', numContrato:'',
    observacao:'', reprovado:false, pausado:false,
    valorCompraVenda:formatCurrencyBr(0), valorAvaliacao:formatCurrencyBr(0), valorRecursoProprio:formatCurrencyBr(0),
    valorSubsidio:formatCurrencyBr(0), valorFgts:formatCurrencyBr(0), valorIq:formatCurrencyBr(0),
    valorFinanciado:formatCurrencyBr(0), valorParcela:formatCurrencyBr(0), numeroParcelas:0,
    valorDespesas:formatCurrencyBr(0), remuneracaoPerc:'0,00', remuneracaoValor:formatCurrencyBr(0),
    taxa:'0,00', tipoAmortizacao:'PRICE' as 'SAC'|'PRICE', tipoImovel:'Novo' as 'Novo'|'Usado',
    parceiroId:0, corretorId:0, imobiliariaId:0, construtoraId:0,
    compradoresIds:[] as number[], vendedoresIds:[] as number[], imoveisIds:[] as number[],
  })

  const parceiroAtivo = form.parceiroId || meuParceiroId || 0
  const bancosAll    = trpc.cadastros.bancos.listar.useQuery()
  const bancosParceiro = trpc.cadastros.bancos.listarPorParceiro.useQuery({ parceiroId: parceiroAtivo }, { enabled: !!parceiroAtivo })
  const bancos       = parceiroAtivo ? bancosParceiro : bancosAll
  const bancoSelecionado = (bancos.data || []).find((b: any) => b.id === form.bancoId)
  const agencias    = trpc.cadastros.agencias.listar.useQuery({ bancoId: form.bancoId || undefined })
  const modalidadesBanco = trpc.cadastros.bancos.modalidadesVinculadas.useQuery(
    { bancoId: form.bancoId },
    { enabled: !!form.bancoId }
  )
  const modalidades = trpc.cadastros.modalidades.listar.useQuery()
  const fluxos      = trpc.cadastros.fluxos.listar.useQuery()
  const situacoes   = trpc.cadastros.situacoes.listar.useQuery()
  const usuarios    = trpc.cadastros.usuarios.listar.useQuery()
  const parceiros   = trpc.cadastros.parceiros.listar.useQuery()
  const corretores  = trpc.cadastros.corretores.listar.useQuery()
  const imobiliarias = trpc.cadastros.imobiliarias.listar.useQuery()
  const construtoras = trpc.cadastros.construtoras.listar.useQuery()

  // Busca de clientes para compradores/vendedores
  const clientesCompradores = trpc.clientes.listar.useQuery(
    { tipo: 'Comprador', busca: buscaCliente || undefined, pagina: 1 },
    { enabled: modalComprador && buscaCliente.length >= 2 }
  )
  const clientesVendedores = trpc.clientes.listar.useQuery(
    { tipo: 'Vendedor', busca: buscaCliente || undefined, pagina: 1 },
    { enabled: modalVendedor && buscaCliente.length >= 2 }
  )

  // Busca de imóveis
  const imoveisListAll = trpc.cadastros.imoveis.listar.useQuery()

  const processo = trpc.processos.buscar.useQuery({ id: Number(id) }, { enabled: isEdicao })
  const utils    = trpc.useUtils()

  // Histórico com join de usuario
  const historicoData = trpc.processos.historico.listar.useQuery(
    { processoId: Number(id) },
    { enabled: isEdicao }
  )

  // Documentos tipos por fluxo (checklist)
  const docTiposPorFluxo = trpc.processos.documentosTiposPorFluxo.useQuery(
    { fluxoId: form.fluxoId },
    { enabled: form.fluxoId > 0 }
  )

  const criar    = trpc.processos.criar.useMutation({ onSuccess: (d) => navigate(`/financiamento/processos/${d.id}`) })
  const atualizar = trpc.processos.atualizar.useMutation({
    onSuccess: () => {
      marcarAlteracaoAtendimento({ exigirAgora: true, irParaAtendimento: true })
      setSucesso('Salvo!')
      setTimeout(()=>setSucesso(''),3000)
      utils.processos.buscar.invalidate({id:Number(id)})
    },
    onError: (err) => setErro(err.message),
  })
  const addAtendimento = trpc.processos.adicionarAtendimento.useMutation({ onSuccess: () => { setAtendimentoAlteracaoPendente(false); utils.processos.buscar.invalidate({id:Number(id)}); setNovaObs(''); setModalNovaObs(false) }})
  const registrarVisualizacao = trpc.processos.registrarVisualizacao.useMutation({ onSuccess: () => utils.processos.buscar.invalidate({id:Number(id)}) })
  const avancarEtapa = trpc.processos.avancarEtapa.useMutation({
    onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setSucesso('Etapa concluida!'); setTimeout(()=>setSucesso(''),3000); setModalConcluirEtapa(false); setConcluirEtapaObs(''); setProximoResponsavelEtapaId(0) },
    onError: (err) => setErro(err.message),
  })
  const reabrirEtapa = trpc.processos.reabrirEtapa.useMutation({
    onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setSucesso('Etapa reaberta!'); setTimeout(()=>setSucesso(''),3000) },
    onError: (err) => setErro(err.message),
  })
  const marcarEtapaPendente = trpc.processos.marcarEtapaPendente.useMutation({
    onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setSucesso('Etapa marcada como pendente!'); setTimeout(()=>setSucesso(''),3000); setModalPendenteEtapa(false); setPendenteEtapaObs('') },
    onError: (err) => setErro(err.message),
  })
  const atualizarObsEtapa = trpc.processos.atualizarObsEtapa.useMutation({ onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); setModalObsEtapa(false); setEtapaObsTexto('') }})
  const criarCliente = trpc.clientes.criar.useMutation()
  const criarImovel  = trpc.cadastros.imoveis.criar.useMutation()
  const criarTarefa  = trpc.tarefas.criar.useMutation({ onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); setModalTarefa(false); setTarefaForm(EMPTY_TAREFA_FORM) }})
  const adicionarDocumento = trpc.processos.adicionarDocumento.useMutation({
    onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}) },
    onError: (err) => setErro(err.message),
  })
  const excluirDocumento   = trpc.processos.excluirDocumento.useMutation({
    onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}) },
    onError: (err) => setErro(err.message),
  })
  const registrarPendencia = trpc.processos.registrarPendencia.useMutation({ onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.buscar.invalidate({id:Number(id)}); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setNovaPendencia(''); setSucesso('Pendencia registrada!'); setTimeout(()=>setSucesso(''),3000) }})
  const criarHistorico = trpc.processos.historico.criar.useMutation({ onSuccess: () => { marcarAlteracaoAtendimento(); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setModalHistorico(false); setHistoricoForm(EMPTY_HISTORICO_FORM) }})
  const setProponente = trpc.processos.setProponente.useMutation({
    onSuccess: () => {
      marcarAlteracaoAtendimento({ exigirAgora: true, irParaAtendimento: true })
      utils.processos.buscar.invalidate({id:Number(id)})
    }
  })
  const adicionarVendedorProcesso = trpc.processos.adicionarVendedor.useMutation({
    onSuccess: () => {
      marcarAlteracaoAtendimento({ exigirAgora: true, irParaAtendimento: true })
      utils.processos.buscar.invalidate({id:Number(id)})
      utils.processos.historico.listar.invalidate({processoId:Number(id)})
      setModalVendedor(false); setBuscaCliente(''); setModoManual(false)
    },
    onError: (err) => setErro(err.message),
  })
  const adicionarImovelProcesso = trpc.processos.adicionarImovel.useMutation({
    onSuccess: () => {
      marcarAlteracaoAtendimento({ exigirAgora: true, irParaAtendimento: true })
      utils.processos.buscar.invalidate({id:Number(id)})
      utils.processos.historico.listar.invalidate({processoId:Number(id)})
      setModalImovel(false); setBuscaImovel(''); setModoManualImovel(false)
    },
    onError: (err) => setErro(err.message),
  })

  useEffect(() => {
    if (processo.data) {
      const p = processo.data
      setForm(f => ({
        ...f,
        bancoId: p.bancoId||0, agenciaId: p.agenciaId||0,
        modalidadeId: p.modalidadeId||0, fluxoId: p.fluxoId||0,
        situacaoId: p.situacaoId||0, encaminhamento: p.encaminhamento||'',
        responsavelId: p.responsavelId||0,
        dataEmissaoContrato: p.dataEmissaoContrato ? String(p.dataEmissaoContrato).substring(0,10) : '',
        dataAssinatura: p.dataAssinatura ? String(p.dataAssinatura).substring(0,10) : '',
        dataPagtoVendedor: p.dataPagtoVendedor ? String(p.dataPagtoVendedor).substring(0,10) : '',
        dataRemuneracao: p.dataRemuneracao ? String(p.dataRemuneracao).substring(0,10) : '',
        dataPagtoComissao: p.dataPagtoComissao ? String(p.dataPagtoComissao).substring(0,10) : '',
        numProposta: p.numProposta||'', numContrato: p.numContrato||'',
        observacao: p.observacao||'', reprovado: p.reprovado||false,
        valorCompraVenda: formatCurrencyBr(p.valorCompraVenda), valorAvaliacao: formatCurrencyBr(p.valorAvaliacao),
        valorRecursoProprio: formatCurrencyBr(p.valorRecursoProprio), valorSubsidio: formatCurrencyBr(p.valorSubsidio),
        valorFgts: formatCurrencyBr(p.valorFgts), valorIq: formatCurrencyBr(p.valorIq),
        valorFinanciado: formatCurrencyBr(p.valorFinanciado), valorParcela: formatCurrencyBr(p.valorParcela),
        numeroParcelas: p.numeroParcelas||0,
        valorDespesas: formatCurrencyBr((p as any).valorDespesas),
        remuneracaoPerc: formatDecimalBr((p as any).remuneracaoPerc),
        remuneracaoValor: formatCurrencyBr((p as any).remuneracaoValor),
        taxa: formatDecimalBr((p as any).taxa),
        tipoAmortizacao: ((p as any).tipoAmortizacao || 'PRICE') as 'SAC'|'PRICE',
        tipoImovel: ((p as any).tipoImovel || 'Novo') as 'Novo'|'Usado',
        parceiroId: p.parceiroId||0, corretorId: p.corretorId||0,
        imobiliariaId: p.imobiliariaId||0, construtoraId: p.construtoraId||0,
        compradoresIds: (p.compradores||[]).map((c: any) => c.cliente?.id).filter(Boolean) as number[],
        vendedoresIds: (p.vendedores||[]).map((v: any) => v.cliente?.id).filter(Boolean) as number[],
        imoveisIds: (p.imoveis||[]).map((i: any) => i.imovel?.id).filter(Boolean) as number[],
      }))
    }
  }, [processo.data])

  useEffect(() => {
    const encaminhamentoBanco = bancoSelecionado?.encaminhamento || ''
    setForm((prev) => {
      if (prev.encaminhamento === encaminhamentoBanco) return prev
      return { ...prev, encaminhamento: encaminhamentoBanco }
    })
  }, [bancoSelecionado?.encaminhamento])

  useEffect(() => {
    const processoId = Number(id)
    if (!isEdicao || isExterno || !processo.data || visualizacaoRegistradaRef.current === processoId) return
    visualizacaoRegistradaRef.current = processoId
    registrarVisualizacao.mutate({ processoId })
  }, [id, isEdicao, isExterno, processo.data])

  useEffect(() => {
    if (!isEdicao || isExterno) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!atendimentoAlteracaoPendente) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [atendimentoAlteracaoPendente, isEdicao, isExterno])

  const modalidadeIdsDoBanco = new Set((modalidadesBanco.data || []).map((item: any) => Number(item.modalidadeId)))
  const modalidadesFiltradas = form.bancoId
    ? (modalidades.data || []).filter((modalidade: any) => modalidadeIdsDoBanco.has(Number(modalidade.id)))
    : []
  const fluxoIdsDoBanco = new Set((modalidadesBanco.data || []).map((item: any) => Number(item.fluxoId)).filter(Boolean))
  const fluxosFiltrados = (fluxos.data || []).filter((fluxo: any) => fluxoIdsDoBanco.has(Number(fluxo.id)))
  const modalidadeSelecionada = modalidadesFiltradas.find((modalidade: any) => Number(modalidade.id) === Number(form.modalidadeId))

  useEffect(() => {
    if (!form.bancoId) {
      setForm((prev) => {
        if (!prev.agenciaId && !prev.modalidadeId && !prev.fluxoId) return prev
        return { ...prev, agenciaId: 0, modalidadeId: 0, fluxoId: 0 }
      })
      return
    }

    if (!modalidadesBanco.data) return

    setForm((prev) => {
      const updates: Record<string, any> = {}

      const agenciaAindaValida = !prev.agenciaId || (agencias.data || []).some((agencia: any) => Number(agencia.id) === Number(prev.agenciaId))
      if (!agenciaAindaValida) updates.agenciaId = 0

      const modalidadeAindaValida = !prev.modalidadeId || modalidadeIdsDoBanco.has(Number(prev.modalidadeId))
      if (!modalidadeAindaValida) {
        updates.modalidadeId = 0
        updates.fluxoId = 0
      } else if (prev.modalidadeId) {
        const modalidadeAtual = (modalidades.data || []).find((modalidade: any) => Number(modalidade.id) === Number(prev.modalidadeId))
        const fluxoEsperado = Number(modalidadeAtual?.fluxoId || 0)
        if (fluxoEsperado !== Number(prev.fluxoId || 0)) {
          updates.fluxoId = fluxoEsperado
        }
      }

      if (!Object.keys(updates).length) return prev
      return { ...prev, ...updates }
    })
  }, [form.bancoId, modalidadesBanco.data, modalidades.data, agencias.data])

  useEffect(() => {
    if (!isEdicao || isExterno) return
    const handleClick = (event: MouseEvent) => {
      if (!atendimentoAlteracaoPendente) return
      const target = event.target as HTMLElement | null
      const link = target?.closest('a') as HTMLAnchorElement | null
      if (!link || link.hasAttribute('download') || link.target === '_blank') return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const destino = `${url.pathname}${url.search}${url.hash}`
      const atual = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (destino === atual) return
      event.preventDefault()
      const basePath = new URL(import.meta.env.BASE_URL || '/', window.location.origin).pathname.replace(/\/$/, '')
      const destinoInterno = basePath && destino.startsWith(basePath)
        ? destino.slice(basePath.length) || '/'
        : destino
      setSaidaPendente(destinoInterno)
      setModalAtendimentoObrigatorio(true)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [atendimentoAlteracaoPendente, isEdicao, isExterno])

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}))
  const fn = (k: string) => (e: React.ChangeEvent<any>) => setForm(p=>({...p,[k]:Number(e.target.value)}))
  const fc = (k: string) => (e: React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}))
  const fp = (k: string) => (e: React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}))
  const formatarCampoMoeda = (k: string) => () => setForm(p=>({...p,[k]:formatCurrencyBr((p as any)[k])}))
  const formatarCampoPercentual = (k: string) => () => setForm(p=>({...p,[k]:formatDecimalBr((p as any)[k])}))
  const campoInternoSomenteLeitura = (k: string) =>
    isExterno && (PROCESSO_FORM_INTERNAL_ONLY_FIELDS as readonly string[]).includes(k)
  const campoDesabilitado = (k: string) => processoTravadoParaExterno || campoInternoSomenteLeitura(k)

  // Auto-calculate remuneracaoValor when remuneracaoPerc or valorFinanciado changes
  useEffect(() => {
    if (isExterno) return
    const perc = Number(parseDecimalBr(form.remuneracaoPerc)) || 0
    const financiado = Number(parseDecimalBr(form.valorFinanciado)) || 0
    if (perc > 0 && financiado > 0) {
      const valor = (perc / 100) * financiado
      setForm(p => {
        const remuneracaoValor = formatCurrencyBr(valor)
        return p.remuneracaoValor === remuneracaoValor ? p : {...p, remuneracaoValor}
      })
    }
  }, [form.remuneracaoPerc, form.valorFinanciado, isExterno])

  const handleSalvar = () => {
    setErro('')
    if (!podeSalvarProcesso) return setErro('Seu perfil não tem permissão para salvar este processo.')
    if (processoTravadoParaExterno) return setErro('Após concluir a primeira etapa, o usuário externo só pode gerenciar a documentação do processo.')
    if (!form.bancoId) return setErro('Banco eh obrigatorio')
    const { pausado, ...formData } = form
    // Limpar campos vazios/datas vazias para nao dar erro no MySQL
    const cleaned: any = { ...formData }
    if (isExterno) {
      for (const campo of PROCESSO_FORM_INTERNAL_ONLY_FIELDS) delete cleaned[campo]
    }
    for (const k of Object.keys(cleaned)) {
      if (cleaned[k] === '') cleaned[k] = undefined
      if (cleaned[k] === 0 && k !== 'bancoId') cleaned[k] = undefined
    }
    // Converter valores decimais de virgula para ponto
    for (const dk of PROCESSO_FORM_DECIMAL_FIELDS) {
      if (cleaned[dk]) cleaned[dk] = parseDecimalBr(cleaned[dk])
    }
    if (isEdicao) atualizar.mutate({ id: Number(id), ...cleaned, finalizarCadastroInicial: true })
    else criar.mutate({ ...cleaned, finalizarCadastroInicial: true })
  }

  const handleSalvarAtendimentoObrigatorio = async () => {
    const descricao = atendimentoObrigatorioTexto.trim()
    if (!descricao || !isEdicao) return
    try {
      await addAtendimento.mutateAsync({ processoId: Number(id), descricao })
      setAtendimentoAlteracaoPendente(false)
      setAtendimentoObrigatorioTexto('')
      setModalAtendimentoObrigatorio(false)
      if (saidaPendente) {
        const destino = saidaPendente
        setSaidaPendente(null)
        navigate(destino)
      }
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível registrar o atendimento.')
    }
  }

  const etapaAtual = processo.data?.etapas?.find((e: any) => !e.etapa.concluido)
  const etapasProcesso = processo.data?.etapas || []
  const primeiraEtapaConcluidaNoProcesso = !!etapasProcesso[0]?.etapa?.concluido
  const processoTravadoParaExterno = isEdicao && isExterno && primeiraEtapaConcluidaNoProcesso
  const podeEditarDadosProcesso = podeGerenciarProcesso && !processoTravadoParaExterno
  const podeIncluirVendedor = isEdicao ? (isExterno ? podeGerenciarProcesso : podeEditarDadosProcesso) : podeEditarDadosProcesso
  const podeIncluirImovel = isEdicao ? (isExterno ? podeGerenciarProcesso : podeEditarDadosProcesso) : podeEditarDadosProcesso
  const podeAlterarVendedor = !isExterno && podeEditarDadosProcesso
  const podeAlterarImovel = !isExterno && podeEditarDadosProcesso
  const podeGerenciarDocumentos = isEdicao && (podeGerenciarProcesso || processoTravadoParaExterno)
  const modoSomenteLeitura = isEdicao && (!pode('processo:editar') || processoTravadoParaExterno)
  const existeTarefaPendente = (processo.data?.tarefas || []).some((t: any) => String(t.status || '').toLowerCase() === 'pendente')
  const podeCriarTarefa = isEdicao && ((isExterno && !existeTarefaPendente) || podeEditarDadosProcesso)
  const cadastroInicialCompleto = (processo.data as any)?.cadastroInicialCompleto
  const cadastroInicialPendente = !isEdicao || (isEdicao && (
    !processo.data || cadastroInicialCompleto === false || cadastroInicialCompleto === 0 || cadastroInicialCompleto === '0'
  ))
  const abasVisiveis = PROCESSO_FORM_ABAS.filter((item) =>
    (!cadastroInicialPendente || PROCESSO_FORM_ABAS_CADASTRO_INICIAL.has(item.id)) &&
    !(isExterno && item.id === 'atendimento')
  )

  useEffect(() => {
    if (abasVisiveis.some((item) => item.id === aba)) return
    setAba('dadosGerais')
  }, [aba, abasVisiveis])
  const usuariosExecutantesTarefa = (usuarios.data || []).filter((u: any) =>
    !isExterno || ['Administrador', 'Gerente', 'Analista'].includes(u.perfil)
  )
  const usuariosInternos = (usuarios.data || []).filter((u: any) => ['Administrador', 'Gerente', 'Analista'].includes(u.perfil))

  const getUserName = (uid: number|null|undefined) => {
    if (!uid) return '—'
    const u = (usuarios.data||[]).find((u: any) => u.id === uid)
    return u ? u.nome : String(uid)
  }

  // Query local: busca dados dos clientes/imoveis pelos IDs quando processo e novo
  const compradoresLocal = trpc.clientes.porIds.useQuery({ ids: form.compradoresIds }, { enabled: !isEdicao && form.compradoresIds.length > 0 })
  const vendedoresLocal = trpc.clientes.porIds.useQuery({ ids: form.vendedoresIds }, { enabled: !isEdicao && form.vendedoresIds.length > 0 })
  const imoveisAll = trpc.cadastros.imoveis.listar.useQuery(undefined, { enabled: !isEdicao && form.imoveisIds.length > 0 })

  const compradorData = isEdicao
    ? (processo.data?.compradores||[]).map((c: any) => ({...c.cliente, proponente: c.proponente})).filter((c:any)=>c?.id)
    : (compradoresLocal.data || []).map((c:any) => ({...c, proponente: false}))
  const vendedorData = isEdicao
    ? (processo.data?.vendedores||[]).map((v: any) => ({...v.cliente, proponente: v.proponente})).filter((v:any)=>v?.id)
    : (vendedoresLocal.data || []).map((v:any) => ({...v, proponente: false}))
  const imovelData = isEdicao
    ? (processo.data?.imoveis||[]).map((i: any) => i.imovel).filter(Boolean)
    : (imoveisAll.data || []).filter((im:any) => form.imoveisIds.includes(im.id))

  // Pendências do histórico
  const pendencias = (historicoData.data || []).filter((h: any) => h.tipo === 'pendencia')
  const tarefasAbertas = (processo.data?.tarefas || []).filter((t: any) => String(t.status || '').toLowerCase() === 'pendente')
  const bancoRelatorio = (bancos.data || []).find((b: any) => b.id === form.bancoId)
  const agenciaRelatorio = (agencias.data || []).find((a: any) => a.id === form.agenciaId)
  const modalidadeRelatorio = modalidadesFiltradas.find((m: any) => m.id === form.modalidadeId) || (modalidades.data || []).find((m: any) => m.id === form.modalidadeId)
  const situacaoProcessoRelatorio = form.reprovado ? 'Reprovado' : form.pausado ? 'Pausado' : 'Ativo'
  const etapaAtualRelatorio = etapaAtual?.etapaNome || (etapasProcesso.length ? 'Concluído' : '—')

  const handleAddComprador = async (clienteId: number) => {
    if (!podeEditarDadosProcesso) return
    if (form.compradoresIds.includes(clienteId)) return
    const newIds = [...form.compradoresIds, clienteId]
    setForm(p => ({...p, compradoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), compradoresIds: newIds })
    setModalComprador(false); setBuscaCliente(''); setModoManual(false)
  }

  const handleAddVendedor = async (clienteId: number) => {
    if (!podeIncluirVendedor) return
    if (form.vendedoresIds.includes(clienteId)) return
    const newIds = [...form.vendedoresIds, clienteId]
    if (isEdicao) {
      adicionarVendedorProcesso.mutate({ processoId: Number(id), clienteId })
    } else {
      setForm(p => ({...p, vendedoresIds: newIds}))
      setModalVendedor(false); setBuscaCliente(''); setModoManual(false)
    }
  }

  const handleRemoveComprador = (clienteId: number) => {
    if (!podeEditarDadosProcesso) return
    const newIds = form.compradoresIds.filter(cid => cid !== clienteId)
    setForm(p => ({...p, compradoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), compradoresIds: newIds })
  }

  const handleRemoveVendedor = (clienteId: number) => {
    if (!podeAlterarVendedor) return
    const newIds = form.vendedoresIds.filter(vid => vid !== clienteId)
    setForm(p => ({...p, vendedoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), vendedoresIds: newIds })
  }

  const handleCriarClienteComprador = async () => {
    if (!podeEditarDadosProcesso) return
    if (!clienteManualNome || !clienteManualCpf) return
    try {
      const result = await criarCliente.mutateAsync({ tipo: 'Comprador', nome: clienteManualNome, cpfCnpj: clienteManualCpf })
      handleAddComprador(result.id)
      setClienteManualNome(''); setClienteManualCpf('')
    } catch {}
  }

  const handleCriarClienteVendedor = async () => {
    if (!podeIncluirVendedor) return
    if (!clienteManualNome || !clienteManualCpf) return
    try {
      const result = await criarCliente.mutateAsync({ tipo: 'Vendedor', nome: clienteManualNome, cpfCnpj: clienteManualCpf })
      handleAddVendedor(result.id)
      setClienteManualNome(''); setClienteManualCpf('')
    } catch {}
  }

  const handleAddImovel = (imovelId: number) => {
    if (!podeIncluirImovel) return
    if (form.imoveisIds.includes(imovelId)) return
    const newIds = [...form.imoveisIds, imovelId]
    if (isEdicao) {
      adicionarImovelProcesso.mutate({ processoId: Number(id), imovelId })
    } else {
      setForm(p => ({...p, imoveisIds: newIds}))
      setModalImovel(false); setBuscaImovel(''); setModoManualImovel(false)
    }
  }

  const handleRemoveImovel = (imovelId: number) => {
    if (!podeAlterarImovel) return
    const newIds = form.imoveisIds.filter(iid => iid !== imovelId)
    setForm(p => ({...p, imoveisIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), imoveisIds: newIds })
  }

  const handleCriarImovel = async () => {
    if (!podeIncluirImovel) return
    if (!imovelForm.endereco || !imovelForm.cidade || !imovelForm.uf) return
    try {
      const result = await criarImovel.mutateAsync(imovelForm)
      const newId = (result as any)?.[0]?.insertId || (result as any)?.id
      if (newId) handleAddImovel(newId)
      setImovelForm(EMPTY_IMOVEL_FORM)
    } catch {}
  }

  // Upload handler with secao and clienteId
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, secao?: string, documentoTipoId?: number, clienteId?: number) => {
    const files = e.target.files
    if (!files?.length || !isEdicao || !podeGerenciarDocumentos) return
    const token = getStoredAuthToken()
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch(import.meta.env.BASE_URL + 'api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await res.json()
        if (data.ok) {
          adicionarDocumento.mutate({
            processoId: Number(id),
            nomeArquivo: data.originalname,
            caminhoArquivo: data.path,
            mimeType: file.type || undefined,
            tamanho: data.size || undefined,
            secao: secao || uploadSecao,
            documentoTipoId: documentoTipoId || undefined,
            clienteId: clienteId || undefined,
            tipoVinculo: secao?.startsWith('Comprador') ? 'comprador' : secao?.startsWith('Vendedor') ? 'vendedor' : secao === 'Imóvel' ? 'imovel' : 'formulario',
          })
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    e.target.value = ''
  }

  const handleCriarTarefa = () => {
    if (!podeCriarTarefa) return
    if (!tarefaForm.executanteId || !tarefaForm.solicitacao) return
    criarTarefa.mutate({
      processoId: Number(id),
      executanteId: tarefaForm.executanteId,
      solicitacao: tarefaForm.solicitacao,
      dataLimite: tarefaForm.dataLimite || undefined,
    })
  }

  const handleImprimir = () => {
    window.print()
  }

  const filteredImoveis = (imoveisListAll.data || []).filter((im: any) => {
    if (!buscaImovel) return true
    const termo = buscaImovel.toLowerCase()
    return (im.matricula?.toLowerCase().includes(termo)) ||
           (im.endereco?.toLowerCase().includes(termo)) ||
           (im.cidade?.toLowerCase().includes(termo))
  })

  const docsPorSecao = (secao: string) => filtrarDocumentosPorSecao(processo.data?.documentos || [], secao)
  const abrirDocumento = (documento: any, nomeAlternativo?: string) => {
    setDocumentoPreview({
      nome: nomeAlternativo || documento.nomeArquivo || 'Documento',
      url: buildDocumentoUrl(documento.caminhoArquivo),
    })
  }

  if (isEdicao && processo.isLoading) return <div className="flex justify-center py-12"><Spinner/></div>

  return (
    <div>
      {/* Print styles */}
      <style>{PROCESSO_FORM_PRINT_STYLES}</style>

      {/* Cabecalho */}
      <div className="flex items-center gap-3 mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3 no-print">
        <Link to="/financiamento/processos" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          {isEdicao ? (
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-800">Editar Processo: {id}</span>
              <Badge label={form.reprovado ? 'Reprovado' : form.pausado ? 'Pausado' : 'Ativo'} color={form.reprovado ? 'bg-red-100 text-red-700' : form.pausado ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}/>
              {etapaAtual && <Badge label={etapaAtual.etapaNome||''} color="bg-yellow-100 text-yellow-700"/>}
            </div>
          ) : <span className="font-bold text-gray-800">Novo Processo</span>}
        </div>
      <div className="flex gap-2">
          {isEdicao && <Btn variant="ghost" size="sm" icon={<Printer size={14}/>} onClick={handleImprimir}>Imprimir</Btn>}
          <Link to="/financiamento/processos"><Btn variant="ghost" size="sm">Cancelar</Btn></Link>
          {podeSalvarProcesso && !processoTravadoParaExterno && <Btn size="sm" icon={<Save size={14}/>} loading={criar.isPending||atualizar.isPending} onClick={handleSalvar}>Salvar</Btn>}
        </div>
      </div>

      {erro    && <Alert type="error"   message={erro}    />}
      {sucesso && <Alert type="success" message={sucesso} />}
      {!isExterno && modoSomenteLeitura && <Alert type="info" message="Seu perfil tem acesso somente para consulta neste processo." />}

      <Card className="mt-4 no-print">
        {/* Abas */}
        <div className="border-b flex overflow-x-auto no-print">
          {abasVisiveis.map(a=>(
            <button key={a.id} onClick={()=>setAba(a.id)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2
                ${aba===a.id?'border-blue-600 text-blue-600 bg-blue-50':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* DADOS GERAIS */}
          {aba==='dadosGerais' && (
            <div>
              <fieldset disabled={processoTravadoParaExterno} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 disabled:opacity-80">
                <Select label="Banco" value={form.bancoId} onChange={fn('bancoId')}
                  options={(bancos.data||[]).map(b=>({value:b.id,label:b.nome}))} placeholder="Selecione..."/>
                <Select label="Agência" value={form.agenciaId} onChange={fn('agenciaId')}
                  options={(agencias.data||[]).map(a=>({value:a.id,label:a.nome}))} placeholder="Selecione..."/>
                <Select label="Modalidade" value={form.modalidadeId} onChange={(e: React.ChangeEvent<any>) => {
                    const modId = Number(e.target.value)
                    const mod = modalidadesFiltradas.find((m:any) => m.id === modId)
                    setForm(p => ({...p, modalidadeId: modId, fluxoId: mod?.fluxoId || 0}))
                  }}
                  options={modalidadesFiltradas.map(m=>({value:m.id,label:m.nome}))} placeholder={form.bancoId ? 'Selecione...' : 'Escolha um banco primeiro'} disabled={!form.bancoId}/>
                <Select label="Fluxo" value={form.fluxoId} onChange={fn('fluxoId')}
                  options={fluxosFiltrados.map(f=>({value:f.id,label:f.nome}))} placeholder={modalidadeSelecionada ? 'Selecionado pela modalidade' : 'Escolha uma modalidade'} disabled/>
                <Input
                  label="Encaminhamento"
                  value={form.encaminhamento || 'Não definido no banco'}
                  disabled
                  hint="Definido automaticamente pelo banco selecionado"
                />
                {isExterno ? (
                  <Input
                    label="Responsável"
                    value={form.responsavelId ? getUserName(form.responsavelId) : 'Definido internamente'}
                    disabled
                    hint="O responsável é definido pela equipe interna da Amarante."
                  />
                ) : (
                  <Select label="Responsável" value={form.responsavelId} onChange={fn('responsavelId')}
                    options={(usuarios.data||[]).filter((u:any)=>['Administrador','Gerente','Analista'].includes(u.perfil)).map(u=>({value:u.id,label:u.nome}))} placeholder="Selecione..."/>
                )}
                {!isExterno && (
                  <>
                    <Input label="Data emissão Contrato" type="date" value={form.dataEmissaoContrato} onChange={f('dataEmissaoContrato')}/>
                    <Input label="Data de Assinatura" type="date" value={form.dataAssinatura} onChange={f('dataAssinatura')}/>
                    <Input label="Data pagto Vendedor" type="date" value={form.dataPagtoVendedor} onChange={f('dataPagtoVendedor')}/>
                    <Input label="Nº Proposta" value={form.numProposta} onChange={f('numProposta')}/>
                    <Input label="Nº Contrato" value={form.numContrato} onChange={f('numContrato')}/>
                  </>
                )}
                {perfil === 'Administrador' && <Input label="Data Remuneração" type="date" value={form.dataRemuneracao} onChange={f('dataRemuneracao')}/>}
                {perfil === 'Administrador' && <Input label="Data Pagamento de Comissão" type="date" value={form.dataPagtoComissao} onChange={f('dataPagtoComissao')}/>}
                {!isExterno && <Textarea label="Observação" value={form.observacao} onChange={f('observacao')} rows={3} className="xl:col-span-3 md:col-span-2"/>}
                {!isExterno && (
                  <div className="flex items-center gap-2 self-end pb-2">
                    <input type="checkbox" id="reprovado" checked={form.reprovado} onChange={e=>setForm(p=>({...p,reprovado:e.target.checked}))} className="rounded"/>
                    <label htmlFor="reprovado" className="text-sm text-gray-700">Processo Reprovado</label>
                  </div>
                )}
              </fieldset>

              {/* Pendências */}
              {isEdicao && !isExterno && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-yellow-500"/>
                    Pendencias
                  </h3>
                  {podeEditarDadosProcesso && (
                    <div className="flex gap-2 mb-3">
                      <Textarea value={novaPendencia} onChange={e=>setNovaPendencia(e.target.value)}
                        placeholder="Descreva a pendencia..." rows={2} className="flex-1"/>
                      <Btn size="sm" variant="secondary" loading={registrarPendencia.isPending}
                        onClick={()=>{ if(novaPendencia.trim()) registrarPendencia.mutate({processoId:Number(id),descricao:novaPendencia.trim()}) }}
                        disabled={!novaPendencia.trim()}>
                        Registrar
                      </Btn>
                    </div>
                  )}
                  {pendencias.length > 0 && (
                    <div className="space-y-2">
                      {pendencias.map((p: any, i: number) => (
                        <div key={p.id || i} className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                          <div className="flex justify-between items-start">
                            <p className="text-gray-700">{p.descricao}</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatDateTimeBr(p.criadoEm)}</span>
                          </div>
                          {p.usuarioNome && <span className="text-xs text-gray-400">por {p.usuarioNome}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {pendencias.length === 0 && <p className="text-gray-400 text-xs">Nenhuma pendencia registrada.</p>}
                </div>
              )}
            </div>
          )}

          {/* VALORES */}
          {aba==='valores' && (
            <fieldset disabled={processoTravadoParaExterno} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 disabled:opacity-80">
              <Input label="Valor de Compra e Venda"  value={form.valorCompraVenda}    onChange={fc('valorCompraVenda')}   onBlur={formatarCampoMoeda('valorCompraVenda')}/>
              <Input label="Valor da Avaliação"        value={form.valorAvaliacao}       onChange={fc('valorAvaliacao')}      onBlur={formatarCampoMoeda('valorAvaliacao')}      disabled={campoDesabilitado('valorAvaliacao')}      hint={campoInternoSomenteLeitura('valorAvaliacao') ? 'Uso interno' : undefined}/>
              <Input label="Valor Recurso Próprio"     value={form.valorRecursoProprio}  onChange={fc('valorRecursoProprio')} onBlur={formatarCampoMoeda('valorRecursoProprio')}/>
              <Input label="Valor do Subsídio"         value={form.valorSubsidio}        onChange={fc('valorSubsidio')}       onBlur={formatarCampoMoeda('valorSubsidio')}       disabled={campoDesabilitado('valorSubsidio')}       hint={campoInternoSomenteLeitura('valorSubsidio') ? 'Uso interno' : undefined}/>
              <Input label="Valor FGTS"                value={form.valorFgts}            onChange={fc('valorFgts')}           onBlur={formatarCampoMoeda('valorFgts')}/>
              <Input label="Valor do IQ"               value={form.valorIq}              onChange={fc('valorIq')}             onBlur={formatarCampoMoeda('valorIq')}/>
              <Input label="Valor Financiado"          value={form.valorFinanciado}      onChange={fc('valorFinanciado')}     onBlur={formatarCampoMoeda('valorFinanciado')}/>
              <Input label="Valor da Parcela"          value={form.valorParcela}         onChange={fc('valorParcela')}        onBlur={formatarCampoMoeda('valorParcela')}        disabled={campoDesabilitado('valorParcela')}        hint={campoInternoSomenteLeitura('valorParcela') ? 'Uso interno' : undefined}/>
              <Input label="Número de Parcelas" type="number" value={form.numeroParcelas} onChange={fn('numeroParcelas')}/>
              <Input label="Taxa de Juros" value={form.taxa} onChange={fp('taxa')} onBlur={formatarCampoPercentual('taxa')} placeholder="Ex: 8,50" disabled={campoDesabilitado('taxa')} hint={campoInternoSomenteLeitura('taxa') ? 'Uso interno' : undefined}/>
              {!isExterno && <Input label="Valor Despesas (R$)" value={form.valorDespesas} onChange={fc('valorDespesas')} onBlur={formatarCampoMoeda('valorDespesas')}/>}
              <Input label="Comissão (%)" value={form.remuneracaoPerc} onChange={fp('remuneracaoPerc')} onBlur={formatarCampoPercentual('remuneracaoPerc')} disabled={campoDesabilitado('remuneracaoPerc')} hint={campoInternoSomenteLeitura('remuneracaoPerc') ? 'Uso interno' : 'Percentual sobre valor financiado'}/>
              <Input label="Comissão (R$)" value={form.remuneracaoValor} onChange={fc('remuneracaoValor')} onBlur={formatarCampoMoeda('remuneracaoValor')} disabled={campoDesabilitado('remuneracaoValor')} hint={campoInternoSomenteLeitura('remuneracaoValor') ? 'Uso interno' : 'Calculado automaticamente'}/>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tipo Amortização</label>
                <div className="flex gap-4 items-center h-10">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tipoAmortizacao" value="SAC" checked={form.tipoAmortizacao==='SAC'} onChange={()=>setForm(p=>({...p,tipoAmortizacao:'SAC'}))} className="text-blue-600"/>
                    SAC
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tipoAmortizacao" value="PRICE" checked={form.tipoAmortizacao==='PRICE'} onChange={()=>setForm(p=>({...p,tipoAmortizacao:'PRICE'}))} className="text-blue-600"/>
                    PRICE
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Situação do Imóvel</label>
                <div className="flex gap-4 items-center h-10">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tipoImovel" value="Novo" checked={form.tipoImovel==='Novo'} onChange={()=>setForm(p=>({...p,tipoImovel:'Novo'}))} className="text-blue-600"/>
                    Novo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tipoImovel" value="Usado" checked={form.tipoImovel==='Usado'} onChange={()=>setForm(p=>({...p,tipoImovel:'Usado'}))} className="text-blue-600"/>
                    Usado
                  </label>
                </div>
              </div>
            </fieldset>
          )}

          {/* COMPRADOR */}
          {aba==='comprador' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Compradores vinculados</h3>
                {podeEditarDadosProcesso && (
                  <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>{setModalComprador(true);setBuscaCliente('');setModoManual(false);setClienteManualNome('');setClienteManualCpf('')}}>Incluir Comprador</Btn>
                )}
              </div>
              {compradorData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum comprador vinculado.</p>
              ) : (
                <Table headers={['CPF/CNPJ','Nome','Email','Telefone','Proponente','']}>
                  {compradorData.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{formatCpfCnpj(c.cpfCnpj)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{c.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.fone1 || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {isEdicao && podeEditarDadosProcesso ? <button onClick={()=>setProponente.mutate({processoId:Number(id),clienteId:c.id,tipo:'comprador',proponente:!c.proponente})} className={c.proponente ? "text-yellow-500" : "text-gray-300"} title="Proponente"><span style={{fontSize:'18px'}}>★</span></button> : <span className={c.proponente ? "text-yellow-500" : "text-gray-300"} style={{fontSize:'18px'}}>★</span>}
                      </td>
                      <td className="px-4 py-3">
                        {podeEditarDadosProcesso && <button onClick={()=>handleRemoveComprador(c.id)} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 size={14}/></button>}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          )}

          {/* VENDEDOR */}
          {aba==='vendedor' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Vendedores vinculados</h3>
                {podeIncluirVendedor && (
                  <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>{setModalVendedor(true);setBuscaCliente('');setModoManual(false);setClienteManualNome('');setClienteManualCpf('')}}>Incluir Vendedor</Btn>
                )}
              </div>
              {vendedorData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum vendedor vinculado.</p>
              ) : (
                <Table headers={['CPF/CNPJ','Nome','Email','Telefone','Proponente','']}>
                  {vendedorData.map((v: any) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{formatCpfCnpj(v.cpfCnpj)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{v.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{v.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{v.fone1 || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {podeAlterarVendedor ? <button onClick={()=>setProponente.mutate({processoId:Number(id),clienteId:v.id,tipo:'vendedor',proponente:!v.proponente})} className={v.proponente ? "text-yellow-500" : "text-gray-300"} title="Proponente"><span style={{fontSize:'18px'}}>★</span></button> : <span className={v.proponente ? "text-yellow-500" : "text-gray-300"} style={{fontSize:'18px'}}>★</span>}
                      </td>
                      <td className="px-4 py-3">
                        {podeAlterarVendedor && <button onClick={()=>handleRemoveVendedor(v.id)} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 size={14}/></button>}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          )}

          {/* IMOVEL */}
          {aba==='imovel' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Imóveis vinculados</h3>
                {podeIncluirImovel && (
                  <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>{setModalImovel(true);setBuscaImovel('');setModoManualImovel(false);setImovelForm(EMPTY_IMOVEL_FORM)}}>Incluir Imóvel</Btn>
                )}
              </div>
              {imovelData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum imóvel vinculado.</p>
              ) : (
                <Table headers={['Matrícula','Endereço','Número','Complemento','Cidade','UF','CEP','']}>
                  {imovelData.map((im: any) => (
                    <tr key={im.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{im.matricula || '—'}</td>
                      <td className="px-4 py-3 text-sm">{im.endereco || '—'}</td>
                      <td className="px-4 py-3 text-sm">{im.numero || '—'}</td>
                      <td className="px-4 py-3 text-sm">{im.complemento || '—'}</td>
                      <td className="px-4 py-3 text-sm">{im.cidade}</td>
                      <td className="px-4 py-3 text-sm">{im.uf}</td>
                      <td className="px-4 py-3 text-sm">{im.cep || '—'}</td>
                      <td className="px-4 py-3">
                        {podeAlterarImovel && <button onClick={()=>handleRemoveImovel(im.id)} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 size={14}/></button>}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          )}

          {/* ETAPAS */}
          {aba==='etapas' && (
            <div>
              {!isEdicao ? <p className="text-gray-400 text-sm">Salve o processo primeiro para ver as etapas.</p> : (
                <Table headers={['','Etapa','Observação','Início','Término','Dias','Usuário','Ações']}>
                  {(() => {
                    const etapasList = etapasProcesso
                    const idxAtual = etapasList.findIndex((e:any) => !e.etapa.concluido)
                    const idxReabrivel = idxAtual === -1 ? etapasList.length - 1 : idxAtual - 1
                    return etapasList.map((e: any, i: number) => {
                      const isConcluida = !!e.etapa.concluido
                      const isAtual = i === idxAtual
                      const isFutura = idxAtual >= 0 && i > idxAtual
                      const canReabrir = !isExterno && isConcluida && i === idxReabrivel
                      const canConcluirInterno = !isExterno && isAtual && podeGerenciarProcesso
                      const canConcluirExterno = isExterno && isAtual && i === 0
                      const canMarcarPendente = !isExterno && isAtual && podeGerenciarProcesso
                      const canGerenciarObs = !isExterno && (isConcluida || isAtual)
                      const rowClass = isConcluida ? 'bg-green-50/30 hover:bg-green-50'
                        : isAtual ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
                        : 'text-gray-400 hover:bg-gray-50'
                      return (
                    <tr key={i} className={rowClass}>
                      <td className="px-4 py-3">
                        {isConcluida
                          ? <CheckCircle size={16} className="text-green-500"/>
                          : isAtual
                            ? <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse"/>
                            : <div className="w-4 h-4 rounded-full border-2 border-gray-300"/>}
                      </td>
                      <td className={`px-4 py-3 font-medium text-sm ${isAtual ? 'text-yellow-900 font-bold' : ''}`}>
                        {i+1}. {e.etapaNome}
                        {isAtual && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">ATUAL</span>}
                        {isFutura && <span className="ml-2 text-xs text-gray-400">(bloqueada)</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{e.etapa.observacao||''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.iniciado ? formatDateTimeBr(e.etapa.iniciado) : ''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.concluido ? formatDateTimeBr(e.etapa.concluido) : ''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.diasDecorridos||0}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{isConcluida ? getUserName(e.etapa.usuarioId) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(canConcluirInterno || canConcluirExterno) && (
                            <Btn size="sm" variant="success"
                              onClick={()=>{setConcluirEtapaTarget({processoId:Number(id),etapaId:e.etapa.etapaId});setConcluirEtapaObs('');setProximoResponsavelEtapaId(0);setModalConcluirEtapa(true)}}>
                              Concluir
                            </Btn>
                          )}
                          {canMarcarPendente && (
                            <Btn size="sm" variant="secondary"
                              onClick={()=>{setPendenteEtapaTarget({processoId:Number(id),etapaId:e.etapa.etapaId});setPendenteEtapaObs(e.etapa.observacao||'');setModalPendenteEtapa(true)}}>
                              Pendente
                            </Btn>
                          )}
                          {canReabrir && (
                            <Btn size="sm" variant="danger"
                              onClick={()=>{ if (confirm(`Reabrir a etapa "${e.etapaNome}" e voltar o processo para ela?`)) reabrirEtapa.mutate({processoId:Number(id),etapaId:e.etapa.etapaId}) }}>
                              Reabrir
                            </Btn>
                          )}
                          {canGerenciarObs && (
                            <Btn size="sm" variant="ghost"
                              onClick={()=>{setEtapaObsTarget({processoId:Number(id),etapaId:e.etapa.etapaId});setEtapaObsTexto(e.etapa.observacao||'');setModalObsEtapa(true)}}>
                              Obs
                            </Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                      )
                    })
                  })()}
                </Table>
              )}
            </div>
          )}

          {/* DOCUMENTACAO */}
          {aba==='documentacao' && (
            <div>
              {form.fluxoId === 0 ? <p className="text-gray-400 text-sm">Selecione uma modalidade para ver os documentos necessários.</p> : (
                <>
                  {docTiposPorFluxo.data && docTiposPorFluxo.data.length > 0 && (() => {
                    const porCategoria: Record<string, any[]> = {}
                    docTiposPorFluxo.data.forEach((dt: any) => {
                      const cat = dt.categoria || 'Outros'
                      if (!porCategoria[cat]) porCategoria[cat] = []
                      porCategoria[cat].push(dt)
                    })
                    const allDocs = processo.data?.documentos || []

                    const getUploadedDoc = (dt: any, clienteId?: number) =>
                      allDocs.find((d: any) => d.documentoTipoId === dt.id && (clienteId ? d.clienteId === clienteId : !d.clienteId))

                    const getStatusVisual = (uploaded: any) => {
                      if (!uploaded) {
                        return {
                          label: 'Não enviado',
                          badge: 'bg-gray-100 text-gray-600',
                          file: 'text-gray-500',
                          row: 'border-gray-200 bg-white',
                          icon: <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-gray-300"/>,
                        }
                      }
                      if (uploaded.status === 'aprovado') {
                        return {
                          label: 'Aprovado',
                          badge: 'bg-green-100 text-green-700',
                          file: 'text-green-700 hover:text-green-800',
                          row: 'border-green-200 bg-green-50/60',
                          icon: <CheckCircle size={16} className="mt-0.5 text-green-600"/>,
                        }
                      }
                      if (uploaded.status === 'reprovado') {
                        return {
                          label: 'Reprovado',
                          badge: 'bg-red-100 text-red-700',
                          file: 'text-red-700 hover:text-red-800',
                          row: 'border-red-200 bg-red-50/60',
                          icon: <AlertTriangle size={16} className="mt-0.5 text-red-600"/>,
                        }
                      }
                      return {
                        label: 'Pendente',
                        badge: 'bg-yellow-100 text-yellow-700',
                        file: 'text-yellow-700 hover:text-yellow-800',
                        row: 'border-yellow-200 bg-yellow-50/70',
                        icon: <div className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-yellow-500 bg-yellow-100"/>,
                      }
                    }

                    const sectionTone: Record<string, { border: string; bg: string; title: string; counter: string }> = {
                      blue: { border: 'border-blue-200', bg: 'bg-blue-50/70', title: 'text-blue-800', counter: 'bg-blue-100 text-blue-700' },
                      purple: { border: 'border-purple-200', bg: 'bg-purple-50/70', title: 'text-purple-800', counter: 'bg-purple-100 text-purple-700' },
                      green: { border: 'border-green-200', bg: 'bg-green-50/70', title: 'text-green-800', counter: 'bg-green-100 text-green-700' },
                      orange: { border: 'border-orange-200', bg: 'bg-orange-50/70', title: 'text-orange-800', counter: 'bg-orange-100 text-orange-700' },
                    }

                    // Helper: render a compact document row with status and actions
                    const renderDocItem = (dt: any, clienteId?: number, cat?: string) => {
                      const uploaded = getUploadedDoc(dt, clienteId)
                      const statusVisual = getStatusVisual(uploaded)
                      const canDelete = !!uploaded && uploaded.status !== 'aprovado' && podeGerenciarDocumentos
                      const canReupload = !!uploaded && uploaded.status === 'reprovado' && podeGerenciarDocumentos
                      const canUpload = isEdicao && podeGerenciarDocumentos && (!uploaded || canReupload)
                      const docCategoria = dt.__documentoCategoria || cat

                      return (
                        <div
                          key={`${docCategoria || 'documento'}-${dt.id}-${clienteId||0}`}
                          className={`rounded-md border px-3 py-2 transition-colors ${canUpload ? 'border-dashed hover:border-blue-300 hover:bg-blue-50/60' : statusVisual.row}`}
                          onDragOver={canUpload ? (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('border-blue-500','bg-blue-50') } : undefined}
                          onDragLeave={canUpload ? (ev) => { ev.currentTarget.classList.remove('border-blue-500','bg-blue-50') } : undefined}
                          onDrop={canUpload ? (ev) => {
                            ev.preventDefault()
                            ev.currentTarget.classList.remove('border-blue-500','bg-blue-50')
                            const droppedFiles = ev.dataTransfer.files
                            if (droppedFiles.length > 0) {
                              if (uploaded) excluirDocumento.mutate({id: uploaded.id})
                              const fakeInput = { target: { files: droppedFiles, value: '' } } as any
                              handleFileUpload(fakeInput, docCategoria || 'Formulários', dt.id, clienteId)
                            }
                          } : undefined}
                        >
                          <div className="flex items-start gap-2">
                            {statusVisual.icon}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="min-w-0 text-[13px] font-medium text-gray-800">
                                  {dt.ordem}. {dt.nome}
                                  {dt.obrigatorio && <span className="ml-1 text-red-500">*</span>}
                                </span>
                                {dt.obrigatorioPrimeiraEtapa && (
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                    1ª etapa
                                  </span>
                                )}
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusVisual.badge}`}>
                                  {statusVisual.label}
                                </span>
                              </div>

                              {uploaded ? (
                                <button
                                  type="button"
                                  onClick={() => abrirDocumento(uploaded, uploaded.status === 'reprovado' ? `${uploaded.nomeArquivo} (reprovado)` : undefined)}
                                  className={`mt-1 inline-flex max-w-full items-center gap-1 text-left text-xs hover:underline ${statusVisual.file}`}
                                >
                                  <FileText size={13} className="shrink-0"/>
                                  <span className="truncate">{uploaded.nomeArquivo}{uploaded.status === 'reprovado' ? ' (reprovado)' : ''}</span>
                                </button>
                              ) : (
                                <p className="mt-1 text-xs text-gray-500">
                                  {canUpload ? 'Enviar pelo botão ou arrastar o arquivo nesta linha.' : 'Documento ainda não enviado.'}
                                </p>
                              )}

                              {uploaded && uploaded.status === 'reprovado' && uploaded.motivoRecusa && (
                                <div className="mt-2 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700">
                                  <strong>Motivo:</strong> {uploaded.motivoRecusa}
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              {canUpload && (
                                <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                                  <Upload size={12}/>
                                  {canReupload ? 'Reenviar' : 'Enviar'}
                                  <input type="file" className="hidden" onChange={(e) => {
                                    if (uploaded) excluirDocumento.mutate({id: uploaded.id})
                                    handleFileUpload(e, docCategoria || 'Formulários', dt.id, clienteId)
                                  }}/>
                                </label>
                              )}
                              {isEdicao && podeGerenciarProcesso && isRevisor && uploaded?.status === 'pendente' && (
                                <>
                                  <button type="button" onClick={()=>aprovarDoc.mutate({id:uploaded.id})} className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">Aprovar</button>
                                  <button type="button" onClick={()=>{setReprovarModal({id:uploaded.id,nome:dt.nome});setReprovarMotivo('')}} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Reprovar</button>
                                </>
                              )}
                              {uploaded?.status === 'aprovado' && <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Travado</span>}
                              {canDelete && isEdicao && (
                                <button type="button" onClick={()=>excluirDocumento.mutate({id:uploaded.id})} className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remover</button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const categoriasAplicaveisPorCliente = (base: 'Comprador'|'Vendedor', cliente: any, categorias: readonly string[]) => {
                      const cpfCnpj = String(cliente?.cpfCnpj || cliente?.cpf_cnpj || '').replace(/\D/g, '')
                      const pf = `${base} - Pessoa Física`
                      const pj = `${base} - Pessoa Jurídica`
                      const categoriaPreferida = cpfCnpj.length > 11 ? pj : cpfCnpj.length > 0 ? pf : ''
                      if (categoriaPreferida && porCategoria[categoriaPreferida]?.length) return [categoriaPreferida]
                      return categorias.filter(cat => porCategoria[cat]?.length)
                    }

                    const documentosDasCategorias = (categorias: string[]) => {
                      const vistos = new Set<string>()
                      return categorias.flatMap(cat => (porCategoria[cat] || []).map((dt: any) => ({
                        ...dt,
                        __documentoCategoria: cat,
                      }))).filter((dt: any) => {
                        const chave = `${dt.__documentoCategoria}-${dt.id}`
                        if (vistos.has(chave)) return false
                        vistos.add(chave)
                        return true
                      })
                    }

                    const resumoCategorias = (categorias: string[]) =>
                      categorias.map(cat => cat.replace('Comprador - ', '').replace('Vendedor - ', '')).join(' / ')

                    const renderDocSection = (key: string, title: string, docs: any[], options: { clienteId?: number; cat?: string; tone?: keyof typeof sectionTone; subtitle?: string } = {}) => {
                      const tone = sectionTone[options.tone || 'blue']
                      const enviados = isEdicao ? docs.filter((dt: any) => getUploadedDoc(dt, options.clienteId)).length : 0
                      return (
                        <section key={key} className={`overflow-hidden rounded-lg border ${tone.border} ${tone.bg}`}>
                          <div className="flex items-start justify-between gap-3 border-b border-white/70 px-3 py-2">
                            <div className="min-w-0">
                              <h4 className={`flex items-center gap-2 text-sm font-semibold ${tone.title}`}>
                                <FileText size={15} className="shrink-0"/>
                                <span className="truncate">{title}</span>
                              </h4>
                              {options.subtitle && <p className="mt-0.5 text-xs text-gray-500">{options.subtitle}</p>}
                            </div>
                            {isEdicao && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone.counter}`}>{enviados}/{docs.length} enviados</span>}
                          </div>
                          <div className="space-y-2 p-3">
                            {docs.map((dt: any) => renderDocItem(dt, options.clienteId, options.cat))}
                          </div>
                        </section>
                      )
                    }

                    // Categorias de comprador/vendedor: separar por pessoa
                    const compradores = (processo.data?.compradores||[]).map((c:any) => c.cliente).filter((c:any)=>c?.id)
                    const vendedores = (processo.data?.vendedores||[]).map((v:any) => v.cliente).filter((v:any)=>v?.id)
                    const secoesDocumentos = []

                    if (compradores.length > 0) {
                      compradores.forEach((cliente: any) => {
                        const categorias = categoriasAplicaveisPorCliente('Comprador', cliente, PROCESSO_FORM_DOCUMENTO_CATEGORIAS_COMPRADOR)
                        const docs = documentosDasCategorias(categorias)
                        if (docs.length > 0) {
                          secoesDocumentos.push(renderDocSection(
                            `comprador-${cliente.id}`,
                            cliente.nome,
                            docs,
                            { clienteId: cliente.id, tone: 'blue', subtitle: resumoCategorias(categorias) || 'Comprador' }
                          ))
                        }
                      })
                    }

                    if (vendedores.length > 0) {
                      vendedores.forEach((cliente: any) => {
                        const categorias = categoriasAplicaveisPorCliente('Vendedor', cliente, PROCESSO_FORM_DOCUMENTO_CATEGORIAS_VENDEDOR)
                        const docs = documentosDasCategorias(categorias)
                        if (docs.length > 0) {
                          secoesDocumentos.push(renderDocSection(
                            `vendedor-${cliente.id}`,
                            cliente.nome,
                            docs,
                            { clienteId: cliente.id, tone: 'purple', subtitle: resumoCategorias(categorias) || 'Vendedor' }
                          ))
                        }
                      })
                    }

                    if (porCategoria['Imóvel'] && porCategoria['Imóvel'].length > 0 && (form.imoveisIds||[]).length > 0) {
                      secoesDocumentos.push(renderDocSection('imovel', 'Imóvel', porCategoria['Imóvel'], { cat: 'Imóvel', tone: 'green', subtitle: 'Documentos do imóvel' }))
                    }

                    if (porCategoria['Formulários'] && porCategoria['Formulários'].length > 0) {
                      secoesDocumentos.push(renderDocSection('formularios', 'Formulários', porCategoria['Formulários'], { cat: 'Formulários', tone: 'orange' }))
                    }

                    return (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {secoesDocumentos}
                        {/* Aviso se falta vincular pessoas */}
                        {compradores.length === 0 && vendedores.length === 0 && (form.imoveisIds||[]).length === 0 && (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 xl:col-span-2">
                            <p className="text-sm text-yellow-700">Adicione compradores, vendedores ou imóveis ao processo para ver os documentos necessários.</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Documentos por seção (uploads avulsos) - só mostra se não tem checklist ou se tem docs avulsos */}
                  {isEdicao && (!docTiposPorFluxo.data?.length || (processo.data?.documentos||[]).some((d:any) => !d.documentoTipoId)) && (
                    <div className="mt-6 border-t pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Documentos avulsos</h4>
                        <span className="text-xs text-gray-400">Uploads fora do checklist</span>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                      {PROCESSO_FORM_SECOES_DOC.map(secao => {
                        const docs = docsPorSecao(secao)
                        const temChecklist = !!docTiposPorFluxo.data?.length
                        if (temChecklist && docs.length === 0) return null
                        return (
                          <section key={secao} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2">
                              <h5 className="min-w-0 truncate text-xs font-semibold text-gray-600">
                                {secao} <span className="font-normal text-gray-400">({docs.length})</span>
                              </h5>
                              {podeGerenciarDocumentos && (
                                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                                  <Upload size={12}/>
                                  Upload
                                  <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, secao)}/>
                                </label>
                              )}
                            </div>
                            <div className="space-y-2 p-3">
                              {docs.length > 0 ? (
                                docs.map((d: any, i: number) => (
                                  <div key={d.id || i} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
                                    <FileText size={14} className="shrink-0 text-gray-400"/>
                                    <button type="button" onClick={() => abrirDocumento(d)} className="min-w-0 flex-1 truncate text-left text-xs text-blue-700 hover:underline">{d.nomeArquivo}</button>
                                    <span className="hidden shrink-0 text-[11px] text-gray-400 md:inline">{formatDateTimeBr(d.criadoEm)}</span>
                                    {podeGerenciarDocumentos && (!isExterno || d.status !== 'aprovado') && <button type="button" onClick={()=>excluirDocumento.mutate({id:d.id})} className="shrink-0 rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Excluir</button>}
                                  </div>
                                ))
                              ) : (
                                <p className="rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-400">
                                  Nenhum documento avulso nesta seção.
                                </p>
                              )}
                            </div>
                          </section>
                        )
                      })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Modal Reprovar */}
              <ModalReprovarDocumento
                target={reprovarModal}
                motivo={reprovarMotivo}
                onChangeMotivo={setReprovarMotivo}
                onClose={()=>setReprovarModal(null)}
                onReprovar={()=>reprovarMotivo.trim() && reprovarModal && reprovarDoc.mutate({id:reprovarModal.id, motivo:reprovarMotivo.trim()})}
                podeReprovar={!!podeGerenciarProcesso}
                loading={reprovarDoc.isPending}
              />
            </div>
          )}

                    {/* TAREFAS */}
          {aba==='tarefas' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex gap-3 text-xs">
                  {PROCESSO_FORM_TAREFA_STATUS.map(s=>(
                    <button key={s||'todas'} onClick={()=>setFiltroStatusTarefa(s)}
                      className={`px-3 py-1 rounded-full border transition-colors ${filtroStatusTarefa===s?'bg-blue-600 text-white border-blue-600':'text-gray-500 hover:bg-gray-100'}`}>
                      {s||'Todas'}
                    </button>
                  ))}
                </div>
                {podeCriarTarefa && <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>setModalTarefa(true)}>Nova Tarefa</Btn>}
              </div>
              {isExterno && existeTarefaPendente && (
                <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Já existe uma tarefa pendente para este processo. O usuário externo só pode abrir uma nova tarefa quando não houver pendência aberta.
                </p>
              )}
              <Table headers={['N','Solicitante','Tarefa','Data','Data Limite','Executante','Status']}>
                {(processo.data?.tarefas||[])
                  .filter((t: any) => !filtroStatusTarefa || t.status === filtroStatusTarefa)
                  .map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge label={String(t.id)} color={t.status==='Pendente'?'bg-yellow-100 text-yellow-700':t.status==='Resolvida'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}/>
                    </td>
                    <td className="px-4 py-3 text-xs">{getUserName(t.solicitanteId)}</td>
                    <td className="px-4 py-3 text-sm max-w-xs">{t.solicitacao}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateBr(t.criadoEm)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.dataLimite ? formatDateBr(t.dataLimite) : '—'}</td>
                    <td className="px-4 py-3 text-xs">{getUserName(t.executanteId)}</td>
                    <td className="px-4 py-3"><Badge label={t.status}/></td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          {/* ATENDIMENTO */}
          {!isExterno && aba==='atendimento' && (
            <div>
              {atendimentoAlteracaoPendente && (
                <Alert
                  type="warning"
                  message="Existe uma alteração neste processo aguardando o registro obrigatório do que foi feito."
                />
              )}
              <div className="mb-4 flex justify-end">
                {podeEditarDadosProcesso && <Btn size="sm" icon={<MessageSquare size={13}/>} onClick={()=>setModalNovaObs(true)}>Novo Atendimento</Btn>}
              </div>
              <div className="space-y-3">
                {(processo.data?.atendimentos||[]).map((a: any,i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">{formatDateTimeBr(a.criadoEm)}</span>
                      <span className="text-xs text-gray-400">Usuário: {getUserName(a.usuarioId)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{a.descricao}</p>
                  </div>
                ))}
                {!processo.data?.atendimentos?.length && <p className="text-gray-400 text-sm text-center py-8">Nenhum atendimento registrado.</p>}
              </div>
            </div>
          )}

          {/* HISTORICO */}
          {aba==='historico' && (
            <div>
              <div className="mb-4 flex justify-end no-print">
                {podeEditarDadosProcesso && <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>setModalHistorico(true)}>Incluir Histórico</Btn>}
              </div>
              <Table headers={['Data','Título / Descrição','Etapa','Tipo','Usuário']}>
                {(historicoData.data||[]).map((h: any, i: number) => (
                  <tr key={h.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTimeBr(h.criadoEm)}</td>
                    <td className="px-4 py-3 text-sm">
                      {h.titulo && <div className="font-medium text-gray-800">{h.titulo}</div>}
                      <div className="text-gray-600 whitespace-pre-line">{h.descricao}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.etapa || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={h.tipo === 'pendencia' ? 'Pendência' : h.tipo === 'pre_analise' ? 'Pré-análise' : 'Histórico'}
                        color={h.tipo === 'pendencia' ? 'bg-yellow-100 text-yellow-700' : h.tipo === 'pre_analise' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.usuarioNome || '—'}</td>
                  </tr>
                ))}
              </Table>
              {!historicoData.data?.length && <p className="text-gray-400 text-sm text-center py-8">Nenhum registro no historico.</p>}
            </div>
          )}

          {/* VINCULO */}
          {aba==='vinculo' && (
            <fieldset disabled={processoTravadoParaExterno} className="grid grid-cols-2 gap-4 disabled:opacity-80">
              <Select label="Parceiro" value={form.parceiroId} onChange={fn('parceiroId')}
                options={(parceiros.data||[]).map(p=>({value:p.id,label:p.nome}))} placeholder="Selecione..."/>
              <Select label="Corretor" value={form.corretorId} onChange={fn('corretorId')}
                options={(corretores.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
              <Select label="Imobiliária" value={form.imobiliariaId} onChange={fn('imobiliariaId')}
                options={(imobiliarias.data||[]).map(i=>({value:i.id,label:i.nome}))} placeholder="Selecione..."/>
              <Select label="Construtora" value={form.construtoraId} onChange={fn('construtoraId')}
                options={(construtoras.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
            </fieldset>
          )}
        </div>
      </Card>

      {isEdicao && (
        <RelatorioImpressao
          id={id}
          form={form}
          isExterno={isExterno}
          bancoRelatorio={bancoRelatorio}
          agenciaRelatorio={agenciaRelatorio}
          modalidadeRelatorio={modalidadeRelatorio}
          situacaoProcessoRelatorio={situacaoProcessoRelatorio}
          etapaAtualRelatorio={etapaAtualRelatorio}
          compradorData={compradorData}
          vendedorData={vendedorData}
          imovelData={imovelData}
          pendencias={pendencias}
          tarefasAbertas={tarefasAbertas}
          getUserName={getUserName}
        />
      )}

      {/* ======= MODALS ======= */}

      {/* Modal Novo Atendimento */}
      <ModalNovoAtendimento
        open={modalNovaObs}
        onClose={()=>setModalNovaObs(false)}
        valor={novaObs}
        onChange={setNovaObs}
        onSalvar={()=>addAtendimento.mutate({processoId:Number(id),descricao:novaObs})}
        loading={addAtendimento.isPending}
        podeSalvar={!!podeEditarDadosProcesso}
      />

      <ModalAtendimentoObrigatorio
        open={modalAtendimentoObrigatorio}
        onClose={()=>{setModalAtendimentoObrigatorio(false); setSaidaPendente(null)}}
        texto={atendimentoObrigatorioTexto}
        onChangeTexto={setAtendimentoObrigatorioTexto}
        loading={addAtendimento.isPending}
        onSalvar={handleSalvarAtendimentoObrigatorio}
      />

      {/* Modal Concluir Etapa */}
      <ModalConcluirEtapa
        open={modalConcluirEtapa}
        onClose={()=>setModalConcluirEtapa(false)}
        observacao={concluirEtapaObs}
        onChangeObservacao={setConcluirEtapaObs}
        proximoResponsavelId={proximoResponsavelEtapaId}
        onChangeProximoResponsavelId={setProximoResponsavelEtapaId}
        usuariosInternos={usuariosInternos}
        isExterno={isExterno}
        podeConcluir={!!(podeGerenciarProcesso || isExterno)}
        loading={avancarEtapa.isPending}
        onConcluir={()=>{if(concluirEtapaTarget) avancarEtapa.mutate({
          ...concluirEtapaTarget,
          observacao:concluirEtapaObs||undefined,
          proximoResponsavelId: isExterno ? undefined : proximoResponsavelEtapaId,
        })}}
      />

      {/* Modal Etapa Pendente */}
      <ModalPendenteEtapa
        open={modalPendenteEtapa}
        onClose={()=>setModalPendenteEtapa(false)}
        observacao={pendenteEtapaObs}
        onChangeObservacao={setPendenteEtapaObs}
        podeSalvar={!!podeEditarDadosProcesso}
        loading={marcarEtapaPendente.isPending}
        onSalvar={()=>{if(pendenteEtapaTarget && pendenteEtapaObs.trim()) marcarEtapaPendente.mutate({...pendenteEtapaTarget, observacao: pendenteEtapaObs.trim()})}}
      />

      {/* Modal Incluir Histórico */}
      <ModalHistorico
        open={modalHistorico}
        onClose={()=>setModalHistorico(false)}
        form={historicoForm}
        onChangeForm={setHistoricoForm}
        podeEditar={!!podeEditarDadosProcesso}
        loading={criarHistorico.isPending}
        onSalvar={()=>{if(historicoForm.titulo && historicoForm.descricao) criarHistorico.mutate({processoId:Number(id),titulo:historicoForm.titulo,descricao:historicoForm.descricao})}}
      />

      {/* Modal Incluir Comprador */}
      <ModalIncluirCliente
        tipo="Comprador"
        open={modalComprador}
        onClose={()=>setModalComprador(false)}
        busca={buscaCliente}
        onChangeBusca={setBuscaCliente}
        modoManual={modoManual}
        onChangeModoManual={setModoManual}
        clientesQuery={clientesCompradores}
        idsJaVinculados={form.compradoresIds}
        onSelecionarCliente={handleAddComprador}
        clienteManualNome={clienteManualNome}
        onChangeClienteManualNome={setClienteManualNome}
        clienteManualCpf={clienteManualCpf}
        onChangeClienteManualCpf={setClienteManualCpf}
        loadingCriar={criarCliente.isPending}
        onCriarCliente={handleCriarClienteComprador}
      />

      {/* Modal Incluir Vendedor */}
      <ModalIncluirCliente
        tipo="Vendedor"
        open={modalVendedor}
        onClose={()=>setModalVendedor(false)}
        busca={buscaCliente}
        onChangeBusca={setBuscaCliente}
        modoManual={modoManual}
        onChangeModoManual={setModoManual}
        clientesQuery={clientesVendedores}
        idsJaVinculados={form.vendedoresIds}
        onSelecionarCliente={handleAddVendedor}
        clienteManualNome={clienteManualNome}
        onChangeClienteManualNome={setClienteManualNome}
        clienteManualCpf={clienteManualCpf}
        onChangeClienteManualCpf={setClienteManualCpf}
        loadingCriar={criarCliente.isPending}
        onCriarCliente={handleCriarClienteVendedor}
      />

      {/* Modal Incluir Imovel */}
      <ModalIncluirImovel
        open={modalImovel}
        onClose={()=>setModalImovel(false)}
        busca={buscaImovel}
        onChangeBusca={setBuscaImovel}
        modoManual={modoManualImovel}
        onChangeModoManual={setModoManualImovel}
        imoveisFiltrados={filteredImoveis}
        imoveisIdsVinculados={form.imoveisIds}
        onSelecionarImovel={handleAddImovel}
        imovelForm={imovelForm}
        onChangeImovelForm={setImovelForm}
        loadingCriar={criarImovel.isPending}
        onCriarImovel={handleCriarImovel}
      />

      {/* Modal Obs Etapa */}
      <ModalObsEtapa
        open={modalObsEtapa}
        onClose={()=>setModalObsEtapa(false)}
        observacao={etapaObsTexto}
        onChangeObservacao={setEtapaObsTexto}
        podeEditar={!!podeEditarDadosProcesso}
        loading={atualizarObsEtapa.isPending}
        onSalvar={()=>{if(etapaObsTarget)atualizarObsEtapa.mutate({...etapaObsTarget,observacao:etapaObsTexto})}}
      />

      {/* Modal Nova Tarefa */}
      <ModalNovaTarefa
        open={modalTarefa}
        onClose={()=>setModalTarefa(false)}
        form={tarefaForm}
        onChangeForm={setTarefaForm}
        usuariosExecutantes={usuariosExecutantesTarefa}
        podeCriar={!!podeCriarTarefa}
        loading={criarTarefa.isPending}
        onCriar={handleCriarTarefa}
      />

      <DocumentoPreview documento={documentoPreview} onClose={()=>setDocumentoPreview(null)} />
    </div>
  )
}
