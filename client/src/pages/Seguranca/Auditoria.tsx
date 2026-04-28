import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { PageHeader, Button, Input, Select, Card, Table, Loading, Badge, Pagination } from '../../components/ui'
import { Search, RefreshCw, FileText } from 'lucide-react'

function formatDataHora(v: any): string {
  if (!v) return ''
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function trunc(s: any, max = 80): string {
  if (s === null || s === undefined) return ''
  const str = String(s)
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function Auditoria() {
  const [filtros, setFiltros] = useState<{ recurso?: string; busca?: string; desde?: string; ate?: string; pagina: number }>({ pagina: 1 })
  const [aplicados, setAplicados] = useState(filtros)

  const log = trpc.auditoria.listar.useQuery(aplicados)
  const recursos = trpc.auditoria.recursosDistintos.useQuery()

  function aplicar() {
    setAplicados({ ...filtros, pagina: 1 })
  }

  function limpar() {
    const f = { pagina: 1 }
    setFiltros(f)
    setAplicados(f)
  }

  return (
    <div>
      <PageHeader
        title="Auditoria de Mutations"
        subtitle="Log de todas as operações sensíveis (criar/editar/excluir) protegidas com requirePerm"
        actions={
          <Button variant="secondary" onClick={() => log.refetch()}>
            <RefreshCw size={14} /> Atualizar
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Select
            label="Recurso"
            value={filtros.recurso || ''}
            onChange={e => setFiltros(f => ({ ...f, recurso: e.target.value || undefined }))}
            options={[{ value: '', label: 'Todos' }, ...((recursos.data || []).map(r => ({ value: r, label: r })))]}
          />
          <Input
            label="Busca"
            placeholder="path ou input"
            value={filtros.busca || ''}
            onChange={e => setFiltros(f => ({ ...f, busca: e.target.value || undefined }))}
          />
          <Input
            label="Desde"
            type="date"
            value={filtros.desde || ''}
            onChange={e => setFiltros(f => ({ ...f, desde: e.target.value || undefined }))}
          />
          <Input
            label="Até"
            type="date"
            value={filtros.ate || ''}
            onChange={e => setFiltros(f => ({ ...f, ate: e.target.value || undefined }))}
          />
          <div className="flex gap-2">
            <Button onClick={aplicar}><Search size={14} /> Filtrar</Button>
            <Button variant="ghost" onClick={limpar}>Limpar</Button>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {log.isLoading ? <Loading /> : (
          <>
            <Table
              headers={['Data/Hora', 'Usuário', 'Perfil', 'Recurso', 'Procedure', 'Input (preview)', 'IP']}
              empty={!log.data?.linhas.length ? 'Nenhum registro encontrado nesse filtro.' : undefined}
            >
              {(log.data?.linhas || []).map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs font-mono text-gray-700 whitespace-nowrap">{formatDataHora(l.criadoEm)}</td>
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium text-gray-800">{l.usuarioNome || `#${l.usuarioId}`}</div>
                    <div className="text-xs text-gray-500">id {l.usuarioId}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {l.perfil && <Badge label={l.perfil} />}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-blue-700">{l.recurso}</td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-600">{l.procedurePath}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 max-w-md">
                    <div className="flex items-start gap-1">
                      <FileText size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="break-all" title={l.inputJson || ''}>{trunc(l.inputJson, 120)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">{l.ip || '—'}</td>
                </tr>
              ))}
            </Table>
            {log.data && log.data.total > log.data.pageSize && (
              <div className="p-4 border-t">
                <Pagination
                  pagina={aplicados.pagina}
                  total={Math.ceil(log.data.total / log.data.pageSize)}
                  onChange={p => setAplicados(a => ({ ...a, pagina: p }))}
                />
              </div>
            )}
            <div className="px-4 py-2 text-xs text-gray-500 border-t">
              {log.data?.total || 0} registros no total
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
