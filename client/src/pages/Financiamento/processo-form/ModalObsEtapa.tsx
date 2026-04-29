import { Modal, Textarea, Btn } from '../../../components/ui'

interface ModalObsEtapaProps {
  open: boolean
  onClose: () => void
  observacao: string
  onChangeObservacao: (v: string) => void
  podeEditar: boolean
  loading: boolean
  onSalvar: () => void
}

export function ModalObsEtapa({
  open,
  onClose,
  observacao,
  onChangeObservacao,
  podeEditar,
  loading,
  onSalvar,
}: ModalObsEtapaProps) {
  return (
    <Modal title="Observação da Etapa" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Textarea
          label="Observação"
          value={observacao}
          onChange={e => onChangeObservacao(e.target.value)}
          rows={4}
          placeholder="Adicione uma observacao..."
        />
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {podeEditar && (
            <Btn loading={loading} onClick={onSalvar}>
              Salvar
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}
