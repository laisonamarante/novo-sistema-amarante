import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Table, Loading, Select } from '../../components/ui'
import { ArrowUp, ArrowDown, Plus, Trash2, ArrowLeft, Save } from 'lucide-react'

export function ConfigurarFluxo() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const fluxoId = Number(id)

  const etapasQuery = trpc.cadastros.etapas.listar.useQuery({ fluxoId })
  const todasEtapas = trpc.cadastros.etapas.listar.useQuery({})
  const situacoesQ = trpc.cadastros.situacoes.listar.useQuery()
  const fluxosQ = trpc.cadastros.fluxos.listar.useQuery()
  const editarEtapa = trpc.cadastros.etapas.editar.useMutation({ onSuccess: () => etapasQuery.refetch() })
  const criarEtapa = trpc.cadastros.etapas.criar.useMutation({ onSuccess: () => etapasQuery.refetch() })
  const excluirEtapa = trpc.cadastros.etapas.excluir.useMutation({ onSuccess: () => etapasQuery.refetch() })

  const fluxo = fluxosQ.data?.find((f: any) => f.id === fluxoId)
  const [addEtapaId, setAddEtapaId] = useState('')

  // Sort by ordem
  const sorted = [...(etapasQuery.data || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
  // Etapas not yet in this fluxo (for adding)
  const available = (todasEtapas.data || []).filter((e: any) => !e.fluxoId || e.fluxoId !== fluxoId)

  function mover(item: any, dir: -1 | 1) {
    const idx = sorted.findIndex((e: any) => e.id === item.id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sorted.length) return
    const other = sorted[newIdx]
    editarEtapa.mutate({ id: item.id, ordem: other.ordem || newIdx })
    editarEtapa.mutate({ id: other.id, ordem: item.ordem || idx })
  }

  function addExisting() {
    if (!addEtapaId) return
    editarEtapa.mutate({ id: Number(addEtapaId), fluxoId, ordem: sorted.length + 1 })
    setAddEtapaId('')
  }

  function getSituacao(id: number | null) {
    if (!id) return '—'
    return situacoesQ.data?.find((s: any) => s.id === id)?.nome || '—'
  }

  if (etapasQuery.isLoading) return <Loading />

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
              options={available.map((e: any) => ({ value: e.id, label: `${e.nome}${e.fluxoId ? ' (outro fluxo)' : ''}` }))}
              placeholder="Selecione uma etapa..."
            />
          </div>
          <Button onClick={addExisting} disabled={!addEtapaId}>
            <Plus size={14} /> Adicionar
          </Button>
        </div>

        <Table
          headers={['Ordem', 'Etapa', 'Situação', 'Tolerância (dias)', 'Importante', 'Mover', 'Ações']}
          empty={!sorted.length ? 'Nenhuma etapa neste fluxo.' : undefined}
        >
          {sorted.map((e: any, i: number) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-mono text-gray-500">{e.ordem || i + 1}</td>
              <td className="px-4 py-2 text-sm font-medium text-gray-800">{e.nome}</td>
              <td className="px-4 py-2 text-sm text-gray-600">{getSituacao(e.situacaoId)}</td>
              <td className="px-4 py-2 text-sm text-gray-600">{e.tolerancia || '—'}</td>
              <td className="px-4 py-2 text-sm">{e.importante ? '⭐' : '—'}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => mover(e, -1)} disabled={i === 0}>
                    <ArrowUp size={13} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => mover(e, 1)} disabled={i === sorted.length - 1}>
                    <ArrowDown size={13} />
                  </Button>
                </div>
              </td>
              <td className="px-4 py-2">
                <Button size="sm" variant="ghost" onClick={() => { if (confirm('Remover esta etapa do fluxo?')) excluirEtapa.mutate({ id: e.id }) }}>
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
