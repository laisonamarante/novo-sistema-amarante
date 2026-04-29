import { useRef, useState } from 'react'

export interface DocumentoPreviewData {
  nome: string
  url: string
}

export interface DocumentoPreviewProps {
  documento: DocumentoPreviewData | null
  onClose: () => void
}

export function DocumentoPreview({ documento, onClose }: DocumentoPreviewProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  if (!documento) return null

  const moverDocumentoPreview = (event: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    setOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    })
  }

  const pararArrasteDocumentoPreview = () => {
    dragRef.current = null
    window.removeEventListener('pointermove', moverDocumentoPreview)
  }

  const iniciarArrasteDocumentoPreview = (event: any) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button,a')) return
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    }
    window.addEventListener('pointermove', moverDocumentoPreview)
    window.addEventListener('pointerup', pararArrasteDocumentoPreview, { once: true })
  }

  const imprimirDocumento = () => {
    const frame = iframeRef.current
    if (!frame?.contentWindow) return
    frame.contentWindow.focus()
    frame.contentWindow.print()
  }

  const abrirDocumentoEmJanela = () => {
    window.open(documento.url, '_blank', 'popup=yes,width=1200,height=900,noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-10 flex h-[92vh] w-[94vw] max-w-[1400px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-2xl"
        style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
      >
        <div
          className="flex cursor-move items-center justify-between gap-3 border-b px-5 py-3"
          onPointerDown={iniciarArrasteDocumentoPreview}
        >
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-800">{documento.nome}</h2>
            <p className="text-xs text-gray-500">Arraste esta barra para mover a visualização.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={abrirDocumentoEmJanela}
              className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Abrir em nova janela
            </button>
            <a
              href={documento.url}
              download={documento.nome}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Baixar
            </a>
            <button
              type="button"
              onClick={imprimirDocumento}
              className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-xl leading-none text-gray-500 hover:bg-gray-50 hover:text-gray-800">
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 p-3">
          <iframe
            ref={iframeRef}
            title={documento.nome}
            src={documento.url}
            className="h-full w-full rounded border border-gray-200 bg-white"
          />
        </div>
      </div>
    </div>
  )
}
