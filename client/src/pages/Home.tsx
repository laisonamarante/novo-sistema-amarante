import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useAuth } from '../lib/auth'
import { usePermissoes } from '../lib/permissoes'
import { CheckCircle, Plus, ExternalLink, Trash2, Edit, UserPlus, Hand, Eye } from 'lucide-react'
import { Btn, Modal, Input, Select, Badge, Spinner } from '../components/ui'

const simuladores = [
  { nome: 'Banco do Brasil', url: 'https://cim-simulador-imovelproprio.apps.bb.com.br/simulacao-imobiliario/sobre-imovel', cor: 'bg-yellow-400', texto: 'text-blue-900' },
  { nome: 'Bradesco',        url: 'https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/encontre-seu-credito/simuladores-imoveis.shtm#box1-comprar', cor: 'bg-red-700', texto: 'text-white' },
  { nome: 'Itau',            url: 'https://www.itau.com.br/emprestimos-financiamentos#emprestimoOnlineSeg', cor: 'bg-orange-500', texto: 'text-white' },
]

const portais = [
  { nome: 'Bradesco',        url: 'https://wspf.banco.bradesco/wsImoveis/AreaRestrita/Default.aspx?ReturnUrl=%2fwsImoveis%2fAreaRestrita%2fConteudo%2fHome.aspx', cor: 'bg-red-700 text-white' },
  { nome: 'Funchal',         url: 'https://formalizabra.creditoimobiliario.funchalnegocios.com.br/', cor: 'bg-orange-500 text-white' },
  { nome: 'Digisac',         url: 'https://amarantecoban.digisac.app/login', cor: 'bg-blue-500 text-white' },
  { nome: 'Crediblue',       url: 'https://crediblue.azo.blue/', cor: 'bg-cyan-600 text-white' },
  { nome: 'CashMe',          url: 'https://institucional.cashme.com.br/login#ut=CASHMEMBER&ru=https://institucional.cashme.com.br/cashmember&pr=PORTAL_CASHMEMBER', cor: 'bg-green-600 text-white' },
  { nome: 'Trello',          url: 'https://trello.com/b/V1WO9JNa', cor: 'bg-blue-600 text-white' },
  { nome: 'Brasilseg',       url: 'https://portal-parceiros.cld.brasilseg.com.br', cor: 'bg-yellow-500 text-blue-900' },
  { nome: 'BB Parceiros',    url: 'https://correspondente.bb.com.br/cbo-portal-acesso/#/login', cor: 'bg-yellow-400 text-blue-900' },
  { nome: 'Itau Imoveis',    url: 'https://plataformaitauimoveis.cloud.itau.com.br/Portal', cor: 'bg-orange-500 text-white' },
  { nome: 'Bari',            url: 'https://portal.parceirosbari.com.br/', cor: 'bg-gray-800 text-white' },
  { nome: 'C6Bank',          url: 'https://c6imobiliario.com.br/simulacao?parceiro=29082442000106', cor: 'bg-black text-white' },
  { nome: 'Libra Credito',   url: 'https://parceiros.libracredito.com.br/', cor: 'bg-blue-800 text-white' },
  { nome: 'HubSpot PF',      url: 'https://share.hsforms.com/1YgeKqRIMRQW-KClSp7ZW0wecp7j', cor: 'bg-orange-600 text-white' },
  { nome: 'HubSpot PJ',      url: 'https://share.hsforms.com/1wmGWD_KZQYCiDmI_Yirw8Aecp7j', cor: 'bg-orange-600 text-white' },
  { nome: 'Nexoos',          url: 'https://parceiro.nexoos.com.br/', cor: 'bg-blue-500 text-white' },
  { nome: 'Makasi',          url: 'https://auth.makasi.com.br/login', cor: 'bg-gray-700 text-white' },
  { nome: 'Creditas',        url: 'https://parceiros.creditas.com.br/', cor: 'bg-green-600 text-white' },
  { nome: 'Daycoval',        url: 'https://creditoimobiliario.daycoval.com.br', cor: 'bg-blue-700 text-white' },
  { nome: 'Pontte',          url: 'https://bit.ly/LeadParceiroHE', cor: 'bg-teal-600 text-white' },
]

const SITUACOES = ['Em analise', 'Aguardando análise'] as const
const BANCOS_FILTRO = ['BB', 'Bradesco', 'Itau'] as const

type FiltroStatus = 'pendente' | 'resolvida' | 'todas'

