import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Table, Loading, Select } from '../../components/ui'
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft } from 'lucide-react'

export function ConfigurarFluxo() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const fluxoId = Number(id)

  const listaQuery = trpc.cadastros.fluxos.listarEtapas.useQuery({ fluxoId })
  const situacoesQ = trpc.cadastros.situacoes.listar.useQuery()
  const fluxosQ = trpc.cadastros.fluxos.listar.useQuery()

  const refetch = () => listaQuery.refetch()
  const vincular = trpc.cadastros.fluxos.vincularEtapa.useMutation({ onSuccess: refetch })
  const desvincular = trpc.cadastros.fluxos.desvincularEtapa.useMutation({ onSuccess: refetch })
  const subir = trpc.cadastros.fluxos.subirOrdemEtapa.useMutation({ onSuccess: refetch })
  const descer = trpc.cadastros.fluxos.descerOrdemEtapa.useMutation({ onSuccess: refetch })

  const fluxo = fluxosQ.data?.find((f: any) => f.id === fluxoId)
  const [addEtapaId, setAddEtapaId] = useState('')

  const etapasDoFluxo = (listaQuery.data || [])
    .filter((e: any) => e.vinculado)
    .sort((a: any, b: any) => (a.fluxoOrdem || 0) - (b.fluxoOrdem || 0))

  const etapasDisponiveis = (listaQuery.data || [])
    .filter((e: any) => !e.vinculado)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome))

  function addExisting() {
    if (!addEtapaId) return
    vincular.mutate({ etapaId: Number(addEtapaId), fluxoId })
    setAddEtapaId('')
  }

  function getSituacao(situacaoId: number | null) {
    if (!situacaoId) return '—'
    return situacoesQ.data?.find((s: any) => s.id === situacaoId)?.nome || '—'
  }

  if (listaQuery.isLoading) return <Loading />

  return (
    <div>
      <PageHeader
        title={`Configurar Fluxo: ${fluxo?.nome || `#${fluxoId}`}`}
        subtitle="Ordene as etapas deste fluxo"
        actions={
          <Button variant="secondary" onClick={() => nav('/configuracoes?tab=fluxos')}>
            <ArrowLeft size={14} /> Voltar
          </Button>
        }
      />

      <Card className="p-5 mb-4">
        <div className="flex gap-3 items-end mb-4">
          <div className="flex-1">
            <Select
              label="Adicionar etapa existente"
              value={addEtapaId}
              onChange={e => setAddEtapaId(e.target.value)}
              options={etapasDisponiveis.map((e: any) => ({ value: e.id, label: e.nome }))}
              placeholder="Selecione uma etapa..."
            />
          </div>
          <Button onClick={addExisting} disabled={!addEtapaId}>
            <Plus size={14} /> Adicionar
          </Button>
        </div>

        <Table
          headers={['Ordem', 'Etapa', 'Situação', 'Tolerância (dias)', 'Importante', 'Mover', 'Ações']}
          empty={!etapasDoFluxo.length ? 'Nenhuma etapa neste fluxo.' : undefined}
        >
          {etapasDoFluxo.map((e: any, i: number) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-mono text-gray-500">{e.fluxoOrdem || i + 1}</td>
              <td className="px-4 py-2 text-sm font-medium text-gray-800">{e.nome}</td>
              <td className="px-4 py-2 text-sm text-gray-600">{getSituacao(e.situacaoId)}</td>
              <td className="px-4 py-2 text-sm text-gray-600">{e.tolerancia || '—'}</td>
              <td className="px-4 py-2 text-sm">{e.importante ? '⭐' : '—'}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => subir.mutate({ etapaId: e.id, fluxoId })} disabled={i === 0}>
                    <ArrowUp size={13} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => descer.mutate({ etapaId: e.id, fluxoId })} disabled={i === etapasDoFluxo.length - 1}>
                    <ArrowDown size={13} />
                  </Button>
                </div>
              </td>
              <td className="px-4 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Remover "${e.nome}" deste fluxo? (a etapa continua existindo)`)) {
                      desvincular.mutate({ etapaId: e.id, fluxoId })
                    }
                  }}
                >
                  <Trash2 size={13} className="text-red-500" />
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
