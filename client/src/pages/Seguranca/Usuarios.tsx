import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Button, Input, Select, Card, Table, Loading, Modal, Badge } from '../../components/ui'
import { Plus, Pencil, Key, Shield } from 'lucide-react'

const PERFIS = ['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Financeiro','Engenheiro','Atendente','Subestabelecido']
const STATUS  = ['Ativo','Bloqueado','Inativo']

const BADGE_PERFIL: Record<string,string> = {
  Administrador: 'bg-purple-100 text-purple-700',
  Gerente:       'bg-blue-100 text-blue-700',
  Corretor:      'bg-yellow-100 text-yellow-700',
  Parceiro:      'bg-orange-100 text-orange-700',
  Construtora:   'bg-pink-100 text-pink-700',
  Imobiliária:   'bg-indigo-100 text-indigo-700',
  Analista:      'bg-cyan-100 text-cyan-700',
  Financeiro:    'bg-amber-100 text-amber-700',
}

const STATUS_BADGE: Record<string,string> = {
  Ativo:     'bg-green-100 text-green-800',
  Bloqueado: 'bg-red-100 text-red-800',
  Inativo:   'bg-gray-100 text-gray-500',
}

export function Usuarios() {
  const [modal, setModal]       = useState(false)
  const [editId, setEditId]     = useState<number|null>(null)
  const [modalSenha, setModalSenha] = useState<number|null>(null)
  const [form, setForm]         = useState<any>({ perfil: 'Analista', status: 'Ativo' })
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [filtroNome, setFiltroNome]     = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const { data, isLoading, refetch } = trpc.cadastros.usuarios.listar.useQuery()
  const subestabelecidosList = trpc.cadastros.subestabelecidos.listar.useQuery()
  const criar = trpc.cadastros.usuarios.criar.useMutation({
    onSuccess: () => { setModal(false); refetch(); setForm({ perfil: 'Analista', status: 'Ativo' }); setEditId(null) }
  })
  const editar = trpc.cadastros.usuarios.editar.useMutation({
    onSuccess: () => { setModal(false); refetch(); setForm({ perfil: 'Analista', status: 'Ativo' }); setEditId(null) }
  })
  const resetarSenha = trpc.auth.resetarSenha.useMutation({
    onSuccess: () => { setModalSenha(null); setNovaSenha('') }
  })

  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }

  function openEdit(u: any) {
    setForm({
      nome: u.nome, login: u.login, email: u.email || '',
      cpf: u.cpf || '', pis: u.pis || '', perfil: u.perfil,
      subestabelecidoId: u.subestabelecidoId || '',
      status: u.status || 'Ativo',
      bloqueioInicio: u.bloqueioInicio || '', bloqueioFim: u.bloqueioFim || '',
    })
    setEditId(u.id)
    setModal(true)
  }

  function openCreate() {
    setForm({ perfil: 'Analista', status: 'Ativo' })
    setEditId(null)
    setModal(true)
  }

  function handleSave() {
    if (editId) {
      const { senha, ...dados } = form
      editar.mutate({
        id: editId, ...dados,
        subestabelecidoId: dados.subestabelecidoId ? Number(dados.subestabelecidoId) : null,
        bloqueioInicio: dados.bloqueioInicio || null,
        bloqueioFim: dados.bloqueioFim || null,
      })
    } else {
      criar.mutate({
        ...form,
        subestabelecidoId: form.subestabelecidoId ? Number(form.subestabelecidoId) : undefined,
      })
    }
  }

  const filtrados = (data||[]).filter((u:any) => {
    const nomeOk   = !filtroNome   || u.nome.toLowerCase().includes(filtroNome.toLowerCase())
    const perfilOk = !filtroPerfil || u.perfil === filtroPerfil
    const statusOk = !filtroStatus || u.status === filtroStatus
    return nomeOk && perfilOk && statusOk
  })

  return (
    <div>
      <PageHeader title="Usuários"
        actions={<Button onClick={openCreate}><Plus size={14}/> Novo Usuário</Button>} />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex items-end gap-3">
          <Input label="Nome" value={filtroNome} onChange={e=>setFiltroNome(e.target.value)} />
          <Select label="Pefil" value={filtroPerfil} onChange={e=>setFiltroPerfil(e.target.value)}
            options={PERFIS.map(p=>({value:p,label:p}))} />
          <Select label="Situação" value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}
            options={STATUS.map(s=>({value:s,label:s}))} />
          <Select label="Subestabelecido" value="" onChange={()=>{}}
            options={(subestabelecidosList.data||[]).map((s:any)=>({value:s.id,label:s.nome}))} />
          <Button onClick={()=>{}}>Pesquisar</Button>
        </div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <Table headers={['','Nome','Login','Situação','Perfil']} empty={!filtrados.length ? 'Nenhum registro.' : undefined}>
            {filtrados.map((u:any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800" title="Editar"><Pencil size={14}/></button>
                    <button onClick={()=>setModalSenha(u.id)} className="text-orange-500 hover:text-orange-700" title="Alterar Senha"><Key size={14}/></button>
                    <Link to={`/seguranca/permissoes?usuario=${u.id}`} className="text-blue-500 hover:text-blue-700" title="Privilégios"><Shield size={14}/></Link>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{u.nome}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.login}</td>
                <td className="px-4 py-3 text-sm">{u.status || 'ATIVO'}</td>
                <td className="px-4 py-3 text-sm">{u.perfil}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal Novo/Editar Usuário */}
      <Modal open={modal} title={editId ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => { setModal(false); setEditId(null) }} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome *" value={form.nome||''} onChange={e=>set('nome',e.target.value)} />
          <Input label="Login *" value={form.login||''} onChange={e=>set('login',e.target.value)} />
          {!editId && (
            <Input label="Senha *" type="password" value={form.senha||''} onChange={e=>set('senha',e.target.value)} />
          )}
          <Input label="E-mail" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} />
          <Input label="CPF" value={form.cpf||''} onChange={e=>set('cpf',e.target.value)} />
          <Input label="PIS" value={form.pis||''} onChange={e=>set('pis',e.target.value)} />
          <Select label="Perfil" value={form.perfil||''} onChange={e=>set('perfil',e.target.value)}
            options={PERFIS.map(p=>({value:p,label:p}))} />
          <Select label="Subestabelecido" value={form.subestabelecidoId||''} onChange={e=>set('subestabelecidoId',e.target.value)}
            options={(subestabelecidosList.data||[]).map((s:any)=>({value:s.id,label:s.nome}))} placeholder="Nenhum" />
          <Select label="Status" value={form.status||'Ativo'} onChange={e=>set('status',e.target.value)}
            options={STATUS.map(s=>({value:s,label:s}))} />
          {form.status === 'Bloqueado' && (
            <>
              <Input label="Bloqueio Início" type="date" value={form.bloqueioInicio||''} onChange={e=>set('bloqueioInicio',e.target.value)} />
              <Input label="Bloqueio Fim" type="date" value={form.bloqueioFim||''} onChange={e=>set('bloqueioFim',e.target.value)} />
            </>
          )}
        </div>
        <div className="flex gap-3 pt-4">
          <Button className="flex-1 justify-center" onClick={handleSave} loading={criar.isPending || editar.isPending}>
            {editId ? 'Salvar Alterações' : 'Criar'}
          </Button>
          <Button variant="secondary" className="flex-1 justify-center" onClick={()=>{setModal(false);setEditId(null)}}>Cancelar</Button>
        </div>
      </Modal>

      {/* Modal Alterar Senha */}
      <Modal open={!!modalSenha} title="Alterar Senha" onClose={() => setModalSenha(null)}>
        <div className="space-y-3">
          <Input label="Nova Senha *" type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
          <Input label="Confirmação *" type="password" value={confirmSenha} onChange={e=>setConfirmSenha(e.target.value)} />
          {confirmSenha && novaSenha !== confirmSenha && <p className="text-xs text-red-500">As senhas não coincidem</p>}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center"
              onClick={() => { if (modalSenha && novaSenha === confirmSenha && novaSenha) resetarSenha.mutate({ usuarioId: modalSenha, novaSenha }) }}
              loading={resetarSenha.isPending} disabled={!novaSenha || novaSenha !== confirmSenha}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>{setModalSenha(null);setNovaSenha('');setConfirmSenha('')}}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
