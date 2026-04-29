import { trpc } from '../../lib/trpc'

interface ParceiroBancosModalProps {
  parceiroId: number
  onClose: () => void
  somenteLeitura?: boolean
}

export function ParceiroBancosModal({ parceiroId, onClose, somenteLeitura = false }: ParceiroBancosModalProps) {
  const lista = trpc.cadastros.parceiros.bancosVinculados.useQuery({ parceiroId })
  const vincular = trpc.cadastros.parceiros.vincularBanco.useMutation({ onSuccess: () => lista.refetch() })
  const desvincular = trpc.cadastros.parceiros.desvincularBanco.useMutation({ onSuccess: () => lista.refetch() })
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Bancos Vinculados ao Parceiro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {lista.isLoading && <p className="text-sm text-gray-500 text-center py-4">Carregando...</p>}
          {(lista.data||[]).map((b:any) => (
            <div key={b.id} className={`flex items-center gap-3 px-3 py-2 rounded ${somenteLeitura ? '' : 'cursor-pointer hover:bg-gray-50'} ${b.vinculado ? 'bg-green-50' : ''}`}
              onClick={somenteLeitura ? undefined : () => b.vinculado ? desvincular.mutate({ parceiroId, bancoId: b.id }) : vincular.mutate({ parceiroId, bancoId: b.id })}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${b.vinculado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                {b.vinculado && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm">{b.nome}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">Fechar</button>
        </div>
      </div>
    </div>
  )
}
