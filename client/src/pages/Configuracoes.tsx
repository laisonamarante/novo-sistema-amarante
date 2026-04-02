import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
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

function CadSimples({ label, novo, listarQuery, criarMutation, editarMutation, excluirMutation, campos, extraAction }: {
  label: string
  novo?: string
  listarQuery: any
  criarMutation: any
  editarMutation?: any
  excluirMutation?: any
  campos: CampoConfig[]
  extraAction?: (item: any) => React.ReactNode
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
    const f: Record<string,any> = {}
    campos.forEach(c => {
      if (c.type === 'checkbox') f[c.key] = !!item[c.key]
      else if (c.type === 'number') f[c.key] = item[c.key] != null ? item[c.key] : ''
      else f[c.key] = item[c.key] ?? ''
    })
    setForm(f); setEditId(item.id); setModal(true)
  }

  function openNew() {
    const f: Record<string,any> = {}
    campos.forEach(c => { f[c.key] = c.type === 'checkbox' ? false : '' })
    setForm(f); setEditId(null); setModal(true)
  }

  function handleSave() {
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

  function renderCellValue(item: any, campo: CampoConfig) {
    const val = item[campo.key]
    if (campo.type === 'checkbox') return val ? '\u2713' : '\u2014'
    if (campo.type === 'select' && campo.options) {
      const opt = campo.options.find(o => String(o.value) === String(val))
      return opt ? opt.label : (val || '\u2014')
    }
    return val || '\u2014'
  }

  function renderFormField(c: CampoConfig) {
    const ft = c.type || 'text'
    if (ft === 'select') return <Select key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]??''} onChange={e=>set(c.key,e.target.value)} options={c.options||[]} placeholder="Selecione..." />
    if (ft === 'checkbox') return <label key={c.key} className="flex items-center gap-2 cursor-pointer py-1"><input type="checkbox" checked={!!form[c.key]} onChange={e=>set(c.key,e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700">{c.label}</span></label>
    if (ft === 'textarea') return <Textarea key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]||''} onChange={e=>set(c.key,e.target.value)} rows={3} />
    if (ft === 'number') return <Input key={c.key} type="number" label={c.label+(c.required?' *':'')} value={form[c.key]??''} onChange={e=>set(c.key,e.target.value)} />
    return <Input key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]||''} onChange={e=>set(c.key,e.target.value)} />
  }

  const saving = editar ? (editId ? editar.isPending : criar.isPending) : criar.isPending

  return (
    <div>
      <div className="flex justify-end mb-3"><Button size="sm" onClick={openNew}><Plus size={13}/> {novo||'Novo'} {label}</Button></div>
      {isLoading ? <Loading/> : (
        <Table headers={[...tableCampos.map(c=>c.label),'Ações']} empty={!data?.length ? 'Nenhum registro' : ''}>
          {data?.map((item:any) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {tableCampos.map(c => <td key={c.key} className="px-4 py-2 text-sm text-gray-700">{renderCellValue(item, c)}</td>)}
              <td className="px-4 py-2"><div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil size={13} className="text-blue-500"/></Button>
                {excluir && <Button size="sm" variant="ghost" onClick={() => { if(confirm('Excluir este registro?')) excluir.mutate({ id: item.id }) }}><Trash2 size={13} className="text-red-500"/></Button>}
                {extraAction && extraAction(item)}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={modal} title={(editId ? 'Editar ' : (novo||'Novo') + ' ') + label} onClose={() => setModal(false)}>
        <div className="space-y-3">
          {campos.map(c => renderFormField(c))}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={handleSave} loading={saving}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf=>({value:uf,label:uf}))
const ENCAMINHAMENTO_OPTIONS = [{value:'CENOP',label:'CENOP'},{value:'SICOB',label:'SICOB'},{value:'CEHOP',label:'CEHOP'},{value:'INTERCERVICE',label:'INTERCERVICE'},{value:'FUNCHAL',label:'FUNCHAL'},{value:'FINTECH',label:'FINTECH'},{value:'ITAÚ',label:'ITAÚ'}]
const TIPO_EMPREENDIMENTO_OPTIONS = [{value:'Comercial',label:'Comercial'},{value:'Residencial',label:'Residencial'}]
const DOCUMENTO_OPTIONS = [{value:'CPF',label:'CPF'},{value:'CNPJ',label:'CNPJ'}]
const TIPO_CHAVE_PIX_OPTIONS = [{value:'CPF',label:'CPF'},{value:'Celular',label:'Celular'},{value:'Email',label:'Email'},{value:'Aleatória',label:'Aleatória'}]
const NATUREZA_TIPO_OPTIONS = [{value:'Despesa',label:'Despesa'},{value:'Receita',label:'Receita'},{value:'Ambos',label:'Ambos'}]
const SIMULADOR_TIPO_OPTIONS = [{value:'Simulador',label:'Simulador'},{value:'Portal',label:'Portal'}]

function TabBancos() {
  return <CadSimples label="Banco" listarQuery={trpc.cadastros.bancos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.bancos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.bancos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.bancos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'encaminhamento',label:'Encaminhamento',type:'select',options:ENCAMINHAMENTO_OPTIONS},{key:'remuneracao',label:'Remuneração %'}]} />
}

function TabAgencias() {
  const {data:bd}=trpc.cadastros.bancos.listar.useQuery(); const bo=(bd||[]).map((b:any)=>({value:b.id,label:b.nome}))
  return <CadSimples label="Agência" listarQuery={trpc.cadastros.agencias.listar.useQuery({})} criarMutation={(opts:any)=>trpc.cadastros.agencias.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.agencias.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.agencias.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome da Agência',required:true},{key:'bancoId',label:'Banco',type:'select',options:bo},{key:'codigo',label:'Número da Agência'},{key:'cidade',label:'Cidade'},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS}]} />
}

function TabModalidades() {
  const {data:fd}=trpc.cadastros.fluxos.listar.useQuery(); const fo=(fd||[]).map((f:any)=>({value:f.id,label:f.nome}))
  return <CadSimples label="Modalidade" listarQuery={trpc.cadastros.modalidades.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.modalidades.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.modalidades.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.modalidades.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'fluxoId',label:'Fluxo',type:'select',options:fo},{key:'externo',label:'Externo',type:'checkbox'}]} />
}

function TabEtapas() {
  const {data:fd}=trpc.cadastros.fluxos.listar.useQuery(); const fo=(fd||[]).map((f:any)=>({value:f.id,label:f.nome}))
  const {data:sd}=trpc.cadastros.situacoes.listar.useQuery(); const so=(sd||[]).map((s:any)=>({value:s.id,label:s.nome}))
  return <CadSimples label="Etapa" listarQuery={trpc.cadastros.etapas.listar.useQuery({})} criarMutation={(opts:any)=>trpc.cadastros.etapas.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.etapas.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.etapas.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'fluxoId',label:'Fluxo',type:'select',options:fo},{key:'ordem',label:'Ordem',type:'number'},{key:'situacaoId',label:'Situação',type:'select',options:so},{key:'tolerancia',label:'Tolerância/Dias',type:'number'},{key:'importante',label:'Importante',type:'checkbox',hideTable:true},{key:'atendente',label:'Atendente',type:'checkbox',hideTable:true},{key:'externo',label:'Externo',type:'checkbox',hideTable:true}]} />
}

