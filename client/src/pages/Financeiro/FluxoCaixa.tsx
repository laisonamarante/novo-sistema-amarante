import { fmtDateBR } from "../../lib/dateUtils"
import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { PageHeader, Button, Input, Select, Card, Table, Pagination, Loading, Modal } from '../../components/ui'
import { Plus, ArrowLeftRight } from 'lucide-react'

export function FluxoCaixa() {
  const [modalIncluir, setModalIncluir]       = useState(false)
  const [modalTransferencia, setModalTransf]  = useState(false)
  const [pagina, setPagina]                   = useState(1)
  const [filtros, setFiltros] = useState<any>({
    dataInicio: new Date(new Date().setDate(1)).toISOString().slice(0,10),
    dataFim:    new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().slice(0,10),
    tipo: 'Todos',
  })
  const [form, setForm]   = useState<any>({ tipo: 'Credito' })
  const [transf, setTransf] = useState<any>({})

  const { data, isLoading, refetch } = trpc.financeiro.fluxoCaixa.listar.useQuery({ ...filtros, pagina })
  const empresas   = trpc.cadastros.finEmpresas.listar.useQuery()
  const contas     = trpc.cadastros.finContas.listar.useQuery()
  const naturezas  = trpc.cadastros.finNaturezas.listar.useQuery()

  const incluir     = trpc.financeiro.fluxoCaixa.incluir.useMutation({ onSuccess: () => { setModalIncluir(false); refetch() } })
  const transferir  = trpc.financeiro.fluxoCaixa.transferencia.useMutation({ onSuccess: () => { setModalTransf(false); refetch() } })

  function set(k:string,v:any) { setForm((f:any)=>({...f,[k]:v})) }
  function setT(k:string,v:any) { setTransf((f:any)=>({...f,[k]:v})) }
  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }

  const lista = data?.lista || []
  const totalExibido = lista.reduce((s:number,i:any)=>s+Number(i.fluxo_caixa?.valor||0),0)
  const qtdRegistros = lista.length

  return (
    <div>
      <PageHeader title="Fluxo de Caixa" />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="space-y-3">
          {/* Linha 1: Período + Tipo + Valor */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-end gap-2">
              <Input label="Período" type="date" value={filtros.dataInicio||''} onChange={e=>setF('dataInicio',e.target.value)} />
              <span className="pb-2 text-sm text-gray-500">à</span>
              <Input label="" type="date" value={filtros.dataFim||''} onChange={e=>setF('dataFim',e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pb-2">
              {['Credito','Debito','Todos'].map(t => (
                <label key={t} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="tipoFluxo" value={t} checked={filtros.tipo===t || (t==='Todos' && !filtros.tipo)} onChange={()=>setF('tipo',t)} /> {t==='Credito'?'Crédito':t==='Debito'?'Débito':t}
                </label>
              ))}
            </div>
            <Input label="Valor" type="number" step="0.01" value={filtros.valor||''} onChange={e=>setF('valor',e.target.value)} className="w-32" />
          </div>

          {/* Linha 2: Conta + Empresa */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Conta" value={filtros.contaId||''} onChange={e=>setF('contaId',Number(e.target.value)||undefined)}
              options={(contas.data||[]).map((c:any)=>({value:c.id,label:c.banco}))} />
            <Select label="Empresa" value={filtros.empresaId||''} onChange={e=>setF('empresaId',Number(e.target.value)||undefined)}
              options={(empresas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
          </div>

          {/* Linha 3: Natureza + Histórico + Pesquisar */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select label="Natureza" value={filtros.naturezaId||''} onChange={e=>setF('naturezaId',Number(e.target.value)||undefined)}
                options={(naturezas.data||[]).map((n:any)=>({value:n.id,label:n.nome}))} />
            </div>
            <div className="flex-1">
              <Input label="Histórico" value={filtros.historico||''} onChange={e=>setF('historico',e.target.value)} />
            </div>
            <Button onClick={() => refetch()} className="whitespace-nowrap">Pesquisar</Button>
          </div>
        </div>
      </Card>

      {/* Resumo + Botões */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Quantidade de registros exibidos</span>
            <span className="bg-gray-100 border border-gray-300 rounded px-3 py-1 font-bold text-gray-800 min-w-[40px] text-center">{qtdRegistros}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Valor total exibido</span>
            <span className="font-bold text-gray-800">{totalExibido.toLocaleString('pt-BR',{minimumFractionDigits:2})} R$</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalIncluir(true)}><Plus size={14}/> Incluir</Button>
          <Button variant="secondary" onClick={() => setModalTransf(true)}><ArrowLeftRight size={14}/> Transferência</Button>
        </div>
      </div>

      <Card>
        {isLoading ? <Loading/> : (
          <>
            <Table headers={['Data','Tipo','Valor','Histórico','Conta','Empresa','Natureza']} empty={!lista.length ? 'Nenhum registro.' : undefined}>
              {lista.map((row:any,i:number) => {
                const fc = row.fluxo_caixa
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs">{fc.dataMovimento ? fmtDateBR(fc.dataMovimento) : '—'}</td>
                    <td className="px-3 py-2 text-xs">{fc.tipo==='Credito'?'Crédito':'Débito'}</td>
                    <td className={`px-3 py-2 text-sm ${fc.tipo==='Credito'?'text-green-700':'text-red-700'}`}>
                      R$ {Number(fc.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{fc.historico||'—'}</td>
                    <td className="px-3 py-2 text-xs">{row.fin_contas?.banco||'—'}</td>
                    <td className="px-3 py-2 text-xs">{row.fin_empresas?.nome||'—'}</td>
                    <td className="px-3 py-2 text-xs">{row.fin_naturezas?.nome||'—'}</td>
                  </tr>
                )
              })}
            </Table>
            <div className="p-4"><Pagination pagina={pagina} total={data?.totalPaginas||1} onChange={setPagina}/></div>
          </>
        )}
      </Card>

      {/* Modal Incluir */}
      <Modal open={modalIncluir} title="Incluir Lançamento" onClose={() => setModalIncluir(false)}>
        <div className="space-y-3">
          <div className="flex gap-4">
            {['Credito','Debito'].map(t => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="tipoLanc" value={t} checked={form.tipo===t} onChange={()=>set('tipo',t)}/>
                <span className={t==='Credito'?'text-green-700':'text-red-700'}>{t==='Credito'?'Crédito':'Débito'}</span>
              </label>
            ))}
          </div>
          <Input label="Data *" type="date" value={form.dataMovimento||''} onChange={e=>set('dataMovimento',e.target.value)} />
          <Input label="Valor *" type="number" step="0.01" value={form.valor||''} onChange={e=>set('valor',e.target.value)} />
          <Select label="Conta *" value={form.contaId||''} onChange={e=>set('contaId',Number(e.target.value))}
            options={(contas.data||[]).map((c:any)=>({value:c.id,label:c.banco}))} />
          <Select label="Empresa *" value={form.empresaId||''} onChange={e=>set('empresaId',Number(e.target.value))}
            options={(empresas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
          <Select label="Natureza" value={form.naturezaId||''} onChange={e=>set('naturezaId',Number(e.target.value))}
            options={(naturezas.data||[]).map((n:any)=>({value:n.id,label:n.nome}))} />
          <Input label="Histórico" value={form.historico||''} onChange={e=>set('historico',e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={()=>incluir.mutate(form)} loading={incluir.isPending}>Salvar</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModalIncluir(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Transferência */}
      <Modal open={modalTransferencia} title="Transferência entre Contas" onClose={() => setModalTransf(false)}>
        <div className="space-y-3">
          <Select label="Conta Origem *" value={transf.contaOrigemId||''} onChange={e=>setT('contaOrigemId',Number(e.target.value))}
            options={(contas.data||[]).map((c:any)=>({value:c.id,label:c.banco}))} />
          <Select label="Conta Destino *" value={transf.contaDestinoId||''} onChange={e=>setT('contaDestinoId',Number(e.target.value))}
            options={(contas.data||[]).map((c:any)=>({value:c.id,label:c.banco}))} />
          <Input label="Valor *" type="number" step="0.01" value={transf.valor||''} onChange={e=>setT('valor',e.target.value)} />
          <Input label="Data *" type="date" value={transf.data||''} onChange={e=>setT('data',e.target.value)} />
          <Input label="Histórico" value={transf.historico||''} onChange={e=>setT('historico',e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 justify-center" onClick={()=>transferir.mutate(transf)} loading={transferir.isPending}>Transferir</Button>
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModalTransf(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
