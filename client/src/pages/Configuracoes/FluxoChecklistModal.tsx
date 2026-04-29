import { useState } from 'react'
import { trpc } from '../../lib/trpc'

interface FluxoChecklistModalProps {
  fluxoId: number
  fluxoNome: string
  onClose: () => void
}

export function FluxoChecklistModal({ fluxoId, fluxoNome, onClose }: FluxoChecklistModalProps) {
  const [catTab, setCatTab] = useState('Comprador')
  const [subTab, setSubTab] = useState('Pessoa Física')
  const [selDoc, setSelDoc] = useState('')
  const hasSubTab = catTab === 'Comprador' || catTab === 'Vendedor'
  const categoria = hasSubTab ? `${catTab} - ${subTab}` : catTab
  const checklist = trpc.cadastros.fluxos.listarChecklist.useQuery({ fluxoId, categoria })
  const todosDoc = trpc.cadastros.documentosTipos.listar.useQuery()
  const adicionar = trpc.cadastros.fluxos.adicionarDocChecklist.useMutation({ onSuccess: () => { checklist.refetch(); setSelDoc('') } })
  const definirObrigatorioPrimeiraEtapa = trpc.cadastros.fluxos.definirObrigatorioPrimeiraEtapaDoc.useMutation({ onSuccess: () => checklist.refetch() })
  const remover = trpc.cadastros.fluxos.removerDocChecklist.useMutation({ onSuccess: () => checklist.refetch() })
  const subir = trpc.cadastros.fluxos.subirOrdemDoc.useMutation({ onSuccess: () => checklist.refetch() })
  const descer = trpc.cadastros.fluxos.descerOrdemDoc.useMutation({ onSuccess: () => checklist.refetch() })
  const docs = checklist.data || []
  const jaVinculados = new Set(docs.map((d:any) => d.documentoTipoId))
  const disponiveis = (todosDoc.data || []).filter((d:any) => !jaVinculados.has(d.id))
  const nextOrdem = docs.length > 0 ? Math.max(...docs.map((d:any) => Number(d.ordem)||0)) + 1 : 1
  function changeTab(cat:string) { setCatTab(cat); setSubTab('Pessoa Física'); setSelDoc('') }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" style={{maxHeight:'90vh'}}>
        <div className="flex items-center justify-between p-4 border-b rounded-t-lg" style={{background:'#e8f0fe'}}>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 text-lg">&#128196;</span>
            <h3 className="font-semibold text-blue-800 text-sm">CheckList de Documenta&#231;&#227;o do Fluxo: {fluxoNome}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="border-b px-4 bg-white">
          <div className="flex">
            {['Comprador','Vendedor','Imóvel','Formulários'].map(cat => (
              <button key={cat} onClick={()=>changeTab(cat)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px font-medium ${catTab===cat ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        {hasSubTab && (
          <div className="border-b px-4" style={{background:'#f8f9fa'}}>
            <div className="flex">
              {['Pessoa Física','Pessoa Jurídica'].map(sub => (
                <button key={sub} onClick={()=>{setSubTab(sub);setSelDoc('')}}
                  className={`px-4 py-1.5 text-sm border-b-2 -mb-px ${subTab===sub ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{background:'#b8d4e3'}}>
                <th className="px-2 py-2 text-left w-20"></th>
                <th className="px-2 py-2 text-left w-16"></th>
                <th className="px-2 py-2 text-left w-16 font-semibold">Ordem</th>
                <th className="px-2 py-2 text-left font-semibold">Documento</th>
                <th className="px-2 py-2 text-center w-32 font-semibold">1ª etapa</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 text-sm py-6">Nenhum documento vinculado.</td></tr>
              )}
              {docs.map((doc:any, idx:number) => (
                <tr key={doc.id} className={`border-b ${idx%2===0?'bg-white':'bg-gray-50'} hover:bg-blue-50`}>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>confirm('Remover documento?')&&remover.mutate({id:doc.id})} className="text-red-400 hover:text-red-600 text-sm" title="Remover">&#128465;</button>
                    </div>
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button onClick={()=>subir.mutate({id:doc.id,fluxoId,categoria})} disabled={idx===0} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Subir">&#9650;</button>
                      <button onClick={()=>descer.mutate({id:doc.id,fluxoId,categoria})} disabled={idx===docs.length-1} className="text-gray-500 hover:text-gray-800 disabled:opacity-20 text-sm px-0.5" title="Descer">&#9660;</button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 text-center">{doc.ordem}</td>
                  <td className="px-2 py-1.5">{doc.docNome}</td>
                  <td className="px-2 py-1.5 text-center">
                    <label className="inline-flex items-center justify-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!doc.obrigatorioPrimeiraEtapa}
                        onChange={e => definirObrigatorioPrimeiraEtapa.mutate({ id: doc.id, obrigatorioPrimeiraEtapa: e.target.checked })}
                        className="rounded"
                      />
                      Obrigatório
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-4 items-end">
            <div className="flex-1">
              <select value={selDoc} onChange={e=>setSelDoc(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Selecione um documento para vincular...</option>
                {disponiveis.map((d:any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <button onClick={()=>selDoc && adicionar.mutate({ fluxoId, documentoTipoId: Number(selDoc), categoria, ordem: nextOrdem, obrigatorioPrimeiraEtapa: false })}
              disabled={!selDoc || adicionar.isPending} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50 whitespace-nowrap">Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
