import { fmtDateBR } from "../../lib/dateUtils"
import { useState, useMemo } from 'react'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Select, Input, Table, Loading, Tabs } from '../../components/ui'
import { Download, ArrowUp, ArrowDown } from 'lucide-react'
import { exportToCSV, hoje } from './exportCSV'

const FORMAS_PAGAMENTO = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERÊNCIA BANCÁRIA', label: 'Transferência' },
  { value: 'CARTÃO DE CRÉDITO', label: 'Cartão Crédito' },
  { value: 'CARTÃO DE DÉBITO', label: 'Cartão Débito' },
  { value: 'DÉBITO EM CONTA', label: 'Débito em Conta' },
]

export function RelFinanceiro() {
  const [aba, setAba]       = useState('pagar')
  const [filtros, setFiltros] = useState<any>({
    dataInicio: new Date(new Date().setDate(1)).toISOString().slice(0,10),
    dataFim: new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().slice(0,10),
  })
  // Tab-specific client-side filters
  const [filtroPagar, setFiltroPagar]     = useState<any>({})
  const [filtroReceber, setFiltroReceber] = useState<any>({})
  const [filtroFluxo, setFiltroFluxo]     = useState<any>({})

  const empresas     = trpc.cadastros.finEmpresas.listar.useQuery()
  const tipoDespesas = trpc.cadastros.finTipoDespesas.listar.useQuery()
  const tipoReceitas = trpc.cadastros.finTipoReceitas.listar.useQuery()
  const fornecedores = trpc.cadastros.finFornecedores.listar.useQuery()
  const devedores    = trpc.cadastros.finDevedores.listar.useQuery()
  const contas       = trpc.cadastros.finContas.listar.useQuery()
  const naturezas    = trpc.cadastros.finNaturezas.listar.useQuery()

  const { data: pagar,   isLoading: lPagar }   = trpc.financeiro.contasPagar.listar.useQuery({ ...filtros, pagina: 1 })
  const { data: receber, isLoading: lReceber }  = trpc.financeiro.contasReceber.listar.useQuery({ ...filtros, pagina: 1 })
  const { data: fluxo,   isLoading: lFluxo }    = trpc.financeiro.fluxoCaixa.listar.useQuery({ ...filtros, pagina: 1 })
  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }

  // Client-side filtered lists
  const listaPagar = useMemo(() => {
    return (pagar?.lista || []).filter((c:any) => {
      if (filtroPagar.tipoDespesaId && c.tipoDespesaNome) {
        const td = tipoDespesas.data?.find((t:any) => t.id === filtroPagar.tipoDespesaId)
        if (td && c.tipoDespesaNome !== td.nome) return false
      } else if (filtroPagar.tipoDespesaId && !c.tipoDespesaNome) return false

      if (filtroPagar.fornecedorId && c.fornecedorNome) {
        const f = fornecedores.data?.find((f:any) => f.id === filtroPagar.fornecedorId)
        if (f && c.fornecedorNome !== f.nome) return false
      } else if (filtroPagar.fornecedorId && !c.fornecedorNome) return false

      if (filtroPagar.formaPagamento && c.formaPagamento !== filtroPagar.formaPagamento) return false
      if (filtroPagar.status && c.status !== filtroPagar.status) return false
      if (filtroPagar.despesaFixa === true && !c.despesaFixa) return false
      if (filtroPagar.dataPagamentoInicio && (!c.dataPagamento || c.dataPagamento < filtroPagar.dataPagamentoInicio)) return false
      if (filtroPagar.dataPagamentoFim   && (!c.dataPagamento || c.dataPagamento > filtroPagar.dataPagamentoFim))   return false
      return true
    })
  }, [pagar, filtroPagar, tipoDespesas.data, fornecedores.data])

  const listaReceber = useMemo(() => {
    return (receber?.lista || []).filter((c:any) => {
      if (filtroReceber.tipoReceitaId && c.tipoReceitaNome) {
        const tr = tipoReceitas.data?.find((t:any) => t.id === filtroReceber.tipoReceitaId)
        if (tr && c.tipoReceitaNome !== tr.nome) return false
      } else if (filtroReceber.tipoReceitaId && !c.tipoReceitaNome) return false

      if (filtroReceber.devedorId && c.devedorNome) {
        const d = devedores.data?.find((d:any) => d.id === filtroReceber.devedorId)
        if (d && c.devedorNome !== d.nome) return false
      } else if (filtroReceber.devedorId && !c.devedorNome) return false

      if (filtroReceber.formaPagamento && c.formaPagamento !== filtroReceber.formaPagamento) return false
      if (filtroReceber.status && c.status !== filtroReceber.status) return false
      if (filtroReceber.dataReceberInicio && (!c.dataRecebimento || c.dataRecebimento < filtroReceber.dataReceberInicio)) return false
      if (filtroReceber.dataReceberFim   && (!c.dataRecebimento || c.dataRecebimento > filtroReceber.dataReceberFim))   return false
      return true
    })
  }, [receber, filtroReceber, tipoReceitas.data, devedores.data])

  const listaFluxo = useMemo(() => {
    return (fluxo?.lista || []).filter((row:any) => {
      const fc = row.fluxo_caixa
      if (filtroFluxo.contaId && row.fin_contas) {
        const ct = contas.data?.find((c:any) => c.id === filtroFluxo.contaId)
        if (ct && row.fin_contas?.banco !== ct.banco) return false
      } else if (filtroFluxo.contaId && !row.fin_contas) return false

      if (filtroFluxo.empresaId && row.fin_empresas) {
        const emp = empresas.data?.find((e:any) => e.id === filtroFluxo.empresaId)
        if (emp && row.fin_empresas?.nome !== emp.nome) return false
      } else if (filtroFluxo.empresaId && !row.fin_empresas) return false

      if (filtroFluxo.naturezaId && row.fin_naturezas) {
        const nat = naturezas.data?.find((n:any) => n.id === filtroFluxo.naturezaId)
        if (nat && row.fin_naturezas?.nome !== nat.nome) return false
      } else if (filtroFluxo.naturezaId && !row.fin_naturezas) return false

      if (filtroFluxo.tipo) {
        if (filtroFluxo.tipo === 'Credito' && fc.tipo !== 'Credito') return false
        if (filtroFluxo.tipo === 'Debito' && fc.tipo !== 'Debito') return false
      }
      return true
    })
  }, [fluxo, filtroFluxo, contas.data, empresas.data, naturezas.data])

  const totalPagar   = listaPagar.reduce((s:number,c:any)=>s+Number(c.valor||0),0)
  const totalReceber = listaReceber.reduce((s:number,c:any)=>s+Number(c.valor||0),0)

  function handleExport() {
    if (aba === 'pagar') {
      if (!listaPagar.length) return
      const headers = ['Vencimento','Valor','Fornecedor','Tipo Despesa','Histórico','Empresa','Status']
      const rows = listaPagar.map((c:any) => [
        c.vencimento ? fmtDateBR(c.vencimento) : '',
        Number(c.valor).toLocaleString('pt-BR', {minimumFractionDigits:2}),
        c.fornecedorNome || '',
        c.tipoDespesaNome || '',
        c.historico || '',
        c.empresaNome || '',
        c.status || '',
      ])
      exportToCSV(headers, rows, `relatorio_contas_pagar_${hoje()}.csv`)
    } else if (aba === 'receber') {
      if (!listaReceber.length) return
      const headers = ['Vencimento','Valor','Devedor','Tipo Receita','Histórico','Empresa','Status']
      const rows = listaReceber.map((c:any) => [
        c.vencimento ? fmtDateBR(c.vencimento) : '',
        Number(c.valor).toLocaleString('pt-BR', {minimumFractionDigits:2}),
        c.devedorNome || '',
        c.tipoReceitaNome || '',
        c.historico || '',
        c.empresaNome || '',
        c.status || '',
      ])
      exportToCSV(headers, rows, `relatorio_contas_receber_${hoje()}.csv`)
    } else {
      if (!listaFluxo.length) return
      const headers = ['Data','Tipo','Valor','Histórico','Conta','Empresa']
      const rows = listaFluxo.map((row:any) => {
        const fc = row.fluxo_caixa
        return [
          fc.dataMovimento ? fmtDateBR(fc.dataMovimento) : '',
          fc.tipo === 'Credito' ? 'Credito' : 'Debito',
          Number(fc.valor).toLocaleString('pt-BR', {minimumFractionDigits:2}),
          fc.historico || '',
          row.fin_contas?.banco || '',
          row.fin_empresas?.nome || '',
        ]
      })
      exportToCSV(headers, rows, `relatorio_fluxo_caixa_${hoje()}.csv`)
    }
  }

  return (
    <div>
      <PageHeader title="Relatório Financeiro"
        actions={<Button variant="secondary" onClick={handleExport}><Download size={14}/> Exportar</Button>} />

      {/* Filtros globais (data + empresa) */}
      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Input label="Período" type="date" value={filtros.dataInicio} onChange={e=>setF('dataInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" value={filtros.dataFim} onChange={e=>setF('dataFim',e.target.value)} />
          </div>
          <Select label="Empresa" value={filtros.empresaId||''} onChange={e=>setF('empresaId',Number(e.target.value)||undefined)}
            options={(empresas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <ArrowDown size={18} className="text-white"/>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total a Pagar</div>
            <div className="text-lg font-bold text-red-700">R$ {totalPagar.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <ArrowUp size={18} className="text-white"/>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total a Receber</div>
            <div className="text-lg font-bold text-green-700">R$ {totalReceber.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
          </div>
        </div>
        <div className={`${totalReceber-totalPagar>=0?'bg-blue-50 border-blue-200':'bg-orange-50 border-orange-200'} border rounded-xl p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 ${totalReceber-totalPagar>=0?'bg-blue-500':'bg-orange-500'} rounded-xl flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">=</span>
          </div>
          <div>
            <div className="text-xs text-gray-500">Resultado</div>
            <div className={`text-lg font-bold ${totalReceber-totalPagar>=0?'text-blue-700':'text-orange-700'}`}>
              R$ {(totalReceber-totalPagar).toLocaleString('pt-BR',{minimumFractionDigits:2})}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <Tabs active={aba} onChange={setAba} tabs={[
            { key:'pagar',   label:'Contas a Pagar' },
            { key:'receber', label:'Contas a Receber' },
            { key:'fluxo',   label:'Fluxo de Caixa' },
          ]}/>
        </div>

        {/* Tab-specific filters */}
        {aba === 'pagar' && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
              <Select label="Tipo Despesa" value={filtroPagar.tipoDespesaId||''} onChange={e=>setFiltroPagar((f:any)=>({...f,tipoDespesaId:Number(e.target.value)||undefined}))}
                options={(tipoDespesas.data||[]).map((t:any)=>({value:t.id,label:t.nome}))} />
              <Select label="Fornecedor" value={filtroPagar.fornecedorId||''} onChange={e=>setFiltroPagar((f:any)=>({...f,fornecedorId:Number(e.target.value)||undefined}))}
                options={(fornecedores.data||[]).map((f:any)=>({value:f.id,label:f.nome}))} />
              <Select label="Conta Bancária" value={filtroPagar.contaId||''} onChange={e=>setFiltroPagar((f:any)=>({...f,contaId:Number(e.target.value)||undefined}))}
                options={(contas.data||[]).map((c:any)=>({value:c.id,label:`${c.banco} - ${c.conta||''}`}))} />
              <Select label="Forma Pagamento" value={filtroPagar.formaPagamento||''} onChange={e=>setFiltroPagar((f:any)=>({...f,formaPagamento:e.target.value||undefined}))}
                options={FORMAS_PAGAMENTO} />
              <Select label="Status" value={filtroPagar.status||''} onChange={e=>setFiltroPagar((f:any)=>({...f,status:e.target.value||undefined}))}
                options={[{value:'Pendente',label:'Pendente'},{value:'Pago',label:'Pago'}]} />
              <Input label="Data Pagto De" type="date" value={filtroPagar.dataPagamentoInicio||""} onChange={e=>setFiltroPagar((f:any)=>({...f,dataPagamentoInicio:e.target.value||undefined}))} />
              <Input label="Data Pagto Até" type="date" value={filtroPagar.dataPagamentoFim||""} onChange={e=>setFiltroPagar((f:any)=>({...f,dataPagamentoFim:e.target.value||undefined}))} />
              <div className="flex items-end pb-2"><label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" checked={!!filtroPagar.despesaFixa} onChange={e=>setFiltroPagar((f:any)=>({...f,despesaFixa:e.target.checked||undefined}))} className="rounded"/> Despesa fixa?</label></div>
            </div>
          </div>
        )}

        {aba === 'receber' && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
              <Select label="Tipo Receita" value={filtroReceber.tipoReceitaId||''} onChange={e=>setFiltroReceber((f:any)=>({...f,tipoReceitaId:Number(e.target.value)||undefined}))}
                options={(tipoReceitas.data||[]).map((t:any)=>({value:t.id,label:t.nome}))} />
              <Select label="Devedor" value={filtroReceber.devedorId||''} onChange={e=>setFiltroReceber((f:any)=>({...f,devedorId:Number(e.target.value)||undefined}))}
                options={(devedores.data||[]).map((d:any)=>({value:d.id,label:d.nome}))} />
              <Select label="Conta Bancária" value={filtroReceber.contaId||''} onChange={e=>setFiltroReceber((f:any)=>({...f,contaId:Number(e.target.value)||undefined}))}
                options={(contas.data||[]).map((c:any)=>({value:c.id,label:`${c.banco} - ${c.conta||''}`}))} />
              <Select label="Forma Recebimento" value={filtroReceber.formaPagamento||''} onChange={e=>setFiltroReceber((f:any)=>({...f,formaPagamento:e.target.value||undefined}))}
                options={FORMAS_PAGAMENTO} />
              <Select label="Status" value={filtroReceber.status||''} onChange={e=>setFiltroReceber((f:any)=>({...f,status:e.target.value||undefined}))}
                options={[{value:'Pendente',label:'Pendente'},{value:'Recebido',label:'Recebido'}]} />
              <Input label="Data Receb. De" type="date" value={filtroReceber.dataReceberInicio||""} onChange={e=>setFiltroReceber((f:any)=>({...f,dataReceberInicio:e.target.value||undefined}))} />
              <Input label="Data Receb. Até" type="date" value={filtroReceber.dataReceberFim||""} onChange={e=>setFiltroReceber((f:any)=>({...f,dataReceberFim:e.target.value||undefined}))} />
            </div>
          </div>
        )}

        {aba === 'fluxo' && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
              <Select label="Conta Bancária" value={filtroFluxo.contaId||''} onChange={e=>setFiltroFluxo((f:any)=>({...f,contaId:Number(e.target.value)||undefined}))}
                options={(contas.data||[]).map((c:any)=>({value:c.id,label:`${c.banco} - ${c.conta||''}`}))} />
              <Select label="Empresa" value={filtroFluxo.empresaId||''} onChange={e=>setFiltroFluxo((f:any)=>({...f,empresaId:Number(e.target.value)||undefined}))}
                options={(empresas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
              <Select label="Natureza" value={filtroFluxo.naturezaId||''} onChange={e=>setFiltroFluxo((f:any)=>({...f,naturezaId:Number(e.target.value)||undefined}))}
                options={(naturezas.data||[]).map((n:any)=>({value:n.id,label:n.nome}))} />
              <Select label="Tipo" value={filtroFluxo.tipo||''} onChange={e=>setFiltroFluxo((f:any)=>({...f,tipo:e.target.value||undefined}))}
                options={[{value:'Credito',label:'Entrada'},{value:'Debito',label:'Saida'}]} />
            </div>
          </div>
        )}

        {aba === 'pagar' && (
          lPagar ? <div className="p-8 flex justify-center"><span className="text-gray-400">Carregando...</span></div> : (
            <Table headers={['Vencimento','Valor','Fornecedor','Tipo Despesa','Histórico','Empresa','Status']} empty={!listaPagar.length ? 'Nenhum registro.' : undefined}>
              {listaPagar.map((c:any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs">{c.vencimento?fmtDateBR(c.vencimento):'—'}</td>
                  <td className="px-3 py-2 text-sm font-medium text-red-600">R$ {Number(c.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2 text-xs">{c.fornecedorNome||'—'}</td>
                  <td className="px-3 py-2 text-xs">{c.tipoDespesaNome||'—'}</td>
                  <td className="px-3 py-2 text-xs max-w-[150px] truncate">{c.historico||'—'}</td>
                  <td className="px-3 py-2 text-xs">{c.empresaNome||'—'}</td>
                  <td className="px-3 py-2 text-xs">{c.status}</td>
                </tr>
              ))}
            </Table>
          )
        )}

        {aba === 'receber' && (
          lReceber ? <div className="p-8 flex justify-center"><span className="text-gray-400">Carregando...</span></div> : (
            <Table headers={['Vencimento','Valor','Devedor','Tipo Receita','Histórico','Empresa','Status']} empty={!listaReceber.length ? 'Nenhum registro.' : undefined}>
              {listaReceber.map((c:any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs">{c.vencimento?fmtDateBR(c.vencimento):'—'}</td>
                  <td className="px-3 py-2 text-sm font-medium text-green-600">R$ {Number(c.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2 text-xs">{c.devedorNome||'—'}</td>
                  <td className="px-3 py-2 text-xs">{c.tipoReceitaNome||'—'}</td>
                  <td className="px-3 py-2 text-xs max-w-[150px] truncate">{c.historico||'—'}</td>
                  <td className="px-3 py-2 text-xs">{c.empresaNome||'—'}</td>
                  <td className="px-3 py-2 text-xs">{c.status}</td>
                </tr>
              ))}
            </Table>
          )
        )}

        {aba === 'fluxo' && (
          lFluxo ? <div className="p-8 flex justify-center"><span className="text-gray-400">Carregando...</span></div> : (
            <Table headers={['Data','Tipo','Valor','Histórico','Conta','Empresa']} empty={!listaFluxo.length ? 'Nenhum registro.' : undefined}>
              {listaFluxo.map((row:any,i:number) => {
                const fc = row.fluxo_caixa
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs">{fc.dataMovimento?fmtDateBR(fc.dataMovimento):'—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${fc.tipo==='Credito'?'text-green-700':'text-red-700'}`}>
                        {fc.tipo==='Credito'?'Credito':'Debito'}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-sm font-bold ${fc.tipo==='Credito'?'text-green-700':'text-red-700'}`}>
                      R$ {Number(fc.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[150px] truncate">{fc.historico||'—'}</td>
                    <td className="px-3 py-2 text-xs">{row.fin_contas?.banco||'—'}</td>
                    <td className="px-3 py-2 text-xs">{row.fin_empresas?.nome||'—'}</td>
                  </tr>
                )
              })}
            </Table>
          )
        )}
      </Card>
    </div>
  )
}
