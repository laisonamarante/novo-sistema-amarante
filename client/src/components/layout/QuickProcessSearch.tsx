import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Edit, MessageSquare, Plus, Search } from 'lucide-react'
import { trpc } from '../../lib/trpc'
import { usePermissoes } from '../../lib/permissoes'
import { Badge, Btn, Modal, Spinner } from '../ui'

function formatDateBr(value: unknown) {
  if (!value) return '—'
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pt-BR')
}

function toDateInput(value: unknown) {
  if (!value) return ''
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function money(value: unknown) {
  const number = Number(value || 0)
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function QuickProcessSearch() {
  const navigate = useNavigate()
  const { isExterno } = usePermissoes()
  const utils = trpc.useUtils()
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [modalBusca, setModalBusca] = useState(false)
  const [processoId, setProcessoId] = useState<number | null>(null)
  const [editandoContrato, setEditandoContrato] = useState(false)
  const [contratoForm, setContratoForm] = useState({
    numProposta: '',
    numContrato: '',
    dataEmissaoContrato: '',
    dataAssinatura: '',
    dataPagtoVendedor: '',
  })
  const [acaoAberta, setAcaoAberta] = useState<'tarefa' | 'atendimento' | 'pendencia' | null>(null)
  const [erroAcao, setErroAcao] = useState('')
  const [tarefaForm, setTarefaForm] = useState({ executanteId: 0, solicitacao: '', dataLimite: '' })
  const [novoAtendimento, setNovoAtendimento] = useState('')
  const [novaPendencia, setNovaPendencia] = useState('')

  const resultados = trpc.processos.listar.useQuery(
    { pagina: 1, busca: buscaAtiva, arquivados: true, reprovados: true },
    { enabled: !!buscaAtiva && !isExterno }
  )
  const processo = trpc.processos.buscar.useQuery(
    { id: processoId || 0 },
    { enabled: !!processoId && !isExterno }
  )
  const usuarios = trpc.cadastros.usuarios.listar.useQuery(undefined, { enabled: !isExterno })
  const atualizar = trpc.processos.atualizar.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      await utils.processos.listar.invalidate()
      setEditandoContrato(false)
      setErroAcao('')
    },
    onError: (err) => setErroAcao(err.message),
  })
  const criarTarefa = trpc.tarefas.criar.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      await utils.tarefas.minhasTarefas.invalidate()
      setAcaoAberta(null)
      setErroAcao('')
      setTarefaForm({ executanteId: 0, solicitacao: '', dataLimite: '' })
    },
    onError: (err) => setErroAcao(err.message),
  })
  const adicionarAtendimento = trpc.processos.adicionarAtendimento.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      setAcaoAberta(null)
      setErroAcao('')
      setNovoAtendimento('')
    },
    onError: (err) => setErroAcao(err.message),
  })
  const registrarPendencia = trpc.processos.registrarPendencia.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      setAcaoAberta(null)
      setErroAcao('')
      setNovaPendencia('')
    },
    onError: (err) => setErroAcao(err.message),
  })

  const lista = resultados.data?.lista || []
  const resumo = lista.find((item: any) => item.id === processoId)
  const detalhe = processo.data as any
  const proponente = detalhe?.compradores?.find((item: any) => item.proponente)?.cliente || detalhe?.compradores?.[0]?.cliente
  const vendedor = detalhe?.vendedores?.[0]?.cliente
  const imovel = detalhe?.imoveis?.[0]?.imovel
  const etapaAtual = detalhe?.etapas?.find((item: any) => !item.etapa?.concluido)
  const usuariosTarefa = getUsuariosTarefa(usuarios.data || [], resumo)

  useEffect(() => {
    if (!detalhe) return
    setContratoForm({
      numProposta: detalhe.numProposta || '',
      numContrato: detalhe.numContrato || '',
      dataEmissaoContrato: toDateInput(detalhe.dataEmissaoContrato),
      dataAssinatura: toDateInput(detalhe.dataAssinatura),
      dataPagtoVendedor: toDateInput(detalhe.dataPagtoVendedor),
    })
  }, [detalhe?.id])

  const pesquisar = () => {
    const termo = busca.trim()
    if (!termo) return
    if (isExterno) {
      navigate(`/financiamento/processos?busca=${encodeURIComponent(termo)}`)
      setBusca('')
      return
    }
    setBuscaAtiva(termo)
    setProcessoId(null)
    setModalBusca(true)
  }

  const salvarContrato = () => {
    if (!processoId) return
    setErroAcao('')
    atualizar.mutate({
      id: processoId,
      numProposta: contratoForm.numProposta || undefined,
      numContrato: contratoForm.numContrato || undefined,
      dataEmissaoContrato: contratoForm.dataEmissaoContrato || undefined,
      dataAssinatura: contratoForm.dataAssinatura || undefined,
      dataPagtoVendedor: contratoForm.dataPagtoVendedor || undefined,
    })
  }

  const salvarTarefa = () => {
    if (!processoId || !tarefaForm.executanteId || !tarefaForm.solicitacao.trim()) return
    setErroAcao('')
    criarTarefa.mutate({
      processoId,
      executanteId: tarefaForm.executanteId,
      solicitacao: tarefaForm.solicitacao.trim(),
      dataLimite: tarefaForm.dataLimite || undefined,
    })
  }

  const salvarAtendimento = () => {
    if (!processoId || !novoAtendimento.trim()) return
    setErroAcao('')
    adicionarAtendimento.mutate({ processoId, descricao: novoAtendimento.trim() })
  }

  const salvarPendencia = () => {
    if (!processoId || !novaPendencia.trim()) return
    setErroAcao('')
    registrarPendencia.mutate({ processoId, descricao: novaPendencia.trim() })
  }

  return (
    <>
      <div className="flex items-center bg-blue-800 rounded px-3 py-1.5 gap-2">
        <Search size={15} className="text-blue-300" />
        <input
          type="text"
          placeholder="Nome, CPF ou processo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pesquisar()}
          className="bg-transparent text-white placeholder-blue-300 text-sm outline-none flex-1 w-full"
        />
      </div>

      <Modal title="Consulta rápida de processo" open={modalBusca} onClose={() => setModalBusca(false)} size="xl">
        <div className="space-y-5">
          {!processoId && (
            <div>
              <h3 className="text-sm font-semibold text-blue-700 mb-3">Processo(s) encontrado(s)</h3>
              {resultados.isLoading && <div className="py-8 flex justify-center"><Spinner /></div>}
              {!resultados.isLoading && lista.length === 0 && (
                <p className="text-sm text-gray-500 bg-gray-50 border rounded-lg p-4">Nenhum processo encontrado para “{buscaAtiva}”.</p>
              )}
              <div className="border rounded-lg divide-y overflow-hidden">
                {lista.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProcessoId(item.id)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 grid grid-cols-[120px_1fr_180px] gap-4 text-sm">
                    <span className="font-bold text-blue-700">#{item.id}</span>
                    <span>
                      <strong>{item.compradorNome || 'Sem proponente'}</strong>
                      <span className="block text-xs text-gray-500">{item.numProposta ? `Proposta ${item.numProposta}` : 'Sem nº proposta'}</span>
                    </span>
                    <span className="text-gray-600">{item.etapaNome || 'Sem etapa atual'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {processoId && (
            <div className="space-y-5">
              {erroAcao && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erroAcao}</div>}
              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setProcessoId(null)} className="text-sm text-blue-600 hover:underline">
                  Voltar aos resultados
                </button>
                <div className="flex items-center gap-3">
                  {!isExterno && (
                    <Btn
                      size="sm"
                      variant="secondary"
                      icon={<AlertTriangle size={13} />}
                      onClick={() => { setAcaoAberta('pendencia'); setErroAcao('') }}>
                      Pendência
                    </Btn>
                  )}
                  <Link to={`/financiamento/processos/${processoId}`} className="text-sm text-blue-600 hover:underline" onClick={() => setModalBusca(false)}>
                    Abrir processo completo
                  </Link>
                </div>
              </div>

              {acaoAberta === 'pendencia' && (
                <ActionPanel title="Registrar pendência" onClose={() => setAcaoAberta(null)}>
                  <QuickTextarea label="Pendência" rows={4} value={novaPendencia} onChange={setNovaPendencia} />
                  <div className="flex justify-end gap-2">
                    <Btn variant="ghost" onClick={() => setAcaoAberta(null)}>Cancelar</Btn>
                    <Btn loading={registrarPendencia.isPending} disabled={!novaPendencia.trim()} onClick={salvarPendencia}>Registrar</Btn>
                  </div>
                </ActionPanel>
              )}

              {processo.isLoading && <div className="py-8 flex justify-center"><Spinner /></div>}
              {!processo.isLoading && detalhe && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <InfoCard title="Dados do Proponente">
                      <Info label="Nome" value={proponente?.nome} />
                      <Info label="CPF/CNPJ" value={proponente?.cpfCnpj} />
                      <Info label="Telefone" value={proponente?.fone1 || proponente?.fone2 || proponente?.fone3} />
                      <Info label="E-mail" value={proponente?.email} />
                    </InfoCard>

                    <InfoCard title="Vínculo">
                      <Info label="Parceiro" value={resumo?.parceiroNome} />
                      <Info label="Corretor" value={resumo?.corretorNome} />
                      <Info label="Imobiliária" value={resumo?.imobiliariaNome} />
                      <Info label="Construtora" value={resumo?.construtoraNome} />
                    </InfoCard>

                    <InfoCard title="Status do Processo">
                      <div className="flex items-center gap-2">
                        <Badge label={detalhe.reprovado ? 'Reprovado' : detalhe.arquivado ? 'Arquivado' : 'Ativo'} />
                        {etapaAtual?.etapaNome && <Badge label={etapaAtual.etapaNome} color="bg-yellow-100 text-yellow-700" />}
                      </div>
                      <Info label="Responsável" value={resumo?.responsavelNome} />
                      <Info label="Criado em" value={formatDateBr(detalhe.criadoEm)} />
                    </InfoCard>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard title="Dados da Operação">
                      <div className="grid grid-cols-2 gap-3">
                        <Info label="Banco" value={resumo?.bancoNome} />
                        <Info label="Agência" value={resumo?.agenciaNome} />
                        <Info label="Modalidade" value={resumo?.modalidadeNome} />
                        <Info label="Valor financiado" value={money(detalhe.valorFinanciado)} />
                        <Info label="Valor compra/venda" value={money(detalhe.valorCompraVenda)} />
                        <Info label="Valor parcela" value={money(detalhe.valorParcela)} />
                      </div>
                    </InfoCard>

                    <InfoCard
                      title="Dados de Contrato"
                      action={<button type="button" onClick={() => setEditandoContrato(v => !v)} className="text-blue-600 hover:text-blue-800"><Edit size={15} /></button>}>
                      {editandoContrato ? (
                        <div className="grid grid-cols-2 gap-3">
                          <QuickInput label="Nº Proposta" value={contratoForm.numProposta} onChange={value => setContratoForm(f => ({ ...f, numProposta: value }))} />
                          <QuickInput label="Nº Contrato" value={contratoForm.numContrato} onChange={value => setContratoForm(f => ({ ...f, numContrato: value }))} />
                          <QuickInput label="Data emissão contrato" type="date" value={contratoForm.dataEmissaoContrato} onChange={value => setContratoForm(f => ({ ...f, dataEmissaoContrato: value }))} />
                          <QuickInput label="Data assinatura" type="date" value={contratoForm.dataAssinatura} onChange={value => setContratoForm(f => ({ ...f, dataAssinatura: value }))} />
                          <QuickInput label="Data pagto vendedor" type="date" value={contratoForm.dataPagtoVendedor} onChange={value => setContratoForm(f => ({ ...f, dataPagtoVendedor: value }))} />
                          <div className="flex items-end gap-2">
                            <Btn size="sm" loading={atualizar.isPending} onClick={salvarContrato}>Salvar</Btn>
                            <Btn size="sm" variant="ghost" onClick={() => setEditandoContrato(false)}>Cancelar</Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <Info label="Nº Proposta" value={detalhe.numProposta} />
                          <Info label="Nº Contrato" value={detalhe.numContrato} />
                          <Info label="Data emissão contrato" value={formatDateBr(detalhe.dataEmissaoContrato)} />
                          <Info label="Data assinatura" value={formatDateBr(detalhe.dataAssinatura)} />
                          <Info label="Data pagto vendedor" value={formatDateBr(detalhe.dataPagtoVendedor)} />
                        </div>
                      )}
                    </InfoCard>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard title="Vendedor">
                      <Info label="Nome" value={vendedor?.nome} />
                      <Info label="CPF/CNPJ" value={vendedor?.cpfCnpj} />
                      <Info label="Telefone" value={vendedor?.fone1 || vendedor?.fone2 || vendedor?.fone3} />
                    </InfoCard>
                    <InfoCard title="Imóvel">
                      <Info label="Endereço" value={imovel?.endereco} />
                      <Info label="Cidade/UF" value={[imovel?.cidade, imovel?.uf].filter(Boolean).join('/')} />
                      <Info label="Matrícula" value={imovel?.matricula} />
                    </InfoCard>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <InfoCard title="Tarefas" action={<Btn size="sm" icon={<Plus size={13} />} onClick={() => { setAcaoAberta('tarefa'); setErroAcao('') }}>Nova</Btn>}>
                      <MiniList items={detalhe.tarefas || []} empty="Nenhuma tarefa" render={(t: any) => (
                        <div>
                          <strong>#{t.id}</strong> {t.solicitacao}
                          <span className="block text-xs text-gray-500">{t.status}</span>
                        </div>
                      )} />
                      {acaoAberta === 'tarefa' && (
                        <ActionPanel title="Nova tarefa" onClose={() => setAcaoAberta(null)}>
                          <QuickSelect
                            label="Executante"
                            value={tarefaForm.executanteId}
                            onChange={value => setTarefaForm(f => ({ ...f, executanteId: Number(value) }))}
                            placeholder="Selecione..."
                            options={usuariosTarefa}
                          />
                          <QuickTextarea label="Solicitação" rows={4} value={tarefaForm.solicitacao} onChange={value => setTarefaForm(f => ({ ...f, solicitacao: value }))} />
                          <QuickInput label="Data limite" type="date" value={tarefaForm.dataLimite} onChange={value => setTarefaForm(f => ({ ...f, dataLimite: value }))} />
                          <div className="flex justify-end gap-2">
                            <Btn variant="ghost" onClick={() => setAcaoAberta(null)}>Cancelar</Btn>
                            <Btn loading={criarTarefa.isPending} disabled={!tarefaForm.executanteId || !tarefaForm.solicitacao.trim()} onClick={salvarTarefa}>Criar tarefa</Btn>
                          </div>
                        </ActionPanel>
                      )}
                    </InfoCard>
                    <InfoCard title="Atendimento" action={<Btn size="sm" icon={<MessageSquare size={13} />} onClick={() => { setAcaoAberta('atendimento'); setErroAcao('') }}>Novo</Btn>}>
                      <MiniList items={detalhe.atendimentos || []} empty="Nenhum atendimento" render={(a: any) => (
                        <div>
                          {a.descricao}
                          <span className="block text-xs text-gray-500">{formatDateBr(a.criadoEm)}</span>
                        </div>
                      )} />
                      {acaoAberta === 'atendimento' && (
                        <ActionPanel title="Novo atendimento" onClose={() => setAcaoAberta(null)}>
                          <QuickTextarea label="Atendimento" rows={4} value={novoAtendimento} onChange={setNovoAtendimento} />
                          <div className="flex justify-end gap-2">
                            <Btn variant="ghost" onClick={() => setAcaoAberta(null)}>Cancelar</Btn>
                            <Btn loading={adicionarAtendimento.isPending} disabled={!novoAtendimento.trim()} onClick={salvarAtendimento}>Salvar</Btn>
                          </div>
                        </ActionPanel>
                      )}
                    </InfoCard>
                    <InfoCard title="Histórico">
                      <MiniList items={detalhe.historico || []} empty="Nenhum histórico" render={(h: any) => (
                        <div>
                          {h.titulo || h.descricao}
                          <span className="block text-xs text-gray-500">{formatDateBr(h.criadoEm)}</span>
                        </div>
                      )} />
                    </InfoCard>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

function ActionPanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-blue-900">{title}</h3>
        <button type="button" onClick={onClose} className="text-blue-600 hover:text-blue-800 text-sm">Fechar</button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function QuickInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </label>
  )
}

function QuickSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: number
  onChange: (value: string) => void
  options: { value: number; label: string }[]
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <select
        value={value || ''}
        onChange={event => onChange(event.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function QuickTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm outline-none bg-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </label>
  )
}

function getUsuariosTarefa(usuarios: any[], processoResumo: any) {
  const idsExternosVinculados = new Set(
    [
      processoResumo?.parceiroUsuarioId,
      processoResumo?.corretorUsuarioId,
      processoResumo?.imobiliariaUsuarioId,
      processoResumo?.construtoraUsuarioId,
    ].filter(Boolean).map(Number)
  )

  return usuarios
    .filter((usuario: any) =>
      ['Administrador', 'Gerente', 'Analista'].includes(usuario.perfil) || idsExternosVinculados.has(Number(usuario.id))
    )
    .map((usuario: any) => ({
      value: usuario.id,
      label: idsExternosVinculados.has(Number(usuario.id)) ? `${usuario.nome} (${usuario.perfil})` : usuario.nome,
    }))
}

function InfoCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-cyan-50 border border-cyan-100 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-bold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  )
}

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <span className="font-semibold text-gray-700">{label}: </span>
      <span className="text-gray-700">{value ? String(value) : '—'}</span>
    </div>
  )
}

function MiniList({ items, empty, render }: { items: any[]; empty: string; render: (item: any) => ReactNode }) {
  const visible = items.slice(0, 5)
  if (!visible.length) return <p className="text-sm text-gray-500">{empty}</p>
  return (
    <div className="space-y-2">
      {visible.map((item) => (
        <div key={item.id} className="bg-white/70 border border-cyan-100 rounded px-3 py-2 text-xs text-gray-700">
          {render(item)}
        </div>
      ))}
    </div>
  )
}
