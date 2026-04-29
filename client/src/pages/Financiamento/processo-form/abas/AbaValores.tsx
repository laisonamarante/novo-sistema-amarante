import { Input } from '../../../../components/ui'
import { PROCESSO_FORM_INTERNAL_ONLY_FIELDS } from '../constants'
import { formatCurrencyBr, formatDecimalBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

export function AbaValores() {
  const { form, setForm, setF, permissoes } = useProcessoFormContext()
  const { isExterno, processoTravadoParaExterno } = permissoes

  const fc = (k: string) => (e: React.ChangeEvent<any>) => setF(k, e.target.value)
  const fn = (k: string) => (e: React.ChangeEvent<any>) => setF(k, Number(e.target.value))
  const fp = (k: string) => (e: React.ChangeEvent<any>) => setF(k, e.target.value)
  const formatarCampoMoeda = (k: string) => () =>
    setForm((p: any) => ({ ...p, [k]: formatCurrencyBr((p as any)[k]) }))
  const formatarCampoPercentual = (k: string) => () =>
    setForm((p: any) => ({ ...p, [k]: formatDecimalBr((p as any)[k]) }))
  const campoInternoSomenteLeitura = (k: string) =>
    isExterno && (PROCESSO_FORM_INTERNAL_ONLY_FIELDS as readonly string[]).includes(k)
  const campoDesabilitado = (k: string) => processoTravadoParaExterno || campoInternoSomenteLeitura(k)

  return (
    <fieldset
      disabled={processoTravadoParaExterno}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 disabled:opacity-80"
    >
      <Input label="Valor de Compra e Venda" value={form.valorCompraVenda} onChange={fc('valorCompraVenda')} onBlur={formatarCampoMoeda('valorCompraVenda')} />
      <Input label="Valor da Avaliação" value={form.valorAvaliacao} onChange={fc('valorAvaliacao')} onBlur={formatarCampoMoeda('valorAvaliacao')} disabled={campoDesabilitado('valorAvaliacao')} hint={campoInternoSomenteLeitura('valorAvaliacao') ? 'Uso interno' : undefined} />
      <Input label="Valor Recurso Próprio" value={form.valorRecursoProprio} onChange={fc('valorRecursoProprio')} onBlur={formatarCampoMoeda('valorRecursoProprio')} />
      <Input label="Valor do Subsídio" value={form.valorSubsidio} onChange={fc('valorSubsidio')} onBlur={formatarCampoMoeda('valorSubsidio')} disabled={campoDesabilitado('valorSubsidio')} hint={campoInternoSomenteLeitura('valorSubsidio') ? 'Uso interno' : undefined} />
      <Input label="Valor FGTS" value={form.valorFgts} onChange={fc('valorFgts')} onBlur={formatarCampoMoeda('valorFgts')} />
      <Input label="Valor do IQ" value={form.valorIq} onChange={fc('valorIq')} onBlur={formatarCampoMoeda('valorIq')} />
      <Input label="Valor Financiado" value={form.valorFinanciado} onChange={fc('valorFinanciado')} onBlur={formatarCampoMoeda('valorFinanciado')} />
      <Input label="Valor da Parcela" value={form.valorParcela} onChange={fc('valorParcela')} onBlur={formatarCampoMoeda('valorParcela')} disabled={campoDesabilitado('valorParcela')} hint={campoInternoSomenteLeitura('valorParcela') ? 'Uso interno' : undefined} />
      <Input label="Número de Parcelas" type="number" value={form.numeroParcelas} onChange={fn('numeroParcelas')} />
      <Input label="Taxa de Juros" value={form.taxa} onChange={fp('taxa')} onBlur={formatarCampoPercentual('taxa')} placeholder="Ex: 8,50" disabled={campoDesabilitado('taxa')} hint={campoInternoSomenteLeitura('taxa') ? 'Uso interno' : undefined} />
      {!isExterno && (
        <Input label="Valor Despesas (R$)" value={form.valorDespesas} onChange={fc('valorDespesas')} onBlur={formatarCampoMoeda('valorDespesas')} />
      )}
      <Input label="Comissão (%)" value={form.remuneracaoPerc} onChange={fp('remuneracaoPerc')} onBlur={formatarCampoPercentual('remuneracaoPerc')} disabled={campoDesabilitado('remuneracaoPerc')} hint={campoInternoSomenteLeitura('remuneracaoPerc') ? 'Uso interno' : 'Percentual sobre valor financiado'} />
      <Input label="Comissão (R$)" value={form.remuneracaoValor} onChange={fc('remuneracaoValor')} onBlur={formatarCampoMoeda('remuneracaoValor')} disabled={campoDesabilitado('remuneracaoValor')} hint={campoInternoSomenteLeitura('remuneracaoValor') ? 'Uso interno' : 'Calculado automaticamente'} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Tipo Amortização</label>
        <div className="flex gap-4 items-center h-10">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipoAmortizacao"
              value="SAC"
              checked={form.tipoAmortizacao === 'SAC'}
              onChange={() => setForm((p: any) => ({ ...p, tipoAmortizacao: 'SAC' }))}
              className="text-blue-600"
            />
            SAC
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipoAmortizacao"
              value="PRICE"
              checked={form.tipoAmortizacao === 'PRICE'}
              onChange={() => setForm((p: any) => ({ ...p, tipoAmortizacao: 'PRICE' }))}
              className="text-blue-600"
            />
            PRICE
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Situação do Imóvel</label>
        <div className="flex gap-4 items-center h-10">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipoImovel"
              value="Novo"
              checked={form.tipoImovel === 'Novo'}
              onChange={() => setForm((p: any) => ({ ...p, tipoImovel: 'Novo' }))}
              className="text-blue-600"
            />
            Novo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipoImovel"
              value="Usado"
              checked={form.tipoImovel === 'Usado'}
              onChange={() => setForm((p: any) => ({ ...p, tipoImovel: 'Usado' }))}
              className="text-blue-600"
            />
            Usado
          </label>
        </div>
      </div>
    </fieldset>
  )
}
