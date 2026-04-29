import { Modal, Textarea, Select, Btn } from '../../../components/ui'

export interface ModalConcluirEtapaProps {
  open: boolean
  onClose: () => void
  observacao: string
  onChangeObservacao: (valor: string) => void
  proximoResponsavelId: number
  onChangeProximoResponsavelId: (id: number) => void
  usuariosInternos: any[]
  isExterno: boolean
  podeConcluir: boolean
  loading: boolean
  onConcluir: () => void
}

export function ModalConcluirEtapa({
  open,
  onClose,
  observacao,
  onChangeObservacao,
  proximoResponsavelId,
  onChangeProximoResponsavelId,
  usuariosInternos,
  isExterno,
  podeConcluir,
  loading,
  onConcluir,
}: ModalConcluirEtapaProps) {
  return (
    <Modal title="Concluir Etapa" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Textarea
          label="Observação"
          value={observacao}
          onChange={e => onChangeObservacao(e.target.value)}
          rows={3}
          placeholder="Observação sobre a conclusao..."
        />
        {!isExterno && (
          <Select
            label="Próximo responsável interno *"
            value={proximoResponsavelId}
            onChange={e => onChangeProximoResponsavelId(Number(e.target.value))}
            options={usuariosInternos.map((u: any) => ({ value: u.id, label: u.nome }))}
            placeholder="Selecione quem receberá a tarefa..."
          />
        )}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {podeConcluir && (
            <Btn
              variant="success"
              loading={loading}
              disabled={!isExterno && !proximoResponsavelId}
              onClick={onConcluir}
            >
              Concluir Etapa
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}
