import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { usePermissoes } from '../../lib/permissoes'
import { PageHeader, Button, Input, Select, Card, Table, Loading, Modal, Alert, Badge } from '../../components/ui'
import { Plus, Pencil, Key, Shield } from 'lucide-react'

const PERFIS = ['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Subestabelecido']
const STATUS  = ['Ativo','Bloqueado','Inativo']

const BADGE_PERFIL: Record<string,string> = {
  Administrador: 'bg-purple-100 text-purple-700',
  Gerente:       'bg-blue-100 text-blue-700',
  Corretor:      'bg-yellow-100 text-yellow-700',
  Parceiro:      'bg-orange-100 text-orange-700',
  Construtora:   'bg-pink-100 text-pink-700',
  Imobiliária:   'bg-indigo-100 text-indigo-700',
  Analista:      'bg-cyan-100 text-cyan-700',
  Subestabelecido: 'bg-gray-100 text-gray-700',
}

const STATUS_BADGE: Record<string,string> = {
  Ativo:     'bg-green-100 text-green-800',
  Bloqueado: 'bg-red-100 text-red-800',
  Inativo:   'bg-gray-100 text-gray-500',
}

const PERFIS_EXTERNOS = ['Corretor','Imobiliária','Parceiro','Construtora','Subestabelecido']

