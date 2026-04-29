import { Plus } from 'lucide-react'
import { Btn, Badge, Table } from '../../../../components/ui'
import { formatDateTimeBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  onAbrirIncluirHistorico: () => void
}

export function AbaHistorico({ onAbrirIncluirHistorico }: Props) {
  const { historicoData, permissoes } = useProcessoFormContext()

  return (
    <div>
      <div className="mb-4 flex justify-end no-print">
        {permissoes.podeEditarDadosProcesso && (
          <Btn size="sm" icon={<Plus size={13} />} onClick={onAbrirIncluirHistorico}>
            Incluir Histórico
          </Btn>
        )}
      </div>
      <Table headers={['Data', 'Título / Descrição', 'Etapa', 'Tipo', 'Usuário']}>
        {(historicoData || []).map((h: any, i: number) => (
          <tr key={h.id || i} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTimeBr(h.criadoEm)}</td>
            <td className="px-4 py-3 text-sm">
              {h.titulo && <div className="font-medium text-gray-800">{h.titulo}</div>}
              <div className="text-gray-600 whitespace-pre-line">{h.descricao}</div>
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">{h.etapa || '—'}</td>
            <td className="px-4 py-3">
              <Badge
                label={h.tipo === 'pendencia' ? 'Pendência' : h.tipo === 'pre_analise' ? 'Pré-análise' : 'Histórico'}
                color={
                  h.tipo === 'pendencia'
                    ? 'bg-yellow-100 text-yellow-700'
                    : h.tipo === 'pre_analise'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }
              />
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">{h.usuarioNome || '—'}</td>
          </tr>
        ))}
      </Table>
      {!historicoData?.length && (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum registro no historico.</p>
      )}
    </div>
  )
}
