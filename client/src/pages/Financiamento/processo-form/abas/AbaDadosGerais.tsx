import { AlertTriangle } from 'lucide-react'
import { Input, Select, Textarea, Btn } from '../../../../components/ui'
import { formatDateTimeBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  perfil: string | undefined
  modalidadeSelecionada: any
  novaPendencia: string
  onChangeNovaPendencia: (v: string) => void
  onRegistrarPendencia: () => void
  registrandoPendencia: boolean
}

export function AbaDadosGerais({
  perfil,
  modalidadeSelecionada,
  novaPendencia,
  onChangeNovaPendencia,
  onRegistrarPendencia,
  registrandoPendencia,
}: Props) {
  const {
    isEdicao,
    form,
    setForm,
    getUserName,
    bancos,
    agencias,
    modalidades,
    modalidadesFiltradas,
    fluxosFiltrados,
    usuarios,
    pendencias,
    permissoes,
  } = useProcessoFormContext()
  const { isExterno, processoTravadoParaExterno, podeEditarDadosProcesso } = permissoes

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm((p: any) => ({ ...p, [k]: e.target.value }))
  const fn = (k: string) => (e: React.ChangeEvent<any>) => setForm((p: any) => ({ ...p, [k]: Number(e.target.value) }))

  return (
    <div>
      <fieldset disabled={processoTravadoParaExterno} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 disabled:opacity-80">
        <Select label="Banco" value={form.bancoId} onChange={fn('bancoId')}
          options={(bancos || []).map((b: any) => ({ value: b.id, label: b.nome }))} placeholder="Selecione..." />
        <Select label="Agência" value={form.agenciaId} onChange={fn('agenciaId')}
          options={(agencias || []).map((a: any) => ({ value: a.id, label: a.nome }))} placeholder="Selecione..." />
        <Select label="Modalidade" value={form.modalidadeId} onChange={(e: React.ChangeEvent<any>) => {
            const modId = Number(e.target.value)
            const mod = modalidadesFiltradas.find((m: any) => m.id === modId)
            setForm((p: any) => ({ ...p, modalidadeId: modId, fluxoId: mod?.fluxoId || 0 }))
          }}
          options={modalidadesFiltradas.map((m: any) => ({ value: m.id, label: m.nome }))} placeholder={form.bancoId ? 'Selecione...' : 'Escolha um banco primeiro'} disabled={!form.bancoId} />
        <Select label="Fluxo" value={form.fluxoId} onChange={fn('fluxoId')}
          options={fluxosFiltrados.map((flx: any) => ({ value: flx.id, label: flx.nome }))} placeholder={modalidadeSelecionada ? 'Selecionado pela modalidade' : 'Escolha uma modalidade'} disabled />
        <Input
          label="Encaminhamento"
          value={form.encaminhamento || 'Não definido no banco'}
          disabled
          hint="Definido automaticamente pelo banco selecionado"
        />
        {isExterno ? (
          <Input
            label="Responsável"
            value={form.responsavelId ? getUserName(form.responsavelId) : 'Definido internamente'}
            disabled
            hint="O responsável é definido pela equipe interna da Amarante."
          />
        ) : (
          <Select label="Responsável" value={form.responsavelId} onChange={fn('responsavelId')}
            options={(usuarios || []).filter((u: any) => ['Administrador', 'Gerente', 'Analista'].includes(u.perfil)).map((u: any) => ({ value: u.id, label: u.nome }))} placeholder="Selecione..." />
        )}
        {!isExterno && (
          <>
            <Input label="Data emissão Contrato" type="date" value={form.dataEmissaoContrato} onChange={f('dataEmissaoContrato')} />
            <Input label="Data de Assinatura" type="date" value={form.dataAssinatura} onChange={f('dataAssinatura')} />
            <Input label="Data pagto Vendedor" type="date" value={form.dataPagtoVendedor} onChange={f('dataPagtoVendedor')} />
            <Input label="Nº Proposta" value={form.numProposta} onChange={f('numProposta')} />
            <Input label="Nº Contrato" value={form.numContrato} onChange={f('numContrato')} />
          </>
        )}
        {perfil === 'Administrador' && <Input label="Data Remuneração" type="date" value={form.dataRemuneracao} onChange={f('dataRemuneracao')} />}
        {perfil === 'Administrador' && <Input label="Data Pagamento de Comissão" type="date" value={form.dataPagtoComissao} onChange={f('dataPagtoComissao')} />}
        {!isExterno && <Textarea label="Observação" value={form.observacao} onChange={f('observacao')} rows={3} className="xl:col-span-3 md:col-span-2" />}
        {!isExterno && (
          <div className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" id="reprovado" checked={form.reprovado} onChange={(e) => setForm((p: any) => ({ ...p, reprovado: e.target.checked }))} className="rounded" />
            <label htmlFor="reprovado" className="text-sm text-gray-700">Processo Reprovado</label>
          </div>
        )}
      </fieldset>

      {/* Pendências */}
      {isEdicao && !isExterno && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-yellow-500" />
            Pendencias
          </h3>
          {podeEditarDadosProcesso && (
            <div className="flex gap-2 mb-3">
              <Textarea value={novaPendencia} onChange={(e) => onChangeNovaPendencia(e.target.value)}
                placeholder="Descreva a pendencia..." rows={2} className="flex-1" />
              <Btn size="sm" variant="secondary" loading={registrandoPendencia}
                onClick={onRegistrarPendencia}
                disabled={!novaPendencia.trim()}>
                Registrar
              </Btn>
            </div>
          )}
          {pendencias.length > 0 && (
            <div className="space-y-2">
              {pendencias.map((p: any, i: number) => (
                <div key={p.id || i} className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-gray-700">{p.descricao}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatDateTimeBr(p.criadoEm)}</span>
                  </div>
                  {p.usuarioNome && <span className="text-xs text-gray-400">por {p.usuarioNome}</span>}
                </div>
              ))}
            </div>
          )}
          {pendencias.length === 0 && <p className="text-gray-400 text-xs">Nenhuma pendencia registrada.</p>}
        </div>
      )}
    </div>
  )
}
