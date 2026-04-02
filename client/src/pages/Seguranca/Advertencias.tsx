import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Button, Input, Select, Card, Table, Loading, Modal, Textarea, Badge } from '../../components/ui'
import { Plus, Printer } from 'lucide-react'

const STATUS_COLORS: Record<string,string> = {
  Pendente:    'bg-yellow-100 text-yellow-700',
  Aceita:      'bg-green-100 text-green-700',
  Contestada:  'bg-blue-100 text-blue-700',
  'Em Análise':'bg-purple-100 text-purple-700',
  Rejeitada:   'bg-red-100 text-red-700',
}

const STATUS_OPTIONS = ['Pendente','Aceita','Contestada','Em Análise','Rejeitada']

export function Advertencias() {
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState<any>({ status: 'Pendente' })
  const [filtroUser, setFiltroUser] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [processoSearch, setProcessoSearch] = useState('')

  const { data, isLoading, refetch } = trpc.advertencias.listar.useQuery({
    usuarioId: filtroUser ? Number(filtroUser) : undefined,
    status: filtroStatus as any || undefined,
  })
  const usuariosList = trpc.cadastros.usuarios.listar.useQuery()
  const criar = trpc.advertencias.criar.useMutation({ onSuccess: () => { setModal(false); refetch(); setForm({ status: 'Pendente' }); setProcessoSearch('') } })
  const atualizar = trpc.advertencias.atualizar.useMutation({ onSuccess: () => refetch() })
  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }

  function handleStatusChange(id: number, novoStatus: string) {
    atualizar.mutate({ id, status: novoStatus as any })
  }

  // Simple processo ID extraction from search text
  function handleProcessoSearchChange(val: string) {
    setProcessoSearch(val)
    const num = parseInt(val.replace(/\D/g, ''))
    if (num && num > 0) {
      set('processoId', num)
    } else {
      set('processoId', undefined)
    }
  }

  return (
    <div>
      <PageHeader title="Cadastro de Advertência"
        actions={<Button onClick={() => setModal(true)}><Plus size={14}/> Nova Advertência</Button>} />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex items-end gap-3">
          <Select label="Usuário" value={filtroUser} onChange={e=>setFiltroUser(e.target.value)}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} placeholder="Todos" />
          <Select label="Situação" value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}
            options={STATUS_OPTIONS.map(s=>({value:s,label:s}))} placeholder="Todos" />
          <Button onClick={()=>refetch()}>Pesquisar</Button>
        </div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <Table headers={['','Situação','Usuário','Data','Processo','Descrição']} empty={!data?.length ? 'Nenhum registro.' : undefined}>
            {data?.map((a:any) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-xs" title="Editar"><Printer size={14}/></button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={a.status || 'Pendente'}
                    onChange={e => handleStatusChange(a.id, e.target.value)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[a.status] || STATUS_COLORS.Pendente}`}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm">{a.usuarioNome||'--'}</td>
                <td className="px-4 py-3 text-sm">{new Date(a.criadoEm).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-sm">
                  {a.processoId
                    ? <Link to={`/financiamento/processos/${a.processoId}`} className="text-blue-600 hover:underline font-medium">{a.processoId}</Link>
                    : <span className="text-gray-400">--</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{a.descricao}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modal} title="Nova Advertência" onClose={() => setModal(false)}>
        <div className="space-y-3">
          <Select label="Usuário *" value={form.usuarioId||''} onChange={e=>set('usuarioId',Number(e.target.value))}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} placeholder="Selecione..." />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Processo (opcional)</label>
            <Input placeholder="Digite o numero do processo..." value={processoSearch}
              onChange={e=>handleProcessoSearchChange(e.target.value)} />
            {form.processoId && (
              <span className="text-xs text-green-600 mt-1 block">Processo #{form.processoId} vinculado</span>
            )}
          </div>
          <Textarea label="Descrição *" value={form.descricao||''} onChange={e=>set('descricao',e.target.value)} rows={4} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={()=>criar.mutate(form)} loading={criar.isPending}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
