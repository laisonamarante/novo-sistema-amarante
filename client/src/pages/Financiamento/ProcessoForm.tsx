import { usePermissoes } from '../../lib/permissoes'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { Input, Select, Textarea, Btn, Card, Spinner, Alert, Badge, Table, Modal } from '../../components/ui'
import { ArrowLeft, Save, Printer, CheckCircle, Upload, Plus, MessageSquare, Trash2, Search, Eye, FileText, AlertTriangle } from 'lucide-react'

type Aba = 'dadosGerais'|'valores'|'comprador'|'vendedor'|'imovel'|'etapas'|'historico'|'documentacao'|'vinculo'|'tarefas'|'atendimento'

const SECOES_DOC = ['Comprador - Pessoa Física','Comprador - Pessoa Jurídica','Vendedor - Pessoa Física','Vendedor - Pessoa Jurídica','Imóvel','Formulários'] as const

const fmtDate = (d: any) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yyyy = dt.getFullYear();
  return dd+"/"+mm+"/"+yyyy;
};
const fmtDateTime = (d: any) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2,"0");
  const mi = String(dt.getMinutes()).padStart(2,"0");
  const ss = String(dt.getSeconds()).padStart(2,"0");
  return dd+"/"+mm+"/"+yyyy+" "+hh+":"+mi+":"+ss;
};

