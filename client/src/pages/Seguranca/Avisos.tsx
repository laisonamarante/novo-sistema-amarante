import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { usePermissoes } from '../../lib/permissoes'
import { PageHeader, Button, Input, Select, Card, Table, Loading, Modal, Textarea, Badge } from '../../components/ui'
import { Plus, Bell } from 'lucide-react'

const PERFIS_AVISO = ['Todos','Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Subestabelecido']

const fmtDate = (v: any): string => { if (!v) return ""; try { const d = new Date(v); if(isNaN(d.getTime())) return ""; return d.toISOString().substring(0,10); } catch { return ""; } }
export function Avisos() {
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number|null>(null)
  const [form, setForm]   = useState<any>({ perfil: 'Todos' })
  const [filtroAtivo, setFiltroAtivo] = useState(false)
  const { pode } = usePermissoes()
  const { data, isLoading, refetch } = trpc.avisos.listar.useQuery()
  const criar = trpc.avisos.criar.useMutation({ onSuccess: () => { setModal(false); refetch(); setForm({ perfil: 'Todos' }); setEditId(null) } })
  const editar = trpc.avisos.editar.useMutation({ onSuccess: () => { setModal(false); refetch(); setForm({ perfil: 'Todos' }); setEditId(null) } })
  const excluir = trpc.avisos.excluir.useMutation({ onSuccess: () => refetch() })
  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }

  const hoje = new Date().toISOString().slice(0,10)

  const avisosFiltrados = (data || []).filter((a: any) => {
    if (!filtroAtivo) return true
    // Ativo = hoje esta dentro do periodo (ou sem periodo definido)
    const inicio = a.dataInicio || a.data_inicio
    const fim = a.dataFim || a.data_fim
    if (!inicio && !fim) return true
    if (inicio && hoje < inicio) return false
    if (fim && hoje > fim) return false
    return true
  })

  function formatPeriodo(a: any) {
    const inicio = a.dataInicio || a.data_inicio
    const fim = a.dataFim || a.data_fim
    if (!inicio && !fim) return 'Sem período'
    const fmtD = (d: string) => { try { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR') } catch { return d } }
    if (inicio && fim) return `${fmtD(inicio)} a ${fmtD(fim)}`
    if (inicio) return `A partir de ${fmtD(inicio)}`
    return `Até ${fmtD(fim)}`
  }

  function isAtivo(a: any) {
    const inicio = a.dataInicio || a.data_inicio
    const fim = a.dataFim || a.data_fim
    if (!inicio && !fim) return true
    if (inicio && hoje < inicio) return false
    if (fim && hoje > fim) return false
    return true
  }

  return (
    <div>
      <PageHeader title="Cadastro de Aviso" />

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={filtroAtivo} onChange={e => setFiltroAtivo(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"/>
            <span className="text-gray-700 font-medium">Ativo</span>
          </label>
          <div className="ml-auto">
            <Button onClick={()=>refetch()}>Pesquisar</Button>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <Table headers={['','Início','Fim','Descrição']} empty={!avisosFiltrados?.length ? 'Nenhum registro.' : undefined}>
            {avisosFiltrados?.map((a:any) => {
              const inicio = a.dataInicio || a.data_inicio
              const fim = a.dataFim || a.data_fim
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {pode('menu:avisos') && (
                        <button onClick={() => { setForm({ titulo: a.titulo, mensagem: a.mensagem, perfil: a.perfil || 'Todos', dataInicio: fmtDate(inicio), dataFim: fmtDate(fim) }); setEditId(a.id); setModal(true) }} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar">✎</button>
                      )}
                      {pode('menu:avisos') && (
                        <button onClick={() => { if(confirm("Excluir este aviso?")) excluir.mutate({ id: a.id }) }} className="text-red-500 hover:text-red-700 text-xs" title="Excluir">🗑</button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{inicio ? new Date(inicio).toLocaleDateString('pt-BR') : '--'}</td>
                  <td className="px-4 py-3 text-sm">{fim ? new Date(fim).toLocaleDateString('pt-BR') : '--'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.mensagem || a.descricao || '--'}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {pode('menu:avisos') && (
        <div className="mt-4">
          <Button onClick={() => { setForm({ perfil: 'Todos' }); setEditId(null); setModal(true) }}>Novo</Button>
        </div>
      )}

      <Modal open={modal} title={editId ? "Editar Aviso" : "Novo Aviso"} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <Input label="Título *" value={form.titulo||''} onChange={e=>set('titulo',e.target.value)} />
          <Textarea label="Mensagem *" value={form.mensagem||''} onChange={e=>set('mensagem',e.target.value)} rows={4} />
          <Select label="Perfil (quem verá o aviso)" value={form.perfil||'Todos'} onChange={e=>set('perfil',e.target.value)}
            options={PERFIS_AVISO.map(p=>({value:p,label:p}))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data Início" type="date" value={form.dataInicio||''} onChange={e=>set('dataInicio',e.target.value)} />
            <Input label="Data Fim" type="date" value={form.dataFim||''} onChange={e=>set('dataFim',e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={()=>{ if(editId) editar.mutate({id:editId,...form}); else criar.mutate(form) }} loading={criar.isPending||editar.isPending} disabled={!pode('menu:avisos')}>{editId ? 'Atualizar' : 'Salvar'}</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
