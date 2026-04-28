import { useRef, useState, useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { usePermissoes } from '../lib/permissoes'
import { getStoredAuthToken } from '../lib/auth-storage'
import { formatCnpj, formatCpf, formatCpfCnpj, type DocumentoMask } from '../lib/documento'
import { PageHeader, Card, Button, Input, Select, Textarea, Table, Loading, Modal, Tabs } from '../components/ui'
import { Plus, Trash2, Pencil } from 'lucide-react'

type CampoType = 'text' | 'select' | 'number' | 'checkbox' | 'textarea'

interface CampoConfig {
  key: string
  label: string
  required?: boolean
  type?: CampoType
  options?: { value: string | number; label: string }[]
  hideTable?: boolean
}

function campoDocumentoMask(campo: CampoConfig): DocumentoMask | undefined {
  const key = campo.key.toLowerCase()
  const label = campo.label.toLowerCase()

  if (key === 'cpf' || (label.includes('cpf') && !label.includes('cnpj'))) return 'cpf'
  if (key === 'cnpj' || (label.includes('cnpj') && !label.includes('cpf'))) return 'cnpj'
  if (key === 'cpfcnpj' || (label.includes('cpf') && label.includes('cnpj'))) return 'cpfCnpj'
  return undefined
}

function formatarDocumento(mask: DocumentoMask, value: unknown) {
  if (mask === 'cpf') return formatCpf(value)
  if (mask === 'cnpj') return formatCnpj(value)
  return formatCpfCnpj(value)
}

function CadSimples({ label, novo, listarQuery, criarMutation, editarMutation, excluirMutation, campos, extraAction, podeCriar = true, podeEditar = true, podeExcluir = true, somenteLeituraEdicao = false }: {
  label: string
  novo?: string
  listarQuery: any
  criarMutation: any
  editarMutation?: any
  excluirMutation?: any
  campos: CampoConfig[]
  extraAction?: (item: any) => React.ReactNode
  podeCriar?: boolean
  podeEditar?: boolean
  podeExcluir?: boolean
  somenteLeituraEdicao?: boolean
}) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Record<string,any>>({})
  const [editId, setEditId] = useState<number|null>(null)
  const { data, isLoading, refetch } = listarQuery

  const onSuccess = () => { setModal(false); refetch(); setForm({}); setEditId(null) }
  const criar = criarMutation({ onSuccess })
  const editar = editarMutation ? editarMutation({ onSuccess }) : null
  const excluir = excluirMutation ? excluirMutation({ onSuccess: () => refetch() }) : null

  function set(k:string, v:any) { setForm(f=>({...f,[k]:v})) }

  function openEdit(item: any) {
    if (!podeEditar) return
    const f: Record<string,any> = {}
    campos.forEach(c => {
      if (c.type === 'checkbox') f[c.key] = !!item[c.key]
      else if (c.type === 'number') f[c.key] = item[c.key] != null ? item[c.key] : ''
      else f[c.key] = item[c.key] ?? ''
    })
    setForm(f); setEditId(item.id); setModal(true)
  }

  function openNew() {
    if (!podeCriar) return
    const f: Record<string,any> = {}
    campos.forEach(c => { f[c.key] = c.type === 'checkbox' ? false : '' })
    setForm(f); setEditId(null); setModal(true)
  }

  function handleSave() {
    if (editId && !podeEditar) return
    if (!editId && !podeCriar) return

    const cleaned: Record<string,any> = {}
    campos.forEach(c => {
      const val = form[c.key]
      if (c.type === 'checkbox') { cleaned[c.key] = !!val }
      else if (c.type === 'number') { cleaned[c.key] = val !== '' && val != null ? Number(val) : undefined }
      else if (c.type === 'select') {
        if (val === '' || val == null) { cleaned[c.key] = undefined }
        else { const n = Number(val); cleaned[c.key] = !isNaN(n) && c.options?.some(o => o.value === n) ? n : val }
      } else { cleaned[c.key] = val || undefined }
    })
    if (editId && editar) editar.mutate({ ...cleaned, id: editId })
    else if (editId) criar.mutate({ ...cleaned, id: editId })
    else criar.mutate(cleaned)
  }

  const tableCampos = campos.filter(c => !c.hideTable)
  const mostrarColunaAcoes = !!extraAction || (podeEditar && !!editarMutation) || (podeExcluir && !!excluirMutation)
  const modoSomenteLeitura = somenteLeituraEdicao && editId !== null

  function renderCellValue(item: any, campo: CampoConfig) {
    const val = item[campo.key]
    const documentoMask = campoDocumentoMask(campo)
    if (campo.type === 'checkbox') return val ? '\u2713' : '\u2014'
    if (campo.type === 'select' && campo.options) {
      const opt = campo.options.find(o => String(o.value) === String(val))
      return opt ? opt.label : (val || '\u2014')
    }
    if (documentoMask && val) return formatarDocumento(documentoMask, val)
    return val || '\u2014'
  }

  function renderFormField(c: CampoConfig) {
    const ft = c.type || 'text'
    const documentoMask = campoDocumentoMask(c)
    if (ft === 'select') return <Select key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]??''} onChange={e=>set(c.key,e.target.value)} options={c.options||[]} placeholder="Selecione..." disabled={modoSomenteLeitura} />
    if (ft === 'checkbox') return <label key={c.key} className={`flex items-center gap-2 py-1 ${modoSomenteLeitura ? 'cursor-default opacity-80' : 'cursor-pointer'}`}><input type="checkbox" checked={!!form[c.key]} onChange={e=>set(c.key,e.target.checked)} disabled={modoSomenteLeitura} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700">{c.label}</span></label>
    if (ft === 'textarea') return <Textarea key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]||''} onChange={e=>set(c.key,e.target.value)} rows={3} disabled={modoSomenteLeitura} />
    if (ft === 'number') return <Input key={c.key} type="number" label={c.label+(c.required?' *':'')} value={form[c.key]??''} onChange={e=>set(c.key,e.target.value)} disabled={modoSomenteLeitura} />
    return <Input key={c.key} label={c.label+(c.required?' *':'')} mask={documentoMask} value={form[c.key]||''} onChange={e=>set(c.key,e.target.value)} disabled={modoSomenteLeitura} />
  }

  const saving = editar ? (editId ? editar.isPending : criar.isPending) : criar.isPending

  return (
    <div>
      {podeCriar && (
        <div className="flex justify-end mb-3"><Button size="sm" onClick={openNew}><Plus size={13}/> {novo||'Novo'} {label}</Button></div>
      )}
      {isLoading ? <Loading/> : (
        <Table headers={[...tableCampos.map(c=>c.label), ...(mostrarColunaAcoes ? ['Ações'] : [])]} empty={!data?.length ? 'Nenhum registro' : ''}>
          {data?.map((item:any) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {tableCampos.map(c => <td key={c.key} className="px-4 py-2 text-sm text-gray-700">{renderCellValue(item, c)}</td>)}
              {mostrarColunaAcoes && (
                <td className="px-4 py-2"><div className="flex gap-1">
                  {podeEditar && (
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil size={13} className="text-blue-500"/></Button>
                  )}
                  {podeExcluir && excluir && (
                    <Button size="sm" variant="ghost" onClick={() => { if(confirm('Excluir este registro?')) excluir.mutate({ id: item.id }) }}><Trash2 size={13} className="text-red-500"/></Button>
                  )}
                  {extraAction && extraAction(item)}
                </div></td>
              )}
            </tr>
          ))}
        </Table>
      )}
      <Modal open={modal} title={(modoSomenteLeitura ? 'Visualizar ' : editId ? 'Editar ' : (novo||'Novo') + ' ') + label} onClose={() => setModal(false)}>
        <div className="space-y-3">
          {campos.map(c => renderFormField(c))}
          <div className="flex gap-3 pt-2">
            {!modoSomenteLeitura && <Button className="flex-1 justify-center" onClick={handleSave} loading={saving}>Salvar</Button>}
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>{modoSomenteLeitura ? 'Fechar' : 'Cancelar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function useCrudPermissoes(base: string) {
  const { pode } = usePermissoes()
  return {
    podeVer: pode(base),
    podeCriar: pode(`${base}:criar`),
    podeEditar: pode(`${base}:editar`),
    podeExcluir: pode(`${base}:excluir`),
  }
}

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf=>({value:uf,label:uf}))
const ENCAMINHAMENTO_OPTIONS = [{value:'CENOP',label:'CENOP'},{value:'SICOB',label:'SICOB'},{value:'CEHOP',label:'CEHOP'},{value:'INTERCERVICE',label:'INTERCERVICE'},{value:'FUNCHAL',label:'FUNCHAL'},{value:'FINTECH',label:'FINTECH'},{value:'ITAÚ',label:'ITAÚ'}]
const TIPO_EMPREENDIMENTO_OPTIONS = [{value:'Comercial',label:'Comercial'},{value:'Residencial',label:'Residencial'}]
const DOCUMENTO_OPTIONS = [{value:'CPF',label:'CPF'},{value:'CNPJ',label:'CNPJ'}]
const TIPO_CHAVE_PIX_OPTIONS = [{value:'CPF',label:'CPF'},{value:'Celular',label:'Celular'},{value:'Email',label:'Email'},{value:'Aleatória',label:'Aleatória'}]
const NATUREZA_TIPO_OPTIONS = [{value:'Despesa',label:'Despesa'},{value:'Receita',label:'Receita'},{value:'Ambos',label:'Ambos'}]
const SIMULADOR_TIPO_OPTIONS = [{value:'Simulador',label:'Simulador'},{value:'Portal',label:'Portal'}]

