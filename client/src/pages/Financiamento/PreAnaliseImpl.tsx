import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { trpc } from "../../lib/trpc"
import { usePermissoes } from "../../lib/permissoes"
import { useAuth } from "../../lib/auth"
import { formatCpfCnpj } from "../../lib/documento"
import { PageHeader, Card, Btn, Modal, Input, Select, Badge, Spinner, Alert } from "../../components/ui"
import { Plus, Edit, Trash2, Eye, FilePlus, ExternalLink } from "lucide-react"

const SITUACOES = ['Em análise', 'Aguardando análise', 'Apto', 'Não apto', 'Concluída'] as const
const BANCOS_FILTRO = ['Banco do Brasil', 'Bradesco', 'Itaú'] as const


const fmtDate = (d: any) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yyyy = dt.getFullYear();
  return dd+"/"+mm+"/"+yyyy;
};

const diasDesde = (d: any) => {
  if (!d) return 0
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return 0
  const diff = Date.now() - dt.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const corSituacao = (situacao?: string) => {
  if ((situacao || '').includes('Em análise')) return 'bg-yellow-100 text-yellow-800'
  if ((situacao || '').includes('Aguardando')) return 'bg-blue-100 text-blue-800'
  if (situacao === 'Apto') return 'bg-green-100 text-green-800'
  if (situacao === 'Não apto') return 'bg-red-100 text-red-800'
  if (situacao === 'Concluída') return 'bg-gray-100 text-gray-600'
  return undefined
}

const normalizarSituacao = (situacao?: string | null) =>
  (situacao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function PreAnalise() {
  const { pode, isExterno } = usePermissoes()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const podeCriarPreAnalise = pode('pre_analise:criar')
  const podeEditarPreAnalise = pode('pre_analise:editar') || pode('pre_analise:concluir')
  const podeExcluirPreAnalise = usuario?.perfil === 'Administrador'
  const podeCriarProcesso = pode('processo:criar')
  const podeAbrirProcesso = pode('menu:processos') || pode('processo:editar') || pode('processo:ver_todos') || podeCriarProcesso
  const podeAcessarPreAnalise = pode('menu:pre_analise') || pode('home:pre_analise')
  const [filtroCpfCnpj, setFiltroCpfCnpj] = useState("")
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([])
  const [filtroBancos, setFiltroBancos] = useState<string[]>([])
  const [filtroSolicitanteId, setFiltroSolicitanteId] = useState<number | undefined>()
  const [filtroResponsavelId, setFiltroResponsavelId] = useState<number | undefined>()
  const [modalNova, setModalNova] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalVisualizar, setModalVisualizar] = useState(false)
  const [selecionada, setSelecionada] = useState<any>(null)
  const [criandoProcessoId, setCriandoProcessoId] = useState<number | null>(null)
  const utils = trpc.useUtils()

  const preAnalise = trpc.preAnalise.listar.useQuery(
    {
      pagina: 1,
      cpfCnpj: filtroCpfCnpj || undefined,
      nome: filtroNome || undefined,
      situacao: filtroSituacao[0] || undefined,
      solicitanteId: filtroSolicitanteId,
      responsavelId: filtroResponsavelId,
    },
    { enabled: podeAcessarPreAnalise }
  )
  const usuarios = trpc.cadastros.usuarios.listar.useQuery(undefined, {
    enabled: podeAcessarPreAnalise && !isExterno,
  })
  const bancosPermitidos = trpc.preAnalise.bancosPermitidos.useQuery(undefined, {
    enabled: podeAcessarPreAnalise,
  })
  const bancosPreAnaliseFiltro: string[] = bancosPermitidos.data
    ? bancosPermitidos.data.map((b: { nome: string }) => b.nome)
    : [...BANCOS_FILTRO]

  const excluir = trpc.preAnalise.excluir.useMutation({
    onSuccess: () => utils.preAnalise.listar.invalidate()
  })
  const criarProcesso = trpc.processos.criarDaPreAnalise.useMutation({
    onSuccess: async (d) => {
      await utils.preAnalise.listar.invalidate()
      navigate(`/financiamento/processos/${d.id}`)
    },
    onSettled: () => setCriandoProcessoId(null),
  })

  const toggleFiltro = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const dados = (preAnalise.data || []).filter(p => {
    if (p.processoId) return false
    if (filtroSituacao.length > 0 && !filtroSituacao.includes(p.situacao || 'Aguardando análise')) return false
    if (filtroBancos.length > 0) {
      const bancosItem = (p.bancos || '').split(',').map((b: string) => b.trim())
      if (!filtroBancos.some(fb => bancosItem.some((bi: string) => bi.toLowerCase().includes(fb.toLowerCase())))) return false
    }
    return true
  })

  const podeTransformarEmProcesso = (item: any) =>
    normalizarSituacao(item.situacao) === 'apto' && !item.processoId && podeCriarProcesso

  const handleCriarProcesso = (item: any) => {
    if (!podeTransformarEmProcesso(item)) return
    setCriandoProcessoId(item.id)
    criarProcesso.mutate({ preAnaliseId: item.id })
  }

  return (
    <>
      <PageHeader title="Pré Análise"
        actions={podeCriarPreAnalise ? <Btn onClick={() => setModalNova(true)}><Plus className="w-4 h-4 mr-1" /> {isExterno ? 'Incluir' : 'Nova Pré-Análise'}</Btn> : undefined} />

      {criarProcesso.error && <Alert type="error" message={criarProcesso.error.message} />}

      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">Banco(s)</span>
            {bancosPreAnaliseFiltro.map(b => (
              <label key={b} className="flex items-center gap-1 cursor-pointer text-sm">
                <input type="checkbox" checked={filtroBancos.includes(b)} onChange={() => toggleFiltro(filtroBancos, b, setFiltroBancos)} className="rounded text-blue-600" />
                {b}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="CPF/CNPJ" mask="cpfCnpj" value={filtroCpfCnpj} onChange={e => setFiltroCpfCnpj(e.target.value)} />
            {!isExterno && (
              <Select label="Solicitante" value={filtroSolicitanteId || ''} onChange={e => setFiltroSolicitanteId(Number(e.target.value) || undefined)}
                options={(usuarios.data || []).map((u: any) => ({ value: u.id, label: u.nome }))} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} />
            {!isExterno && (
              <Select label="Responsável" value={filtroResponsavelId || ''} onChange={e => setFiltroResponsavelId(Number(e.target.value) || undefined)}
                options={(usuarios.data || []).map((u: any) => ({ value: u.id, label: u.nome }))} />
            )}
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select label="Situação" value={filtroSituacao[0]||''} onChange={e => setFiltroSituacao(e.target.value ? [e.target.value] : [])}
                options={SITUACOES.map(s => ({value:s,label:s}))} />
            </div>
            <Btn onClick={() => preAnalise.refetch()}>Pesquisar</Btn>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-4 py-3 w-32"></th>
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-left">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Banco</th>
                <th className="px-4 py-3 text-left">Observação</th>
                <th className="px-4 py-3 text-left">Responsável</th>
                <th className="px-4 py-3 text-left">Dias</th>
                <th className="px-4 py-3 text-left">Cód.</th>
                {!isExterno && <th className="px-4 py-3 text-left">Valor</th>}
                {!isExterno && <th className="px-4 py-3 text-left">Solicitante</th>}
                {!isExterno && <th className="px-4 py-3 text-left">Data</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {preAnalise.isLoading && (
                <tr><td colSpan={isExterno ? 9 : 12} className="py-8 text-center"><Spinner size={20} /></td></tr>
              )}
              {!preAnalise.isLoading && dados.length === 0 && (
                <tr><td colSpan={isExterno ? 9 : 12} className="py-8 text-center text-gray-400">Nenhuma pré-análise encontrada</td></tr>
              )}
              {dados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelecionada(p); setModalVisualizar(true) }}
                        className="text-gray-500 hover:text-gray-700"
                        title="Visualizar"
                      >
                        <Eye size={15} />
                      </button>
                      {p.processoId && podeAbrirProcesso && (
                        <button
                          type="button"
                          onClick={() => navigate(`/financiamento/processos/${p.processoId}`)}
                          className="text-green-600 hover:text-green-800"
                          title={`Abrir proposta #${p.processoId}`}
                        >
                          <ExternalLink size={15} />
                        </button>
                      )}
                      {podeTransformarEmProcesso(p) && (
                        <button
                          type="button"
                          onClick={() => handleCriarProcesso(p)}
                          disabled={criandoProcessoId === p.id && criarProcesso.isPending}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Criar proposta a partir da pré-análise"
                        >
                          {criandoProcessoId === p.id && criarProcesso.isPending ? <Spinner size={15} /> : <FilePlus size={15} />}
                        </button>
                      )}
                      {podeEditarPreAnalise && (
                        <button
                          onClick={() => { setSelecionada(p); setModalEditar(true) }}
                          className="text-blue-500 hover:text-blue-700"
                          title="Editar"
                        >
                          <Edit size={15} />
                        </button>
                      )}
                      {podeExcluirPreAnalise && (
                        <button
                          onClick={() => { if (confirm('Excluir esta pré-análise?')) excluir.mutate({ id: p.id }) }}
                          className="text-red-500 hover:text-red-700"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={p.situacao || 'Aguardando análise'} color={corSituacao(p.situacao)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{formatCpfCnpj(p.cpfCnpj)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{p.bancos}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{(p as any).observacao || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{(p as any).responsavelNome || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{diasDesde((p as any).criadoEm)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.id}</td>
                  {!isExterno && <td className="px-4 py-3 text-gray-600">R$ {Number(p.valorFinanciamento || 0).toLocaleString('pt-BR')}</td>}
                  {!isExterno && <td className="px-4 py-3 text-xs text-gray-500">{(p as any).solicitanteNome || '—'}</td>}
                  {!isExterno && <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate((p as any).criadoEm)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nova */}
      {podeCriarPreAnalise && (
        <Modal title="Nova Pré-Análise" open={modalNova} onClose={() => setModalNova(false)} size="lg">
          <NovaPreAnalise onClose={() => setModalNova(false)} />
        </Modal>
      )}

      {/* Modal Editar */}
      {podeEditarPreAnalise && (
        <Modal title="Alterar Pré-Análise" open={modalEditar} onClose={() => { setModalEditar(false); setSelecionada(null) }} size="lg">
          {selecionada && <EditarPreAnalise item={selecionada} onClose={() => { setModalEditar(false); setSelecionada(null) }} />}
        </Modal>
      )}

      {/* Modal Visualizar */}
      <Modal title="Visualizar Pré-Análise" open={modalVisualizar} onClose={() => { setModalVisualizar(false); setSelecionada(null) }}>
        {selecionada && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Nome:</span> <strong>{selecionada.nome}</strong></div>
              <div><span className="text-gray-500">CPF/CNPJ:</span> <strong>{formatCpfCnpj(selecionada.cpfCnpj)}</strong></div>
              <div><span className="text-gray-500">Banco(s):</span> {selecionada.bancos}</div>
              <div><span className="text-gray-500">Valor:</span> R$ {Number(selecionada.valorFinanciamento || 0).toLocaleString('pt-BR')}</div>
              <div><span className="text-gray-500">Situação:</span> {selecionada.situacao || 'Aguardando'}</div>
              <div><span className="text-gray-500">Estado Civil:</span> {selecionada.estadoCivil || '-'}</div>
              <div><span className="text-gray-500">CEP:</span> {selecionada.cep || '-'}</div>
              <div><span className="text-gray-500">Nome da Mãe:</span> {selecionada.nomeMae || '-'}</div>
            </div>
            {selecionada.retorno && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 text-xs font-medium block mb-1">Retorno:</span>
                <p className="text-gray-700">{selecionada.retorno}</p>
              </div>
            )}
            {selecionada.observacao && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 text-xs font-medium block mb-1">Observação:</span>
                <p className="text-gray-700">{selecionada.observacao}</p>
              </div>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <div>
                {selecionada.processoId && podeAbrirProcesso && (
                  <Btn
                    size="sm"
                    icon={<ExternalLink size={14} />}
                    onClick={() => navigate(`/financiamento/processos/${selecionada.processoId}`)}
                  >
                    Abrir proposta #{selecionada.processoId}
                  </Btn>
                )}
                {podeTransformarEmProcesso(selecionada) && (
                  <Btn
                    size="sm"
                    icon={<FilePlus size={14} />}
                    loading={criandoProcessoId === selecionada.id && criarProcesso.isPending}
                    onClick={() => handleCriarProcesso(selecionada)}
                  >
                    Criar proposta
                  </Btn>
                )}
              </div>
              <Btn variant="ghost" onClick={() => { setModalVisualizar(false); setSelecionada(null) }}>Fechar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function NovaPreAnalise({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({ nome: '', cpfCnpj: '', dataNascimento: '', valorFinanciamento: '', estadoCivil: 'Solteiro', cpfConjuge: '', nomeConjuge: '', nomeMae: '', cep: '', observacao: '' })
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
      {criar.error && <Alert type="error" message={criar.error.message} />}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
        <Input label="CPF/CNPJ" mask="cpfCnpj" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} />
        <Input label="Data Nascimento" type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} />
        <Input label="Valor Financiamento" value={form.valorFinanciamento} onChange={e => setForm(f => ({ ...f, valorFinanciamento: e.target.value }))} placeholder="0,00" />
        <Select label="Estado Civil" value={form.estadoCivil} onChange={e => setForm(f => ({ ...f, estadoCivil: e.target.value }))}
          options={[{ value: 'Solteiro', label: 'Solteiro' }, { value: 'Casado', label: 'Casado' }]} />
        <Input label="CEP" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
      </div>
      {form.estadoCivil === 'Casado' && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="CPF Cônjuge" mask="cpf" value={form.cpfConjuge} onChange={e => setForm(f => ({ ...f, cpfConjuge: e.target.value }))} />
          <Input label="Nome Cônjuge" value={form.nomeConjuge} onChange={e => setForm(f => ({ ...f, nomeConjuge: e.target.value }))} />
        </div>
      )}
      <Input label="Nome da Mãe" value={form.nomeMae} onChange={e => setForm(f => ({ ...f, nomeMae: e.target.value }))} />
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Observação</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.observacao}
          onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!bancosSel.length} loading={criar.isPending} onClick={() => criar.mutate({ ...form, bancos: bancosSel.join(','), estadoCivil: form.estadoCivil as 'Solteiro'|'Casado'|undefined })}>Salvar</Btn>
      </div>
    </div>
  )
}

function EditarPreAnalise({ item, onClose }: { item: any; onClose: () => void }) {
  const { isExterno } = usePermissoes()
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    situacao: item.situacao || 'Aguardando análise',
    observacao: item.observacao || '',
    retorno: item.retorno || '',
    permitirReenvio: item.permitirReenvio || false,
  })

  const atualizar = trpc.preAnalise.atualizar.useMutation({
    onSuccess: () => { utils.preAnalise.listar.invalidate(); onClose() }
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div><span className="text-gray-500">Nome:</span> <strong>{item.nome}</strong></div>
        <div><span className="text-gray-500">CPF/CNPJ:</span> <strong>{formatCpfCnpj(item.cpfCnpj)}</strong></div>
        <div><span className="text-gray-500">Banco(s):</span> {item.bancos}</div>
        <div><span className="text-gray-500">Valor:</span> R$ {Number(item.valorFinanciamento || 0).toLocaleString('pt-BR')}</div>
      </div>
      {!isExterno && (
        <Select label="Situação" value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))}
          options={SITUACOES.map(s => ({ value: s, label: s }))} />
      )}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Observação</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.observacao}
          onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
      </div>
      {!isExterno && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.permitirReenvio} onChange={e => setForm(f => ({ ...f, permitirReenvio: e.target.checked }))} className="rounded" />
          Permitir o reenvio
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={atualizar.isPending} onClick={() => atualizar.mutate({ id: item.id, ...form })}>Salvar</Btn>
      </div>
    </div>
  )
}
