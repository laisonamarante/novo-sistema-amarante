import { Modal, Textarea, Input, Select, Btn } from '../../../components/ui'

export interface TarefaFormState {
  executanteId: number
  solicitacao: string
  dataLimite: string
}

export interface ModalNovaTarefaProps {
  open: boolean
  onClose: () => void
  form: TarefaFormState
  onChangeForm: (updater: (prev: TarefaFormState) => TarefaFormState) => void
  usuariosExecutantes: any[]
  podeCriar: boolean
  loading: boolean
  onCriar: () => void
}

export function ModalNovaTarefa({
  open,
  onClose,
  form,
  onChangeForm,
  usuariosExecutantes,
  podeCriar,
  loading,
  onCriar,
}: ModalNovaTarefaProps) {
  return (
    <Modal title="Nova Tarefa" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Select
          label="Executante *"
          value={form.executanteId}
          onChange={e => onChangeForm(p => ({ ...p, executanteId: Number(e.target.value) }))}
          options={usuariosExecutantes.map((u: any) => ({ value: u.id, label: u.nome }))}
          placeholder="Selecione..."
        />
        <Textarea
          label="Solicitacao *"
          value={form.solicitacao}
          onChange={e => onChangeForm(p => ({ ...p, solicitacao: e.target.value }))}
          rows={4}
          placeholder="Descreva a tarefa..."
        />
        <Input
          label="Data Limite"
          type="date"
          value={form.dataLimite}
          onChange={e => onChangeForm(p => ({ ...p, dataLimite: e.target.value }))}
        />
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {podeCriar && (
            <Btn loading={loading} onClick={onCriar}>Criar Tarefa</Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}
