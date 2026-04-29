export interface ReprovarTargetDocumento {
  id: number
  nome: string
}

export interface ModalReprovarDocumentoProps {
  target: ReprovarTargetDocumento | null
  motivo: string
  onChangeMotivo: (valor: string) => void
  onClose: () => void
  onReprovar: () => void
  podeReprovar: boolean
  loading: boolean
}

export function ModalReprovarDocumento({
  target,
  motivo,
  onChangeMotivo,
  onClose,
  onReprovar,
  podeReprovar,
  loading,
}: ModalReprovarDocumentoProps) {
  if (!target) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
          <span>❌</span> Reprovar Documento
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Documento: <strong>{target.nome}</strong>
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da recusa *</label>
        <textarea
          value={motivo}
          onChange={e => onChangeMotivo(e.target.value)}
          placeholder="Descreva o motivo da recusa..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onReprovar}
            disabled={!podeReprovar || !motivo.trim() || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm disabled:opacity-50"
          >
            Reprovar
          </button>
        </div>
      </div>
    </div>
  )
}