export function ProcessoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdicao = Boolean(id && id !== 'novo')
  const { pode } = usePermissoes()
  const [aba, setAba] = useState<Aba>('dadosGerais')
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modalNovaObs, setModalNovaObs] = useState(false)
  const [novaObs, setNovaObs]           = useState('')

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
  const [imovelForm, setImovelForm] = useState({ matricula:'', endereco:'', numero:'', bairro:'', cidade:'', uf:'', cep:'' })

  // --- Etapa modals ---
  const [modalObsEtapa, setModalObsEtapa] = useState(false)
  const [etapaObsTarget, setEtapaObsTarget] = useState<{processoId:number;etapaId:number}|null>(null)
  const [etapaObsTexto, setEtapaObsTexto]   = useState('')

  // --- Concluir Etapa modal ---
  const [modalConcluirEtapa, setModalConcluirEtapa] = useState(false)
  const [concluirEtapaTarget, setConcluirEtapaTarget] = useState<{processoId:number;etapaId:number}|null>(null)
  const [concluirEtapaObs, setConcluirEtapaObs] = useState('')
  const [concluirEtapaResp, setConcluirEtapaResp] = useState(0)

  // --- Tarefa modal ---
  const [modalTarefa, setModalTarefa]   = useState(false)
  const [tarefaForm, setTarefaForm]     = useState({ executanteId:0, solicitacao:'', dataLimite:'' })
  const [filtroStatusTarefa, setFiltroStatusTarefa] = useState<string|null>(null)

  // --- Pendência ---
  const [novaPendencia, setNovaPendencia] = useState('')

  // --- Histórico modal ---
  const [modalHistorico, setModalHistorico] = useState(false)
  const [historicoForm, setHistoricoForm] = useState({ titulo:'', descricao:'' })

  // --- Documentação: seção selecionada para upload ---
  const [uploadSecao, setUploadSecao] = useState('Formulários')

  const [form, setForm] = useState({
    bancoId:0, agenciaId:0, modalidadeId:0, fluxoId:0, situacaoId:0,
    encaminhamento:'', responsavelId:0, dataEmissaoContrato:'', dataAssinatura:'',
    dataPagtoVendedor:'', dataRemuneracao:'', numProposta:'', numContrato:'',
    observacao:'', reprovado:false, pausado:false,
    valorCompraVenda:'0,00', valorAvaliacao:'0,00', valorRecursoProprio:'0,00',
    valorSubsidio:'0,00', valorFgts:'0,00', valorIq:'0,00',
    valorFinanciado:'0,00', valorParcela:'0,00', numeroParcelas:0,
    valorDespesas:'0,00', remuneracaoPerc:'0', remuneracaoValor:'0,00',
    taxa:'', tipoAmortizacao:'SAC' as 'SAC'|'PRICE', tipoImovel:'Novo' as 'Novo'|'Usado',
    parceiroId:0, corretorId:0, imobiliariaId:0, constutoraId:0,
    compradoresIds:[] as number[], vendedoresIds:[] as number[], imoveisIds:[] as number[],
  })

  const bancos      = trpc.cadastros.bancos.listar.useQuery()
  const agencias    = trpc.cadastros.agencias.listar.useQuery({ bancoId: form.bancoId || undefined })
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
    { enabled: isEdicao && form.fluxoId > 0 }
  )

  const criar    = trpc.processos.criar.useMutation({ onSuccess: (d) => navigate(`/financiamento/processos/${d.id}`) })
  const atualizar = trpc.processos.atualizar.useMutation({ onSuccess: () => { setSucesso('Salvo!'); setTimeout(()=>setSucesso(''),3000); utils.processos.buscar.invalidate({id:Number(id)}) }})
  const addAtendimento = trpc.processos.adicionarAtendimento.useMutation({ onSuccess: () => { utils.processos.buscar.invalidate({id:Number(id)}); setNovaObs(''); setModalNovaObs(false) }})
  const avancarEtapa = trpc.processos.avancarEtapa.useMutation({ onSuccess: () => { utils.processos.buscar.invalidate({id:Number(id)}); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setSucesso('Etapa concluida!'); setTimeout(()=>setSucesso(''),3000); setModalConcluirEtapa(false); setConcluirEtapaObs(''); setConcluirEtapaResp(0) }})
  const atualizarObsEtapa = trpc.processos.atualizarObsEtapa.useMutation({ onSuccess: () => { utils.processos.buscar.invalidate({id:Number(id)}); setModalObsEtapa(false); setEtapaObsTexto('') }})
  const criarCliente = trpc.clientes.criar.useMutation()
  const criarImovel  = trpc.cadastros.imoveis.criar.useMutation()
  const criarTarefa  = trpc.tarefas.criar.useMutation({ onSuccess: () => { utils.processos.buscar.invalidate({id:Number(id)}); setModalTarefa(false); setTarefaForm({executanteId:0,solicitacao:'',dataLimite:''}) }})
  const adicionarDocumento = trpc.processos.adicionarDocumento.useMutation({ onSuccess: () => utils.processos.buscar.invalidate({id:Number(id)}) })
  const excluirDocumento   = trpc.processos.excluirDocumento.useMutation({ onSuccess: () => utils.processos.buscar.invalidate({id:Number(id)}) })
  const registrarPendencia = trpc.processos.registrarPendencia.useMutation({ onSuccess: () => { utils.processos.buscar.invalidate({id:Number(id)}); utils.processos.historico.listar.invalidate({processoId:Number(id)}); setNovaPendencia(''); setSucesso('Pendencia registrada!'); setTimeout(()=>setSucesso(''),3000) }})
  const criarHistorico = trpc.processos.historico.criar.useMutation({ onSuccess: () => { utils.processos.historico.listar.invalidate({processoId:Number(id)}); setModalHistorico(false); setHistoricoForm({titulo:'',descricao:''}) }})
  const setProponente = trpc.processos.setProponente.useMutation({ onSuccess: () => utils.processos.buscar.invalidate({id:Number(id)}) })

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
        numProposta: p.numProposta||'', numContrato: p.numContrato||'',
        observacao: p.observacao||'', reprovado: p.reprovado||false,
        valorCompraVenda: String(p.valorCompraVenda||'0,00'), valorAvaliacao: String(p.valorAvaliacao||'0,00'),
        valorRecursoProprio: String(p.valorRecursoProprio||'0,00'), valorSubsidio: String(p.valorSubsidio||'0,00'),
        valorFgts: String(p.valorFgts||'0,00'), valorIq: String(p.valorIq||'0,00'),
        valorFinanciado: String(p.valorFinanciado||'0,00'), valorParcela: String(p.valorParcela||'0,00'),
        numeroParcelas: p.numeroParcelas||0,
        valorDespesas: String((p as any).valorDespesas||'0,00'),
        remuneracaoPerc: String((p as any).remuneracaoPerc||'0'),
        remuneracaoValor: String((p as any).remuneracaoValor||'0,00'),
        parceiroId: p.parceiroId||0, corretorId: p.corretorId||0,
        imobiliariaId: p.imobiliariaId||0, constutoraId: p.constutoraId||0,
        compradoresIds: (p.compradores||[]).map((c: any) => c.cliente?.id).filter(Boolean) as number[],
        vendedoresIds: (p.vendedores||[]).map((v: any) => v.cliente?.id).filter(Boolean) as number[],
        imoveisIds: (p.imoveis||[]).map((i: any) => i.imovel?.id).filter(Boolean) as number[],
      }))
    }
  }, [processo.data])

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}))
  const fn = (k: string) => (e: React.ChangeEvent<any>) => setForm(p=>({...p,[k]:Number(e.target.value)}))

  // Auto-calculate remuneracaoValor when remuneracaoPerc or valorFinanciado changes
  useEffect(() => {
    const perc = parseFloat(String(form.remuneracaoPerc).replace(',','.')) || 0
    const financiado = parseFloat(String(form.valorFinanciado).replace(',','.')) || 0
    if (perc > 0 && financiado > 0) {
      const valor = (perc / 100) * financiado
      setForm(p => ({...p, remuneracaoValor: valor.toFixed(2).replace('.',',')}))
    }
  }, [form.remuneracaoPerc, form.valorFinanciado])

  const handleSalvar = () => {
    setErro('')
    if (!form.bancoId) return setErro('Banco eh obrigatorio')
    const { pausado, taxa, tipoAmortizacao, tipoImovel, ...formData } = form
    // Limpar campos vazios/datas vazias para nao dar erro no MySQL
    const cleaned: any = { ...formData }
    for (const k of Object.keys(cleaned)) {
      if (cleaned[k] === '') cleaned[k] = undefined
      if (cleaned[k] === 0 && k !== 'bancoId') cleaned[k] = undefined
    }
    // Converter valores decimais de virgula para ponto
    const decimalFields = ['valorCompraVenda','valorAvaliacao','valorRecursoProprio','valorSubsidio','valorFgts','valorIq','valorFinanciado','valorParcela','valorDespesas','remuneracaoPerc','remuneracaoValor']
    for (const dk of decimalFields) {
      if (cleaned[dk]) cleaned[dk] = String(cleaned[dk]).replace(',', '.')
    }
    if (isEdicao) atualizar.mutate({ id: Number(id), ...cleaned })
    else criar.mutate(cleaned)
  }

  const abas: {id:Aba;label:string}[] = [
    {id:'dadosGerais',label:'Dados Gerais'},{id:'valores',label:'Valores'},
    {id:'comprador',label:'Comprador'},{id:'vendedor',label:'Vendedor'},
    {id:'imovel',label:'Imóvel'},{id:'etapas',label:'Etapas'},
    {id:'historico',label:'Histórico'},{id:'documentacao',label:'Documentação'},
    {id:'vinculo',label:'Vínculo'},{id:'tarefas',label:'Tarefas'},
    {id:'atendimento',label:'Atendimento'},
  ]

  const etapaAtual = processo.data?.etapas?.find((e: any) => !e.etapa.concluido)

  const getUserName = (uid: number|null|undefined) => {
    if (!uid) return '—'
    const u = (usuarios.data||[]).find((u: any) => u.id === uid)
    return u ? u.nome : String(uid)
  }

  const compradorData = (processo.data?.compradores||[]).map((c: any) => ({...c.cliente, proponente: c.proponente})).filter((c:any)=>c?.id)
  const vendedorData  = (processo.data?.vendedores||[]).map((v: any) => ({...v.cliente, proponente: v.proponente})).filter((v:any)=>v?.id)
  const imovelData    = (processo.data?.imoveis||[]).map((i: any) => i.imovel).filter(Boolean)

  // Pendências do histórico
  const pendencias = (historicoData.data || []).filter((h: any) => h.tipo === 'pendencia')

  const handleAddComprador = async (clienteId: number) => {
    if (form.compradoresIds.includes(clienteId)) return
    const newIds = [...form.compradoresIds, clienteId]
    setForm(p => ({...p, compradoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), compradoresIds: newIds })
    setModalComprador(false); setBuscaCliente(''); setModoManual(false)
  }

  const handleAddVendedor = async (clienteId: number) => {
    if (form.vendedoresIds.includes(clienteId)) return
    const newIds = [...form.vendedoresIds, clienteId]
    setForm(p => ({...p, vendedoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), vendedoresIds: newIds })
    setModalVendedor(false); setBuscaCliente(''); setModoManual(false)
  }

  const handleRemoveComprador = (clienteId: number) => {
    const newIds = form.compradoresIds.filter(cid => cid !== clienteId)
    setForm(p => ({...p, compradoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), compradoresIds: newIds })
  }

  const handleRemoveVendedor = (clienteId: number) => {
    const newIds = form.vendedoresIds.filter(vid => vid !== clienteId)
    setForm(p => ({...p, vendedoresIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), vendedoresIds: newIds })
  }

  const handleCriarClienteComprador = async () => {
    if (!clienteManualNome || !clienteManualCpf) return
    try {
      const result = await criarCliente.mutateAsync({ tipo: 'Comprador', nome: clienteManualNome, cpfCnpj: clienteManualCpf })
      handleAddComprador(result.id)
      setClienteManualNome(''); setClienteManualCpf('')
    } catch {}
  }

  const handleCriarClienteVendedor = async () => {
    if (!clienteManualNome || !clienteManualCpf) return
    try {
      const result = await criarCliente.mutateAsync({ tipo: 'Vendedor', nome: clienteManualNome, cpfCnpj: clienteManualCpf })
      handleAddVendedor(result.id)
      setClienteManualNome(''); setClienteManualCpf('')
    } catch {}
  }

  const handleAddImovel = (imovelId: number) => {
    if (form.imoveisIds.includes(imovelId)) return
    const newIds = [...form.imoveisIds, imovelId]
    setForm(p => ({...p, imoveisIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), imoveisIds: newIds })
    setModalImovel(false); setBuscaImovel(''); setModoManualImovel(false)
  }

  const handleRemoveImovel = (imovelId: number) => {
    const newIds = form.imoveisIds.filter(iid => iid !== imovelId)
    setForm(p => ({...p, imoveisIds: newIds}))
    if (isEdicao) atualizar.mutate({ id: Number(id), imoveisIds: newIds })
  }

  const handleCriarImovel = async () => {
    if (!imovelForm.endereco || !imovelForm.cidade || !imovelForm.uf) return
    try {
      const result = await criarImovel.mutateAsync(imovelForm)
      const newId = (result as any)?.[0]?.insertId || (result as any)?.id
      if (newId) handleAddImovel(newId)
      setImovelForm({ matricula:'', endereco:'', numero:'', bairro:'', cidade:'', uf:'', cep:'' })
    } catch {}
  }

  // Upload handler with secao
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, secao?: string, documentoTipoId?: number) => {
    const files = e.target.files
    if (!files?.length || !isEdicao) return
    const token = localStorage.getItem('token')
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', {
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
          })
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    e.target.value = ''
  }

  const handleCriarTarefa = () => {
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

  // Group documents by secao
  const docsPorSecao = (secao: string) => (processo.data?.documentos||[]).filter((d: any) => (d.secao || 'Geral') === secao || (!d.secao && secao === 'Formulários'))

  if (isEdicao && processo.isLoading) return <div className="flex justify-center py-12"><Spinner/></div>

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          button, .no-print { display: none !important; }
        }
      `}</style>

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
          {(isEdicao ? pode('processo:editar') : pode('processo:criar')) && <Btn size="sm" icon={<Save size={14}/>} loading={criar.isPending||atualizar.isPending} onClick={handleSalvar}>Salvar</Btn>}
        </div>
      </div>

      {erro    && <Alert type="error"   message={erro}    />}
      {sucesso && <Alert type="success" message={sucesso} />}

      <Card className="mt-4 print-area">
        {/* Abas */}
        <div className="border-b flex overflow-x-auto no-print">
          {abas.map(a=>(
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
              <div className="space-y-4 max-w-xl">
                <Select label="Banco" value={form.bancoId} onChange={fn('bancoId')}
                  options={(bancos.data||[]).map(b=>({value:b.id,label:b.nome}))} placeholder="Selecione..."/>
                <Select label="Agência" value={form.agenciaId} onChange={fn('agenciaId')}
                  options={(agencias.data||[]).map(a=>({value:a.id,label:a.nome}))} placeholder="Selecione..."/>
                <Select label="Modalidade" value={form.modalidadeId} onChange={fn('modalidadeId')}
                  options={(modalidades.data||[]).map(m=>({value:m.id,label:m.nome}))} placeholder="Selecione..."/>
                <Select label="Fluxo" value={form.fluxoId} onChange={fn('fluxoId')}
                  options={(fluxos.data||[]).map(f=>({value:f.id,label:f.nome}))} placeholder="Selecione..."/>
                <Select label="Encaminhamento" value={form.encaminhamento} onChange={f('encaminhamento')}
                  options={['CENOP','SICOB','CEHOP','INTERCERVICE','FUNCHAL','FINTECH','ITAÚ'].map(v=>({value:v,label:v}))}/>
                <Select label="Responsável" value={form.responsavelId} onChange={fn('responsavelId')}
                  options={(usuarios.data||[]).map(u=>({value:u.id,label:u.nome}))} placeholder="Selecione..."/>
                <Input label="Data emissão Contrato" type="date" value={form.dataEmissaoContrato} onChange={f('dataEmissaoContrato')}/>
                <Input label="Data de Assinatura" type="date" value={form.dataAssinatura} onChange={f('dataAssinatura')}/>
                <Input label="Data pagto Vendedor" type="date" value={form.dataPagtoVendedor} onChange={f('dataPagtoVendedor')}/>
                <Input label="Nº Proposta" value={form.numProposta} onChange={f('numProposta')}/>
                <Input label="Nº Contrato" value={form.numContrato} onChange={f('numContrato')}/>
                <Input label="Data Remuneração" type="date" value={form.dataRemuneracao} onChange={f('dataRemuneracao')}/>
                <Textarea label="Observação" value={form.observacao} onChange={f('observacao')} rows={3}/>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="reprovado" checked={form.reprovado} onChange={e=>setForm(p=>({...p,reprovado:e.target.checked}))} className="rounded"/>
                  <label htmlFor="reprovado" className="text-sm text-gray-700">Processo Reprovado</label>
                </div>
              </div>

              {/* Pendências */}
              {isEdicao && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-yellow-500"/>
                    Pendencias
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <Textarea value={novaPendencia} onChange={e=>setNovaPendencia(e.target.value)}
                      placeholder="Descreva a pendencia..." rows={2} className="flex-1"/>
                    <Btn size="sm" variant="secondary" loading={registrarPendencia.isPending}
                      onClick={()=>{ if(novaPendencia.trim()) registrarPendencia.mutate({processoId:Number(id),descricao:novaPendencia.trim()}) }}
                      disabled={!novaPendencia.trim()}>
                      Registrar
                    </Btn>
                  </div>
                  {pendencias.length > 0 && (
                    <div className="space-y-2">
                      {pendencias.map((p: any, i: number) => (
                        <div key={p.id || i} className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                          <div className="flex justify-between items-start">
                            <p className="text-gray-700">{p.descricao}</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{fmtDateTime(p.criadoEm)}</span>
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
            <div className="space-y-4 max-w-xl">
              <Input label="Valor de Compra e Venda"  value={form.valorCompraVenda}    onChange={f('valorCompraVenda')}/>
              <Input label="Valor da Avaliação"        value={form.valorAvaliacao}       onChange={f('valorAvaliacao')}/>
              <Input label="Valor Recurso Próprio"     value={form.valorRecursoProprio}  onChange={f('valorRecursoProprio')}/>
              <Input label="Valor do Subsídio"         value={form.valorSubsidio}        onChange={f('valorSubsidio')}/>
              <Input label="Valor FGTS"                value={form.valorFgts}            onChange={f('valorFgts')}/>
              <Input label="Valor do IQ"               value={form.valorIq}              onChange={f('valorIq')}/>
              <Input label="Valor Financiado"          value={form.valorFinanciado}      onChange={f('valorFinanciado')}/>
              <Input label="Valor da Parcela"          value={form.valorParcela}         onChange={f('valorParcela')}/>
              <Input label="Número de Parcelas" type="number" value={form.numeroParcelas} onChange={fn('numeroParcelas')}/>
              <Input label="Taxa de Juros" value={form.taxa} onChange={f('taxa')} placeholder="Ex: 8.5"/>
              <Input label="Valor Despesas (R$)" value={form.valorDespesas} onChange={f('valorDespesas')}/>
              <Input label="Remuneração (%)" value={form.remuneracaoPerc} onChange={f('remuneracaoPerc')} hint="Percentual sobre valor financiado"/>
              <Input label="Remuneração (R$)" value={form.remuneracaoValor} onChange={f('remuneracaoValor')} hint="Calculado automaticamente"/>
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
            </div>
          )}

          {/* COMPRADOR */}
          {aba==='comprador' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Compradores vinculados</h3>
                {isEdicao && <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>{setModalComprador(true);setBuscaCliente('');setModoManual(false);setClienteManualNome('');setClienteManualCpf('')}}>Incluir Comprador</Btn>}
              </div>
              {!isEdicao ? (
                <div className="text-center py-8"><p className="text-gray-400 text-sm mb-3">Salve o processo para vincular compradores.</p><Btn size="sm" onClick={handleSalvar} loading={criar.isPending}>Salvar Processo Agora</Btn></div>
              ) : compradorData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum comprador vinculado.</p>
              ) : (
                <Table headers={['CPF/CNPJ','Nome','Email','Telefone','Proponente','']}>
                  {compradorData.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{c.cpfCnpj}</td>
                      <td className="px-4 py-3 text-sm font-medium">{c.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.fone1 || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={()=>setProponente.mutate({processoId:Number(id),clienteId:c.id,tipo:'comprador',proponente:!c.proponente})} className={c.proponente ? "text-yellow-500" : "text-gray-300"} title="Proponente"><span style={{fontSize:'18px'}}>★</span></button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={()=>handleRemoveComprador(c.id)} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 size={14}/></button>
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
                {isEdicao && <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>{setModalVendedor(true);setBuscaCliente('');setModoManual(false);setClienteManualNome('');setClienteManualCpf('')}}>Incluir Vendedor</Btn>}
              </div>
              {!isEdicao ? (
                <div className="text-center py-8"><p className="text-gray-400 text-sm mb-3">Salve o processo para vincular vendedores.</p><Btn size="sm" onClick={handleSalvar} loading={criar.isPending}>Salvar Processo Agora</Btn></div>
              ) : vendedorData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum vendedor vinculado.</p>
              ) : (
                <Table headers={['CPF/CNPJ','Nome','Email','Telefone','Proponente','']}>
                  {vendedorData.map((v: any) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{v.cpfCnpj}</td>
                      <td className="px-4 py-3 text-sm font-medium">{v.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{v.email || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{v.fone1 || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={()=>setProponente.mutate({processoId:Number(id),clienteId:v.id,tipo:'vendedor',proponente:!v.proponente})} className={v.proponente ? "text-yellow-500" : "text-gray-300"} title="Proponente"><span style={{fontSize:'18px'}}>★</span></button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={()=>handleRemoveVendedor(v.id)} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 size={14}/></button>
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
                {isEdicao && <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>{setModalImovel(true);setBuscaImovel('');setModoManualImovel(false);setImovelForm({matricula:'',endereco:'',numero:'',bairro:'',cidade:'',uf:'',cep:''})}}>Incluir Imóvel</Btn>}
              </div>
              {!isEdicao ? (
                <div className="text-center py-8"><p className="text-gray-400 text-sm mb-3">Salve o processo para vincular imóveis.</p><Btn size="sm" onClick={handleSalvar} loading={criar.isPending}>Salvar Processo Agora</Btn></div>
              ) : imovelData.length === 0 ? (
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
                        <button onClick={()=>handleRemoveImovel(im.id)} className="text-red-500 hover:text-red-700" title="Remover"><Trash2 size={14}/></button>
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
                  {(processo.data?.etapas||[]).map((e: any,i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {e.etapa.concluido
                          ? <CheckCircle size={16} className="text-green-500"/>
                          : <div className="w-4 h-4 rounded-full border-2 border-gray-300"/>}
                      </td>
                      <td className="px-4 py-3 font-medium text-sm">{i+1}. {e.etapaNome}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{e.etapa.observacao||''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.iniciado ? fmtDate(e.etapa.iniciado) : ''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.concluido ? fmtDate(e.etapa.concluido) : ''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.diasDecorridos||0}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{getUserName(e.etapa.usuarioId)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!e.etapa.concluido && (
                            <Btn size="sm" variant="success"
                              onClick={()=>{setConcluirEtapaTarget({processoId:Number(id),etapaId:e.etapa.etapaId});setConcluirEtapaObs('');setConcluirEtapaResp(0);setModalConcluirEtapa(true)}}>
                              Concluir
                            </Btn>
                          )}
                          <Btn size="sm" variant="ghost"
                            onClick={()=>{setEtapaObsTarget({processoId:Number(id),etapaId:e.etapa.etapaId});setEtapaObsTexto(e.etapa.observacao||'');setModalObsEtapa(true)}}>
                            Obs
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          )}

          {/* DOCUMENTACAO */}
          {aba==='documentacao' && (
            <div>
              {!isEdicao ? <p className="text-gray-400 text-sm">Salve o processo primeiro para fazer upload de documentos.</p> : (
                <>
                  {/* Checklist de documentos por fluxo */}
                  {form.fluxoId > 0 && docTiposPorFluxo.data && docTiposPorFluxo.data.length > 0 && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-3">Checklist de Documentos do Fluxo</h4>
                      <div className="space-y-2">
                        {docTiposPorFluxo.data.map((dt: any) => {
                          const uploaded = (processo.data?.documentos||[]).find((d: any) => d.documentoTipoId === dt.id)
                          return (
                            <div key={dt.id} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2">
                                {uploaded
                                  ? <CheckCircle size={16} className="text-green-500"/>
                                  : <div className="w-4 h-4 rounded-full border-2 border-gray-300"/>}
                                <span className={`text-sm ${uploaded ? 'text-green-700' : 'text-gray-700'}`}>
                                  {dt.nome}
                                  {dt.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                                </span>
                              </div>
                              {!uploaded && (
                                <label className="cursor-pointer">
                                  <Btn variant="ghost" size="sm" icon={<Upload size={12}/>}>Upload</Btn>
                                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'Formulários', dt.id)}/>
                                </label>
                              )}
                              {uploaded && (
                                <a href={uploaded.caminhoArquivo} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs">{uploaded.nomeArquivo}</a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Documentos por seção */}
                  {SECOES_DOC.map(secao => {
                    const docs = docsPorSecao(secao)
                    return (
                      <div key={secao} className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <FileText size={14}/>
                            {secao}
                            <span className="text-xs text-gray-400 font-normal">({docs.length})</span>
                          </h4>
                          <label className="cursor-pointer">
                            <Btn variant="secondary" size="sm" icon={<Upload size={14}/>}>Upload</Btn>
                            <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, secao)}/>
                          </label>
                        </div>
                        {docs.length > 0 ? (
                          <Table headers={['Ordem','Documento','Arquivo','Data Upload','Validade','Usuário','']}>
                            {docs.map((d: any, i: number) => (
                              <tr key={d.id || i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{i+1}</td>
                                <td className="px-4 py-3 text-sm font-medium">{d.nomeArquivo}</td>
                                <td className="px-4 py-3">
                                  <a href={d.caminhoArquivo} target="_blank" rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs">{d.nomeArquivo}</a>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(d.criadoEm)}</td>
                                <td className="px-4 py-3 text-xs">{d.dataValidade ? String(d.dataValidade).substring(0,10) : '—'}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{getUserName(d.usuarioId)}</td>
                                <td className="px-4 py-3">
                                  <button onClick={()=>excluirDocumento.mutate({id:d.id})} className="text-red-500 hover:text-red-700 text-xs">Excluir</button>
                                </td>
                              </tr>
                            ))}
                          </Table>
                        ) : (
                          <p className="text-gray-400 text-xs py-2 pl-6">Nenhum documento nesta seção.</p>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          {/* TAREFAS */}
          {aba==='tarefas' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex gap-3 text-xs">
                  {[null,'Pendente','Resolvida','Encerrada'].map(s=>(
                    <button key={s||'todas'} onClick={()=>setFiltroStatusTarefa(s)}
                      className={`px-3 py-1 rounded-full border transition-colors ${filtroStatusTarefa===s?'bg-blue-600 text-white border-blue-600':'text-gray-500 hover:bg-gray-100'}`}>
                      {s||'Todas'}
                    </button>
                  ))}
                </div>
                {isEdicao && <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>setModalTarefa(true)}>Nova Tarefa</Btn>}
              </div>
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
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(t.criadoEm)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.dataLimite ? fmtDate(t.dataLimite) : '—'}</td>
                    <td className="px-4 py-3 text-xs">{getUserName(t.executanteId)}</td>
                    <td className="px-4 py-3"><Badge label={t.status}/></td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          {/* ATENDIMENTO */}
          {aba==='atendimento' && (
            <div>
              <div className="mb-4 flex justify-end">
                <Btn size="sm" icon={<MessageSquare size={13}/>} onClick={()=>setModalNovaObs(true)}>Novo Atendimento</Btn>
              </div>
              <div className="space-y-3">
                {(processo.data?.atendimentos||[]).map((a: any,i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">{fmtDateTime(a.criadoEm)}</span>
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
                <Btn size="sm" icon={<Plus size={13}/>} onClick={()=>setModalHistorico(true)}>Incluir Histórico</Btn>
              </div>
              <Table headers={['Data','Título / Descrição','Etapa','Tipo','Usuário']}>
                {(historicoData.data||[]).map((h: any, i: number) => (
                  <tr key={h.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(h.criadoEm)}</td>
                    <td className="px-4 py-3 text-sm">
                      {h.titulo && <div className="font-medium text-gray-800">{h.titulo}</div>}
                      <div className="text-gray-600">{h.descricao}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.etapa || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={h.tipo === 'pendencia' ? 'Pendência' : 'Histórico'}
                        color={h.tipo === 'pendencia' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}/>
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
            <div className="grid grid-cols-2 gap-4">
              <Select label="Parceiro" value={form.parceiroId} onChange={fn('parceiroId')}
                options={(parceiros.data||[]).map(p=>({value:p.id,label:p.nome}))} placeholder="Selecione..."/>
              <Select label="Corretor" value={form.corretorId} onChange={fn('corretorId')}
                options={(corretores.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
              <Select label="Imobiliária" value={form.imobiliariaId} onChange={fn('imobiliariaId')}
                options={(imobiliarias.data||[]).map(i=>({value:i.id,label:i.nome}))} placeholder="Selecione..."/>
              <Select label="Construtora" value={form.constutoraId} onChange={fn('constutoraId')}
                options={(construtoras.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
            </div>
          )}
        </div>
      </Card>

      {/* ======= MODALS ======= */}

      {/* Modal Novo Atendimento */}
      <Modal title="Novo Atendimento" open={modalNovaObs} onClose={()=>setModalNovaObs(false)}>
        <div className="space-y-4">
          <Textarea label="Descrição" value={novaObs} onChange={e=>setNovaObs(e.target.value)} rows={4} placeholder="Registre o atendimento..."/>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={()=>setModalNovaObs(false)}>Cancelar</Btn>
            <Btn loading={addAtendimento.isPending}
              onClick={()=>addAtendimento.mutate({processoId:Number(id),descricao:novaObs})}>Salvar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Concluir Etapa */}
      <Modal title="Concluir Etapa" open={modalConcluirEtapa} onClose={()=>setModalConcluirEtapa(false)}>
        <div className="space-y-4">
          <Textarea label="Observação" value={concluirEtapaObs} onChange={e=>setConcluirEtapaObs(e.target.value)} rows={3} placeholder="Observação sobre a conclusao..."/>
          <Select label="Responsavel da proxima etapa" value={concluirEtapaResp} onChange={e=>setConcluirEtapaResp(Number(e.target.value))}
            options={(usuarios.data||[]).map(u=>({value:u.id,label:u.nome}))} placeholder="Selecione (opcional)..."/>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={()=>setModalConcluirEtapa(false)}>Cancelar</Btn>
            <Btn variant="success" loading={avancarEtapa.isPending}
              onClick={()=>{if(concluirEtapaTarget) avancarEtapa.mutate({...concluirEtapaTarget, observacao:concluirEtapaObs||undefined, responsavelId:concluirEtapaResp||undefined})}}>
              Concluir Etapa
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Incluir Histórico */}
      <Modal title="Incluir Histórico" open={modalHistorico} onClose={()=>setModalHistorico(false)}>
        <div className="space-y-4">
          <Input label="Titulo *" value={historicoForm.titulo} onChange={e=>setHistoricoForm(p=>({...p,titulo:e.target.value}))} placeholder="Titulo do registro..."/>
          <Textarea label="Descricao *" value={historicoForm.descricao} onChange={e=>setHistoricoForm(p=>({...p,descricao:e.target.value}))} rows={4} placeholder="Descreva..."/>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={()=>setModalHistorico(false)}>Cancelar</Btn>
            <Btn loading={criarHistorico.isPending}
              onClick={()=>{if(historicoForm.titulo && historicoForm.descricao) criarHistorico.mutate({processoId:Number(id),titulo:historicoForm.titulo,descricao:historicoForm.descricao})}}>
              Salvar
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Incluir Comprador */}
      <Modal title="Incluir Comprador" open={modalComprador} onClose={()=>setModalComprador(false)} size="lg">
        <div className="space-y-4">
          {!modoManual ? (
            <>
              <div className="relative">
                <Input label="Buscar por nome ou CPF" value={buscaCliente} onChange={e=>setBuscaCliente(e.target.value)} placeholder="Digite pelo menos 2 caracteres..."/>
                <Search size={14} className="absolute right-3 top-9 text-gray-400"/>
              </div>
              {buscaCliente.length >= 2 && (
                <div className="border rounded max-h-60 overflow-y-auto">
                  {clientesCompradores.isLoading && <div className="p-3 text-center text-gray-400 text-sm">Buscando...</div>}
                  {clientesCompradores.data?.lista?.length === 0 && <div className="p-3 text-center text-gray-400 text-sm">Nenhum comprador encontrado.</div>}
                  {(clientesCompradores.data?.lista||[]).map((c: any) => (
                    <button key={c.id} onClick={()=>handleAddComprador(c.id)}
                      disabled={form.compradoresIds.includes(c.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 text-sm transition-colors ${form.compradoresIds.includes(c.id)?'opacity-50 bg-gray-50':''}`}>
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-gray-400 ml-2">{c.cpfCnpj}</span>
                      {c.email && <span className="text-gray-400 ml-2 text-xs">{c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t">
                <Btn variant="ghost" size="sm" onClick={()=>setModoManual(true)}>+ Cadastrar novo comprador</Btn>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome *" value={clienteManualNome} onChange={e=>setClienteManualNome(e.target.value)}/>
                <Input label="CPF/CNPJ *" value={clienteManualCpf} onChange={e=>setClienteManualCpf(e.target.value)}/>
              </div>
              <div className="flex justify-between">
                <Btn variant="ghost" size="sm" onClick={()=>setModoManual(false)}>Voltar para busca</Btn>
                <Btn size="sm" loading={criarCliente.isPending} onClick={handleCriarClienteComprador}>Cadastrar e vincular</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Incluir Vendedor */}
      <Modal title="Incluir Vendedor" open={modalVendedor} onClose={()=>setModalVendedor(false)} size="lg">
        <div className="space-y-4">
          {!modoManual ? (
            <>
              <div className="relative">
                <Input label="Buscar por nome ou CPF" value={buscaCliente} onChange={e=>setBuscaCliente(e.target.value)} placeholder="Digite pelo menos 2 caracteres..."/>
                <Search size={14} className="absolute right-3 top-9 text-gray-400"/>
              </div>
              {buscaCliente.length >= 2 && (
                <div className="border rounded max-h-60 overflow-y-auto">
                  {clientesVendedores.isLoading && <div className="p-3 text-center text-gray-400 text-sm">Buscando...</div>}
                  {clientesVendedores.data?.lista?.length === 0 && <div className="p-3 text-center text-gray-400 text-sm">Nenhum vendedor encontrado.</div>}
                  {(clientesVendedores.data?.lista||[]).map((c: any) => (
                    <button key={c.id} onClick={()=>handleAddVendedor(c.id)}
                      disabled={form.vendedoresIds.includes(c.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 text-sm transition-colors ${form.vendedoresIds.includes(c.id)?'opacity-50 bg-gray-50':''}`}>
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-gray-400 ml-2">{c.cpfCnpj}</span>
                      {c.email && <span className="text-gray-400 ml-2 text-xs">{c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t">
                <Btn variant="ghost" size="sm" onClick={()=>setModoManual(true)}>+ Cadastrar novo vendedor</Btn>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome *" value={clienteManualNome} onChange={e=>setClienteManualNome(e.target.value)}/>
                <Input label="CPF/CNPJ *" value={clienteManualCpf} onChange={e=>setClienteManualCpf(e.target.value)}/>
              </div>
              <div className="flex justify-between">
                <Btn variant="ghost" size="sm" onClick={()=>setModoManual(false)}>Voltar para busca</Btn>
                <Btn size="sm" loading={criarCliente.isPending} onClick={handleCriarClienteVendedor}>Cadastrar e vincular</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Incluir Imovel */}
      <Modal title="Incluir Imóvel" open={modalImovel} onClose={()=>setModalImovel(false)} size="lg">
        <div className="space-y-4">
          {!modoManualImovel ? (
            <>
              <div className="relative">
                <Input label="Buscar por matricula, endereco ou cidade" value={buscaImovel} onChange={e=>setBuscaImovel(e.target.value)} placeholder="Digite para filtrar..."/>
                <Search size={14} className="absolute right-3 top-9 text-gray-400"/>
              </div>
              <div className="border rounded max-h-60 overflow-y-auto">
                {filteredImoveis.length === 0 && <div className="p-3 text-center text-gray-400 text-sm">Nenhum imóvel encontrado.</div>}
                {filteredImoveis.slice(0, 20).map((im: any) => (
                  <button key={im.id} onClick={()=>handleAddImovel(im.id)}
                    disabled={form.imoveisIds.includes(im.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 text-sm transition-colors ${form.imoveisIds.includes(im.id)?'opacity-50 bg-gray-50':''}`}>
                    <span className="font-medium">{im.matricula ? `[${im.matricula}] ` : ''}{im.endereco}{im.numero ? `, ${im.numero}` : ''}</span>
                    <span className="text-gray-400 ml-2">{im.cidade}/{im.uf}</span>
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t">
                <Btn variant="ghost" size="sm" onClick={()=>setModoManualImovel(true)}>+ Cadastrar novo imovel</Btn>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Matrícula" value={imovelForm.matricula} onChange={e=>setImovelForm(p=>({...p,matricula:e.target.value}))}/>
                <Input label="Endereço *" value={imovelForm.endereco} onChange={e=>setImovelForm(p=>({...p,endereco:e.target.value}))}/>
                <Input label="Numero" value={imovelForm.numero} onChange={e=>setImovelForm(p=>({...p,numero:e.target.value}))}/>
                <Input label="Bairro" value={imovelForm.bairro} onChange={e=>setImovelForm(p=>({...p,bairro:e.target.value}))}/>
                <Input label="Cidade *" value={imovelForm.cidade} onChange={e=>setImovelForm(p=>({...p,cidade:e.target.value}))}/>
                <Input label="UF *" value={imovelForm.uf} onChange={e=>setImovelForm(p=>({...p,uf:e.target.value}))} maxLength={2}/>
                <Input label="CEP" value={imovelForm.cep} onChange={e=>setImovelForm(p=>({...p,cep:e.target.value}))}/>
              </div>
              <div className="flex justify-between">
                <Btn variant="ghost" size="sm" onClick={()=>setModoManualImovel(false)}>Voltar para busca</Btn>
                <Btn size="sm" loading={criarImovel.isPending} onClick={handleCriarImovel}>Cadastrar e vincular</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Obs Etapa */}
      <Modal title="Observação da Etapa" open={modalObsEtapa} onClose={()=>setModalObsEtapa(false)}>
        <div className="space-y-4">
          <Textarea label="Observação" value={etapaObsTexto} onChange={e=>setEtapaObsTexto(e.target.value)} rows={4} placeholder="Adicione uma observacao..."/>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={()=>setModalObsEtapa(false)}>Cancelar</Btn>
            <Btn loading={atualizarObsEtapa.isPending}
              onClick={()=>{if(etapaObsTarget)atualizarObsEtapa.mutate({...etapaObsTarget,observacao:etapaObsTexto})}}>
              Salvar
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Nova Tarefa */}
      <Modal title="Nova Tarefa" open={modalTarefa} onClose={()=>setModalTarefa(false)}>
        <div className="space-y-4">
          <Select label="Executante *" value={tarefaForm.executanteId} onChange={e=>setTarefaForm(p=>({...p,executanteId:Number(e.target.value)}))}
            options={(usuarios.data||[]).map(u=>({value:u.id,label:u.nome}))} placeholder="Selecione..."/>
          <Textarea label="Solicitacao *" value={tarefaForm.solicitacao} onChange={e=>setTarefaForm(p=>({...p,solicitacao:e.target.value}))} rows={4} placeholder="Descreva a tarefa..."/>
          <Input label="Data Limite" type="date" value={tarefaForm.dataLimite} onChange={e=>setTarefaForm(p=>({...p,dataLimite:e.target.value}))}/>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={()=>setModalTarefa(false)}>Cancelar</Btn>
            <Btn loading={criarTarefa.isPending} onClick={handleCriarTarefa}>Criar Tarefa</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
