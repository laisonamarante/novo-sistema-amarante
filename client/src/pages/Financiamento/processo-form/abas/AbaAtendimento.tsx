import { MessageSquare } from 'lucide-react'
import { Alert, Btn } from '../../../../components/ui'
import { formatDateTimeBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  atendimentoAlteracaoPendente: boolean
  onAbrirNovoAtendimento: () => void
}

export function AbaAtendimento({ atendimentoAlteracaoPendente, onAbrirNovoAtendimento }: Props) {
  const { processo, getUserName, permissoes } = useProcessoFormContext()

  return (
    <div>
      {atendimentoAlteracaoPendente && (
        <Alert
          type="warning"
          message="Existe uma alteração neste processo aguardando o registro obrigatório do que foi feito."
        />
      )}
      <div className="mb-4 flex justify-end">
        {permissoes.podeEditarDadosProcesso && (
          <Btn size="sm" icon={<MessageSquare size={13} />} onClick={onAbrirNovoAtendimento}>
            Novo Atendimento
          </Btn>
        )}
      </div>
      <div className="space-y-3">
        {(processo?.data?.atendimentos || []).map((a: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">{formatDateTimeBr(a.criadoEm)}</span>
              <span className="text-xs text-gray-400">Usuário: {getUserName(a.usuarioId)}</span>
            </div>
            <p className="text-sm text-gray-700">{a.descricao}</p>
          </div>
        ))}
        {!processo?.data?.atendimentos?.length && (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum atendimento registrado.</p>
        )}
      </div>
    </div>
  )
}