export function Usuarios() {
  const [modal, setModal]       = useState(false)
  const [editId, setEditId]     = useState<number|null>(null)
  const [modalSenha, setModalSenha] = useState<number|null>(null)
  const [form, setForm]         = useState<any>({ perfil: 'Analista', status: 'Ativo' })
  const [erro, setErro]         = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [filtroNome, setFiltroNome]     = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const { pode, isAdmin } = usePermissoes()
  const podeGerenciarUsuarios = isAdmin || pode('menu:usuarios')

  const { data, isLoading, refetch } = trpc.cadastros.usuarios.listar.useQuery()
  const subestabelecidosList = trpc.cadastros.subestabelecidos.listar.useQuery()
  const parceirosList = trpc.cadastros.parceiros.listar.useQuery()
  const corretoresList = trpc.cadastros.corretores.listar.useQuery()
  const imobiliariasList = trpc.cadastros.imobiliarias.listar.useQuery()
  const construtorasList = trpc.cadastros.construtoras.listar.useQuery()
  const criar = trpc.cadastros.usuarios.criar.useMutation({
    onSuccess: () => {
      setErro('')
      setModal(false)
      refetch()
      setForm({ perfil: 'Analista', status: 'Ativo' })
      setEditId(null)
    },
    onError: (error) => setErro(error.message || 'Erro ao criar usuário'),
  })
  const editar = trpc.cadastros.usuarios.editar.useMutation({
    onSuccess: () => {
      setErro('')
      setModal(false)
      refetch()
      setForm({ perfil: 'Analista', status: 'Ativo' })
      setEditId(null)
    },
    onError: (error) => setErro(error.message || 'Erro ao atualizar usuário'),
  })
  const resetarSenha = trpc.auth.resetarSenha.useMutation({
    onSuccess: () => { setModalSenha(null); setNovaSenha('') }
  })

  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }
  function setPerfil(perfil: string) {
    setForm((f: any) => ({
      ...f,
      perfil,
      subestabelecidoId: perfil === 'Subestabelecido' ? f.subestabelecidoId || '' : '',
    }))
  }

  function openEdit(u: any) {
    setErro('')
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
    setErro('')
    setForm({ perfil: 'Analista', status: 'Ativo' })
    setEditId(null)
    setModal(true)
  }

  const nomesVinculos = useMemo(() => ({
    parceiros: new Map((parceirosList.data || []).map((item: any) => [item.id, item.nome])),
    corretores: new Map((corretoresList.data || []).map((item: any) => [item.id, item.nome])),
    imobiliarias: new Map((imobiliariasList.data || []).map((item: any) => [item.id, item.nome])),
    construtoras: new Map((construtorasList.data || []).map((item: any) => [item.id, item.nome])),
    subestabelecidos: new Map((subestabelecidosList.data || []).map((item: any) => [item.id, item.nome])),
  }), [
    construtorasList.data,
    corretoresList.data,
    imobiliariasList.data,
    parceirosList.data,
    subestabelecidosList.data,
  ])

  function getVinculoInfo(usuario: any) {
    switch (usuario.perfil) {
      case 'Parceiro':
        return usuario.parceiroId
          ? { tipo: 'Parceiro', nome: nomesVinculos.parceiros.get(usuario.parceiroId) || `ID ${usuario.parceiroId}` }
          : null
      case 'Corretor':
        return usuario.corretorId
          ? { tipo: 'Corretor', nome: nomesVinculos.corretores.get(usuario.corretorId) || `ID ${usuario.corretorId}` }
          : null
      case 'Imobiliária':
        return usuario.imobiliariaId
          ? { tipo: 'Imobiliária', nome: nomesVinculos.imobiliarias.get(usuario.imobiliariaId) || `ID ${usuario.imobiliariaId}` }
          : null
      case 'Construtora':
        return usuario.construtoraId
          ? { tipo: 'Construtora', nome: nomesVinculos.construtoras.get(usuario.construtoraId) || `ID ${usuario.construtoraId}` }
          : null
      case 'Subestabelecido':
        return usuario.subestabelecidoId
          ? { tipo: 'Subestabelecido', nome: nomesVinculos.subestabelecidos.get(usuario.subestabelecidoId) || `ID ${usuario.subestabelecidoId}` }
          : null
      default:
        return null
    }
  }

  function handleSave() {
    setErro('')
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
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Link
                to="/seguranca/permissoes"
                className="inline-flex items-center gap-2 rounded font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
              >
                <Shield size={14}/> Permissões
              </Link>
            )}
            {podeGerenciarUsuarios && (
              <Button onClick={openCreate}><Plus size={14}/> Novo Usuário</Button>
            )}
          </div>
        } />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex items-end gap-3">
          <Input label="Nome" value={filtroNome} onChange={e=>setFiltroNome(e.target.value)} />
          <Select label="Perfil" value={filtroPerfil} onChange={e=>setFiltroPerfil(e.target.value)}
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
          <Table headers={['','Nome','Login','Situação','Perfil','Vínculo']} empty={!filtrados.length ? 'Nenhum registro.' : undefined}>
            {filtrados.map((u:any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    {podeGerenciarUsuarios && (
                      <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800" title="Editar"><Pencil size={14}/></button>
                    )}
                    {podeGerenciarUsuarios && (
                      <button onClick={()=>setModalSenha(u.id)} className="text-orange-500 hover:text-orange-700" title="Alterar Senha"><Key size={14}/></button>
                    )}
                    {isAdmin && (
                      <Link to="/seguranca/permissoes" className="text-blue-500 hover:text-blue-700" title="Permissões do Perfil"><Shield size={14}/></Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{u.nome}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.login}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge label={u.status || 'Ativo'} color={STATUS_BADGE[u.status || 'Ativo'] || STATUS_BADGE.Ativo} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge label={u.perfil} color={BADGE_PERFIL[u.perfil] || 'bg-gray-100 text-gray-700'} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {(() => {
                    const vinculo = getVinculoInfo(u)
                    if (vinculo) {
                      return (
                        <div>
                          <div className="font-medium">{vinculo.nome}</div>
                          <div className="text-xs text-gray-500">{vinculo.tipo}</div>
                        </div>
                      )
                    }
                    if (PERFIS_EXTERNOS.includes(u.perfil)) {
                      return <span className="text-red-500">Sem vínculo</span>
                    }
                    return <span className="text-gray-400">Interno</span>
                  })()}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal Novo/Editar Usuário */}
      <Modal open={modal} title={editId ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => { setModal(false); setEditId(null) }} size="lg">
        {erro && <Alert type="error" message={erro} />}
        {PERFIS_EXTERNOS.includes(form.perfil) && form.perfil !== 'Subestabelecido' && (
          <Alert
            type="info"
            message={`O vínculo deste login ${form.perfil.toLowerCase()} agora é feito no próprio cadastro de ${form.perfil.toLowerCase()} em Cadastros. Aqui você define apenas o acesso do usuário.`}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome *" value={form.nome||''} onChange={e=>set('nome',e.target.value)} />
          <Input label="Login *" value={form.login||''} onChange={e=>set('login',e.target.value)} />
          {!editId && (
            <Input label="Senha *" type="password" value={form.senha||''} onChange={e=>set('senha',e.target.value)} />
          )}
          <Input label="E-mail" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} />
          <Input label="CPF" mask="cpf" value={form.cpf||''} onChange={e=>set('cpf',e.target.value)} />
          <Input label="PIS" value={form.pis||''} onChange={e=>set('pis',e.target.value)} />
          <Select label="Perfil" value={form.perfil||''} onChange={e=>setPerfil(e.target.value)}
            options={PERFIS.map(p=>({value:p,label:p}))} />
          {form.perfil === 'Subestabelecido' ? (
            <div className="space-y-2">
              <Select
                label="Cadastro do subestabelecido *"
                value={form.subestabelecidoId || ''}
                onChange={e=>set('subestabelecidoId', e.target.value)}
                options={(subestabelecidosList.data || []).map((item: any) => ({ value: item.id, label: item.nome }))}
                placeholder="Selecione..."
              />
              <p className="text-xs text-gray-500">
                No caso de subestabelecido, o vínculo continua sendo definido aqui, como no sistema antigo.
              </p>
            </div>
          ) : (
            <div className="flex items-end rounded border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-500">
              {PERFIS_EXTERNOS.includes(form.perfil)
                ? 'O vínculo deste login será feito no próprio cadastro externo.'
                : 'Perfis internos não precisam de vínculo externo.'}
            </div>
          )}
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
          <Button className="flex-1 justify-center" onClick={handleSave} loading={criar.isPending || editar.isPending} disabled={!podeGerenciarUsuarios}>
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
              loading={resetarSenha.isPending} disabled={!novaSenha || novaSenha !== confirmSenha || !podeGerenciarUsuarios}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>{setModalSenha(null);setNovaSenha('');setConfirmSenha('')}}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
