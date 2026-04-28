import { fmtDateBR } from "../../lib/dateUtils"
import { useState } from 'react'
import { trpc } from '../../lib/trpc'

const formasReceber = ['BOLETO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','DÉBITO EM CONTA','DINHEIRO','PIX','TRANSFERÊNCIA BANCÁRIA'].map(v=>({value:v,label:v}))
import { PageHeader, Button, Input, Select, Card, Table, Pagination, Loading, Modal, Badge } from '../../components/ui'
import { Plus, CheckCircle, Undo2, Eye } from 'lucide-react'

const formas = ['BOLETO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','DÉBITO EM CONTA','DINHEIRO','PIX','TRANSFERÊNCIA BANCÁRIA'].map(v=>({value:v,label:v}))

export function ContasReceber() {
  const [modal, setModal] = useState(false)
  const [modalReceber, setModalReceber] = useState<any>(null)
  const [modalDetalhes, setModalDetalhes] = useState<any>(null)
  const [pagina, setPagina] = useState(1)

  const hoje = new Date()
  const iniDefault = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10)
  const fimDefault = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10)

  const [filtros, setFiltros] = useState<any>({
    dataInicio: iniDefault,
    dataFim: fimDefault,
    tipoReceitaId: undefined,
    devedorId: undefined,
    formaPagamento: undefined,
    contaId: undefined,
    numDocumento: undefined,
    empresaId: undefined,
    status: 'Todos',
  })
  const [ativos, setAtivos] = useState<any>({ ...filtros })

  const [form, setForm] = useState<any>({ parcelas: 1 })
  const [parcelas, setParcelas] = useState(1)
  const { data, isLoading, refetch } = trpc.financeiro.contasReceber.listar.useQuery({ ...ativos, pagina })
  const empresas    = trpc.cadastros.finEmpresas.listar.useQuery()
  const tipoReceitas = trpc.cadastros.finTipoReceitas.listar.useQuery()
  const devedores   = trpc.cadastros.finDevedores.listar.useQuery()
  const contas      = trpc.cadastros.finContas.listar.useQuery()
  const naturezas   = trpc.cadastros.finNaturezas.listar.useQuery()
  const criar = trpc.financeiro.contasReceber.criar.useMutation({ onSuccess: () => { setModal(false); refetch() } })
  const receber = trpc.financeiro.contasReceber.receber.useMutation({ onSuccess: () => { setModalReceber(null); refetch() } })
  const estornar = trpc.financeiro.contasReceber.estornar.useMutation({ onSuccess: () => { refetch() } })
  const excluir = trpc.financeiro.contasReceber.excluir.useMutation({ onSuccess: () => { refetch() } })

  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }
  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }
  const fn = (k:string)=>(e:React.ChangeEvent<any>)=>setFiltros((p:any)=>({...p,[k]:Number(e.target.value)||undefined}))
  const ff = (k:string)=>(e:React.ChangeEvent<any>)=>setFiltros((p:any)=>({...p,[k]:e.target.value||undefined}))

  const totalValor = (data?.lista||[]).reduce((s:number,c:any)=>s+Number(c.valor||0),0)
  const totalRecebido = (data?.lista||[]).reduce((s:number,c:any)=>s+Number(c.valorRecebido||0),0)

  function pesquisar() {
    const f = { ...filtros }
    setAtivos(f)
    setPagina(1)
  }

  function limpar() {
    const novo: any = {
      dataInicio: iniDefault, dataFim: fimDefault,
      tipoReceitaId: undefined, devedorId: undefined, formaPagamento: undefined,
      contaId: undefined, numDocumento: undefined, empresaId: undefined,
      historico: undefined, codigo: undefined, valor: undefined, status: 'Todos',
    }
    setFiltros(novo)
    setAtivos(novo)
    setPagina(1)
  }

  return (
    <div>
      <PageHeader title="Contas a Receber"
        actions={<Button onClick={() => setModal(true)}><Plus size={14}/> Incluir</Button>} />

      <Card className="p-4 mb-4">
        <div className="space-y-3">
          {/* Linha 1: Data de vencimento + Valor + Código */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-end gap-2">
              <Input label="Data de vencimento" type="date" value={filtros.dataInicio||''} onChange={e=>setF('dataInicio',e.target.value)} />
              <span className="pb-2 text-sm text-gray-500">à</span>
              <Input label="" type="date" value={filtros.dataFim||''} onChange={e=>setF('dataFim',e.target.value)} />
            </div>
            <Input label="Valor" value={filtros.valor||''} onChange={e=>setF('valor',e.target.value)} className="w-32" />
            <Input label="Código" type="number" value={filtros.codigo||''} onChange={e=>setF('codigo',Number(e.target.value)||undefined)} className="w-32" />
          </div>

          {/* Linha 2: Tipo de Receita + Devedor */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo de Receita" value={filtros.tipoReceitaId||''} onChange={fn('tipoReceitaId')}
              options={(tipoReceitas.data||[]).map((t:any)=>({value:t.id,label:t.nome}))} />
            <Select label="Devedor" value={filtros.devedorId||''} onChange={fn('devedorId')}
              options={(devedores.data||[]).map((d:any)=>({value:d.id,label:d.nome}))} />
          </div>

          {/* Linha 3: Forma de Recebimento + Conta */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Forma de Recebimento" value={filtros.formaPagamento||''} onChange={ff('formaPagamento')}
              options={formas} />
            <Select label="Conta" value={filtros.contaId||''} onChange={fn('contaId')}
              options={(contas.data||[]).map((c:any)=>({value:c.id,label:c.banco}))} />
          </div>

          {/* Linha 4: Nº Documento + Empresa */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nº Documento" value={filtros.numDocumento||''} onChange={e=>setF('numDocumento',e.target.value||undefined)} />
            <Select label="Empresa" value={filtros.empresaId||''} onChange={fn('empresaId')}
              options={(empresas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
          </div>

          {/* Linha 5: Histórico + Status + Protesto + Pesquisar */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1">
              <Input label="Histórico" value={filtros.historico||''} onChange={e=>setF('historico',e.target.value||undefined)} />
            </div>
            <div className="flex items-center gap-3 pb-2">
              {['Pendente','Recebido','Todos'].map(s => (
                <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="statusCR" value={s} checked={filtros.status===s}
                    onChange={()=>setF('status',s)} />
                  {s}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-1 text-sm cursor-pointer pb-2">
              <input type="checkbox" checked={filtros.status==='Protesto'}
                onChange={e=>setF('status',e.target.checked?'Protesto':'Todos')} />
              Protesto
            </label>
            <Button onClick={pesquisar}>Pesquisar</Button>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <>
            <Table headers={['','Código','Vencimento','Valor','Devedor','Tipo de Receita','Histórico','Forma recebimento','Empresa']} empty={!data?.lista.length ? 'Nenhum registro.' : undefined}>
              {data?.lista.map((c:any) => (
                <tr key={c.id} className={`hover:bg-gray-50 border-l-4 ${c.status==='Recebido'?'border-green-400':'border-yellow-400'}`}>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>setModalDetalhes(c)} className="text-gray-600 hover:text-gray-800 text-xs" title="Detalhes"><Eye size={14}/></button>
                      {c.status==='Pendente' && <button onClick={()=>setModalReceber(c)} className="text-green-600 hover:text-green-800 text-xs">Receber</button>}
                      {c.status==='Recebido' && <button onClick={()=>confirm('Estornar este recebimento?')&&estornar.mutate({id:c.id})} className="text-orange-600 hover:text-orange-800 text-xs"><Undo2 size={14}/></button>}
                      {c.status==='Pendente' && <button onClick={()=>confirm('Excluir esta conta a receber?')&&excluir.mutate({id:c.id})} className="text-red-500 hover:text-red-700 text-xs">Excluir</button>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm font-mono">{c.id}</td>
                  <td className="px-3 py-2 text-sm">{c.vencimento ? fmtDateBR(c.vencimento) : '--'}</td>
                  <td className="px-3 py-2 text-sm font-medium">R$ {Number(c.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2 text-sm">{c.devedorNome||'--'}</td>
                  <td className="px-3 py-2 text-sm">{c.tipoReceitaNome||'--'}</td>
                  <td className="px-3 py-2 text-sm max-w-[200px] truncate">{c.historico||'--'}</td>
                  <td className="px-3 py-2 text-sm">{c.formaPagamento||'--'}</td>
                  <td className="px-3 py-2 text-sm">{c.empresaNome||'--'}</td>
                </tr>
              ))}
            </Table>
            {/* Footer totais */}
            <div className="flex items-center gap-6 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Quantidade de registros exibidos</span>
                <span className="bg-gray-100 border border-gray-300 rounded px-3 py-1 font-bold text-gray-800 min-w-[40px] text-center">{data?.lista.length||0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Valor total exibido</span>
                <span className="font-bold text-gray-800">{totalValor.toLocaleString('pt-BR',{minimumFractionDigits:2})} R$</span>
              </div>
            </div>
            <div className="p-4"><Pagination pagina={pagina} total={data?.totalPaginas||1} onChange={setPagina}/></div>
          </>
        )}
      </Card>

      {/* Modal Nova Conta a Receber */}
      <Modal open={modal} title="Nova Conta a Receber" onClose={() => setModal(false)}>
        <div className="space-y-3">
          <Input label="Vencimento *" type="date" value={form.vencimento||''} onChange={e=>set('vencimento',e.target.value)} />
          <Input label="Valor *" type="number" step="0.01" value={form.valor||''} onChange={e=>set('valor',e.target.value)} />
          <Select label="Tipo de Receita" value={form.tipoReceitaId||''} onChange={e=>set('tipoReceitaId',Number(e.target.value))}
            options={(tipoReceitas.data||[]).map((t:any)=>({value:t.id,label:t.nome}))} />
          <Select label="Devedor" value={form.devedorId||''} onChange={e=>set('devedorId',Number(e.target.value))}
            options={(devedores.data||[]).map((d:any)=>({value:d.id,label:d.nome}))} />
          <Select label="Conta" value={form.contaId||''} onChange={e=>set('contaId',Number(e.target.value))}
            options={(contas.data||[]).map((c:any)=>({value:c.id,label:c.banco}))} />
          <Select label="Empresa" value={form.empresaId||''} onChange={e=>set('empresaId',Number(e.target.value))}
            options={(empresas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
          <Select label="Forma de Recebimento" value={form.formaRecebimento||''} onChange={e=>set('formaRecebimento',e.target.value)}
            options={formasReceber} />
          <Input label="Nº Documento" value={form.numDocumento||''} onChange={e=>set('numDocumento',e.target.value)} placeholder="Nº doc..." />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Parcelas</label>
            <div className="flex items-center gap-2">
              <button onClick={()=>setParcelas(p=>Math.max(1,p-1))} className="w-8 h-8 border rounded text-lg">-</button>
              <span className="w-10 text-center text-sm font-medium">{parcelas}</span>
              <button onClick={()=>setParcelas(p=>p+1)} className="w-8 h-8 border rounded text-lg">+</button>
            </div>
          </div>
          <Input label="Histórico" value={form.historico||''} onChange={e=>set('historico',e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={()=>{ const c:any={...form}; Object.keys(c).forEach(k=>{if(c[k]==='')c[k]=undefined}); if(c.valor)c.valor=String(c.valor).replace(',','.'); criar.mutate({...c, parcelas}); }} loading={criar.isPending}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Receber */}
      <Modal open={!!modalReceber} title="Receber Conta" onClose={() => setModalReceber(null)}>
        {modalReceber && <FormReceber conta={modalReceber} contas={contas.data||[]} empresas={empresas.data||[]} naturezas={naturezas.data||[]} onReceber={(form:any)=>receber.mutate(form)} loading={receber.isPending} onClose={()=>setModalReceber(null)}/>}
      </Modal>

      {/* Modal Detalhes */}
      <Modal open={!!modalDetalhes} title="Detalhes da Conta a Receber" onClose={() => setModalDetalhes(null)}>
        {modalDetalhes && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Código:</span> #{modalDetalhes.id}</div>
              <div><span className="text-gray-500">Status:</span> <Badge label={modalDetalhes.status}/></div>
              <div><span className="text-gray-500">Vencimento:</span> {modalDetalhes.vencimento ? fmtDateBR(modalDetalhes.vencimento) : '--'}</div>
              <div><span className="text-gray-500">Valor:</span> R$ {Number(modalDetalhes.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              <div><span className="text-gray-500">Valor Recebido:</span> R$ {Number(modalDetalhes.valorRecebido||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              <div><span className="text-gray-500">Devedor:</span> {modalDetalhes.devedorNome||'--'}</div>
              <div><span className="text-gray-500">Tipo Receita:</span> {modalDetalhes.tipoReceitaNome||'--'}</div>
              <div><span className="text-gray-500">Empresa:</span> {modalDetalhes.empresaNome||'--'}</div>
              <div><span className="text-gray-500">Nº Documento:</span> {modalDetalhes.numDocumento||'--'}</div>
              <div><span className="text-gray-500">Conta Bancária:</span> {modalDetalhes.contaBanco||'--'}</div>
              <div><span className="text-gray-500">Forma Recebimento:</span> {modalDetalhes.formaPagamento||'--'}</div>
              <div><span className="text-gray-500">Data Recebimento:</span> {modalDetalhes.dataRecebimento ? fmtDateBR(modalDetalhes.dataRecebimento) : '--'}</div>
              <div className="col-span-2"><span className="text-gray-500">Histórico:</span> {modalDetalhes.historico||'--'}</div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={()=>setModalDetalhes(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function FormReceber({ conta, contas, empresas, naturezas, onReceber, loading, onClose }:{ conta:any; contas:any[]; empresas:any[]; naturezas:any[]; onReceber:(f:any)=>void; loading:boolean; onClose:()=>void }) {
  const [form, setForm] = useState({
    id: conta.id,
    dataRecebimento: new Date().toISOString().substring(0,10),
    valorRecebido: String(Number(conta.valor).toFixed(2)),
    formaPagamento: 'PIX' as any,
    contaId: 0,
    empresaId: 0,
    naturezaId: 0,
    historico: conta.historico || '',
    observacao: '',
  })
  const f=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:e.target.value}))
  const fn=(k:string)=>(e:React.ChangeEvent<any>)=>setForm(p=>({...p,[k]:Number(e.target.value)}))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Data Recebimento *" type="date" value={form.dataRecebimento} onChange={f('dataRecebimento')}/>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Valor</label>
          <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium">R$ {Number(conta.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <Select label="Forma de Recebimento *" value={form.formaPagamento} onChange={f('formaPagamento')} options={formas}/>
        <Select label="Conta *" value={form.contaId} onChange={fn('contaId')} placeholder="Selecione..."
          options={contas.map((t:any)=>({value:t.id,label:t.banco}))}/>
        <Select label="Empresa *" value={form.empresaId} onChange={fn('empresaId')} placeholder="Selecione..."
          options={empresas.map((t:any)=>({value:t.id,label:t.nome}))}/>
        <Select label="Natureza" value={form.naturezaId} onChange={fn('naturezaId')} placeholder="Selecione..."
          options={naturezas.map((n:any)=>({value:n.id,label:n.nome}))}/>
        <Input label="Histórico" value={form.historico} onChange={f('historico')}/>
        <Input label="Observação" value={form.observacao} onChange={f('observacao')}/>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={loading} onClick={()=>onReceber(form)}><CheckCircle size={14}/> Confirmar Recebimento</Button>
      </div>
    </div>
  )
}
