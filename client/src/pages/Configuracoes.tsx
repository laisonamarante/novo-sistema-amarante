import { useState, useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { usePermissoes } from '../lib/permissoes'
import { PageHeader, Card, Loading, Tabs } from '../components/ui'
import { CadSimples, useCrudPermissoes, mapUsuariosPorPerfil } from './Configuracoes/CadSimples'
import { ModalidadesVinculadas } from './Configuracoes/ModalidadesVinculadas'
import { ParceiroBancosModal } from './Configuracoes/ParceiroBancosModal'
import { ParceiroArquivosModal } from './Configuracoes/ParceiroArquivosModal'
import { BancosVinculados } from './Configuracoes/BancosVinculados'
import { FluxoEtapasModal } from './Configuracoes/FluxoEtapasModal'
import { FluxoChecklistModal } from './Configuracoes/FluxoChecklistModal'

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf=>({value:uf,label:uf}))
const ENCAMINHAMENTO_OPTIONS = [{value:'CENOP',label:'CENOP'},{value:'SICOB',label:'SICOB'},{value:'CEHOP',label:'CEHOP'},{value:'INTERCERVICE',label:'INTERCERVICE'},{value:'FUNCHAL',label:'FUNCHAL'},{value:'FINTECH',label:'FINTECH'},{value:'ITAÚ',label:'ITAÚ'}]
const TIPO_EMPREENDIMENTO_OPTIONS = [{value:'Comercial',label:'Comercial'},{value:'Residencial',label:'Residencial'}]
const DOCUMENTO_OPTIONS = [{value:'CPF',label:'CPF'},{value:'CNPJ',label:'CNPJ'}]
const TIPO_CHAVE_PIX_OPTIONS = [{value:'CPF',label:'CPF'},{value:'Celular',label:'Celular'},{value:'Email',label:'Email'},{value:'Aleatória',label:'Aleatória'}]
const SIMULADOR_TIPO_OPTIONS = [{value:'Simulador',label:'Simulador'},{value:'Portal',label:'Portal'}]

function TabBancos() {
  const [vincId, setVincId] = useState<number|null>(null)
  return (
    <>
      <CadSimples label="Banco" listarQuery={trpc.cadastros.bancos.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.bancos.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.bancos.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.bancos.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'encaminhamento',label:'Encaminhamento',type:'select',options:ENCAMINHAMENTO_OPTIONS},{key:'remuneracao',label:'Remuneração %'}]} extraAction={(item:any) => <button onClick={()=>setVincId(item.id)} className="text-blue-600 hover:text-blue-800 text-xs px-1" title="Modalidades vinculadas">📋</button>} />
      {vincId && <ModalidadesVinculadas bancoId={vincId} onClose={()=>setVincId(null)} />}
    </>
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
          <SelectFiltroBanco value={filtroBancoId} onChange={setFiltroBancoId} options={boFiltro} />
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

// Pequeno wrapper local para o Select de filtro (mantém imports do hub enxutos)
import { Select } from '../components/ui'
function SelectFiltroBanco({ value, onChange, options }: { value: string; onChange: (v:string)=>void; options: any[] }) {
  return <Select label="Banco" value={value} onChange={e=>onChange(e.target.value)} options={options} placeholder="Todos os bancos" />
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

function TabSimuladores() {
  return <CadSimples label="Simulador" listarQuery={trpc.cadastros.simuladores.listar.useQuery()} criarMutation={(opts:any)=>trpc.cadastros.simuladores.criar.useMutation(opts)} editarMutation={(opts:any)=>trpc.cadastros.simuladores.editar.useMutation(opts)} excluirMutation={(opts:any)=>trpc.cadastros.simuladores.excluir.useMutation(opts)} campos={[{key:'nome',label:'Nome',required:true},{key:'url',label:'URL'},{key:'logoUrl',label:'Logo URL'},{key:'tipo',label:'Tipo',type:'select',options:SIMULADOR_TIPO_OPTIONS}]} />
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
