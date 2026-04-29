import { Select } from '../../../../components/ui'
import { useProcessoFormContext } from '../ProcessoFormContext'

export function AbaVinculo() {
  const { form, setF, parceiros, corretores, imobiliarias, construtoras, permissoes } = useProcessoFormContext()
  const fn = (k: string) => (e: React.ChangeEvent<any>) => setF(k, Number(e.target.value))

  return (
    <fieldset disabled={permissoes.processoTravadoParaExterno} className="grid grid-cols-2 gap-4 disabled:opacity-80">
      <Select
        label="Parceiro"
        value={form.parceiroId}
        onChange={fn('parceiroId')}
        options={(parceiros || []).map((p: any) => ({ value: p.id, label: p.nome }))}
        placeholder="Selecione..."
      />
      <Select
        label="Corretor"
        value={form.corretorId}
        onChange={fn('corretorId')}
        options={(corretores || []).map((c: any) => ({ value: c.id, label: c.nome }))}
        placeholder="Selecione..."
      />
      <Select
        label="Imobiliária"
        value={form.imobiliariaId}
        onChange={fn('imobiliariaId')}
        options={(imobiliarias || []).map((i: any) => ({ value: i.id, label: i.nome }))}
        placeholder="Selecione..."
      />
      <Select
        label="Construtora"
        value={form.construtoraId}
        onChange={fn('construtoraId')}
        options={(construtoras || []).map((c: any) => ({ value: c.id, label: c.nome }))}
        placeholder="Selecione..."
      />
    </fieldset>
  )
}
