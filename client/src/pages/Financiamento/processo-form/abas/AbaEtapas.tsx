import { CheckCircle } from 'lucide-react'
import { Btn, Table } from '../../../../components/ui'
import { formatDateTimeBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface EtapaTarget {
  processoId: number
  etapaId: number
}

interface Props {
  onAbrirConcluir: (target: EtapaTarget) => void
  onAbrirPendente: (target: EtapaTarget, observacaoAtual: string) => void
  onAbrirObs: (target: EtapaTarget, observacaoAtual: string) => void
  onReabrirEtapa: (target: EtapaTarget, etapaNome: string) => void
}

export function AbaEtapas({ onAbrirConcluir, onAbrirPendente, onAbrirObs, onReabrirEtapa }: Props) {
  const { id, isEdicao, processo, getUserName, permissoes } = useProcessoFormContext()
  const { isExterno, podeGerenciarProcesso } = permissoes

  const etapasProcesso = processo.data?.etapas || []

  if (!isEdicao) {
    return <p className="text-gray-400 text-sm">Salve o processo primeiro para ver as etapas.</p>
  }

  const idxAtual = etapasProcesso.findIndex((e: any) => !e.etapa.concluido)
  const idxReabrivel = idxAtual === -1 ? etapasProcesso.length - 1 : idxAtual - 1

  return (
    <div>
      <Table headers={['', 'Etapa', 'Observação', 'Início', 'Término', 'Dias', 'Usuário', 'Ações']}>
        {etapasProcesso.map((e: any, i: number) => {
          const isConcluida = !!e.etapa.concluido
          const isAtual = i === idxAtual
          const isFutura = idxAtual >= 0 && i > idxAtual
          const canReabrir = !isExterno && isConcluida && i === idxReabrivel
          const canConcluirInterno = !isExterno && isAtual && podeGerenciarProcesso
          const canConcluirExterno = isExterno && isAtual && i === 0
          const canMarcarPendente = !isExterno && isAtual && podeGerenciarProcesso
          const canGerenciarObs = !isExterno && (isConcluida || isAtual)
          const rowClass = isConcluida
            ? 'bg-green-50/30 hover:bg-green-50'
            : isAtual
              ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
              : 'text-gray-400 hover:bg-gray-50'
          const target: EtapaTarget = { processoId: Number(id), etapaId: e.etapa.etapaId }
          return (
            <tr key={i} className={rowClass}>
              <td className="px-4 py-3">
                {isConcluida
                  ? <CheckCircle size={16} className="text-green-500" />
                  : isAtual
                    ? <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              </td>
              <td className={`px-4 py-3 font-medium text-sm ${isAtual ? 'text-yellow-900 font-bold' : ''}`}>
                {i + 1}. {e.etapaNome}
                {isAtual && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">ATUAL</span>}
                {isFutura && <span className="ml-2 text-xs text-gray-400">(bloqueada)</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{e.etapa.observacao || ''}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.iniciado ? formatDateTimeBr(e.etapa.iniciado) : ''}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.concluido ? formatDateTimeBr(e.etapa.concluido) : ''}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{e.etapa.diasDecorridos || 0}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{isConcluida ? getUserName(e.etapa.usuarioId) : '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {(canConcluirInterno || canConcluirExterno) && (
                    <Btn size="sm" variant="success" onClick={() => onAbrirConcluir(target)}>
                      Concluir
                    </Btn>
                  )}
                  {canMarcarPendente && (
                    <Btn size="sm" variant="secondary" onClick={() => onAbrirPendente(target, e.etapa.observacao || '')}>
                      Pendente
                    </Btn>
                  )}
                  {canReabrir && (
                    <Btn size="sm" variant="danger" onClick={() => onReabrirEtapa(target, e.etapaNome)}>
                      Reabrir
                    </Btn>
                  )}
                  {canGerenciarObs && (
                    <Btn size="sm" variant="ghost" onClick={() => onAbrirObs(target, e.etapa.observacao || '')}>
                      Obs
                    </Btn>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
