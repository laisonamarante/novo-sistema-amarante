import { fmtDateBR } from "../../lib/dateUtils"
import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Select, Input, Table, Loading } from '../../components/ui'
import { Download } from 'lucide-react'
import { exportToCSV, hoje } from './exportCSV'

export function RelProducao() {
  const [filtros, setFiltros] = useState<any>({})
  const [ativos, setAtivos] = useState<any>({})
  const bancos   = trpc.cadastros.bancos.listar.useQuery()
  const agencias = trpc.cadastros.agencias.listar.useQuery({ bancoId: filtros.bancoId })
  const { data, isLoading } = trpc.processos.listar.useQuery({ ...ativos, pagina: 1 })
  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }

  function handleExport() {
    if (!data?.lista?.length) return
    const headers = ['Codigo','N Proposta','Comprador','Banco','Agencia','Modalidade','Dt Emissao','Dt Assinatura','Valor Financiado','Responsavel']
    const rows = data.lista.map((p:any) => [
      p.id,
      p.numProposta || '',
      p.compradorNome || '',
      p.bancoNome || '',
      p.agenciaNome || '',
      p.modalidadeNome || '',
      p.dataEmissaoContrato ? fmtDateBR(p.dataEmissaoContrato) : '',
      p.dataAssinatura ? fmtDateBR(p.dataAssinatura) : '',
      p.valorFinanciado ? Number(p.valorFinanciado).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '',
      p.responsavelNome || '',
    ])
    exportToCSV(headers, rows, `relatorio_producao_${hoje()}.csv`)
  }

  return (
    <div>
      <PageHeader title="Relatório de Produção"
        actions={<Button variant="secondary" onClick={handleExport}><Download size={14}/> Exportar</Button>} />
      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Input label="Data emissão do Contrato" type="date" onChange={e=>setF('dataEmissaoInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" onChange={e=>setF('dataEmissaoFim',e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Input label="Data de Assinatura" type="date" onChange={e=>setF('dataAssinaturaInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" onChange={e=>setF('dataAssinaturaFim',e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Input label="Data pagto Vendedor" type="date" onChange={e=>setF('dataPagtoInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" onChange={e=>setF('dataPagtoFim',e.target.value)} />
          </div>
          <Select label="Banco" value={filtros.bancoId||''} onChange={e=>setF('bancoId',Number(e.target.value)||undefined)}
            options={(bancos.data||[]).map((b:any)=>({value:b.id,label:b.nome}))} />
          <Select label="Agência" value={filtros.agenciaId||''} onChange={e=>setF('agenciaId',Number(e.target.value)||undefined)}
            options={(agencias.data||[]).map((a:any)=>({value:a.id,label:a.nome}))} />
        </div>
        <div className="mt-3">
          <Button onClick={() => setAtivos(filtros)}>Gerar</Button>
        </div>
      </Card>
      <Card>
        {isLoading ? <Loading/> : (
          <Table headers={['Código','Nº Proposta','Comprador','Banco','Agência','Modalidade','Dt. Emissão','Dt. Assinatura','Valor Fin.','Responsável']} empty={!data?.lista.length ? 'Nenhum registro.' : undefined}>
            {data?.lista.map((p:any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-blue-600 font-medium text-xs">#{p.id}</td>
                <td className="px-3 py-2 text-xs">{p.numProposta||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.compradorNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.bancoNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.agenciaNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.modalidadeNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.dataEmissaoContrato ? fmtDateBR(p.dataEmissaoContrato) : '--'}</td>
                <td className="px-3 py-2 text-xs">{p.dataAssinatura ? fmtDateBR(p.dataAssinatura) : '--'}</td>
                <td className="px-3 py-2 text-xs font-medium text-green-700">{p.valorFinanciado ? `R$ ${Number(p.valorFinanciado).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '--'}</td>
                <td className="px-3 py-2 text-xs">{p.responsavelNome||'--'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
