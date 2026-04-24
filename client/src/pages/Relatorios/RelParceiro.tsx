import { fmtDateBR } from "../../lib/dateUtils"
import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Select, Input, Table, Loading } from '../../components/ui'
import { Download } from 'lucide-react'
import { exportToCSV, hoje } from './exportCSV'

export function RelParceiro() {
  const [filtros, setFiltros] = useState<any>({})
  const [ativos, setAtivos] = useState<any>({})
  const bancos   = trpc.cadastros.bancos.listar.useQuery()
  const parceiros = trpc.cadastros.parceiros.listar.useQuery()
  const { data, isLoading } = trpc.processos.listar.useQuery({ ...ativos, pagina: 1 })
  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }

  function handleExport() {
    if (!data?.lista?.length) return
    const headers = ['Codigo','Parceiro','Banco','Comprador','Dt Assinatura','Dt Emissao','Dt Pagto','Valor Financiado']
    const rows = data.lista.map((p:any) => [
      p.id,
      p.parceiroNome || '',
      p.bancoNome || '',
      p.compradorNome || '',
      p.dataAssinatura ? fmtDateBR(p.dataAssinatura) : '',
      p.dataEmissaoContrato ? fmtDateBR(p.dataEmissaoContrato) : '',
      p.dataPagtoVendedor ? fmtDateBR(p.dataPagtoVendedor) : '',
      p.valorFinanciado ? Number(p.valorFinanciado).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '',
    ])
    exportToCSV(headers, rows, `relatorio_parceiro_${hoje()}.csv`)
  }

  return (
    <div>
      <PageHeader title="Relatório de Parceiro"
        actions={<Button variant="secondary" onClick={handleExport}><Download size={14}/> Exportar</Button>} />
      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <Select label="Banco" value={filtros.bancoId||''} onChange={e=>setF('bancoId',Number(e.target.value)||undefined)}
            options={(bancos.data||[]).map((b:any)=>({value:b.id,label:b.nome}))} />
          <Select label="Parceiro" value={filtros.parceiroId||''} onChange={e=>setF('parceiroId',Number(e.target.value)||undefined)}
            options={(parceiros.data||[]).map((p:any)=>({value:p.id,label:p.nome}))} />
          <div className="flex items-end gap-2">
            <Input label="Data de Assinatura" type="date" onChange={e=>setF('dataAssinaturaInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" onChange={e=>setF('dataAssinaturaFim',e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Input label="Data emissão do Contrato" type="date" onChange={e=>setF('dataEmissaoInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" onChange={e=>setF('dataEmissaoFim',e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Input label="Data pagto Vendedor" type="date" onChange={e=>setF('dataPagtoInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" onChange={e=>setF('dataPagtoFim',e.target.value)} />
          </div>
          <Input label="Nº Processo" type="number" onChange={e=>setF('codigo',Number(e.target.value)||undefined)} className="w-48" />
        </div>
        <div className="mt-3"><Button onClick={() => setAtivos(filtros)}>Gerar</Button></div>
      </Card>
      <Card>
        {isLoading ? <Loading/> : (
          <Table headers={['Código','Parceiro','Banco','Comprador','Dt. Assinatura','Dt. Emissão','Dt. Pagto','Valor Fin.']} empty={!data?.lista.length ? 'Nenhum registro.' : undefined}>
            {data?.lista.map((p:any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-blue-600 font-medium text-xs">#{p.id}</td>
                <td className="px-3 py-2 text-xs">{p.parceiroNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.bancoNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.compradorNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.dataAssinatura ? fmtDateBR(p.dataAssinatura) : '--'}</td>
                <td className="px-3 py-2 text-xs">{p.dataEmissaoContrato ? fmtDateBR(p.dataEmissaoContrato) : '--'}</td>
                <td className="px-3 py-2 text-xs">{p.dataPagtoVendedor ? fmtDateBR(p.dataPagtoVendedor) : '--'}</td>
                <td className="px-3 py-2 text-xs font-medium text-green-700">{p.valorFinanciado ? `R$ ${Number(p.valorFinanciado).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '--'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
