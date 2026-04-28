import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { usePermissoes } from '../../lib/permissoes'
import { Input, Select, Btn, Spinner, Alert } from '../../components/ui'
import { Save, X } from 'lucide-react'

const estadosCivis = ['Solteiro','Casado Comunhão de Bens','Casado Comunhão Parcial de Bens','Casado separação de Bens','Divorciado','Separado Judicialmente','União Estável/Outros','Viúvo'].map(v=>({value:v,label:v}))
const tiposDoc    = ['Carteira de Identidade','Carteira Funcional','Identidade Militar','Cart. Identidade e Estrangeiro','Passaporte','CNH','CPF'].map(v=>({value:v,label:v}))
const ufs         = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(v=>({value:v,label:v}))

type Aba = 'dadosGerais'|'endereco'|'contato'|'dadosBancarios'|'vinculo'

type ClienteFormProps = {
  tipo: 'Comprador' | 'Vendedor'
  clienteId?: number | 'novo'
  modoPopup?: boolean
  onClose?: () => void
  onSaved?: () => void
}

export function ClienteForm({ tipo, clienteId, modoPopup = false, onClose, onSaved }: ClienteFormProps) {
  const { perfil, isExterno } = usePermissoes()
  const { id: idRota } = useParams()
  const navigate = useNavigate()
  const id = clienteId !== undefined ? String(clienteId) : idRota
  const isEdicao = Boolean(id && id !== 'novo')
  const base = tipo === 'Comprador' ? '/cadastros/compradores' : '/cadastros/vendedores'

  const [aba, setAba] = useState<Aba>('dadosGerais')
  const [erro, setErro]   = useState('')
  const [sucesso, setSucesso] = useState('')

  const [form, setForm] = useState({
    tipo, nome:'', cpfCnpj:'', dataNascimento:'', estadoCivil:'', tipoDocumento:'',
    numeroDocumento:'', dataExpedicao:'', orgaoExpedidor:'', captacao:'',
    rendaComprovada:'0,00', possuiDependentes: false, cpfConjuge:'', nomeConjuge:'',
    nomeMae:'', endereco:'', numero:'', bairro:'', cidade:'', uf:'', cep:'',
    fone1:'', fone2:'', contato2:'', fone3:'', contato3:'', email:'',
    bancoId: 0, numeroAgencia:'', numeroConta:'',
    construtoraId:0, corretorId:0, parceiroId:0, imobiliariaId:0,
  })

  const utils    = trpc.useUtils()
  const cliente  = trpc.clientes.buscar.useQuery({ id: Number(id) }, { enabled: isEdicao })
  const bancos   = trpc.cadastros.bancos.listar.useQuery()
  const corretores  = trpc.cadastros.corretores.listar.useQuery()
  const parceiros   = trpc.cadastros.parceiros.listar.useQuery()
  const imobiliarias = trpc.cadastros.imobiliarias.listar.useQuery()
  const construtoras = trpc.cadastros.construtoras.listar.useQuery()

  const fmtDate = (v: any) => {
    if (!v) return ''
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0,10)
    try { return new Date(v).toISOString().substring(0,10) } catch { return '' }
  }

  useEffect(() => {
    if (cliente.data) {
      const d = cliente.data
      setForm({
        tipo: d.tipo, nome: d.nome, cpfCnpj: d.cpfCnpj,
        dataNascimento: fmtDate(d.dataNascimento),
        estadoCivil: d.estadoCivil||'', tipoDocumento: d.tipoDocumento||'',
        numeroDocumento: d.numeroDocumento||'', dataExpedicao: fmtDate(d.dataExpedicao),
        orgaoExpedidor: d.orgaoExpedidor||'', captacao: d.captacao||'',
        rendaComprovada: String(d.rendaComprovada||'0,00'), possuiDependentes: d.possuiDependentes||false,
        cpfConjuge: d.cpfConjuge||'', nomeConjuge: d.nomeConjuge||'', nomeMae: d.nomeMae||'',
        endereco: d.endereco||'', numero: d.numero||'', bairro: d.bairro||'',
        cidade: d.cidade||'', uf: d.uf||'', cep: d.cep||'',
        fone1: d.fone1||'', fone2: d.fone2||'', contato2: d.contato2||'',
        fone3: d.fone3||'', contato3: d.contato3||'', email: d.email||'',
        bancoId: d.bancoId||0, numeroAgencia: d.numeroAgencia||'', numeroConta: d.numeroConta||'',
        construtoraId: d.construtoraId||0, corretorId: d.corretorId||0,
        parceiroId: d.parceiroId||0, imobiliariaId: d.imobiliariaId||0,
      })
    }
  }, [cliente.data])

  const f = (field: string) => (e: React.ChangeEvent<any>) => setForm(prev => ({...prev, [field]: e.target.value}))

  const mostrarVinculo = (campo: 'construtora' | 'corretor' | 'parceiro' | 'imobiliaria') => {
    if (!isExterno) return true
    if ((perfil === 'Parceiro' || perfil === 'Subestabelecido') && campo === 'parceiro') return false
    if (perfil === 'Corretor' && ['parceiro', 'corretor', 'imobiliaria'].includes(campo)) return false
    if (perfil === 'Imobiliária' && ['parceiro', 'imobiliaria'].includes(campo)) return false
    if (perfil === 'Construtora' && ['parceiro', 'construtora'].includes(campo)) return false
    return true
  }

  const handleErroAPI = (error: any) => {
    const msg = error?.message || error?.data?.message || 'Erro ao salvar. Tente novamente.'
    setErro(msg)
  }

  const criar    = trpc.clientes.criar.useMutation({
    onSuccess: () => {
      utils.clientes.listar.invalidate();
      onSaved?.();
      if (modoPopup) onClose?.();
      else navigate(base);
    },
    onError: handleErroAPI,
  })
  const atualizar = trpc.clientes.atualizar.useMutation({
    onSuccess: () => {
      utils.clientes.listar.invalidate();
      onSaved?.();
      if (modoPopup) onClose?.();
      else {
        setSucesso('Salvo com sucesso!');
        setTimeout(() => setSucesso(''), 3000);
      }
    },
    onError: handleErroAPI,
  })

  const handleSalvar = () => {
    setErro('')
    setSucesso('')

    // Validação dos campos obrigatórios
    const camposFaltando: string[] = []
    if (!form.nome.trim()) camposFaltando.push('Nome')
    if (!form.cpfCnpj.trim()) camposFaltando.push('CPF/CNPJ')
    if (!form.dataNascimento) camposFaltando.push('Data de Nascimento')
    if (!form.fone1.trim()) camposFaltando.push('Fone 1')
    if (!form.email.trim()) camposFaltando.push('Email')

    if (camposFaltando.length > 0) {
      return setErro('Campos obrigatórios não preenchidos: ' + camposFaltando.join(', '))
    }

    // Bloqueia clique duplo verificando se já está carregando
    if (criar.isPending || atualizar.isPending) return

    // Limpar campos vazios para nao dar erro no Zod
    const cleaned: any = { ...form }
    for (const k of Object.keys(cleaned)) {
      if (cleaned[k] === '') cleaned[k] = undefined
      if (cleaned[k] === 0) cleaned[k] = undefined
    }
    cleaned.tipo = form.tipo // garantir tipo
    // Converter renda de vírgula para ponto
    if (cleaned.rendaComprovada) cleaned.rendaComprovada = String(cleaned.rendaComprovada).replace(",", ".")
    if (isEdicao) atualizar.mutate({ id: Number(id), ...cleaned })
    else criar.mutate(cleaned)
  }

  const handleCancelar = () => {
    if (modoPopup) onClose?.()
    else navigate(base)
  }

  const abas: { id: Aba; label: string }[] = [
    { id:'dadosGerais',   label:'Dados Gerais' },
    { id:'endereco',      label:'Endereço' },
    { id:'contato',       label:'Contato' },
    { id:'dadosBancarios',label:'Dados Bancários' },
    { id:'vinculo',       label:'Vínculo' },
  ]

  if (isEdicao && cliente.isLoading) return <div className="flex justify-center py-12"><Spinner/></div>

  const formulario = (
    <>
      {/* Abas */}
      <div className="border-b flex overflow-x-auto">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2
              ${aba===a.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {a.label}
          </button>
        ))}
      </div>

      <div className={modoPopup ? 'p-4 sm:p-5' : 'p-6'}>
        {/* Dados Gerais */}
        {aba === 'dadosGerais' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input label="Nome *" value={form.nome} onChange={f('nome')} placeholder="Nome completo"/>
            </div>
            <Input label="CPF/CNPJ *" mask="cpfCnpj" value={form.cpfCnpj} onChange={f('cpfCnpj')}/>
            <Input label="Data de Nascimento *" type="date" value={form.dataNascimento} onChange={f('dataNascimento')}/>
            <Select label="Estado Civil" value={form.estadoCivil} onChange={f('estadoCivil')} options={estadosCivis} placeholder="Selecione..."/>
            <Select label="Documento de Identificação" value={form.tipoDocumento} onChange={f('tipoDocumento')} options={tiposDoc} placeholder="Selecione..."/>
            <Input label="Número do Documento" value={form.numeroDocumento} onChange={f('numeroDocumento')}/>
            <Input label="Data de Expedição" type="date" value={form.dataExpedicao} onChange={f('dataExpedicao')}/>
            <Input label="Órgão Expedidor" value={form.orgaoExpedidor} onChange={f('orgaoExpedidor')}/>
            <Input label="Captação" value={form.captacao} onChange={f('captacao')}/>
            <Input label="Valor de Renda Comprovada" value={form.rendaComprovada} onChange={f('rendaComprovada')}/>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="dep" checked={form.possuiDependentes} onChange={e=>setForm(p=>({...p,possuiDependentes:e.target.checked}))} className="rounded"/>
              <label htmlFor="dep" className="text-sm text-gray-700">Possui dependentes?</label>
            </div>
            {(form.estadoCivil==='Casado Comunhão de Bens'||form.estadoCivil==='Casado Comunhão Parcial de Bens'||form.estadoCivil==='Casado separação de Bens'||form.estadoCivil==='União Estável/Outros') && (
              <>
                <Input label="CPF Cônjuge" mask="cpf" value={form.cpfConjuge} onChange={f('cpfConjuge')}/>
                <Input label="Nome do Cônjuge" value={form.nomeConjuge} onChange={f('nomeConjuge')}/>
              </>
            )}
            <Input label="Nome da Mãe" value={form.nomeMae} onChange={f('nomeMae')}/>
          </div>
        )}

        {/* Endereço */}
        {aba === 'endereco' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input label="Endereço" value={form.endereco} onChange={f('endereco')}/>
            </div>
            <Input label="Número" value={form.numero} onChange={f('numero')}/>
            <Input label="Bairro" value={form.bairro} onChange={f('bairro')}/>
            <Input label="Cidade" value={form.cidade} onChange={f('cidade')}/>
            <Select label="UF" value={form.uf} onChange={f('uf')} options={ufs} placeholder="UF"/>
            <Input label="CEP" value={form.cep} onChange={f('cep')}/>
          </div>
        )}

        {/* Contato */}
        {aba === 'contato' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fone 1 *" value={form.fone1} onChange={f('fone1')}/>
            <Input label="Fone 2" value={form.fone2} onChange={f('fone2')}/>
            <Input label="Contato 2" value={form.contato2} onChange={f('contato2')}/>
            <Input label="Fone 3" value={form.fone3} onChange={f('fone3')}/>
            <Input label="Contato 3" value={form.contato3} onChange={f('contato3')}/>
            <Input label="E-mail *" type="email" value={form.email} onChange={f('email')}/>
          </div>
        )}

        {/* Dados Bancários */}
        {aba === 'dadosBancarios' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Banco" value={form.bancoId} onChange={e=>setForm(p=>({...p,bancoId:Number(e.target.value)}))}
              options={(bancos.data||[]).map(b=>({value:b.id,label:b.nome}))} placeholder="Selecione..."/>
            <Input label="Número da Agência" value={form.numeroAgencia} onChange={f('numeroAgencia')}/>
            <Input label="Número da Conta" value={form.numeroConta} onChange={f('numeroConta')}/>
          </div>
        )}

        {/* Vínculo */}
        {aba === 'vinculo' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mostrarVinculo('construtora') && (
              <Select label="Construtora" value={form.construtoraId} onChange={e=>setForm(p=>({...p,construtoraId:Number(e.target.value)}))}
                options={(construtoras.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
            )}
            {mostrarVinculo('corretor') && (
              <Select label="Corretor" value={form.corretorId} onChange={e=>setForm(p=>({...p,corretorId:Number(e.target.value)}))}
                options={(corretores.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
            )}
            {mostrarVinculo('parceiro') && (
              <Select label="Parceiro" value={form.parceiroId} onChange={e=>setForm(p=>({...p,parceiroId:Number(e.target.value)}))}
                options={(parceiros.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
            )}
            {mostrarVinculo('imobiliaria') && (
              <Select label="Imobiliária" value={form.imobiliariaId} onChange={e=>setForm(p=>({...p,imobiliariaId:Number(e.target.value)}))}
                options={(imobiliarias.data||[]).map(c=>({value:c.id,label:c.nome}))} placeholder="Selecione..."/>
            )}
          </div>
        )}
      </div>
    </>
  )

  const titulo = isEdicao ? `Editar ${tipo}` : `Novo ${tipo}`

  if (!modoPopup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="absolute inset-0" onClick={handleCancelar}/>
        <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200">
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-800 text-base truncate">
                {titulo}
                {isEdicao && cliente.data && <span className="text-blue-600 ml-2">: {cliente.data.nome}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Btn variant="ghost" onClick={handleCancelar}>Cancelar</Btn>
              <Btn icon={<Save size={15}/>} loading={criar.isPending || atualizar.isPending} onClick={handleSalvar}>Salvar</Btn>
              <button type="button" onClick={handleCancelar} className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center" title="Fechar">
                <X size={18}/>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {erro    && <Alert type="error"   message={erro}    />}
            {sucesso && <Alert type="success" message={sucesso} />}
            <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">{formulario}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Btn variant="ghost" onClick={handleCancelar}>Cancelar</Btn>
        <Btn icon={<Save size={15}/>} loading={criar.isPending || atualizar.isPending} onClick={handleSalvar}>Salvar</Btn>
      </div>

      {erro    && <Alert type="error"   message={erro}    />}
      {sucesso && <Alert type="success" message={sucesso} />}

      <div className="border border-gray-200 rounded-lg overflow-hidden">{formulario}</div>
    </div>
  )
}
