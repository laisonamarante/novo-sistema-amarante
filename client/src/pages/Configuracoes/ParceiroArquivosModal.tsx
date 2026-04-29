import { useRef, useState } from 'react'
import { trpc } from '../../lib/trpc'
import { getStoredAuthToken } from '../../lib/auth-storage'

interface ParceiroArquivosModalProps {
  parceiroId: number
  onClose: () => void
  somenteLeitura?: boolean
}

export function ParceiroArquivosModal({ parceiroId, onClose, somenteLeitura = false }: ParceiroArquivosModalProps) {
  const lista = trpc.cadastros.parceiros.listarArquivos.useQuery({ parceiroId })
  const excluir = trpc.cadastros.parceiros.excluirArquivo.useMutation({ onSuccess: () => lista.refetch() })
  const registrar = trpc.cadastros.parceiros.registrarArquivo.useMutation({ onSuccess: () => lista.refetch() })
  const [uploading, setUploading] = useState(false)
  const [erroUpload, setErroUpload] = useState('')
  const [arquivoPreview, setArquivoPreview] = useState<{ nome: string; url: string } | null>(null)
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 })
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)
  const previewDragRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  function arquivoUrl(caminho: string) {
    const base = import.meta.env.BASE_URL || '/'
    const token = getStoredAuthToken()
    const cleanPath = caminho?.startsWith('/uploads/') ? caminho.slice(1) : caminho
    return `${base}${cleanPath}?token=${encodeURIComponent(token)}`
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (somenteLeitura) return
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    setErroUpload('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const token = getStoredAuthToken()
      const res = await fetch(import.meta.env.BASE_URL + 'api/upload', { method: 'POST', body: fd, headers: { Authorization: 'Bearer ' + token } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Não foi possível enviar o arquivo.')
      }
      await registrar.mutateAsync({ parceiroId, nomeOriginal: file.name, nomeArquivo: data.filename, caminhoArquivo: data.path, mimeType: file.type, tamanho: file.size })
    } catch (err: any) {
      setErroUpload(err?.message || 'Não foi possível anexar o arquivo.')
    } finally { setUploading(false); e.target.value = '' }
  }

  function abrirArquivo(a: any) {
    setPreviewOffset({ x: 0, y: 0 })
    setArquivoPreview({
      nome: a.nomeOriginal || a.nomeArquivo || 'Arquivo',
      url: arquivoUrl(a.caminhoArquivo),
    })
  }

  function moverPreview(event: PointerEvent) {
    const start = previewDragRef.current
    setPreviewOffset({
      x: start.offsetX + event.clientX - start.x,
      y: start.offsetY + event.clientY - start.y,
    })
  }

  function pararPreview() {
    window.removeEventListener('pointermove', moverPreview)
  }

  function iniciarPreview(event: React.PointerEvent<HTMLDivElement>) {
    previewDragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: previewOffset.x,
      offsetY: previewOffset.y,
    }
    window.addEventListener('pointermove', moverPreview)
    window.addEventListener('pointerup', pararPreview, { once: true })
  }

  function imprimirPreview() {
    previewFrameRef.current?.contentWindow?.focus()
    previewFrameRef.current?.contentWindow?.print()
  }

  function abrirPreviewEmJanela() {
    if (!arquivoPreview) return
    window.open(arquivoPreview.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Arquivos do Parceiro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {!somenteLeitura && (
          <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 cursor-pointer hover:border-blue-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-sm text-gray-600">{uploading ? 'Enviando...' : '📎 Clique para selecionar arquivo'}</span>
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        )}
        {erroUpload && <p className="text-sm text-red-600 mb-3">{erroUpload}</p>}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {lista.isLoading && <p className="text-sm text-gray-500 text-center py-2">Carregando...</p>}
          {!(lista.data||[]).length && !lista.isLoading && <p className="text-sm text-gray-500 text-center py-4">Nenhum arquivo.</p>}
          {(lista.data||[]).map((a:any) => (
            <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
              <button type="button" onClick={() => abrirArquivo(a)} className="text-sm text-blue-600 hover:underline truncate max-w-xs text-left">{a.nomeOriginal}</button>
              {!somenteLeitura && <button onClick={()=>confirm('Excluir arquivo?')&&excluir.mutate({id:a.id})} className="text-red-500 hover:text-red-700 text-xs ml-2 flex-shrink-0">Excluir</button>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded">Fechar</button>
        </div>
      </div>

      {arquivoPreview && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setArquivoPreview(null)} />
          <div
            className="fixed left-1/2 top-1/2 z-10 flex h-[92vh] w-[94vw] max-w-[1400px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-2xl"
            style={{ transform: `translate(calc(-50% + ${previewOffset.x}px), calc(-50% + ${previewOffset.y}px))` }}
          >
            <div
              className="flex cursor-move items-center justify-between gap-3 border-b px-5 py-3"
              onPointerDown={iniciarPreview}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-800">{arquivoPreview.nome}</h2>
                <p className="text-xs text-gray-500">Arraste esta barra para mover a visualização.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={abrirPreviewEmJanela}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Abrir em nova janela
                </button>
                <a
                  href={arquivoPreview.url}
                  download={arquivoPreview.nome}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Baixar
                </a>
                <button
                  type="button"
                  onClick={imprimirPreview}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setArquivoPreview(null)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-xl leading-none text-gray-500 hover:bg-gray-50 hover:text-gray-800">
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-3">
              <iframe
                ref={previewFrameRef}
                title={arquivoPreview.nome}
                src={arquivoPreview.url}
                className="h-full w-full rounded border border-gray-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