export function Home() {
  const { pode, isExterno } = usePermissoes()
  const { usuario } = useAuth()
  const [modalPreAnalise, setModalPreAnalise] = useState(false)
  const [modalTarefa, setModalTarefa] = useState(false)
  const [modalAtribuir, setModalAtribuir] = useState(false)
  const [processoSelecionado, setProcessoSelecionado] = useState<number | null>(null)

  // Filtros Pré-Análise
  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([])
  const [filtroBancos, setFiltroBancos] = useState<string[]>([])

  // Filtros Tarefas
  const [filtroRecebidas, setFiltroRecebidas] = useState<FiltroStatus>('pendente')
  const [filtroCriadas, setFiltroCriadas] = useState<FiltroStatus>('pendente')

  const tarefasRecebidas = trpc.tarefas.minhasTarefas.useQuery({ filtroStatus: filtroRecebidas })
  const tarefasCriadas = trpc.tarefas.minhasTarefas.useQuery({ filtroStatus: filtroCriadas })
  const preAnalise = trpc.preAnalise.listar.useQuery({ pagina: 1 })
  const coban = trpc.processos.analiseCoban.useQuery()
  const meusProcessos = trpc.processos.meusProcessos.useQuery()
  const utils = trpc.useUtils()

  const [tarefaDetalhe, setTarefaDetalhe] = useState<any>(null)
  const concluirTarefa = trpc.tarefas.concluir.useMutation({
    onSuccess: () => utils.tarefas.minhasTarefas.invalidate()
  })
  const excluirPreAnalise = trpc.preAnalise.excluir.useMutation({
    onSuccess: () => utils.preAnalise.listar.invalidate()
  })
  const pegarProcesso = trpc.processos.pegarProcesso.useMutation({
    onSuccess: () => utils.processos.analiseCoban.invalidate()
  })

  // Filtro client-side pre-analise
  const preAnaliseFiltrada = (preAnalise.data || []).filter(p => {
    if (filtroSituacao.length > 0 && !filtroSituacao.includes(p.situacao || 'Aguardando análise')) return false
    if (filtroBancos.length > 0) {
      const bancosItem = (p.bancos || '').split(',').map((b: string) => b.trim())
      if (!filtroBancos.some(fb => bancosItem.some((bi: string) => bi.toLowerCase().includes(fb.toLowerCase())))) return false
    }
    return true
  })

  const toggleFiltro = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  return (
    <div className="space-y-6">
      {/* Saudacao */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
        <h2 className="text-lg font-bold">Olá, {usuario?.nome?.split(' ')[0]}!</h2>
        <p className="text-blue-200 text-sm mt-1">Bem-vindo ao Sistema Amarante — Serviços Financeiros e Imobiliários</p>
      </div>

      {/* Simuladores */}
      {pode('home:simuladores') && <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Simuladores</h3>
        <div className="grid grid-cols-3 gap-4">
          {simuladores.map(s => (
            <a key={s.nome} href={s.url} target="_blank" rel="noopener noreferrer"
              className={`${s.cor} ${s.texto} rounded-xl p-4 flex items-center justify-between font-bold text-sm hover:opacity-90 transition-opacity shadow-sm`}>
              {s.nome} <ExternalLink size={14} />
            </a>
          ))}
        </div>
      </section>}

      {/* Acesso ao Portal */}
      {pode('home:portais') && <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Acesso ao Portal</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {portais.map(p => (
            <a key={p.nome} href={p.url} target="_blank" rel="noopener noreferrer"
              className={`${p.cor} rounded-lg px-2 py-2 text-xs font-semibold text-center hover:opacity-80 transition-opacity flex items-center justify-center gap-1`}>
              {p.nome}
            </a>
          ))}
        </div>
      </section>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Pré-Análise ── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Pré-Análise</h3>
            <Btn size="sm" onClick={() => setModalPreAnalise(true)} icon={<Plus size={13} />}>Incluir</Btn>
          </div>
          {/* Filtros */}
          <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Situacao:</span>
              {SITUACOES.map(s => (
                <label key={s} className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={filtroSituacao.includes(s)} onChange={() => toggleFiltro(filtroSituacao, s, setFiltroSituacao)} className="rounded text-blue-600 w-3 h-3" />
                  <span className="text-gray-600">{s}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Banco:</span>
              {BANCOS_FILTRO.map(b => (
                <label key={b} className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={filtroBancos.includes(b)} onChange={() => toggleFiltro(filtroBancos, b, setFiltroBancos)} className="rounded text-blue-600 w-3 h-3" />
                  <span className="text-gray-600">{b}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left">Situacao</th>
                  <th className="px-3 py-2 text-left">CPF/CNPJ</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Banco</th>
                  <th className="px-3 py-2 text-left">Solicitante</th>
                  <th className="px-3 py-2 text-left">Responsavel</th>
                  <th className="px-3 py-2 text-center">Dias</th>
                  <th className="px-3 py-2 text-center">Cod.</th>
                  <th className="px-3 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preAnalise.isLoading && (
                  <tr><td colSpan={10} className="py-6 text-center"><Spinner size={16} /></td></tr>
                )}
                {!preAnalise.isLoading && preAnaliseFiltrada.length === 0 && (
                  <tr><td colSpan={10} className="py-6 text-center text-gray-400">Nenhuma pre-analise encontrada</td></tr>
                )}
                {preAnaliseFiltrada.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Badge label={p.situacao || 'Aguardando'} color={
                        (p.situacao || '').includes('Em analise') ? 'bg-yellow-100 text-yellow-800' :
                        (p.situacao || '').includes('Aguardando') ? 'bg-blue-100 text-blue-800' :
                        undefined
                      } />
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">{p.cpfCnpj}</td>
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[140px] truncate">{p.nome}</td>
                    <td className="px-3 py-2 text-gray-600">R$ {Number(p.valorFinanciamento || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{p.bancos}</td>
                    <td className="px-3 py-2 text-gray-600">{(p as any).solicitanteNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{(p as any).responsavelNome || '-'}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{(p as any).dias ?? '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge label={String(p.id)} color="bg-gray-100 text-gray-600" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/financiamento/pre-analise/${p.id}`} className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => { if (confirm('Excluir esta pre-analise?')) excluirPreAnalise.mutate({ id: p.id }) }}
                          className="text-red-500 hover:text-red-700 p-1" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Tarefas Recebidas ── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
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
                  <th className="px-3 py-2 text-left">Processo</th>
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
                {(tarefasRecebidas.data?.recebidas || []).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setTarefaDetalhe(t)} className="text-blue-500 hover:text-blue-700 mr-1" title="Ver detalhes"><Eye size={16} /></button>
                      <button
                        onClick={() => concluirTarefa.mutate({ id: t.id })}
                        className="text-green-500 hover:text-green-700" title="Concluir">
                        <CheckCircle size={16} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={String(t.id)} color="bg-blue-100 text-blue-700" />
                    </td>
                    <td className="px-3 py-2 text-gray-700">{(t as any).solicitanteNome || t.solicitanteId}</td>
                    <td className="px-3 py-2">
                      {(t as any).processoId ? (
                        <Link to={`/financiamento/processos/${(t as any).processoId}`} className="text-blue-600 hover:underline">
                          #{(t as any).processoId}
                        </Link>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <p className="line-clamp-2">{t.solicitacao}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t flex gap-3">
            {(['pendente', 'resolvida', 'todas'] as FiltroStatus[]).map((f, i) => (
              <span key={f} className="flex items-center gap-3">
                {i > 0 && <span className="text-gray-300">|</span>}
                <button
                  onClick={() => setFiltroRecebidas(f)}
                  className={`text-xs font-medium ${filtroRecebidas === f ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* ── Tarefas Criadas ── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
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
                  <th className="px-3 py-2 text-left">Processo</th>
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
                {(tarefasCriadas.data?.criadas || []).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setTarefaDetalhe(t)} className="text-blue-500 hover:text-blue-700 mr-1" title="Ver detalhes"><Eye size={16} /></button>
                      <button
                        onClick={() => concluirTarefa.mutate({ id: t.id })}
                        className="text-green-500 hover:text-green-700" title="Concluir">
                        <CheckCircle size={16} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={String(t.id)} color="bg-purple-100 text-purple-700" />
                    </td>
                    <td className="px-3 py-2 text-gray-700">{(t as any).executanteNome || t.executanteId}</td>
                    <td className="px-3 py-2">
                      {(t as any).processoId ? (
                        <Link to={`/financiamento/processos/${(t as any).processoId}`} className="text-blue-600 hover:underline">
                          #{(t as any).processoId}
                        </Link>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <p className="line-clamp-2">{t.solicitacao}</p>
                    </td>
                  </tr>
                ))}
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
        </section>

        {pode('home:analise_coban') && <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
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
                        <button
                          onClick={() => pegarProcesso.mutate({ id: p.id })}
                          className="text-green-600 hover:text-green-800 text-[10px] flex items-center gap-0.5 font-medium"
                          title="Pegar Processo">
                          <Hand size={12} /> Pegar
                        </button>
                        <span className="text-gray-300 mx-0.5">|</span>
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
      {pode('home:meus_processos') && <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
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
                    <Badge label={p.etapa || 'N/A'} />
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
      <Modal title="Nova Pré-Análise" open={modalPreAnalise} onClose={() => setModalPreAnalise(false)} size="lg">
        <NovaPreAnalise onClose={() => setModalPreAnalise(false)} />
      </Modal>
{tarefaDetalhe && (        <Modal title={`Tarefa #${tarefaDetalhe.id}`} open={!!tarefaDetalhe} onClose={() => setTarefaDetalhe(null)}>          <div className="space-y-3">            <div><strong>Solicitante:</strong> {tarefaDetalhe.solicitanteNome || tarefaDetalhe.solicitanteId}</div>            {tarefaDetalhe.processoId && <div><strong>Processo:</strong> #{tarefaDetalhe.processoId}</div>}            <div><strong>Data:</strong> {new Date(tarefaDetalhe.criadoEm).toLocaleDateString("pt-BR")}</div>            {tarefaDetalhe.dataLimite && <div><strong>Limite:</strong> {new Date(tarefaDetalhe.dataLimite).toLocaleDateString("pt-BR")}</div>}            <div><strong>Solicitacao:</strong></div>            <p className="bg-gray-50 p-3 rounded text-gray-700">{tarefaDetalhe.solicitacao}</p>            {tarefaDetalhe.acompanhamento && (<>              <div><strong>Acompanhamento:</strong></div>              <p className="bg-gray-50 p-3 rounded text-gray-700">{tarefaDetalhe.acompanhamento}</p>            </>)}            <div className="flex justify-end"><Btn variant="ghost" onClick={() => setTarefaDetalhe(null)}>Fechar</Btn></div>          </div>        </Modal>      )}

      <Modal title="Nova Tarefa" open={modalTarefa} onClose={() => setModalTarefa(false)}>
        <NovaTarefa onClose={() => setModalTarefa(false)} />
      </Modal>

      <Modal title="Atribuir Responsavel" open={modalAtribuir} onClose={() => setModalAtribuir(false)}>
        <AtribuirResponsavel processoId={processoSelecionado} onClose={() => { setModalAtribuir(false); setProcessoSelecionado(null) }} />
      </Modal>
    </div>
  )
}

// ── Nova Pré-Análise form ──
function NovaPreAnalise({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({ bancos: '', nome: '', cpfCnpj: '', dataNascimento: '', valorFinanciamento: '', estadoCivil: 'Solteiro', cep: '' })
  const [bancosSel, setBancosSel] = useState<string[]>([])

  const criar = trpc.preAnalise.criar.useMutation({
    onSuccess: () => { utils.preAnalise.listar.invalidate(); onClose() }
  })

  const toggleBanco = (b: string) => setBancosSel(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Banco(s)</label>
        <div className="flex gap-3">
          {['Banco do Brasil', 'Bradesco', 'Itau'].map(b => (
            <label key={b} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={bancosSel.includes(b)} onChange={() => toggleBanco(b)} className="rounded" />
              {b}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
        <Input label="CPF/CNPJ" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} />
        <Input label="Data Nascimento" type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} />
        <Input label="Valor Financiamento" value={form.valorFinanciamento} onChange={e => setForm(f => ({ ...f, valorFinanciamento: e.target.value }))} placeholder="0,00" />
        <Select label="Estado Civil" value={form.estadoCivil} onChange={e => setForm(f => ({ ...f, estadoCivil: e.target.value }))}
          options={[{ value: 'Solteiro', label: 'Solteiro' }, { value: 'Casado', label: 'Casado' }]} />
        <Input label="CEP" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={criar.isPending} onClick={() => { var cleaned = { ...form, bancos: bancosSel.join(',') }; Object.keys(cleaned).forEach(function(k) { if ((cleaned as any)[k] === '') (cleaned as any)[k] = undefined; }); if (cleaned.valorFinanciamento) cleaned.valorFinanciamento = String(cleaned.valorFinanciamento).replace(',','.'); criar.mutate(cleaned as any); }}>Salvar</Btn>
      </div>
    </div>
  )
}

// ── Nova Tarefa form ──
function NovaTarefa({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const usuarios = trpc.cadastros.usuarios.listar.useQuery()
  const [form, setForm] = useState({ executanteId: 0, solicitacao: '', dataLimite: '' })

  const criar = trpc.tarefas.criar.useMutation({
    onSuccess: () => { utils.tarefas.minhasTarefas.invalidate(); onClose() }
  })

  return (
    <div className="space-y-4">
      <Select label="Usuario" value={form.executanteId} onChange={e => setForm(f => ({ ...f, executanteId: Number(e.target.value) }))}
        placeholder="Selecione..."
        options={(usuarios.data || []).map(u => ({ value: u.id, label: u.nome }))} />
      <Input label="Solicitacao" value={form.solicitacao} onChange={e => setForm(f => ({ ...f, solicitacao: e.target.value }))} placeholder="Descreva a tarefa..." />
      <Input label="Data Limite" type="date" value={form.dataLimite} onChange={e => setForm(f => ({ ...f, dataLimite: e.target.value }))} />
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={criar.isPending} onClick={() => criar.mutate(form)}>Salvar</Btn>
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