function mapUsuariosPorPerfil(usuarios: any[] | undefined, perfil: string) {
  return (usuarios || [])
    .filter((usuario: any) => usuario.perfil === perfil)
    .map((usuario: any) => ({ value: usuario.id, label: `${usuario.nome} (${usuario.login})` }))
}

function TabBancos() {
  const [vincId, setVincId] = useState<number|null>(null)
  return (
    <>
      <CadSimples label="Banco" listarQuery={trpc.cadastros.bancos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.bancos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.bancos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.bancos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'encaminhamento',label:'Encaminhamento',type:'select',options:ENCAMINHAMENTO_OPTIONS},{key:'remuneracao',label:'Remuneração %'}]} extraAction={(item:any) => <button onClick={()=>setVincId(item.id)} className="text-blue-600 hover:text-blue-800 text-xs px-1" title="Modalidades vinculadas">📋</button>} />
      {vincId && <ModalidadesVinculadas bancoId={vincId} onClose={()=>setVincId(null)} />}
    </>
  )
}

function ModalidadesVinculadas({ bancoId, onClose }:{ bancoId:number; onClose:()=>void }) {
  const [selMod, setSelMod] = useState('')
  const vinculadas = trpc.cadastros.bancos.modalidadesVinculadas.useQuery({ bancoId })
  const vincular = trpc.cadastros.bancos.vincularModalidade.useMutation({ onSuccess: () => { vinculadas.refetch(); setSelMod('') } })
  const desvincular = trpc.cadastros.bancos.desvincularModalidade.useMutation({ onSuccess: () => vinculadas.refetch() })
  const todasMod = trpc.cadastros.modalidades.listar.useQuery()
  const lista = vinculadas.data || []
  const vinculadasIds = lista.map((v:any) => v.modalidadeId)
  const disponiveis = (todasMod.data || []).filter((m:any) => !vinculadasIds.includes(m.id))
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Modalidades Vinculadas ao Banco</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex gap-2 mb-4">
          <select value={selMod} onChange={e=>setSelMod(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm">
            <option value="">Selecione uma modalidade...</option>
            {disponiveis.map((m:any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <button onClick={()=>selMod && vincular.mutate({ bancoId, modalidadeId: Number(selMod) })} disabled={!selMod || vincular.isPending} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">Vincular</button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {lista.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma modalidade vinculada.</p>}
          {lista.map((v:any) => (
            <div key={v.modalidadeId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
              <span className="text-sm">{v.modalidadeNome}</span>
              <button onClick={()=>desvincular.mutate({ bancoId, modalidadeId: v.modalidadeId })} className="text-red-500 hover:text-red-700 text-xs">Remover</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TabAgencias() {
  const perms = useCrudPermissoes('cadastro:agencia')
  const [filtroBancoId, setFiltroBancoId] = useState('')
  const {data:bd}=trpc.cadastros.bancos.listar.useQuery()
  const bo=(bd||[]).map((b:any)=>({value:b.id,label:b.nome}))
  const boFiltro=[{value:'',label:'Todos os bancos'}, ...bo]
  const listarAgencias = trpc.cadastros.agencias.listar.useQuery({ bancoId: filtroBancoId ? Number(filtroBancoId) : undefined })

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="max-w-md">
          <Select
            label="Banco"
            value={filtroBancoId}
            onChange={e=>setFiltroBancoId(e.target.value)}
            options={boFiltro}
            placeholder="Todos os bancos"
          />
        </div>
      </Card>

      <CadSimples
        label="Agência"
        listarQuery={listarAgencias}
        criarMutation={(opts:any)=>trpc.cadastros.agencias.criar.useMutation(opts)}
        editarMutation={(opts:any)=>trpc.cadastros.agencias.editar.useMutation(opts)}
        excluirMutation={(opts:any)=>trpc.cadastros.agencias.excluir.useMutation(opts)}
        campos={[
          {key:'nome',label:'Nome da Agência',required:true},
          {key:'bancoId',label:'Banco',type:'select',options:bo},
          {key:'codigo',label:'Número da Agência'},
          {key:'cidade',label:'Cidade'},
          {key:'uf',label:'UF',type:'select',options:UF_OPTIONS},
        ]}
        podeCriar={perms.podeCriar}
        podeEditar={perms.podeEditar}
        podeExcluir={perms.podeExcluir}
      />
    </div>
  )
}

function TabModalidades() {
  const {data:fd}=trpc.cadastros.fluxos.listar.useQuery(); const fo=(fd||[]).map((f:any)=>({value:f.id,label:f.nome}))
  return <CadSimples label="Modalidade" listarQuery={trpc.cadastros.modalidades.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.modalidades.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.modalidades.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.modalidades.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'fluxoId',label:'Fluxo',type:'select',options:fo}]} />
}

function TabEtapas() {
  const {data:sd}=trpc.cadastros.situacoes.listar.useQuery(); const so=(sd||[]).map((s:any)=>({value:s.id,label:s.nome}))
  return <CadSimples label="Etapa" listarQuery={trpc.cadastros.etapas.listar.useQuery({})} criarMutation={(opts:any)=>trpc.cadastros.etapas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.etapas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.etapas.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'ordem',label:'Ordem',type:'number'},{key:'situacaoId',label:'Situação',type:'select',options:so},{key:'tolerancia',label:'Tolerância/Dias',type:'number'},{key:'importante',label:'Importante',type:'checkbox',hideTable:true},{key:'atendente',label:'Atendente',type:'checkbox',hideTable:true},{key:'externo',label:'Externo',type:'checkbox',hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}

function TabEmpreendimentos() {
  const perms = useCrudPermissoes('cadastro:empreendimento')
  const {data:cd}=trpc.cadastros.construtoras.listar.useQuery(); const co=(cd||[]).map((c:any)=>({value:c.id,label:c.nome}))
  return <CadSimples label="Empreendimento" listarQuery={trpc.cadastros.empreendimentos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.empreendimentos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.empreendimentos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.empreendimentos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome do Empreendimento',required:true},{key:'construtoraId',label:'Construtora',type:'select',options:co},{key:'tipo',label:'Tipo de Empreendimento',type:'select',options:TIPO_EMPREENDIMENTO_OPTIONS},{key:'endereco',label:'Endereço',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade'},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS}]} podeCriar={perms.podeCriar} podeEditar={perms.podeEditar} podeExcluir={perms.podeExcluir} />
}

function TabConstrutoras() {
  const perms = useCrudPermissoes('cadastro:construtora')
  const {data:us}=trpc.cadastros.usuarios.listar.useQuery(); const uo=mapUsuariosPorPerfil(us, 'Construtora')
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  return <CadSimples label="Construtora" novo="Nova" listarQuery={trpc.cadastros.construtoras.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.construtoras.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.construtoras.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.construtoras.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome da Construtora',required:true},{key:'cnpj',label:'CNPJ'},{key:'contato',label:'Nome do Contato'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'endereco',label:'Endereço',hideTable:true},{key:'numero',label:'Número',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade',hideTable:true},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS,hideTable:true},{key:'cep',label:'CEP',hideTable:true},{key:'parceiroId',label:'Parceiro',type:'select',options:po,hideTable:true},{key:'usuarioId',label:'Usuário do Sistema',type:'select',options:uo,hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} podeCriar={perms.podeCriar} podeEditar={perms.podeEditar} podeExcluir={perms.podeExcluir} />
}

function TabImobiliarias() {
  const perms = useCrudPermissoes('cadastro:imobiliaria')
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  const {data:ud}=trpc.cadastros.usuarios.listar.useQuery(); const uo=mapUsuariosPorPerfil(ud, 'Imobiliária')
  return <CadSimples label="Imobiliária" listarQuery={trpc.cadastros.imobiliarias.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.imobiliarias.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.imobiliarias.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.imobiliarias.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome da Imobiliária',required:true},{key:'cnpj',label:'CNPJ'},{key:'contato',label:'Nome do Contato'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'endereco',label:'Endereço',hideTable:true},{key:'numero',label:'Número',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade',hideTable:true},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS,hideTable:true},{key:'cep',label:'CEP',hideTable:true},{key:'parceiroId',label:'Parceiro',type:'select',options:po,hideTable:true},{key:'usuarioId',label:'Usuário do Sistema',type:'select',options:uo,hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} podeCriar={perms.podeCriar} podeEditar={perms.podeEditar} podeExcluir={perms.podeExcluir} />
}

function TabCorretores() {
  const perms = useCrudPermissoes('cadastro:corretor')
  const {data:id}=trpc.cadastros.imobiliarias.listar.useQuery(); const io=(id||[]).map((i:any)=>({value:i.id,label:i.nome}))
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  const {data:ud}=trpc.cadastros.usuarios.listar.useQuery(); const uo=mapUsuariosPorPerfil(ud, 'Corretor')
  return <CadSimples label="Corretor" listarQuery={trpc.cadastros.corretores.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.corretores.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.corretores.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.corretores.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome do Corretor',required:true},{key:'cpf',label:'CPF'},{key:'creci',label:'CRECI'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'imobiliariaId',label:'Imobiliária',type:'select',options:io},{key:'parceiroId',label:'Parceiro',type:'select',options:po},{key:'usuarioId',label:'Usuário do Sistema',type:'select',options:uo,hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} podeCriar={perms.podeCriar} podeEditar={perms.podeEditar} podeExcluir={perms.podeExcluir} />
}

function TabParceiros() {
  const perms = useCrudPermissoes('cadastro:parceiro')
  const { perfil } = usePermissoes()
  const analistaSomenteVisualiza = perfil === 'Analista'
  const {data:ud}=trpc.cadastros.usuarios.listar.useQuery(); const uo=mapUsuariosPorPerfil(ud, 'Parceiro')
  const [bancosId, setBancosId] = useState<number|null>(null)
  const [arquivosId, setArquivosId] = useState<number|null>(null)
  return (
    <>
      <CadSimples label="Parceiro" listarQuery={trpc.cadastros.parceiros.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.parceiros.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.parceiros.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.parceiros.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'nomeFantasia',label:'Nome Fantasia',hideTable:true},{key:'razaoSocial',label:'Razão Social',hideTable:true},{key:'cnpj',label:'CPF/CNPJ'},{key:'representante',label:'Nome do Representante',hideTable:true},{key:'documento',label:'Documento',type:'select',options:DOCUMENTO_OPTIONS,hideTable:true},{key:'contato',label:'Contato'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'endereco',label:'Endereço',hideTable:true},{key:'numero',label:'Número',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade',hideTable:true},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS,hideTable:true},{key:'cep',label:'CEP',hideTable:true},{key:'responsavel',label:'Responsável',hideTable:true},{key:'usuarioId',label:'Usuário do Sistema',type:'select',options:uo,hideTable:true},{key:'tipoChavePix',label:'Tipo Chave PIX',type:'select',options:TIPO_CHAVE_PIX_OPTIONS,hideTable:true},{key:'chavePix',label:'Chave PIX',hideTable:true},{key:'dataContrato',label:'Data Contrato',hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} extraAction={(item:any) => (<><button onClick={()=>setBancosId(item.id)} className="text-blue-600 hover:text-blue-800 text-xs px-1" title="Bancos vinculados">🏦</button><button onClick={()=>setArquivosId(item.id)} className="text-green-600 hover:text-green-800 text-xs px-1" title="Arquivos">📎</button></>)} podeCriar={analistaSomenteVisualiza ? false : perms.podeCriar} podeEditar={analistaSomenteVisualiza ? perms.podeVer : perms.podeEditar} podeExcluir={analistaSomenteVisualiza ? false : perms.podeExcluir} somenteLeituraEdicao={analistaSomenteVisualiza} />
      {bancosId && <ParceiroBancosModal parceiroId={bancosId} onClose={()=>setBancosId(null)} somenteLeitura={analistaSomenteVisualiza} />}
      {arquivosId && <ParceiroArquivosModal parceiroId={arquivosId} onClose={()=>setArquivosId(null)} somenteLeitura={analistaSomenteVisualiza} />}
    </>
  )
}

function ParceiroBancosModal({ parceiroId, onClose, somenteLeitura = false }:{ parceiroId:number; onClose:()=>void; somenteLeitura?: boolean }) {
  const lista = trpc.cadastros.parceiros.bancosVinculados.useQuery({ parceiroId })
  const vincular = trpc.cadastros.parceiros.vincularBanco.useMutation({ onSuccess: () => lista.refetch() })
  const desvincular = trpc.cadastros.parceiros.desvincularBanco.useMutation({ onSuccess: () => lista.refetch() })
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Bancos Vinculados ao Parceiro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {lista.isLoading && <p className="text-sm text-gray-500 text-center py-4">Carregando...</p>}
          {(lista.data||[]).map((b:any) => (
            <div key={b.id} className={`flex items-center gap-3 px-3 py-2 rounded ${somenteLeitura ? '' : 'cursor-pointer hover:bg-gray-50'} ${b.vinculado ? 'bg-green-50' : ''}`}
              onClick={somenteLeitura ? undefined : () => b.vinculado ? desvincular.mutate({ parceiroId, bancoId: b.id }) : vincular.mutate({ parceiroId, bancoId: b.id })}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${b.vinculado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                {b.vinculado && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm">{b.nome}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">Fechar</button>
        </div>
      </div>
    </div>
  )
}

function ParceiroArquivosModal({ parceiroId, onClose, somenteLeitura = false }:{ parceiroId:number; onClose:()=>void; somenteLeitura?: boolean }) {
  const lista = trpc.cadastros.parceiros.listarArquivos.useQuery({ parceiroId })
  const excluir = trpc.cadastros.parceiros.excluirArquivo.useMutation({ onSuccess: () => lista.refetch() })
  const registrar = trpc.cadastros.parceiros.registrarArquivo.useMutation({ onSuccess: () => lista.refetch() })
  const [uploading, setUploading] = useState(false)
  const [erroUpload, setErroUpload] = useState('')
  const [arquivoPreview, setArquivoPreview] = useState<{ nome: string; url: string } | null>(null)
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 })
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)
  const previewDragRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  function arquivoUrl(caminho: string) {
    const base = import.meta.env.BASE_URL || '/'
    const token = getStoredAuthToken()
    const cleanPath = caminho?.startsWith('/uploads/') ? caminho.slice(1) : caminho
    return `${base}${cleanPath}?token=${encodeURIComponent(token)}`
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (somenteLeitura) return
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    setErroUpload('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const token = getStoredAuthToken()
      const res = await fetch(import.meta.env.BASE_URL + 'api/upload', { method: 'POST', body: fd, headers: { Authorization: 'Bearer ' + token } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Não foi possível enviar o arquivo.')
      }
      await registrar.mutateAsync({ parceiroId, nomeOriginal: file.name, nomeArquivo: data.filename, caminhoArquivo: data.path, mimeType: file.type, tamanho: file.size })
    } catch (err: any) {
      setErroUpload(err?.message || 'Não foi possível anexar o arquivo.')
    } finally { setUploading(false); e.target.value = '' }
  }

  function abrirArquivo(a: any) {
    setPreviewOffset({ x: 0, y: 0 })
    setArquivoPreview({
      nome: a.nomeOriginal || a.nomeArquivo || 'Arquivo',
      url: arquivoUrl(a.caminhoArquivo),
    })
  }

  function moverPreview(event: PointerEvent) {
    const start = previewDragRef.current
    setPreviewOffset({
      x: start.offsetX + event.clientX - start.x,
      y: start.offsetY + event.clientY - start.y,
    })
  }

  function pararPreview() {
    window.removeEventListener('pointermove', moverPreview)
  }

  function iniciarPreview(event: React.PointerEvent<HTMLDivElement>) {
    previewDragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: previewOffset.x,
      offsetY: previewOffset.y,
    }
    window.addEventListener('pointermove', moverPreview)
    window.addEventListener('pointerup', pararPreview, { once: true })
  }

  function imprimirPreview() {
    previewFrameRef.current?.contentWindow?.focus()
    previewFrameRef.current?.contentWindow?.print()
  }

  function abrirPreviewEmJanela() {
    if (!arquivoPreview) return
    window.open(arquivoPreview.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Arquivos do Parceiro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {!somenteLeitura && (
          <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 cursor-pointer hover:border-blue-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-sm text-gray-600">{uploading ? 'Enviando...' : '📎 Clique para selecionar arquivo'}</span>
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        )}
        {erroUpload && <p className="text-sm text-red-600 mb-3">{erroUpload}</p>}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {lista.isLoading && <p className="text-sm text-gray-500 text-center py-2">Carregando...</p>}
          {!(lista.data||[]).length && !lista.isLoading && <p className="text-sm text-gray-500 text-center py-4">Nenhum arquivo.</p>}
          {(lista.data||[]).map((a:any) => (
            <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
              <button type="button" onClick={() => abrirArquivo(a)} className="text-sm text-blue-600 hover:underline truncate max-w-xs text-left">{a.nomeOriginal}</button>
              {!somenteLeitura && <button onClick={()=>confirm('Excluir arquivo?')&&excluir.mutate({id:a.id})} className="text-red-500 hover:text-red-700 text-xs ml-2 flex-shrink-0">Excluir</button>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">Fechar</button>
        </div>
      </div>

      {arquivoPreview && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setArquivoPreview(null)} />
          <div
            className="fixed left-1/2 top-1/2 z-10 flex h-[92vh] w-[94vw] max-w-[1400px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-2xl"
            style={{ transform: `translate(calc(-50% + ${previewOffset.x}px), calc(-50% + ${previewOffset.y}px))` }}
          >
            <div
              className="flex cursor-move items-center justify-between gap-3 border-b px-5 py-3"
              onPointerDown={iniciarPreview}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-800">{arquivoPreview.nome}</h2>
                <p className="text-xs text-gray-500">Arraste esta barra para mover a visualização.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={abrirPreviewEmJanela}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Abrir em nova janela
                </button>
                <a
                  href={arquivoPreview.url}
                  download={arquivoPreview.nome}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Baixar
                </a>
                <button
                  type="button"
                  onClick={imprimirPreview}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setArquivoPreview(null)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-xl leading-none text-gray-500 hover:bg-gray-50 hover:text-gray-800">
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-3">
              <iframe
                ref={previewFrameRef}
                title={arquivoPreview.nome}
                src={arquivoPreview.url}
                className="h-full w-full rounded border border-gray-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabFinContas() {
  const {data:ed}=trpc.cadastros.finEmpresas.listar.useQuery(); const eo=(ed||[]).map((e:any)=>({value:e.id,label:e.nome}))
  return <CadSimples label="Conta Bancária" novo="Nova" listarQuery={trpc.cadastros.finContas.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finContas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finContas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finContas.excluir.useMutation(opts)} campos={[{key:'banco',label:'Banco',required:true},{key:'agencia',label:'Agência'},{key:'conta',label:'Conta'},{key:'titular',label:'Titular'},{key:'limite',label:'Limite',hideTable:true},{key:'saldo',label:'Saldo',hideTable:true},{key:'empresaId',label:'Empresa',type:'select',options:eo},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}

function TabSimuladores() {
  return <CadSimples label="Simulador" listarQuery={trpc.cadastros.simuladores.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.simuladores.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.simuladores.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.simuladores.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'url',label:'URL'},{key:'logoUrl',label:'Logo URL'},{key:'tipo',label:'Tipo',type:'select',options:SIMULADOR_TIPO_OPTIONS}]} />
}

function TabNaturezas() {
  return <CadSimples label="Natureza" novo="Nova" listarQuery={trpc.cadastros.finNaturezas.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finNaturezas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finNaturezas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finNaturezas.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'tipo',label:'Tipo',type:'select',options:NATUREZA_TIPO_OPTIONS}]} />
}

function TabDocumentosTipos() {
  return <CadSimples label="Documento" listarQuery={trpc.cadastros.documentosTipos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.documentosTipos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.documentosTipos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.documentosTipos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'categoria',label:'Categoria',type:'select',options:[{value:'Comprador - Pessoa Física',label:'Comprador - Pessoa Física'},{value:'Comprador - Pessoa Jurídica',label:'Comprador - Pessoa Jurídica'},{value:'Vendedor - Pessoa Física',label:'Vendedor - Pessoa Física'},{value:'Vendedor - Pessoa Jurídica',label:'Vendedor - Pessoa Jurídica'},{value:'Imóvel',label:'Imóvel'},{value:'Formulários',label:'Formulários'}]},{key:'ordem',label:'Ordem',type:'number'},{key:'obrigatorio',label:'Obrigatório',type:'checkbox'}]} />
}

function TabSubestabelecidos() {
  const perms = useCrudPermissoes('cadastro:subestabelecido')
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  const listar = trpc.cadastros.subestabelecidos.listar.useQuery()
  const [vincId, setVincId] = useState<number|null>(null)
  return (
    <div>
      <CadSimples label="Subestabelecido" listarQuery={listar} criarMutation={(opts:any)=>trpc.cadastros.subestabelecidos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.subestabelecidos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.subestabelecidos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'cpf',label:'CPF'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'parceiroId',label:'Parceiro',type:'select',options:po}]} extraAction={(item:any) => <button onClick={()=>setVincId(item.id)} className="text-blue-600 hover:text-blue-800 text-xs px-1" title="Bancos vinculados">🏦</button>} podeCriar={perms.podeCriar} podeEditar={perms.podeEditar} podeExcluir={perms.podeExcluir} />
      {vincId && <BancosVinculados subestabelecidoId={vincId} onClose={()=>setVincId(null)} />}
    </div>
  )
}

function BancosVinculados({ subestabelecidoId, onClose }:{ subestabelecidoId:number; onClose:()=>void }) {
  const [bancoId, setBancoId] = useState(0)
  const bancosList = trpc.cadastros.bancos.listar.useQuery()
  const vinculados = trpc.cadastros.subestabelecidos.bancosVinculados.useQuery({ subestabelecidoId })
  const vincular = trpc.cadastros.subestabelecidos.vincularBanco.useMutation({ onSuccess: () => vinculados.refetch() })
  const desvincular = trpc.cadastros.subestabelecidos.desvincularBanco.useMutation({ onSuccess: () => vinculados.refetch() })

  return (
    <Modal open={true} title="Bancos vinculados" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2 items-end">
          <Select label="Banco" value={bancoId} onChange={e=>setBancoId(Number(e.target.value))}
            options={(bancosList.data||[]).map((b:any)=>({value:b.id,label:b.nome}))} placeholder="Selecione..." />
          <Button onClick={()=>{ if(bancoId) vincular.mutate({ subestabelecidoId, bancoId }); setBancoId(0) }}>Adicionar</Button>
        </div>
        <Table headers={['Banco','']} empty={!vinculados.data?.length ? 'Nenhum banco vinculado.' : undefined}>
          {vinculados.data?.map((v:any) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm">{v.bancoNome}</td>
              <td className="px-4 py-2 w-10">
                <button onClick={()=>desvincular.mutate({id:v.id})} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </Modal>
  )
}

function TabFluxos() {
  const [etapasId, setEtapasId] = useState<number|null>(null)
  const [docsFluxo, setDocsFluxo] = useState<{id:number,nome:string}|null>(null)
  return (
    <>
      <CadSimples label="Fluxo" listarQuery={trpc.cadastros.fluxos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.fluxos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.fluxos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.fluxos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'externo',label:'Externo',type:'checkbox'}]}
        extraAction={(item:any) => (<>
          <button onClick={()=>setEtapasId(item.id)} className="text-orange-600 hover:text-orange-800 text-xs px-1" title="Configurar Etapas">&#128295;</button>
          <button onClick={()=>setDocsFluxo({id:item.id,nome:item.nome})} className="text-purple-600 hover:text-purple-800 text-xs px-1" title="Documentos">&#128196;</button>
        </>)} />
      {etapasId && <FluxoEtapasModal fluxoId={etapasId} onClose={()=>setEtapasId(null)} />}
      {docsFluxo && <FluxoChecklistModal fluxoId={docsFluxo.id} fluxoNome={docsFluxo.nome} onClose={()=>setDocsFluxo(null)} />}
    </>
  )
}

function FluxoEtapasModal({ fluxoId, onClose }:{ fluxoId:number; onClose:()=>void }) {
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const lista = trpc.cadastros.fluxos.listarEtapas.useQuery({ fluxoId })
  const situacoesList = trpc.cadastros.situacoes.listar.useQuery()
  const vincular = trpc.cadastros.fluxos.vincularEtapa.useMutation({ onSuccess: () => { lista.refetch(); setFiltroEtapa('') } })
  const desvincular = trpc.cadastros.fluxos.desvincularEtapa.useMutation({ onSuccess: () => lista.refetch() })
  const subir = trpc.cadastros.fluxos.subirOrdemEtapa.useMutation({ onSuccess: () => lista.refetch() })
  const descer = trpc.cadastros.fluxos.descerOrdemEtapa.useMutation({ onSuccess: () => lista.refetch() })
  const vinculadas = (lista.data||[]).filter((e:any) => e.vinculado).sort((a:any,b:any) => (a.fluxoOrdem||0) - (b.fluxoOrdem||0))
  const disponiveis = (lista.data||[]).filter((e:any) => !e.vinculado)
  const filtradas = disponiveis.filter((e:any) => {
    if (filtroSituacao && String(e.situacaoId) !== filtroSituacao) return false
    return true
  })
  const fluxoData = trpc.cadastros.fluxos.listar.useQuery()
  const fluxoNome = (fluxoData.data||[]).find((f:any) => f.id === fluxoId)?.nome || ''
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" style={{maxHeight:'90vh'}}>
        <div className="flex items-center justify-between p-4 border-b rounded-t-lg" style={{background:'#e8f0fe'}}>
          <div className="flex items-center gap-2">
            <span className="text-orange-600 text-lg">\🔧</span>
            <h3 className="font-semibold text-blue-800 text-sm">Configurar Fluxo: {fluxoNome}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Situação</label>
              <select value={filtroSituacao} onChange={e=>{setFiltroSituacao(e.target.value);setFiltroEtapa('')}} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Todas</option>
                {(situacoesList.data||[]).map((s:any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
              <select value={filtroEtapa} onChange={e=>setFiltroEtapa(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Selecione...</option>
                {filtradas.map((e:any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <button onClick={()=>{if(filtroEtapa) { vincular.mutate({ etapaId: Number(filtroEtapa), fluxoId }); }}} disabled={!filtroEtapa || vincular.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50 whitespace-nowrap flex items-center gap-1">
              <Plus size={14}/> Adicionar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{background:'#b8d4e3'}}>
                <th className="px-2 py-2 text-left w-24"></th>
                <th className="px-2 py-2 text-left font-semibold">Etapa</th>
                <th className="px-2 py-2 text-center w-16 font-semibold">Ordem</th>
              </tr>
            </thead>
            <tbody>
              {vinculadas.length === 0 && (
                <tr><td colSpan={3} className="text-center text-gray-400 text-sm py-6">Nenhuma etapa vinculada.</td></tr>
              )}
              {vinculadas.map((e:any, idx:number) => (
                <tr key={e.id} className={`border-b ${idx%2===0?'bg-white':'bg-gray-50'} hover:bg-blue-50`}>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>subir.mutate({etapaId:e.id,fluxoId})} disabled={idx===0} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Subir">&#9650;</button>
                      <button onClick={()=>descer.mutate({etapaId:e.id,fluxoId})} disabled={idx===vinculadas.length-1} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Descer">&#9660;</button>
                      <button onClick={()=>confirm('Remover etapa?')&&desvincular.mutate({etapaId:e.id,fluxoId})} className="text-red-400 hover:text-red-600 text-sm ml-1" title="Remover">&#128465;</button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">{e.nome}</td>
                  <td className="px-2 py-1.5 text-gray-600 text-center">{e.fluxoOrdem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t flex justify-end">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">Fechar</button>
        </div>
      </div>
    </div>
  )
}

function FluxoChecklistModal({ fluxoId, fluxoNome, onClose }:{ fluxoId:number; fluxoNome:string; onClose:()=>void }) {
  const [catTab, setCatTab] = useState('Comprador')
  const [subTab, setSubTab] = useState('Pessoa Física')
  const [selDoc, setSelDoc] = useState('')
  const hasSubTab = catTab === 'Comprador' || catTab === 'Vendedor'
  const categoria = hasSubTab ? `${catTab} - ${subTab}` : catTab
  const checklist = trpc.cadastros.fluxos.listarChecklist.useQuery({ fluxoId, categoria })
  const todosDoc = trpc.cadastros.documentosTipos.listar.useQuery()
  const adicionar = trpc.cadastros.fluxos.adicionarDocChecklist.useMutation({ onSuccess: () => { checklist.refetch(); setSelDoc('') } })
  const definirObrigatorioPrimeiraEtapa = trpc.cadastros.fluxos.definirObrigatorioPrimeiraEtapaDoc.useMutation({ onSuccess: () => checklist.refetch() })
  const remover = trpc.cadastros.fluxos.removerDocChecklist.useMutation({ onSuccess: () => checklist.refetch() })
  const subir = trpc.cadastros.fluxos.subirOrdemDoc.useMutation({ onSuccess: () => checklist.refetch() })
  const descer = trpc.cadastros.fluxos.descerOrdemDoc.useMutation({ onSuccess: () => checklist.refetch() })
  const docs = checklist.data || []
  const jaVinculados = new Set(docs.map((d:any) => d.documentoTipoId))
  const disponiveis = (todosDoc.data || []).filter((d:any) => !jaVinculados.has(d.id))
  const nextOrdem = docs.length > 0 ? Math.max(...docs.map((d:any) => Number(d.ordem)||0)) + 1 : 1
  function changeTab(cat:string) { setCatTab(cat); setSubTab('Pessoa Física'); setSelDoc('') }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" style={{maxHeight:'90vh'}}>
        <div className="flex items-center justify-between p-4 border-b rounded-t-lg" style={{background:'#e8f0fe'}}>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 text-lg">&#128196;</span>
            <h3 className="font-semibold text-blue-800 text-sm">CheckList de Documenta&#231;&#227;o do Fluxo: {fluxoNome}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="border-b px-4 bg-white">
          <div className="flex">
            {['Comprador','Vendedor','Im\u00f3vel','Formul\u00e1rios'].map(cat => (
              <button key={cat} onClick={()=>changeTab(cat)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px font-medium ${catTab===cat ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        {hasSubTab && (
          <div className="border-b px-4" style={{background:'#f8f9fa'}}>
            <div className="flex">
              {['Pessoa Física','Pessoa Jurídica'].map(sub => (
                <button key={sub} onClick={()=>{setSubTab(sub);setSelDoc('')}}
                  className={`px-4 py-1.5 text-sm border-b-2 -mb-px ${subTab===sub ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{background:'#b8d4e3'}}>
                <th className="px-2 py-2 text-left w-20"></th>
                <th className="px-2 py-2 text-left w-16"></th>
                <th className="px-2 py-2 text-left w-16 font-semibold">Ordem</th>
                <th className="px-2 py-2 text-left font-semibold">Documento</th>
                <th className="px-2 py-2 text-center w-32 font-semibold">1ª etapa</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 text-sm py-6">Nenhum documento vinculado.</td></tr>
              )}
              {docs.map((doc:any, idx:number) => (
                <tr key={doc.id} className={`border-b ${idx%2===0?'bg-white':'bg-gray-50'} hover:bg-blue-50`}>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>confirm('Remover documento?')&&remover.mutate({id:doc.id})} className="text-red-400 hover:text-red-600 text-sm" title="Remover">&#128465;</button>
                    </div>
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button onClick={()=>subir.mutate({id:doc.id,fluxoId,categoria})} disabled={idx===0} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Subir">&#9650;</button>
                      <button onClick={()=>descer.mutate({id:doc.id,fluxoId,categoria})} disabled={idx===docs.length-1} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Descer">&#9660;</button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 text-center">{doc.ordem}</td>
                  <td className="px-2 py-1.5">{doc.docNome}</td>
                  <td className="px-2 py-1.5 text-center">
                    <label className="inline-flex items-center justify-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!doc.obrigatorioPrimeiraEtapa}
                        onChange={e => definirObrigatorioPrimeiraEtapa.mutate({ id: doc.id, obrigatorioPrimeiraEtapa: e.target.checked })}
                        className="rounded"
                      />
                      Obrigatório
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-4 items-end">
            <div className="flex-1">
              <select value={selDoc} onChange={e=>setSelDoc(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Selecione um documento para vincular...</option>
                {disponiveis.map((d:any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <button onClick={()=>selDoc && adicionar.mutate({ fluxoId, documentoTipoId: Number(selDoc), categoria, ordem: nextOrdem, obrigatorioPrimeiraEtapa: false })}
              disabled={!selDoc || adicionar.isPending} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50 whitespace-nowrap">Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabSituacoes() {
  return <CadSimples label="Situação" listarQuery={trpc.cadastros.situacoes.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.situacoes.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.situacoes.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.situacoes.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'ordem',label:'Ordem',type:'number'}]} />
}
function TabImoveis() {
  const perms = useCrudPermissoes('cadastro:imovel')
  const { perfil, isExterno } = usePermissoes()
  const {data:cd}=trpc.cadastros.construtoras.listar.useQuery(); const co=(cd||[]).map((c:any)=>({value:c.id,label:c.nome}))
  const {data:rid}=trpc.cadastros.corretores.listar.useQuery(); const ro=(rid||[]).map((r:any)=>({value:r.id,label:r.nome}))
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  const {data:id}=trpc.cadastros.imobiliarias.listar.useQuery(); const io=(id||[]).map((i:any)=>({value:i.id,label:i.nome}))
  const {data:ud}=trpc.cadastros.usuarios.listar.useQuery(); const uo=(ud||[]).map((u:any)=>({value:u.id,label:u.nome}))
  const campos = [
    {key:'matricula',label:'Matrícula'},
    {key:'endereco',label:'Endereço',required:true},
    {key:'numero',label:'Número'},
    {key:'complemento',label:'Complemento',hideTable:true},
    {key:'bairro',label:'Bairro'},
    {key:'cidade',label:'Cidade'},
    {key:'uf',label:'UF',type:'select' as const,options:UF_OPTIONS},
    {key:'cep',label:'CEP'},
    {key:'tipo',label:'Tipo',type:'select' as const,options:[{value:'Residencial',label:'Residencial'},{value:'Comercial',label:'Comercial'},{value:'Terreno',label:'Terreno'},{value:'Galpão',label:'Galpão'}],hideTable:true},
    ...(!(isExterno && perfil === 'Construtora') ? [{key:'construtoraId',label:'Construtora',type:'select' as const,options:co,hideTable:true}] : []),
    ...(!(isExterno && perfil === 'Corretor') ? [{key:'corretorId',label:'Corretor',type:'select' as const,options:ro,hideTable:true}] : []),
    ...(!isExterno ? [{key:'parceiroId',label:'Parceiro',type:'select' as const,options:po,hideTable:true}] : []),
    ...(!(isExterno && ['Corretor','Imobiliária'].includes(perfil)) ? [{key:'imobiliariaId',label:'Imobiliária',type:'select' as const,options:io,hideTable:true}] : []),
    ...(!isExterno ? [{key:'usuarioId',label:'Usuário Responsável',type:'select' as const,options:uo,hideTable:true}] : []),
  ]
  return <CadSimples label="Imóvel" listarQuery={trpc.cadastros.imoveis.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.imoveis.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.imoveis.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.imoveis.excluir.useMutation(opts)} campos={campos} podeCriar={perms.podeCriar} podeEditar={perms.podeEditar} podeExcluir={perms.podeExcluir} />
}
function TabFinEmpresas() {
  return <CadSimples label="Empresa" novo="Nova" listarQuery={trpc.cadastros.finEmpresas.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finEmpresas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finEmpresas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finEmpresas.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'cnpj',label:'CNPJ'},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}
function TabFinFornecedores() {
  return <CadSimples label="Fornecedor" listarQuery={trpc.cadastros.finFornecedores.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finFornecedores.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finFornecedores.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finFornecedores.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'cnpj',label:'CNPJ'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}
function TabFinDevedores() {
  return <CadSimples label="Devedor" listarQuery={trpc.cadastros.finDevedores.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finDevedores.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finDevedores.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finDevedores.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'cnpj',label:'CNPJ'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}
function TabFinTipoDespesas() {
  return <CadSimples label="Tipo de Despesa" listarQuery={trpc.cadastros.finTipoDespesas.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finTipoDespesas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finTipoDespesas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finTipoDespesas.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}
function TabFinTipoReceitas() {
  return <CadSimples label="Tipo de Receita" listarQuery={trpc.cadastros.finTipoReceitas.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.finTipoReceitas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.finTipoReceitas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.finTipoReceitas.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'ativo',label:'Ativo',type:'checkbox'}]} />
}

export function Configuracoes() {
  const { pode, isLoading } = usePermissoes()
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const viaMenu = !!tabFromUrl
  const abas = [
    { key: 'bancos', label: 'Bancos', perm: 'menu:configuracoes' },
    { key: 'agencias', label: 'Agências', perm: 'cadastro:agencia' },
    { key: 'modalidades', label: 'Modalidades', perm: 'menu:configuracoes' },
    { key: 'fluxos', label: 'Fluxos', perm: 'menu:configuracoes' },
    { key: 'situacoes', label: 'Situações', perm: 'menu:configuracoes' },
    { key: 'etapas', label: 'Etapas', perm: 'menu:configuracoes' },
    { key: 'documentosTipos', label: 'Documentos', perm: 'menu:configuracoes' },
    { key: 'construtoras', label: 'Construtoras', perm: 'cadastro:construtora' },
    { key: 'empreendimentos', label: 'Empreendimentos', perm: 'cadastro:empreendimento' },
    { key: 'imobiliarias', label: 'Imobiliárias', perm: 'cadastro:imobiliaria' },
    { key: 'corretores', label: 'Corretores', perm: 'cadastro:corretor' },
    { key: 'parceiros', label: 'Parceiros', perm: 'cadastro:parceiro' },
    { key: 'subestabelecidos', label: 'Subestabelecidos', perm: 'cadastro:subestabelecido' },
    { key: 'imoveis', label: 'Imóveis', perm: 'cadastro:imovel' },
    { key: 'simuladores', label: 'Simuladores', perm: 'menu:configuracoes' },
  ]
  const abasPermitidas = abas.filter(tab => pode(tab.perm))
  const primeiraAbaPermitida = abasPermitidas[0]?.key || ''
  const abaSolicitadaPermitida = tabFromUrl && abasPermitidas.some(tab => tab.key === tabFromUrl)
    ? tabFromUrl
    : ''
  const [aba, setAba] = useState(abaSolicitadaPermitida || primeiraAbaPermitida)
  const abaAtiva = aba || abaSolicitadaPermitida || primeiraAbaPermitida

  useEffect(() => {
    if (isLoading) return
    const proximaAba = abaSolicitadaPermitida || primeiraAbaPermitida
    if (proximaAba && proximaAba !== aba) {
      setAba(proximaAba)
    }
  }, [isLoading, aba, abaSolicitadaPermitida, primeiraAbaPermitida])

  if (isLoading) return <Loading />
  if (!abasPermitidas.length) return <Navigate to='/' replace />

  return (
    <div>
      <PageHeader title={viaMenu ? (abasPermitidas.find(a=>a.key===abaAtiva)?.label || 'Configurações') : 'Configurações'} />
      <Card className="p-5">
        {!viaMenu && <Tabs active={abaAtiva} onChange={setAba} tabs={abasPermitidas.map(({ key, label }) => ({ key, label }))} />}
        {abaAtiva === 'bancos' && <TabBancos />}
        {abaAtiva === 'agencias' && <TabAgencias />}
        {abaAtiva === 'modalidades' && <TabModalidades />}
        {abaAtiva === 'fluxos' && <TabFluxos />}
        {abaAtiva === 'situacoes' && <TabSituacoes />}
        {abaAtiva === 'etapas' && <TabEtapas />}
        {abaAtiva === 'documentosTipos' && <TabDocumentosTipos />}
        {abaAtiva === 'construtoras' && <TabConstrutoras />}
        {abaAtiva === 'empreendimentos' && <TabEmpreendimentos />}
        {abaAtiva === 'imobiliarias' && <TabImobiliarias />}
        {abaAtiva === 'corretores' && <TabCorretores />}
        {abaAtiva === 'parceiros' && <TabParceiros />}
        {abaAtiva === 'subestabelecidos' && <TabSubestabelecidos />}
        {abaAtiva === 'imoveis' && <TabImoveis />}
        {abaAtiva === 'simuladores' && <TabSimuladores />}
      </Card>
    </div>
  )
}
