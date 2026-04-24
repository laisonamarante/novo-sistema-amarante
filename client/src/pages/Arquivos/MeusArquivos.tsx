import { useState, useRef } from 'react'
import { trpc } from '../../lib/trpc'
import { getStoredAuthToken } from '../../lib/auth-storage'
import { PageHeader, Card, Button, Table, Loading } from '../../components/ui'
import { Upload, FileText, Download, Trash2, Eye } from 'lucide-react'

function formatBytes(bytes: number) {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export function MeusArquivos() {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [arquivoPreview, setArquivoPreview] = useState<{ nome: string; url: string } | null>(null)
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)
  const previewDragRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const { data, isLoading, refetch } = trpc.cadastros.arquivos.listar.useQuery()
  const salvar = trpc.cadastros.arquivos.upload.useMutation({ onSuccess: () => refetch() })
  const excluir = trpc.cadastros.arquivos.excluir.useMutation({ onSuccess: () => refetch() })

  function arquivoUrl(caminho?: string) {
    const base = import.meta.env.BASE_URL || '/'
    const token = getStoredAuthToken()
    const cleanPath = caminho?.startsWith('/uploads/') ? caminho.slice(1) : (caminho || '').replace(/^\//, '')
    return `${base}${cleanPath}?token=${encodeURIComponent(token)}`
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
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button,a')) return
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
    window.open(arquivoPreview.url, '_blank', 'popup=yes,width=1200,height=900,noopener,noreferrer')
  }

  async function doUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/upload', {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      const json = await res.json()
      if (json.nomeArquivo || json.filename) {
        await salvar.mutateAsync({
          nomeOriginal: file.name,
          nomeArquivo: json.nomeArquivo || json.filename,
          caminhoArquivo: json.caminhoArquivo || json.path || `/uploads/${json.nomeArquivo || json.filename}`,
          mimeType: file.type || undefined,
          tamanho: file.size || undefined,
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      await doUpload(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (!files.length) return
    Array.from(files).forEach(f => doUpload(f))
  }

  return (
    <div>
      <PageHeader title="Meus Arquivos"
        actions={
          <label className="cursor-pointer">
            <input ref={inputRef} type="file" className="hidden" multiple onChange={handleUpload} />
            <Button loading={uploading} onClick={() => inputRef.current?.click()}><Upload size={14}/> Upload</Button>
          </label>
        } />

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={32} className="mx-auto text-gray-400 mb-2"/>
        <p className="text-sm text-gray-500">Arraste arquivos aqui ou clique para fazer upload</p>
      </div>

      <Card>
        {isLoading ? <Loading/> : (
          <Table headers={['Nome','Tipo','Tamanho','Data','Ações']} empty={!(data as any)?.length ? 'Nenhum arquivo.' : undefined}>
            {(data as any[] || []).map((a: any) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm flex items-center gap-2">
                  <FileText size={16} className="text-gray-400 flex-shrink-0"/>
                  <span className="truncate max-w-xs">{a.nomeOriginal}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{a.mimeType || '--'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(a.tamanho)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{a.criadoEm ? new Date(a.criadoEm).toLocaleDateString('pt-BR') : '--'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirArquivo(a)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Visualizar">
                      <Eye size={14}/>
                    </button>
                    <a
                      href={arquivoUrl(a.caminhoArquivo)}
                      download={a.nomeOriginal}
                      className="text-blue-600 hover:text-blue-800"
                      title="Baixar">
                      <Download size={14}/>
                    </a>
                    <button onClick={() => confirm('Excluir arquivo?') && excluir.mutate({ id: a.id })}
                      className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {arquivoPreview && (
        <div className="fixed inset-0 z-50">
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
                  className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Abrir em nova janela
                </button>
                <a
                  href={arquivoPreview.url}
                  download={arquivoPreview.nome}
                  className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Baixar
                </a>
                <button
                  type="button"
                  onClick={imprimirPreview}
                  className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setArquivoPreview(null)}
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
