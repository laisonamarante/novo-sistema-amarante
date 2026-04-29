import { Modal, Textarea, Btn } from '../../../components/ui'

export interface ModalNovoAtendimentoProps {
  open: boolean
  onClose: () => void
  valor: string
  onChange: (valor: string) => void
  onSalvar: () => void
  loading: boolean
  podeSalvar: boolean
}

export function ModalNovoAtendimento({
  open,
  onClose,
  valor,
  onChange,
  onSalvar,
  loading,
  podeSalvar,
}: ModalNovoAtendimentoProps) {
  return (
    <Modal title="Novo Atendimento" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Textarea
          label="Descrição"
          value={valor}
          onChange={e => onChange(e.target.value)}
          rows={4}
          placeholder="Registre o atendimento..."
        />
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {podeSalvar && (
            <Btn loading={loading} onClick={onSalvar}>Salvar</Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}
