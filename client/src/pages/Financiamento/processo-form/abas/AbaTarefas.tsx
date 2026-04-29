import { Plus } from 'lucide-react'
import { Btn, Badge, Table } from '../../../../components/ui'
import { PROCESSO_FORM_TAREFA_STATUS } from '../constants'
import { formatDateBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  filtroStatusTarefa: string | null
  setFiltroStatusTarefa: (s: string | null) => void
  onAbrirNovaTarefa: () => void
}

export function AbaTarefas({ filtroStatusTarefa, setFiltroStatusTarefa, onAbrirNovaTarefa }: Props) {
  const { processo, getUserName, permissoes } = useProcessoFormContext()
  const { podeCriarTarefa, isExterno, existeTarefaPendente } = permissoes

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-3 text-xs">
          {PROCESSO_FORM_TAREFA_STATUS.map((s) => (
            <button
              key={s || 'todas'}
              onClick={() => setFiltroStatusTarefa(s)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                filtroStatusTarefa === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {s || 'Todas'}
            </button>
          ))}
        </div>
        {podeCriarTarefa && (
          <Btn size="sm" icon={<Plus size={13} />} onClick={onAbrirNovaTarefa}>
            Nova Tarefa
          </Btn>
        )}
      </div>
      {isExterno && existeTarefaPendente && (
        <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Já existe uma tarefa pendente para este processo. O usuário externo só pode abrir uma nova tarefa quando não houver pendência aberta.
        </p>
      )}
      <Table headers={['N', 'Solicitante', 'Tarefa', 'Data', 'Data Limite', 'Executante', 'Status']}>
        {(processo?.data?.tarefas || [])
          .filter((t: any) => !filtroStatusTarefa || t.status === filtroStatusTarefa)
          .map((t: any) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Badge
                  label={String(t.id)}
                  color={
                    t.status === 'Pendente'
                      ? 'bg-yellow-100 text-yellow-700'
                      : t.status === 'Resolvida'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }
                />
              </td>
              <td className="px-4 py-3 text-xs">{getUserName(t.solicitanteId)}</td>
              <td className="px-4 py-3 text-sm max-w-xs">{t.solicitacao}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{formatDateBr(t.criadoEm)}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{t.dataLimite ? formatDateBr(t.dataLimite) : '—'}</td>
              <td className="px-4 py-3 text-xs">{getUserName(t.executanteId)}</td>
              <td className="px-4 py-3">
                <Badge label={t.status} />
              </td>
            </tr>
          ))}
      </Table>
    </div>
  )
}