function TabEmpreendimentos() {
  const {data:cd}=trpc.cadastros.construtoras.listar.useQuery(); const co=(cd||[]).map((c:any)=>({value:c.id,label:c.nome}))
  return <CadSimples label="Empreendimento" listarQuery={trpc.cadastros.empreendimentos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.empreendimentos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.empreendimentos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.empreendimentos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome do Empreendimento',required:true},{key:'constutoraId',label:'Construtora',type:'select',options:co},{key:'tipo',label:'Tipo de Empreendimento',type:'select',options:TIPO_EMPREENDIMENTO_OPTIONS},{key:'endereco',label:'Endereço',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade'},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS}]} />
}

function TabConstrutoras() {
  const {data:us}=trpc.cadastros.usuarios.listar.useQuery(); const uo=(us||[]).map((u:any)=>({value:u.id,label:u.nome}))
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  return <CadSimples label="Construtora" novo="Nova" listarQuery={trpc.cadastros.construtoras.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.construtoras.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.construtoras.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.construtoras.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome da Construtora',required:true},{key:'cnpj',label:'CNPJ'},{key:'contato',label:'Nome do Contato'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'endereco',label:'Endereço',hideTable:true},{key:'numero',label:'Número',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade',hideTable:true},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS,hideTable:true},{key:'cep',label:'CEP',hideTable:true},{key:'parceiroId',label:'Parceiro',type:'select',options:po,hideTable:true},{key:'usuarioId',label:'Usuário do Sistema',type:'select',options:uo,hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} />
}

