import logoAmarante from '../../../assets/logo-amarante-branca.png'
import { formatCpfCnpj } from '../../../lib/documento'
import { formatCurrencyBr, formatDateBr, formatDateTimeBr } from './utils'

export interface RelatorioImpressaoProps {
  id: string | undefined
  form: any
  isExterno: boolean
  bancoRelatorio: any
  agenciaRelatorio: any
  modalidadeRelatorio: any
  situacaoProcessoRelatorio: string
  etapaAtualRelatorio: string
  compradorData: any[]
  vendedorData: any[]
  imovelData: any[]
  pendencias: any[]
  tarefasAbertas: any[]
  getUserName: (uid: number | null | undefined) => string
}

export function RelatorioImpressao({
  id,
  form,
  isExterno,
  bancoRelatorio,
  agenciaRelatorio,
  modalidadeRelatorio,
  situacaoProcessoRelatorio,
  etapaAtualRelatorio,
  compradorData,
  vendedorData,
  imovelData,
  pendencias,
  tarefasAbertas,
  getUserName,
}: RelatorioImpressaoProps) {
  const valorRelatorio = (valor: any) => formatCurrencyBr(valor)
  const textoRelatorio = (valor: any) => {
    const texto = String(valor ?? '').trim()
    return texto || '—'
  }
  const contatoRelatorio = (cliente: any) => [cliente.email, cliente.fone1 || cliente.fone2 || cliente.fone3].filter(Boolean).join(' | ') || '—'
  const enderecoImovelRelatorio = (imovel: any) => [
    imovel.endereco,
    imovel.numero,
    imovel.complemento,
    imovel.bairro,
    [imovel.cidade, imovel.uf].filter(Boolean).join('/'),
    imovel.cep,
  ].filter(Boolean).join(', ') || '—'

  return (
        <div className="processo-print-report">
          <div className="mb-4 border-b-2 border-gray-900 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-44 items-center justify-center rounded bg-blue-950 px-4 py-3">
                  <img src={logoAmarante} alt="Amarante" className="max-h-10 max-w-full object-contain"/>
                </div>
                <div>
                <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">Relatório do Processo</h1>
                <p className="mt-1 text-sm text-gray-600">Processo #{id}</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                <div>Emitido em {formatDateTimeBr(new Date())}</div>
                <div>Sistema Amarante</div>
              </div>
            </div>
          </div>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Situação / Etapa Atual</h2>
            <table>
              <tbody>
                <tr>
                  <th>Situação</th>
                  <td>{situacaoProcessoRelatorio}</td>
                  <th>Etapa atual</th>
                  <td>{etapaAtualRelatorio}</td>
                </tr>
                <tr>
                  <th>Responsável</th>
                  <td>{getUserName(form.responsavelId)}</td>
                  <th>Nº Proposta / Contrato</th>
                  <td>{textoRelatorio(form.numProposta)} / {textoRelatorio(form.numContrato)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Banco, Agência e Modalidade</h2>
            <table>
              <tbody>
                <tr>
                  <th>Banco</th>
                  <td>{textoRelatorio(bancoRelatorio?.nome)}</td>
                  <th>Agência</th>
                  <td>{textoRelatorio(agenciaRelatorio?.nome)}</td>
                </tr>
                <tr>
                  <th>Modalidade</th>
                  <td>{textoRelatorio(modalidadeRelatorio?.nome)}</td>
                  <th>Encaminhamento</th>
                  <td>{textoRelatorio(form.encaminhamento)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Valores do Financiamento</h2>
            <table>
              <tbody>
                <tr>
                  <th>Compra e venda</th>
                  <td>{valorRelatorio(form.valorCompraVenda)}</td>
                  <th>Avaliação</th>
                  <td>{valorRelatorio(form.valorAvaliacao)}</td>
                  <th>Financiado</th>
                  <td>{valorRelatorio(form.valorFinanciado)}</td>
                </tr>
                <tr>
                  <th>Recurso próprio</th>
                  <td>{valorRelatorio(form.valorRecursoProprio)}</td>
                  <th>FGTS</th>
                  <td>{valorRelatorio(form.valorFgts)}</td>
                  <th>Subsídio</th>
                  <td>{valorRelatorio(form.valorSubsidio)}</td>
                </tr>
                <tr>
                  <th>Valor do IQ</th>
                  <td>{valorRelatorio(form.valorIq)}</td>
                  <th>Parcela</th>
                  <td>{valorRelatorio(form.valorParcela)}</td>
                  <th>Nº Parcelas</th>
                  <td>{textoRelatorio(form.numeroParcelas)}</td>
                </tr>
                <tr>
                  <th>Taxa de juros</th>
                  <td>{textoRelatorio(form.taxa)}%</td>
                  <th>Amortização</th>
                  <td>{textoRelatorio(form.tipoAmortizacao)}</td>
                  <th>Situação do imóvel</th>
                  <td>{textoRelatorio(form.tipoImovel)}</td>
                </tr>
                {!isExterno && (
                  <tr>
                    <th>Comissão (%)</th>
                    <td>{textoRelatorio(form.remuneracaoPerc)}%</td>
                    <th>Comissão (R$)</th>
                    <td>{valorRelatorio(form.remuneracaoValor)}</td>
                    <th>Despesas</th>
                    <td>{valorRelatorio(form.valorDespesas)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Dados do Comprador</h2>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>Contato</th>
                  <th>Proponente</th>
                </tr>
              </thead>
              <tbody>
                {compradorData.length ? compradorData.map((c: any) => (
                  <tr key={`print-comprador-${c.id}`}>
                    <td>{textoRelatorio(c.nome)}</td>
                    <td>{textoRelatorio(formatCpfCnpj(c.cpfCnpj))}</td>
                    <td>{contatoRelatorio(c)}</td>
                    <td>{c.proponente ? 'Sim' : 'Não'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}>Nenhum comprador vinculado.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Dados do Vendedor</h2>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>Contato</th>
                  <th>Proponente</th>
                </tr>
              </thead>
              <tbody>
                {vendedorData.length ? vendedorData.map((v: any) => (
                  <tr key={`print-vendedor-${v.id}`}>
                    <td>{textoRelatorio(v.nome)}</td>
                    <td>{textoRelatorio(formatCpfCnpj(v.cpfCnpj))}</td>
                    <td>{contatoRelatorio(v)}</td>
                    <td>{v.proponente ? 'Sim' : 'Não'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}>Nenhum vendedor vinculado.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Dados do Imóvel</h2>
            <table>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Endereço</th>
                  <th>Cidade/UF</th>
                  <th>CEP</th>
                </tr>
              </thead>
              <tbody>
                {imovelData.length ? imovelData.map((im: any) => (
                  <tr key={`print-imovel-${im.id}`}>
                    <td>{textoRelatorio(im.matricula)}</td>
                    <td>{enderecoImovelRelatorio(im)}</td>
                    <td>{[im.cidade, im.uf].filter(Boolean).join('/') || '—'}</td>
                    <td>{textoRelatorio(im.cep)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}>Nenhum imóvel vinculado.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Pendências Atuais</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {pendencias.length ? pendencias.map((p: any, i: number) => (
                  <tr key={`print-pendencia-${p.id || i}`}>
                    <td>{formatDateTimeBr(p.criadoEm)}</td>
                    <td>{textoRelatorio(p.descricao)}</td>
                    <td>{textoRelatorio(p.usuarioNome)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3}>Nenhuma pendência atual.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="processo-print-section">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-900">Tarefas Abertas</h2>
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Solicitação</th>
                  <th>Solicitante</th>
                  <th>Executante</th>
                  <th>Data limite</th>
                </tr>
              </thead>
              <tbody>
                {tarefasAbertas.length ? tarefasAbertas.map((t: any) => (
                  <tr key={`print-tarefa-${t.id}`}>
                    <td>{t.id}</td>
                    <td>{textoRelatorio(t.solicitacao)}</td>
                    <td>{getUserName(t.solicitanteId)}</td>
                    <td>{getUserName(t.executanteId)}</td>
                    <td>{t.dataLimite ? formatDateBr(t.dataLimite) : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>Nenhuma tarefa aberta.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
  )
}
