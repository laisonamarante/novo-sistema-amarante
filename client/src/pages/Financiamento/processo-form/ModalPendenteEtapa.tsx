import { Modal, Textarea, Btn } from '../../../components/ui'

export interface ModalPendenteEtapaProps {
  open: boolean
  onClose: () => void
  observacao: string
  onChangeObservacao: (valor: string) => void
  podeSalvar: boolean
  loading: boolean
  onSalvar: () => void
}

export function ModalPendenteEtapa({
  open,
  onClose,
  observacao,
  onChangeObservacao,
  podeSalvar,
  loading,
  onSalvar,
}: ModalPendenteEtapaProps) {
  return (
    <Modal title="Deixar Etapa Pendente" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Textarea
          label="Motivo / Observação *"
          value={observacao}
          onChange={e => onChangeObservacao(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo da pendência..."
        />
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {podeSalvar && (
            <Btn
              variant="secondary"
              loading={loading}
              onClick={onSalvar}
              disabled={!observacao.trim()}
            >
              Salvar Pendência
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}
