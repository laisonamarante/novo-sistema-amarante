import { fmtDateBR } from "../../lib/dateUtils"
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Button, Select, Input, Card, Table, Loading, Modal, Textarea, Badge } from '../../components/ui'
import { Plus, CheckCircle, Pencil } from 'lucide-react'

const STATUS_COLOR: Record<string,string> = {
  Pendente:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Resolvida: 'bg-green-100 text-green-700 border border-green-200',
  Encerrada: 'bg-gray-100 text-gray-600 border border-gray-200',
}

export function Tarefas() {
  const [modal, setModal]   = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm]   = useState<any>({})
  const [form, setForm]     = useState<any>({})
  const [filtros, setFiltros] = useState<any>({
    dataInicio: new Date(new Date().setDate(1)).toISOString().slice(0,10),
    dataFim:    new Date().toISOString().slice(0,10),
  })
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [modalMassa, setModalMassa] = useState(false)
  const [massaForm, setMassaForm] = useState<any>({})

  const { data, isLoading, refetch } = trpc.tarefas.minhasTarefas.useQuery()
  const usuariosList = trpc.cadastros.usuarios.listar.useQuery()
  const parceiros    = trpc.cadastros.parceiros.listar.useQuery()
  const criar    = trpc.tarefas.criar.useMutation({ onSuccess: () => { setModal(false); refetch(); setForm({}) } })
  const concluir = trpc.tarefas.concluir.useMutation({ onSuccess: () => { setEditModal(false); refetch() } })
  const concluirEmMassa = trpc.tarefas.concluirEmMassa.useMutation({ onSuccess: () => { setModalMassa(false); setSelecionados([]); setMassaForm({}); refetch() } })
  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }
  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }
  function setE(k:string,v:any) { setEditForm((f:any)=>({...f,[k]:v})) }

  const todasTarefas = [...(data?.recebidas||[]), ...(data?.criadas||[])]

  // Deduplicate (a task may appear in both recebidas and criadas)
  const seen = new Set<number>()
  const deduped = todasTarefas.filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  // aplicar filtros locais
  const filtradas = deduped.filter(t => {
    if (filtros.status && t.status !== filtros.status) return false
    return true
  })

  function abrirEditModal(tarefa: any) {
    setEditForm({
      id: tarefa.id,
      status: tarefa.status || 'Pendente',
      acompanhamento: tarefa.acompanhamento || '',
    })
    setEditModal(true)
  }

  function salvarEdicao() {
    concluir.mutate({
      id: editForm.id,
      status: editForm.status,
      acompanhamento: editForm.acompanhamento || undefined,
    })
  }

  function toggleSelecionado(id: number) {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (selecionados.length === filtradas.length) {
      setSelecionados([])
    } else {
      setSelecionados(filtradas.map(t => t.id))
    }
  }

  function executarAcaoMassa() {
    const payload: any = { ids: selecionados }
    if (massaForm.status) payload.status = massaForm.status
    if (massaForm.executanteId) payload.executanteId = Number(massaForm.executanteId)
    concluirEmMassa.mutate(payload)
  }

  return (
    <div>
      <PageHeader title="Tarefas"
        actions={
          <div className="flex gap-2">
            {selecionados.length > 0 && (
              <Button variant="secondary" onClick={() => setModalMassa(true)}>
                Ações em massa ({selecionados.length})
              </Button>
            )}
            <Button onClick={() => setModal(true)}><Plus size={14}/> Nova Tarefa</Button>
          </div>
        } />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <Input label="Nº da Tarefa" type="number" onChange={e=>setF('id',Number(e.target.value)||undefined)} className="w-48" />
          <div className="flex items-end gap-2">
            <Input label="Data" type="date" value={filtros.dataInicio} onChange={e=>setF('dataInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" value={filtros.dataFim} onChange={e=>setF('dataFim',e.target.value)} />
          </div>
          <Select label="Situação" value={filtros.status||''} onChange={e=>setF('status',e.target.value||undefined)}
            options={['Pendente','Resolvida','Encerrada'].map(s=>({value:s,label:s}))} placeholder="" />
          <Select label="Parceiro" value={filtros.parceiroId||''} onChange={e=>setF('parceiroId',Number(e.target.value)||undefined)}
            options={(parceiros.data||[]).map((p:any)=>({value:p.id,label:p.nome}))} placeholder="" />
          <Select label="Solicitante" value={filtros.solicitanteId||''} onChange={e=>setF('solicitanteId',Number(e.target.value)||undefined)}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} placeholder="" />
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select label="Executante" value={filtros.executanteId||''} onChange={e=>setF('executanteId',Number(e.target.value)||undefined)}
                options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} placeholder="" />
            </div>
            <Button onClick={()=>refetch()}>Pesquisar</Button>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <Table
            headers={['Nº','Data','Situação','Nº Processo','Comprador','Solicitante','Executante','Solicitação','Limite']}
            empty={!filtradas.length ? 'Nenhum registro.' : undefined}>
            {filtradas.map((t:any) => (
              <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirEditModal(t)}>
                <td className="px-3 py-2 text-xs font-mono text-gray-500">{t.id}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{new Date(t.criadoEm).toLocaleDateString('pt-BR')}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[t.status]||STATUS_COLOR.Pendente}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.processoId
                    ? <Link to={`/financiamento/processos/${t.processoId}`} className="text-blue-600 hover:underline font-medium">#{t.processoId}</Link>
                    : <span className="text-gray-400">--</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.compradorNome || '--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.solicitanteNome || '--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.executanteNome || '--'}</td>
                <td className="px-3 py-2 text-xs text-gray-700 max-w-xs">
                  <p className="truncate" title={t.solicitacao}>{t.solicitacao}</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.dataLimite
                    ? <span className={new Date(t.dataLimite) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {fmtDateBR(t.dataLimite)}
                      </span>
                    : '--'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Checkbox master row */}
      {filtradas.length > 0 && (
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={selecionados.length === filtradas.length && filtradas.length > 0}
              onChange={toggleAll}
              className="rounded border-gray-300 text-blue-600 w-4 h-4" />
            Selecionar todos ({filtradas.length})
          </label>
          {selecionados.length > 0 && (
            <span className="text-blue-600 font-medium">{selecionados.length} selecionado(s)</span>
          )}
        </div>
      )}

      {/* Modal Nova Tarefa */}
      <Modal open={modal} title="Nova Tarefa" onClose={() => setModal(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Processo (opcional)</label>
            <Input placeholder="Digite o nome ou CPF do cliente..." value={form.processoSearch||''} onChange={e=>set('processoSearch',e.target.value)} />
          </div>
          <Select label="Executante *" value={form.executanteId||''} onChange={e=>set('executanteId',Number(e.target.value))}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} placeholder="Selecione..." />
          <Textarea label="Solicitação *" value={form.solicitacao||''} onChange={e=>set('solicitacao',e.target.value)} rows={3} />
          <Input label="Data Limite" type="date" value={form.dataLimite||''} onChange={e=>set('dataLimite',e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={()=>criar.mutate(form)} loading={criar.isPending}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Tarefa */}
      <Modal open={editModal} title={`Editar Tarefa #${editForm.id || ''}`} onClose={() => setEditModal(false)}>
        <div className="space-y-3">
          <Select label="Situação" value={editForm.status||'Pendente'} onChange={e=>setE('status',e.target.value)}
            options={['Pendente','Resolvida','Encerrada'].map(s=>({value:s,label:s}))} />
          <Textarea label="Acompanhamento" value={editForm.acompanhamento||''} onChange={e=>setE('acompanhamento',e.target.value)} rows={4}
            placeholder="Descreva o acompanhamento ou resolucao da tarefa..." />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={salvarEdicao} loading={concluir.isPending}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setEditModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ações em Massa */}
      <Modal open={modalMassa} title={`Ações em Massa (${selecionados.length} tarefas)`} onClose={() => setModalMassa(false)}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Selecione a ação a ser aplicada nas {selecionados.length} tarefas selecionadas:</p>
          <Select label="Alterar Situação" value={massaForm.status||''} onChange={e=>setMassaForm((f:any)=>({...f,status:e.target.value||undefined}))}
            options={['Pendente','Resolvida','Encerrada'].map(s=>({value:s,label:s}))} placeholder="Manter atual" />
          <Select label="Atribuir Executante" value={massaForm.executanteId||''} onChange={e=>setMassaForm((f:any)=>({...f,executanteId:e.target.value||undefined}))}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} placeholder="Manter atual" />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={executarAcaoMassa}
              loading={concluirEmMassa.isPending}
              disabled={!massaForm.status && !massaForm.executanteId}>
              Aplicar
            </Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModalMassa(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
