import { useState, useRef } from 'react'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Table, Loading } from '../../components/ui'
import { Upload, FileText, Download, Trash2, File } from 'lucide-react'

function formatBytes(bytes: number) {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export function MeusArquivos() {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading, refetch } = trpc.cadastros.arquivos.listar.useQuery()
  const salvar = trpc.cadastros.arquivos.upload.useMutation({ onSuccess: () => refetch() })
  const excluir = trpc.cadastros.arquivos.excluir.useMutation({ onSuccess: () => refetch() })

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
                    <a href={`${import.meta.env.BASE_URL}${a.caminhoArquivo?.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"><Download size={14}/></a>
                    <button onClick={() => confirm('Excluir arquivo?') && excluir.mutate({ id: a.id })}
                      className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