function TabImobiliarias() {
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  const {data:ud}=trpc.cadastros.usuarios.listar.useQuery(); const uo=(ud||[]).map((u:any)=>({value:u.id,label:u.nome}))
  return <CadSimples label="Imobiliária" listarQuery={trpc.cadastros.imobiliarias.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.imobiliarias.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.imobiliarias.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.imobiliarias.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome da Imobiliária',required:true},{key:'cnpj',label:'CNPJ'},{key:'contato',label:'Nome do Contato'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'endereco',label:'Endereço',hideTable:true},{key:'numero',label:'Número',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade',hideTable:true},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS,hideTable:true},{key:'cep',label:'CEP',hideTable:true},{key:'parceiroId',label:'Parceiro',type:'select',options:po,hideTable:true},{key:'usuarioId',label:'Usuário do Sistema',type:'select',options:uo,hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} />
}

function TabCorretores() {
  const {data:id}=trpc.cadastros.imobiliarias.listar.useQuery(); const io=(id||[]).map((i:any)=>({value:i.id,label:i.nome}))
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  return <CadSimples label="Corretor" listarQuery={trpc.cadastros.corretores.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.corretores.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.corretores.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.corretores.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome do Corretor',required:true},{key:'cpf',label:'CPF'},{key:'creci',label:'CRECI'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'imobiliariaId',label:'Imobiliária',type:'select',options:io},{key:'parceiroId',label:'Parceiro',type:'select',options:po},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} />
}

function TabParceiros() {
  return <CadSimples label="Parceiro" listarQuery={trpc.cadastros.parceiros.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.parceiros.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.parceiros.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.parceiros.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'nomeFantasia',label:'Nome Fantasia',hideTable:true},{key:'razaoSocial',label:'Razão Social',hideTable:true},{key:'cnpj',label:'CPF/CNPJ'},{key:'representante',label:'Nome do Representante',hideTable:true},{key:'documento',label:'Documento',type:'select',options:DOCUMENTO_OPTIONS,hideTable:true},{key:'contato',label:'Contato'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'endereco',label:'Endereço',hideTable:true},{key:'numero',label:'Número',hideTable:true},{key:'bairro',label:'Bairro',hideTable:true},{key:'cidade',label:'Cidade',hideTable:true},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS,hideTable:true},{key:'cep',label:'CEP',hideTable:true},{key:'responsavel',label:'Responsável',hideTable:true},{key:'tipoChavePix',label:'Tipo Chave PIX',type:'select',options:TIPO_CHAVE_PIX_OPTIONS,hideTable:true},{key:'chavePix',label:'Chave PIX',hideTable:true},{key:'dataContrato',label:'Data Contrato',hideTable:true},{key:'ativo',label:'Ativo',type:'checkbox',hideTable:true}]} />
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
  const {data:fd}=trpc.cadastros.fluxos.listar.useQuery(); const fo=(fd||[]).map((f:any)=>({value:f.id,label:f.nome}))
  return <CadSimples label="Documento" listarQuery={trpc.cadastros.documentosTipos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.documentosTipos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.documentosTipos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.documentosTipos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'fluxoId',label:'Fluxo',type:'select',options:fo},{key:'ordem',label:'Ordem',type:'number'},{key:'obrigatorio',label:'Obrigatório',type:'checkbox'}]} />
}

