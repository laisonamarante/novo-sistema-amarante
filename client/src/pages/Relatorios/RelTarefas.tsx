import { fmtDateBR } from "../../lib/dateUtils"
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Select, Input, Table, Loading, Badge } from '../../components/ui'
import { Download } from 'lucide-react'
import { exportToCSV, hoje } from './exportCSV'

export function RelTarefas() {
  const [filtros, setFiltros] = useState<any>({
    dataInicio: new Date(new Date().setDate(1)).toISOString().slice(0,10),
    dataFim:    new Date().toISOString().slice(0,10),
  })
  const usuariosList = trpc.cadastros.usuarios.listar.useQuery()
  const parceiros    = trpc.cadastros.parceiros.listar.useQuery()
  const { data, isLoading } = trpc.tarefas.minhasTarefas.useQuery()

  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }

  const todasTarefas = useMemo(() => {
    const all = [...(data?.recebidas||[]), ...(data?.criadas||[])]
    return all.filter((t:any) => {
      if (filtros.id && t.id !== filtros.id) return false
      if (filtros.status && t.status !== filtros.status) return false
      if (filtros.solicitanteId && t.solicitanteId !== filtros.solicitanteId) return false
      if (filtros.executanteId && t.executanteId !== filtros.executanteId) return false
      if (filtros.dataInicio) {
        const dt = new Date(t.criadoEm).toISOString().slice(0,10)
        if (dt < filtros.dataInicio) return false
      }
      if (filtros.dataFim) {
        const dt = new Date(t.criadoEm).toISOString().slice(0,10)
        if (dt > filtros.dataFim) return false
      }
      return true
    })
  }, [data, filtros])

  function handleExport() {
    if (!todasTarefas.length) return
    const headers = ['N','Data','Situacao','N Processo','Comprador','Solicitante','Executante','Solicitacao','Data Limite']
    const rows = todasTarefas.map((t:any) => [
      t.id,
      new Date(t.criadoEm).toLocaleDateString('pt-BR'),
      t.status,
      t.processoId || '',
      t.compradorNome || '',
      t.solicitanteNome || '',
      t.executanteNome || '',
      t.solicitacao || '',
      t.dataLimite ? fmtDateBR(t.dataLimite) : '',
    ])
    exportToCSV(headers, rows, `relatorio_tarefas_${hoje()}.csv`)
  }

  return (
    <div>
      <PageHeader title="Relatório de Tarefa"
        actions={<Button variant="secondary" onClick={handleExport}><Download size={14}/> Exportar</Button>} />

      <Card className="p-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Input label="Data" type="date" value={filtros.dataInicio} onChange={e=>setF('dataInicio',e.target.value)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" value={filtros.dataFim} onChange={e=>setF('dataFim',e.target.value)} />
          </div>
          <Select label="Situação" value={filtros.status||''} onChange={e=>setF('status',e.target.value||undefined)}
            options={['Pendente','Resolvida','Encerrada'].map(s=>({value:s,label:s}))} />
          <Select label="Parceiro" value={filtros.parceiroId||''} onChange={e=>setF('parceiroId',Number(e.target.value)||undefined)}
            options={(parceiros.data||[]).map((p:any)=>({value:p.id,label:p.nome}))} />
          <Select label="Solicitante" value={filtros.solicitanteId||''} onChange={e=>setF('solicitanteId',Number(e.target.value)||undefined)}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} />
          <Select label="Executante" value={filtros.executanteId||''} onChange={e=>setF('executanteId',Number(e.target.value)||undefined)}
            options={(usuariosList.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} />
        </div>
        <div className="mt-3"><Button>Gerar</Button></div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <Table
            headers={['Nº','Data','Situação','Nº Processo','Comprador','Solicitante','Executante','Solicitação','Limite']}
            empty={!todasTarefas.length ? 'Nenhum registro.' : undefined}>
            {todasTarefas.map((t:any) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 font-mono">#{t.id}</td>
                <td className="px-3 py-2 text-xs">{new Date(t.criadoEm).toLocaleDateString('pt-BR')}</td>
                <td className="px-3 py-2"><Badge label={t.status}/></td>
                <td className="px-3 py-2 text-xs">
                  {t.processoId
                    ? <Link to={`/financiamento/processos/${t.processoId}`} className="text-blue-600 hover:underline">#{t.processoId}</Link>
                    : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.compradorNome || '--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.solicitanteNome || '--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.executanteNome || '--'}</td>
                <td className="px-3 py-2 text-xs text-gray-700 max-w-xs">
                  <p className="truncate">{t.solicitacao}</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.dataLimite
                    ? <span className={`font-medium ${new Date(t.dataLimite) < new Date() ? 'text-red-600' : 'text-gray-600'}`}>
                        {fmtDateBR(t.dataLimite)}
                      </span>
                    : '—'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
