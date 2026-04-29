import { Modal, Input, Textarea, Btn } from '../../../components/ui'

interface HistoricoForm {
  titulo: string
  descricao: string
}

interface ModalHistoricoProps {
  open: boolean
  onClose: () => void
  form: HistoricoForm
  onChangeForm: (updater: (prev: HistoricoForm) => HistoricoForm) => void
  podeEditar: boolean
  loading: boolean
  onSalvar: () => void
}

export function ModalHistorico({
  open,
  onClose,
  form,
  onChangeForm,
  podeEditar,
  loading,
  onSalvar,
}: ModalHistoricoProps) {
  return (
    <Modal title="Incluir Histórico" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Titulo *"
          value={form.titulo}
          onChange={e => onChangeForm(p => ({ ...p, titulo: e.target.value }))}
          placeholder="Titulo do registro..."
        />
        <Textarea
          label="Descricao *"
          value={form.descricao}
          onChange={e => onChangeForm(p => ({ ...p, descricao: e.target.value }))}
          rows={4}
          placeholder="Descreva..."
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
