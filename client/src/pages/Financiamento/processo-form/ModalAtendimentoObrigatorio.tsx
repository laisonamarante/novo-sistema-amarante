import { Modal, Textarea, Btn, Alert } from '../../../components/ui'

interface ModalAtendimentoObrigatorioProps {
  open: boolean
  onClose: () => void
  texto: string
  onChangeTexto: (v: string) => void
  loading: boolean
  onSalvar: () => void
}

export function ModalAtendimentoObrigatorio({
  open,
  onClose,
  texto,
  onChangeTexto,
  loading,
  onSalvar,
}: ModalAtendimentoObrigatorioProps) {
  return (
    <Modal title="Registrar atendimento obrigatório" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Alert type="warning" message="Você alterou este processo. Informe o que foi feito antes de sair desta tela." />
        <Textarea
          label="O que foi feito neste processo? *"
          value={texto}
          onChange={e => onChangeTexto(e.target.value)}
          rows={5}
          placeholder="Ex.: Atualizei dados do contrato, conferi documentos, ajustei vínculo do comprador..."
        />
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Continuar na tela</Btn>
          <Btn
            loading={loading}
            disabled={!texto.trim()}
            onClick={onSalvar}
          >
            Registrar e sair
          </Btn>
        </div>
      </div>
    </Modal>
  )
}
