import { useState } from 'react'
import { trpc } from '../../lib/trpc'

interface ModalidadesVinculadasProps {
  bancoId: number
  onClose: () => void
}

export function ModalidadesVinculadas({ bancoId, onClose }: ModalidadesVinculadasProps) {
  const [selMod, setSelMod] = useState('')
  const vinculadas = trpc.cadastros.bancos.modalidadesVinculadas.useQuery({ bancoId })
  const vincular = trpc.cadastros.bancos.vincularModalidade.useMutation({ onSuccess: () => { vinculadas.refetch(); setSelMod('') } })
  const desvincular = trpc.cadastros.bancos.desvincularModalidade.useMutation({ onSuccess: () => vinculadas.refetch() })
  const todasMod = trpc.cadastros.modalidades.listar.useQuery()
  const lista = vinculadas.data || []
  const vinculadasIds = lista.map((v:any) => v.modalidadeId)
  const disponiveis = (todasMod.data || []).filter((m:any) => !vinculadasIds.includes(m.id))
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Modalidades Vinculadas ao Banco</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex gap-2 mb-4">
          <select value={selMod} onChange={e=>setSelMod(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm">
            <option value="">Selecione uma modalidade...</option>
            {disponiveis.map((m:any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <button onClick={()=>selMod && vincular.mutate({ bancoId, modalidadeId: Number(selMod) })} disabled={!selMod || vincular.isPending} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">Vincular</button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {lista.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma modalidade vinculada.</p>}
          {lista.map((v:any) => (
            <div key={v.modalidadeId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
              <span className="text-sm">{v.modalidadeNome}</span>
              <button onClick={()=>desvincular.mutate({ bancoId, modalidadeId: v.modalidadeId })} className="text-red-500 hover:text-red-700 text-xs">Remover</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