function TabSubestabelecidos() {
  const {data:pd}=trpc.cadastros.parceiros.listar.useQuery(); const po=(pd||[]).map((p:any)=>({value:p.id,label:p.nome}))
  const listar = trpc.cadastros.subestabelecidos.listar.useQuery()
  const [vincId, setVincId] = useState<number|null>(null)
  return (
    <div>
      <CadSimples label="Subestabelecido" listarQuery={listar} criarMutation={(opts:any)=>trpc.cadastros.subestabelecidos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.subestabelecidos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.subestabelecidos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'cpf',label:'CPF'},{key:'fone',label:'Fone'},{key:'email',label:'E-mail'},{key:'parceiroId',label:'Parceiro',type:'select',options:po}]} extraAction={(item:any) => <button onClick={()=>setVincId(item.id)} className="text-blue-600 hover:text-blue-800 text-xs px-1" title="Bancos vinculados">🏦</button>} />
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
  return <CadSimples label="Fluxo" listarQuery={trpc.cadastros.fluxos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.fluxos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.fluxos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.fluxos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true}]} />
}
function TabSituacoes() {
  return <CadSimples label="Situação" listarQuery={trpc.cadastros.situacoes.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.situacoes.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.situacoes.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.situacoes.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'ordem',label:'Ordem',type:'number'}]} />
}
function TabImoveis() {
  return <CadSimples label="Imóvel" listarQuery={trpc.cadastros.imoveis.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.imoveis.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.imoveis.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.imoveis.excluir.useMutation(opts)} campos={[{key:'matricula',label:'Matrícula'},{key:'endereco',label:'Endereço',required:true},{key:'numero',label:'Número'},{key:'complemento',label:'Complemento',hideTable:true},{key:'bairro',label:'Bairro'},{key:'cidade',label:'Cidade'},{key:'uf',label:'UF',type:'select',options:UF_OPTIONS},{key:'cep',label:'CEP'}]} />
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
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const defaultTab = tabFromUrl || 'bancos'
  const [aba, setAba] = useState(defaultTab)
  const viaMenu = !!tabFromUrl

  useEffect(() => {
    if (tabFromUrl) setAba(tabFromUrl)
  }, [tabFromUrl])
  const abas = [
    { key: 'bancos', label: 'Bancos' },
    { key: 'agencias', label: 'Agências' },
    { key: 'modalidades', label: 'Modalidades' },
    { key: 'fluxos', label: 'Fluxos' },
    { key: 'situacoes', label: 'Situações' },
    { key: 'etapas', label: 'Etapas' },
    { key: 'documentosTipos', label: 'Documentos' },
    { key: 'construtoras', label: 'Construtoras' },
    { key: 'empreendimentos', label: 'Empreendimentos' },
    { key: 'imobiliarias', label: 'Imobiliárias' },
    { key: 'corretores', label: 'Corretores' },
    { key: 'parceiros', label: 'Parceiros' },
    { key: 'subestabelecidos', label: 'Subestabelecidos' },
    { key: 'imoveis', label: 'Imóveis' },
    { key: 'simuladores', label: 'Simuladores' },
    { key: 'finEmpresas', label: 'Empresas' },
    { key: 'finContas', label: 'Contas Bancárias' },
    { key: 'finFornecedores', label: 'Fornecedores' },
    { key: 'finDevedores', label: 'Devedores' },
    { key: 'finTipoDespesas', label: 'Tipos Despesa' },
    { key: 'finTipoReceitas', label: 'Tipos Receita' },
    { key: 'finNaturezas', label: 'Naturezas' },
  ]
  return (
    <div>
      <PageHeader title={viaMenu ? (abas.find(a=>a.key===aba)?.label || 'Configurações') : 'Configurações'} />
      <Card className="p-5">
        {!viaMenu && <Tabs active={aba} onChange={setAba} tabs={abas} />}
        {aba === 'bancos' && <TabBancos />}
        {aba === 'agencias' && <TabAgencias />}
        {aba === 'modalidades' && <TabModalidades />}
        {aba === 'fluxos' && <TabFluxos />}
        {aba === 'situacoes' && <TabSituacoes />}
        {aba === 'etapas' && <TabEtapas />}
        {aba === 'documentosTipos' && <TabDocumentosTipos />}
        {aba === 'construtoras' && <TabConstrutoras />}
        {aba === 'empreendimentos' && <TabEmpreendimentos />}
        {aba === 'imobiliarias' && <TabImobiliarias />}
        {aba === 'corretores' && <TabCorretores />}
        {aba === 'parceiros' && <TabParceiros />}
        {aba === 'subestabelecidos' && <TabSubestabelecidos />}
        {aba === 'imoveis' && <TabImoveis />}
        {aba === 'simuladores' && <TabSimuladores />}
        {aba === 'finEmpresas' && <TabFinEmpresas />}
        {aba === 'finContas' && <TabFinContas />}
        {aba === 'finFornecedores' && <TabFinFornecedores />}
        {aba === 'finDevedores' && <TabFinDevedores />}
        {aba === 'finTipoDespesas' && <TabFinTipoDespesas />}
        {aba === 'finTipoReceitas' && <TabFinTipoReceitas />}
        {aba === 'finNaturezas' && <TabNaturezas />}
      </Card>
    </div>
  )
}
