import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { Plus } from 'lucide-react'

interface FluxoEtapasModalProps {
  fluxoId: number
  onClose: () => void
}

export function FluxoEtapasModal({ fluxoId, onClose }: FluxoEtapasModalProps) {
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const lista = trpc.cadastros.fluxos.listarEtapas.useQuery({ fluxoId })
  const situacoesList = trpc.cadastros.situacoes.listar.useQuery()
  const vincular = trpc.cadastros.fluxos.vincularEtapa.useMutation({ onSuccess: () => { lista.refetch(); setFiltroEtapa('') } })
  const desvincular = trpc.cadastros.fluxos.desvincularEtapa.useMutation({ onSuccess: () => lista.refetch() })
  const subir = trpc.cadastros.fluxos.subirOrdemEtapa.useMutation({ onSuccess: () => lista.refetch() })
  const descer = trpc.cadastros.fluxos.descerOrdemEtapa.useMutation({ onSuccess: () => lista.refetch() })
  const vinculadas = (lista.data||[]).filter((e:any) => e.vinculado).sort((a:any,b:any) => (a.fluxoOrdem||0) - (b.fluxoOrdem||0))
  const disponiveis = (lista.data||[]).filter((e:any) => !e.vinculado)
  const filtradas = disponiveis.filter((e:any) => {
    if (filtroSituacao && String(e.situacaoId) !== filtroSituacao) return false
    return true
  })
  const fluxoData = trpc.cadastros.fluxos.listar.useQuery()
  const fluxoNome = (fluxoData.data||[]).find((f:any) => f.id === fluxoId)?.nome || ''
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" style={{maxHeight:'90vh'}}>
        <div className="flex items-center justify-between p-4 border-b rounded-t-lg" style={{background:'#e8f0fe'}}>
          <div className="flex items-center gap-2">
            <span className="text-orange-600 text-lg">\🔧</span>
            <h3 className="font-semibold text-blue-800 text-sm">Configurar Fluxo: {fluxoNome}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Situação</label>
              <select value={filtroSituacao} onChange={e=>{setFiltroSituacao(e.target.value);setFiltroEtapa('')}} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Todas</option>
                {(situacoesList.data||[]).map((s:any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
              <select value={filtroEtapa} onChange={e=>setFiltroEtapa(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Selecione...</option>
                {filtradas.map((e:any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <button onClick={()=>{if(filtroEtapa) { vincular.mutate({ etapaId: Number(filtroEtapa), fluxoId }); }}} disabled={!filtroEtapa || vincular.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50 whitespace-nowrap flex items-center gap-1">
              <Plus size={14}/> Adicionar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{background:'#b8d4e3'}}>
                <th className="px-2 py-2 text-left w-24"></th>
                <th className="px-2 py-2 text-left font-semibold">Etapa</th>
                <th className="px-2 py-2 text-center w-16 font-semibold">Ordem</th>
              </tr>
            </thead>
            <tbody>
              {vinculadas.length === 0 && (
                <tr><td colSpan={3} className="text-center text-gray-400 text-sm py-6">Nenhuma etapa vinculada.</td></tr>
              )}
              {vinculadas.map((e:any, idx:number) => (
                <tr key={e.id} className={`border-b ${idx%2===0?'bg-white':'bg-gray-50'} hover:bg-blue-50`}>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>subir.mutate({etapaId:e.id,fluxoId})} disabled={idx===0} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Subir">&#9650;</button>
                      <button onClick={()=>descer.mutate({etapaId:e.id,fluxoId})} disabled={idx===vinculadas.length-1} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Descer">&#9660;</button>
                      <button onClick={()=>confirm('Remover etapa?')&&desvincular.mutate({etapaId:e.id,fluxoId})} className="text-red-400 hover:text-red-600 text-sm ml-1" title="Remover">&#128465;</button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">{e.nome}</td>
                  <td className="px-2 py-1.5 text-gray-600 text-center">{e.fluxoOrdem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t flex justify-end">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">Fechar</button>
        </div>
      </div>
    </div>
  )
}
