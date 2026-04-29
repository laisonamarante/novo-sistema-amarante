import { CheckCircle, Upload, FileText, AlertTriangle } from 'lucide-react'
import {
  PROCESSO_FORM_DOCUMENTO_CATEGORIAS_COMPRADOR,
  PROCESSO_FORM_DOCUMENTO_CATEGORIAS_VENDEDOR,
  PROCESSO_FORM_SECOES_DOC,
} from '../constants'
import { filtrarDocumentosPorSecao, formatDateTimeBr } from '../utils'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  docTiposPorFluxo: any[] | undefined
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>, secao?: string, documentoTipoId?: number, clienteId?: number) => void
  onAprovarDoc: (id: number) => void
  onAbrirReprovarModal: (target: { id: number; nome: string }) => void
  onAbrirPreview: (documento: any, nomeAlternativo?: string) => void
  onExcluirDoc: (id: number) => void
}

const sectionTone: Record<string, { border: string; bg: string; title: string; counter: string }> = {
  blue: { border: 'border-blue-200', bg: 'bg-blue-50/70', title: 'text-blue-800', counter: 'bg-blue-100 text-blue-700' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50/70', title: 'text-purple-800', counter: 'bg-purple-100 text-purple-700' },
  green: { border: 'border-green-200', bg: 'bg-green-50/70', title: 'text-green-800', counter: 'bg-green-100 text-green-700' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50/70', title: 'text-orange-800', counter: 'bg-orange-100 text-orange-700' },
}

const getStatusVisual = (uploaded: any) => {
  if (!uploaded) {
    return {
      label: 'Não enviado',
      badge: 'bg-gray-100 text-gray-600',
      file: 'text-gray-500',
      row: 'border-gray-200 bg-white',
      icon: <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-gray-300" />,
    }
  }
  if (uploaded.status === 'aprovado') {
    return {
      label: 'Aprovado',
      badge: 'bg-green-100 text-green-700',
      file: 'text-green-700 hover:text-green-800',
      row: 'border-green-200 bg-green-50/60',
      icon: <CheckCircle size={16} className="mt-0.5 text-green-600" />,
    }
  }
  if (uploaded.status === 'reprovado') {
    return {
      label: 'Reprovado',
      badge: 'bg-red-100 text-red-700',
      file: 'text-red-700 hover:text-red-800',
      row: 'border-red-200 bg-red-50/60',
      icon: <AlertTriangle size={16} className="mt-0.5 text-red-600" />,
    }
  }
  return {
    label: 'Pendente',
    badge: 'bg-yellow-100 text-yellow-700',
    file: 'text-yellow-700 hover:text-yellow-800',
    row: 'border-yellow-200 bg-yellow-50/70',
    icon: <div className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-yellow-500 bg-yellow-100" />,
  }
}

export function AbaDocumentacao({
  docTiposPorFluxo,
  onUploadFile,
  onAprovarDoc,
  onAbrirReprovarModal,
  onAbrirPreview,
  onExcluirDoc,
}: Props) {
  const { isEdicao, form, processo, permissoes } = useProcessoFormContext()
  const { isExterno, isRevisor, podeGerenciarProcesso, podeGerenciarDocumentos } = permissoes

  if (form.fluxoId === 0) {
    return <p className="text-gray-400 text-sm">Selecione uma modalidade para ver os documentos necessários.</p>
  }

  const allDocs = processo.data?.documentos || []

  const getUploadedDoc = (dt: any, clienteId?: number) =>
    allDocs.find((d: any) => d.documentoTipoId === dt.id && (clienteId ? d.clienteId === clienteId : !d.clienteId))

  const docsPorSecao = (secao: string) => filtrarDocumentosPorSecao(allDocs, secao)

  // Render uma linha de documento no checklist
  const renderDocItem = (dt: any, clienteId?: number, cat?: string) => {
    const uploaded = getUploadedDoc(dt, clienteId)
    const statusVisual = getStatusVisual(uploaded)
    const canDelete = !!uploaded && uploaded.status !== 'aprovado' && podeGerenciarDocumentos
    const canReupload = !!uploaded && uploaded.status === 'reprovado' && podeGerenciarDocumentos
    const canUpload = isEdicao && podeGerenciarDocumentos && (!uploaded || canReupload)
    const docCategoria = dt.__documentoCategoria || cat

    return (
      <div
        key={`${docCategoria || 'documento'}-${dt.id}-${clienteId || 0}`}
        className={`rounded-md border px-3 py-2 transition-colors ${canUpload ? 'border-dashed hover:border-blue-300 hover:bg-blue-50/60' : statusVisual.row}`}
        onDragOver={canUpload ? (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('border-blue-500', 'bg-blue-50') } : undefined}
        onDragLeave={canUpload ? (ev) => { ev.currentTarget.classList.remove('border-blue-500', 'bg-blue-50') } : undefined}
        onDrop={canUpload ? (ev) => {
          ev.preventDefault()
          ev.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')
          const droppedFiles = ev.dataTransfer.files
          if (droppedFiles.length > 0) {
            if (uploaded) onExcluirDoc(uploaded.id)
            const fakeInput = { target: { files: droppedFiles, value: '' } } as any
            onUploadFile(fakeInput, docCategoria || 'Formulários', dt.id, clienteId)
          }
        } : undefined}
      >
        <div className="flex items-start gap-2">
          {statusVisual.icon}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 text-[13px] font-medium text-gray-800">
                {dt.ordem}. {dt.nome}
                {dt.obrigatorio && <span className="ml-1 text-red-500">*</span>}
              </span>
              {dt.obrigatorioPrimeiraEtapa && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                  1ª etapa
                </span>
              )}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusVisual.badge}`}>
                {statusVisual.label}
              </span>
            </div>

            {uploaded ? (
              <button
                type="button"
                onClick={() => onAbrirPreview(uploaded, uploaded.status === 'reprovado' ? `${uploaded.nomeArquivo} (reprovado)` : undefined)}
                className={`mt-1 inline-flex max-w-full items-center gap-1 text-left text-xs hover:underline ${statusVisual.file}`}
              >
                <FileText size={13} className="shrink-0" />
                <span className="truncate">{uploaded.nomeArquivo}{uploaded.status === 'reprovado' ? ' (reprovado)' : ''}</span>
              </button>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                {canUpload ? 'Enviar pelo botão ou arrastar o arquivo nesta linha.' : 'Documento ainda não enviado.'}
              </p>
            )}

            {uploaded && uploaded.status === 'reprovado' && uploaded.motivoRecusa && (
              <div className="mt-2 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700">
                <strong>Motivo:</strong> {uploaded.motivoRecusa}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {canUpload && (
              <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                <Upload size={12} />
                {canReupload ? 'Reenviar' : 'Enviar'}
                <input type="file" className="hidden" onChange={(e) => {
                  if (uploaded) onExcluirDoc(uploaded.id)
                  onUploadFile(e, docCategoria || 'Formulários', dt.id, clienteId)
                }} />
              </label>
            )}
            {isEdicao && podeGerenciarProcesso && isRevisor && uploaded?.status === 'pendente' && (
              <>
                <button type="button" onClick={() => onAprovarDoc(uploaded.id)} className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">Aprovar</button>
                <button type="button" onClick={() => onAbrirReprovarModal({ id: uploaded.id, nome: dt.nome })} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Reprovar</button>
              </>
            )}
            {uploaded?.status === 'aprovado' && <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Travado</span>}
            {canDelete && isEdicao && (
              <button type="button" onClick={() => onExcluirDoc(uploaded.id)} className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remover</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Section render: monta cabeçalho + lista de docs com tone
  const renderDocSection = (
    key: string,
    title: string,
    docs: any[],
    options: { clienteId?: number; cat?: string; tone?: keyof typeof sectionTone; subtitle?: string } = {},
  ) => {
    const tone = sectionTone[options.tone || 'blue']
    const enviados = isEdicao ? docs.filter((dt: any) => getUploadedDoc(dt, options.clienteId)).length : 0
    return (
      <section key={key} className={`overflow-hidden rounded-lg border ${tone.border} ${tone.bg}`}>
        <div className="flex items-start justify-between gap-3 border-b border-white/70 px-3 py-2">
          <div className="min-w-0">
            <h4 className={`flex items-center gap-2 text-sm font-semibold ${tone.title}`}>
              <FileText size={15} className="shrink-0" />
              <span className="truncate">{title}</span>
            </h4>
            {options.subtitle && <p className="mt-0.5 text-xs text-gray-500">{options.subtitle}</p>}
          </div>
          {isEdicao && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone.counter}`}>{enviados}/{docs.length} enviados</span>}
        </div>
        <div className="space-y-2 p-3">
          {docs.map((dt: any) => renderDocItem(dt, options.clienteId, options.cat))}
        </div>
      </section>
    )
  }

  // Build checklist data
  const checklistContent = docTiposPorFluxo && docTiposPorFluxo.length > 0 ? (() => {
    const porCategoria: Record<string, any[]> = {}
    docTiposPorFluxo.forEach((dt: any) => {
      const cat = dt.categoria || 'Outros'
      if (!porCategoria[cat]) porCategoria[cat] = []
      porCategoria[cat].push(dt)
    })

    const categoriasAplicaveisPorCliente = (base: 'Comprador' | 'Vendedor', cliente: any, categorias: readonly string[]) => {
      const cpfCnpj = String(cliente?.cpfCnpj || cliente?.cpf_cnpj || '').replace(/\D/g, '')
      const pf = `${base} - Pessoa Física`
      const pj = `${base} - Pessoa Jurídica`
      const categoriaPreferida = cpfCnpj.length > 11 ? pj : cpfCnpj.length > 0 ? pf : ''
      if (categoriaPreferida && porCategoria[categoriaPreferida]?.length) return [categoriaPreferida]
      return categorias.filter((cat) => porCategoria[cat]?.length)
    }

    const documentosDasCategorias = (categorias: string[]) => {
      const vistos = new Set<string>()
      return categorias.flatMap((cat) => (porCategoria[cat] || []).map((dt: any) => ({
        ...dt,
        __documentoCategoria: cat,
      }))).filter((dt: any) => {
        const chave = `${dt.__documentoCategoria}-${dt.id}`
        if (vistos.has(chave)) return false
        vistos.add(chave)
        return true
      })
    }

    const resumoCategorias = (categorias: string[]) =>
      categorias.map((cat) => cat.replace('Comprador - ', '').replace('Vendedor - ', '')).join(' / ')

    const compradores = (processo.data?.compradores || []).map((c: any) => c.cliente).filter((c: any) => c?.id)
    const vendedores = (processo.data?.vendedores || []).map((v: any) => v.cliente).filter((v: any) => v?.id)
    const secoesDocumentos: any[] = []

    if (compradores.length > 0) {
      compradores.forEach((cliente: any) => {
        const categorias = categoriasAplicaveisPorCliente('Comprador', cliente, PROCESSO_FORM_DOCUMENTO_CATEGORIAS_COMPRADOR)
        const docs = documentosDasCategorias(categorias)
        if (docs.length > 0) {
          secoesDocumentos.push(renderDocSection(
            `comprador-${cliente.id}`,
            cliente.nome,
            docs,
            { clienteId: cliente.id, tone: 'blue', subtitle: resumoCategorias(categorias) || 'Comprador' },
          ))
        }
      })
    }

    if (vendedores.length > 0) {
      vendedores.forEach((cliente: any) => {
        const categorias = categoriasAplicaveisPorCliente('Vendedor', cliente, PROCESSO_FORM_DOCUMENTO_CATEGORIAS_VENDEDOR)
        const docs = documentosDasCategorias(categorias)
        if (docs.length > 0) {
          secoesDocumentos.push(renderDocSection(
            `vendedor-${cliente.id}`,
            cliente.nome,
            docs,
            { clienteId: cliente.id, tone: 'purple', subtitle: resumoCategorias(categorias) || 'Vendedor' },
          ))
        }
      })
    }

    if (porCategoria['Imóvel'] && porCategoria['Imóvel'].length > 0 && (form.imoveisIds || []).length > 0) {
      secoesDocumentos.push(renderDocSection('imovel', 'Imóvel', porCategoria['Imóvel'], { cat: 'Imóvel', tone: 'green', subtitle: 'Documentos do imóvel' }))
    }

    if (porCategoria['Formulários'] && porCategoria['Formulários'].length > 0) {
      secoesDocumentos.push(renderDocSection('formularios', 'Formulários', porCategoria['Formulários'], { cat: 'Formulários', tone: 'orange' }))
    }

    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {secoesDocumentos}
        {compradores.length === 0 && vendedores.length === 0 && (form.imoveisIds || []).length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 xl:col-span-2">
            <p className="text-sm text-yellow-700">Adicione compradores, vendedores ou imóveis ao processo para ver os documentos necessários.</p>
          </div>
        )}
      </div>
    )
  })() : null

  return (
    <div>
      {checklistContent}

      {/* Documentos avulsos */}
      {isEdicao && (!docTiposPorFluxo?.length || allDocs.some((d: any) => !d.documentoTipoId)) && (
        <div className="mt-6 border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Documentos avulsos</h4>
            <span className="text-xs text-gray-400">Uploads fora do checklist</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {PROCESSO_FORM_SECOES_DOC.map((secao) => {
              const docs = docsPorSecao(secao)
              const temChecklist = !!docTiposPorFluxo?.length
              if (temChecklist && docs.length === 0) return null
              return (
                <section key={secao} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2">
                    <h5 className="min-w-0 truncate text-xs font-semibold text-gray-600">
                      {secao} <span className="font-normal text-gray-400">({docs.length})</span>
                    </h5>
                    {podeGerenciarDocumentos && (
                      <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                        <Upload size={12} />
                        Upload
                        <input type="file" className="hidden" multiple onChange={(e) => onUploadFile(e, secao)} />
                      </label>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    {docs.length > 0 ? (
                      docs.map((d: any, i: number) => (
                        <div key={d.id || i} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
                          <FileText size={14} className="shrink-0 text-gray-400" />
                          <button type="button" onClick={() => onAbrirPreview(d)} className="min-w-0 flex-1 truncate text-left text-xs text-blue-700 hover:underline">{d.nomeArquivo}</button>
                          <span className="hidden shrink-0 text-[11px] text-gray-400 md:inline">{formatDateTimeBr(d.criadoEm)}</span>
                          {podeGerenciarDocumentos && (!isExterno || d.status !== 'aprovado') && <button type="button" onClick={() => onExcluirDoc(d.id)} className="shrink-0 rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Excluir</button>}
                        </div>
                      ))
                    ) : (
                      <p className="rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-400">
                        Nenhum documento avulso nesta seção.
                      </p>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
