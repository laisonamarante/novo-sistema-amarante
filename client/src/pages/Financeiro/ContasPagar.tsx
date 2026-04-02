import { fmtDateBR } from "../../lib/dateUtils"
import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { Table, Btn, PageHeader, Badge, Modal, Input, Select, Pagination } from '../../components/ui'
import { Plus, DollarSign, CheckCircle, Undo2, Eye } from 'lucide-react'

const formas = ['BOLETO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','DÉBITO EM CONTA','DINHEIRO','PIX','TRANSFERÊNCIA BANCÁRIA'].map(v=>({value:v,label:v}))

// --- CONTAS A PAGAR ------------------------------------------------
export function ContasPagar() {
  const [modal, setModal]   = useState(false)
  const [modalPagar, setModalPagar] = useState<number|null>(null)
  const [modalDetalhes, setModalDetalhes] = useState<any>(null)
  const [modalEditar, setModalEditar] = useState<any>(null)
  const [pagina, setPagina] = useState(1)
  const hoje = new Date(); const ini = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`
  const fim  = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate()}`

  const [filtros, setFiltros] = useState<any>({
    dataInicio: ini,
    dataFim: fim,
    status: 'Todos',
    tipoDespesaId: undefined,
    fornecedorId: undefined,
    formaPagamento: undefined,
    contaId: undefined,
    numDocumento: undefined,
    naturezaId: undefined,
    empresaId: undefined,
    atrasadas: false,
    despesaFixa: undefined,
    pagina: 1,
  })
  const [ativos, setAtivos] = useState(filtros)

  // Queries de cadastros para os selects
  const tipos      = trpc.cadastros.finTipoDespesas.listar.useQuery()
  const fornecs    = trpc.cadastros.finFornecedores.listar.useQuery()
  const contasBanc = trpc.cadastros.finContas.listar.useQuery()
  const naturezas  = trpc.cadastros.finNaturezas.listar.useQuery()
  const empresas   = trpc.cadastros.finEmpresas.listar.useQuery()

  const { data, isLoading } = trpc.financeiro.contasPagar.listar.useQuery(ativos)
  const utils = trpc.useUtils()
  const excluir = trpc.financeiro.contasPagar.excluir.useMutation({ onSuccess:()=>utils.financeiro.contasPagar.listar.invalidate() })
  const estornar = trpc.financeiro.contasPagar.estornar.useMutation({ onSuccess:()=>utils.financeiro.contasPagar.listar.invalidate() })
  const editar  = trpc.financeiro.contasPagar.editar.useMutation({ onSuccess:()=>{utils.financeiro.contasPagar.listar.invalidate();setModalEditar(null)} })

  const f = (k:string)=>(e:React.ChangeEvent<any>)=>setFiltros((p:any)=>({...p,[k]:e.target.value}))
  const fn = (k:string)=>(e:React.ChangeEvent<any>)=>setFiltros((p:any)=>({...p,[k]:Number(e.target.value)||undefined}))

  const totalValor = (data?.lista||[]).reduce((s:number,c:any)=>s+Number(c.valor||0),0)
  const totalPago = (data?.lista||[]).reduce((s:number,c:any)=>s+Number(c.valorPago||0),0)

  function pesquisar() {
    const f = { ...filtros, pagina: 1 }
    if (f.status === 'Atrasadas') {
      f.status = 'Pendente'
      f.atrasadas = true
    } else {
      f.atrasadas = undefined
    }
    setAtivos(f)
  }

  function limpar() {
    const novo: any = {
      dataInicio: ini, dataFim: fim, status: 'Todos',
      tipoDespesaId: undefined, fornecedorId: undefined, formaPagamento: undefined,
      contaId: undefined, numDocumento: undefined, naturezaId: undefined,
      empresaId: undefined, atrasadas: false, despesaFixa: undefined, pagina: 1,
    }
    setFiltros(novo)
    setAtivos(novo)
  }

  return (
    <div>
      <PageHeader title="Contas a Pagar"
        actions={<div className="flex gap-2">
          <Btn variant="secondary" icon={<Eye size={15}/>} onClick={()=>window.print()}>Recibo Geral</Btn>
          <Btn icon={<Plus size={15}/>} onClick={()=>setModal(true)}>Incluir</Btn>
        </div>}/>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="space-y-3">
          {/* Linha 1: Data de vencimento + Valor + Código */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-end gap-2">
              <Input label="Data de vencimento" type="date" value={filtros.dataInicio} onChange={f('dataInicio')}/>
              <span className="pb-2 text-sm text-gray-500">à</span>
              <Input label="" type="date" value={filtros.dataFim} onChange={f('dataFim')}/>
            </div>
            <Input label="Valor" value={filtros.valor||""} onChange={f("valor")} className="w-32"/>
            <Input label="Código" type="number" value={filtros.codigo||""} onChange={fn("codigo")} className="w-32"/>
          </div>

          {/* Linha 2: Tipo de Despesa + Fornecedor */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo de Despesa" value={filtros.tipoDespesaId||''} onChange={fn('tipoDespesaId')}
              options={(tipos.data||[]).map((t:any)=>({value:t.id,label:t.nome}))}/>
            <Select label="Fornecedor" value={filtros.fornecedorId||''} onChange={fn('fornecedorId')}
              options={(fornecs.data||[]).map((t:any)=>({value:t.id,label:t.nome}))}/>
          </div>

          {/* Linha 3: Forma de Pagamento + Conta */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Forma de Pagamento" value={filtros.formaPagamento||''} onChange={f('formaPagamento')}
              options={formas}/>
            <Select label="Conta" value={filtros.contaId||''} onChange={fn('contaId')}
              options={(contasBanc.data||[]).map((t:any)=>({value:t.id,label:t.banco}))}/>
          </div>

          {/* Linha 4: Nº Documento + Natureza */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nº Documento" value={filtros.numDocumento||''} onChange={f('numDocumento')}/>
            <Select label="Natureza" value={filtros.naturezaId||''} onChange={fn('naturezaId')}
              options={(naturezas.data||[]).map((t:any)=>({value:t.id,label:t.nome}))}/>
          </div>

          {/* Linha 5: Histórico + Empresa */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Histórico" value={filtros.historico||""} onChange={f("historico")}/>
            <Select label="Empresa" value={filtros.empresaId||''} onChange={fn('empresaId')}
              options={(empresas.data||[]).map((t:any)=>({value:t.id,label:t.nome}))}/>
          </div>

          {/* Linha 6: Status + Atrasadas + Despesa fixa + Pesquisar */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              {['Pendente','Pago','Todos'].map(s => (
                <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="statusCP" value={s} checked={filtros.status===s}
                    onChange={()=>setFiltros((p:any)=>({...p,status:s}))} />
                  {s}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="checkbox"
                checked={filtros.status==='Atrasadas'}
                onChange={e=>setFiltros((p:any)=>({...p,status:e.target.checked?'Atrasadas':'Pendente'}))}/>
              Atrasadas
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="checkbox"
                checked={filtros.despesaFixa===true}
                onChange={e=>setFiltros((p:any)=>({...p, despesaFixa: e.target.checked ? true : undefined}))}/>
              Despesa fixa?
            </label>
            <div className="ml-auto">
              <Btn onClick={pesquisar}>Pesquisar</Btn>
            </div>
          </div>
        </div>
      </div>

      <Table headers={['','Código','Vencimento','Valor','Valor pago','Fornecedor','Tipo de Despesa','Histórico','N°','Forma pagamento','Empresa']}
        loading={isLoading} empty={!data?.lista.length?'Nenhum registro.':undefined}>
        {data?.lista.map(c=>(
          <tr key={c.id} className={`hover:bg-gray-50 border-l-4 ${c.status==='Pago'?'border-green-400':c.status==='Atrasado'?'border-red-400':'border-yellow-400'}`}>
            <td className="px-3 py-3">
              <div className="flex gap-2">
                <button onClick={()=>setModalDetalhes(c)} className="text-gray-600 hover:text-gray-800 text-xs" title="Detalhes"><Eye size={14}/></button>
                {c.status==='Pendente' && <button onClick={()=>setModalEditar(c)} className="text-blue-600 hover:text-blue-800 text-xs" title="Editar">Editar</button>}
                {c.status==='Pendente' && <button onClick={()=>setModalPagar(c.id)} className="text-green-600 hover:text-green-800 text-xs">Pagar</button>}
                {c.status==='Pago' && <button onClick={()=>confirm('Estornar este pagamento?')&&estornar.mutate({id:c.id})} className="text-orange-600 hover:text-orange-800 text-xs" title="Estornar"><Undo2 size={14}/></button>}
                {c.status==='Pendente' && <button onClick={()=>confirm('Excluir?')&&excluir.mutate({id:c.id})} className="text-red-500 hover:text-red-700 text-xs">Excluir</button>}
              </div>
            </td>
            <td className="px-4 py-3 text-sm font-mono">{c.id}</td>
            <td className="px-4 py-3 text-sm">{fmtDateBR(c.vencimento)}</td>
            <td className="px-4 py-3 text-sm font-medium">R$ {Number(c.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
            <td className="px-4 py-3 text-sm text-gray-500">R$ {Number(c.valorPago||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
            <td className="px-4 py-3 text-sm">{c.fornecedorNome||'--'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.tipoDespesaNome||'--'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.historico||'--'}</td>
            <td className="px-4 py-3 text-sm text-gray-500">{c.totalParcelas&&c.totalParcelas>1?`${c.parcelaAtual}/${c.totalParcelas}`:c.numDocumento||''}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{c.formaPagamento||'--'}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{c.empresaNome||'--'}</td>
          </tr>
        ))}
      </Table>

      <div className="flex items-center gap-6 px-4 py-3 text-sm">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"/> Pendente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/> Atrasada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Paga</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Quantidade de registros exibidos</span>
          <span className="bg-gray-100 border border-gray-300 rounded px-3 py-1 font-bold text-gray-800 min-w-[40px] text-center">{data?.lista.length||0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Valor total exibido</span>
          <span className="font-bold text-gray-800">{totalValor.toLocaleString('pt-BR',{minimumFractionDigits:2})} R$</span>
        </div>
      </div>

      <Pagination pagina={ativos.pagina} total={data?.totalPaginas||1} onChange={p=>setAtivos((a:any)=>({...a,pagina:p}))}/>

      <Modal title="Inserir nova Conta a Pagar" open={modal} onClose={()=>setModal(false)} size="lg">
        <FormContaPagar onClose={()=>{setModal(false);utils.financeiro.contasPagar.listar.invalidate()}}/>
      </Modal>

      <Modal title="Pagar" open={!!modalPagar} onClose={()=>setModalPagar(null)}>
        {modalPagar && <FormPagar id={modalPagar} onClose={()=>{setModalPagar(null);utils.financeiro.contasPagar.listar.invalidate()}}/>}
      </Modal>

      <Modal title="Editar Conta a Pagar" open={!!modalEditar} onClose={()=>setModalEditar(null)} size="lg">
        {modalEditar && <FormEditarContaPagar item={modalEditar} onSave={(d:any)=>editar.mutate({id:modalEditar.id,...d})} loading={editar.isPending} onClose={()=>setModalEditar(null)}/>}
      </Modal>

      <Modal title="Detalhes da Conta a Pagar" open={!!modalDetalhes} onClose={()=>setModalDetalhes(null)}>
        {modalDetalhes && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Código:</span> #{modalDetalhes.id}</div>
              <div><span className="text-gray-500">Status:</span> <Badge label={modalDetalhes.status}/></div>
              <div><span className="text-gray-500">Vencimento:</span> {fmtDateBR(modalDetalhes.vencimento)}</div>
              <div><span className="text-gray-500">Valor:</span> R$ {Number(modalDetalhes.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              <div><span className="text-gray-500">Valor Pago:</span> R$ {Number(modalDetalhes.valorPago||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              <div><span className="text-gray-500">Fornecedor:</span> {modalDetalhes.fornecedorNome||'--'}</div>
              <div><span className="text-gray-500">Tipo Despesa:</span> {modalDetalhes.tipoDespesaNome||'--'}</div>
              <div><span className="text-gray-500">Empresa:</span> {modalDetalhes.empresaNome||'--'}</div>
              <div><span className="text-gray-500">Forma Pagamento:</span> {modalDetalhes.formaPagamento||'--'}</div>
              <div><span className="text-gray-500">Despesa Fixa:</span> {modalDetalhes.despesaFixa?'Sim':'Nao'}</div>
              {modalDetalhes.totalParcelas>1 && <div><span className="text-gray-500">Parcela:</span> {modalDetalhes.parcelaAtual}/{modalDetalhes.totalParcelas}</div>}
              <div className="col-span-2"><span className="text-gray-500">Histórico:</span> {modalDetalhes.historico||'--'}</div>
            </div>
            <div className="flex justify-end pt-2">
              <Btn variant="ghost" onClick={()=>setModalDetalhes(null)}>Fechar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function FormContaPagar({ onClose }:{ onClose:()=>void }) {
  const [form, setForm] = useState({ vencimento:'', valor:'', parcelas:1, tipoDespesaId:0, fornecedorId:0, contaId:0, formaPagamento:'', empresaId:0, historico:'', despesaFixa:false })
  const tipos      = trpc.cadastros.finTipoDespesas.listar.useQuery()
  const fornecs    = trpc.cadastros.finFornecedores.listar.useQuery()
  const contas     = trpc.cadastros.finContas.listar.useQuery()
  const empresas   = trpc.cadastros.finEmpresas.listar.useQuery()
  const criar = trpc.financeiro.contasPagar.criar.useMutation({ onSuccess: onClose })
  const f=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:e.target.value}))
  const fn=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:Number(e.target.value)}))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Vencimento *" type="date" value={form.vencimento} onChange={f('vencimento')}/>
        <Input label="Valor *" value={form.valor} onChange={f('valor')} placeholder="0,00"/>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Parcelas</label>
          <div className="flex items-center gap-2">
            <button onClick={()=>setForm(p=>({...p,parcelas:Math.max(1,p.parcelas-1)})) } className="w-8 h-8 border rounded text-lg">-</button>
            <Input type="number" value={form.parcelas} onChange={fn('parcelas')} className="w-16 text-center"/>
            <button onClick={()=>setForm(p=>({...p,parcelas:p.parcelas+1}))} className="w-8 h-8 border rounded text-lg">+</button>
          </div>
        </div>
        <Select label="Tipo de Despesa" value={form.tipoDespesaId} onChange={fn('tipoDespesaId')} placeholder="Selecione..."
          options={(tipos.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Select label="Fornecedor" value={form.fornecedorId} onChange={fn('fornecedorId')} placeholder="Selecione..."
          options={(fornecs.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Select label="Conta" value={form.contaId} onChange={fn('contaId')} placeholder="Selecione..."
          options={(contas.data||[]).map(t=>({value:t.id,label:t.banco}))}/>
        <Select label="Forma de Pagamento" value={form.formaPagamento} onChange={f('formaPagamento')} placeholder="Selecione..." options={formas}/>
        <Select label="Empresa" value={form.empresaId} onChange={fn('empresaId')} placeholder="Selecione..."
          options={(empresas.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Input label="Histórico" value={form.historico} onChange={f('historico')} className="col-span-2"/>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.despesaFixa} onChange={e=>setForm(p=>({...p,despesaFixa:e.target.checked}))} className="rounded"/>
          Despesa fixa?
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={criar.isPending} onClick={()=>{ const c:any={...form}; Object.keys(c).forEach(k=>{if(c[k]==='')c[k]=undefined}); if(c.valor)c.valor=String(c.valor).replace(',','.'); criar.mutate(c); }}>Salvar</Btn>
      </div>
    </div>
  )
}

function FormPagar({ id, onClose }:{ id:number; onClose:()=>void }) {
  const [form, setForm] = useState({ dataPagamento: new Date().toISOString().substring(0,10), valorPago:'', formaPagamento:'PIX' as any, contaId:0, empresaId:0, historico:'' })
  const contas   = trpc.cadastros.finContas.listar.useQuery()
  const empresas = trpc.cadastros.finEmpresas.listar.useQuery()
  const pagar    = trpc.financeiro.contasPagar.pagar.useMutation({ onSuccess: onClose })
  const f=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:e.target.value}))
  const fn=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:Number(e.target.value)}))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Data Pagamento *" type="date" value={form.dataPagamento} onChange={f('dataPagamento')}/>
        <Input label="Valor Pago *"     value={form.valorPago}     onChange={f('valorPago')} placeholder="0,00"/>
        <Select label="Forma Pagamento *" value={form.formaPagamento} onChange={f('formaPagamento')} options={formas}/>
        <Select label="Conta *"  value={form.contaId} onChange={fn('contaId')} placeholder="Selecione..."
          options={(contas.data||[]).map(t=>({value:t.id,label:t.banco}))}/>
        <Select label="Empresa *" value={form.empresaId} onChange={fn('empresaId')} placeholder="Selecione..."
          options={(empresas.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Input label="Histórico" value={form.historico} onChange={f('historico')}/>
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn icon={<CheckCircle size={14}/>} loading={pagar.isPending}
          onClick={()=>pagar.mutate({ id, ...form })}>Confirmar Pagamento</Btn>
      </div>
    </div>
  )
}


function FormEditarContaPagar({ item, onSave, loading, onClose }:{ item:any; onSave:(d:any)=>void; loading:boolean; onClose:()=>void }) {
  const [form, setForm] = useState({
    vencimento: String(item.vencimento).substring(0,10),
    valor: String(item.valor),
    tipoDespesaId: item.tipoDespesaId||0,
    fornecedorId: item.fornecedorId||0,
    contaId: item.contaId||0,
    formaPagamento: item.formaPagamento||'',
    empresaId: item.empresaId||0,
    historico: item.historico||'',
    despesaFixa: !!item.despesaFixa,
    alterarParcelasFuturas: false,
  })
  const tipos    = trpc.cadastros.finTipoDespesas.listar.useQuery()
  const fornecs  = trpc.cadastros.finFornecedores.listar.useQuery()
  const contas   = trpc.cadastros.finContas.listar.useQuery()
  const empresas = trpc.cadastros.finEmpresas.listar.useQuery()
  const f=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:e.target.value}))
  const fn=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:Number(e.target.value)}))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Vencimento *" type="date" value={form.vencimento} onChange={f('vencimento')}/>
        <Input label="Valor *" value={form.valor} onChange={f('valor')}/>
        <Select label="Tipo de Despesa" value={form.tipoDespesaId} onChange={fn('tipoDespesaId')} placeholder="Selecione..."
          options={(tipos.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Select label="Fornecedor" value={form.fornecedorId} onChange={fn('fornecedorId')} placeholder="Selecione..."
          options={(fornecs.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Select label="Conta" value={form.contaId} onChange={fn('contaId')} placeholder="Selecione..."
          options={(contas.data||[]).map(t=>({value:t.id,label:t.banco}))}/>
        <Select label="Forma de Pagamento" value={form.formaPagamento} onChange={f('formaPagamento')} placeholder="Selecione..." options={formas}/>
        <Select label="Empresa" value={form.empresaId} onChange={fn('empresaId')} placeholder="Selecione..."
          options={(empresas.data||[]).map(t=>({value:t.id,label:t.nome}))}/>
        <Input label="Histórico" value={form.historico} onChange={f('historico')}/>
        <div className="col-span-2 flex gap-6">
          {item.totalParcelas > 1 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.alterarParcelasFuturas}
                onChange={e=>setForm(p=>({...p,alterarParcelasFuturas:e.target.checked}))} className="rounded"/>
              Alterar parcelas futuras?
            </label>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.despesaFixa}
              onChange={e=>setForm(p=>({...p,despesaFixa:e.target.checked}))} className="rounded"/>
            Despesa fixa?
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={loading} onClick={()=>onSave(form)}>Salvar</Btn>
      </div>
    </div>
  )
}
