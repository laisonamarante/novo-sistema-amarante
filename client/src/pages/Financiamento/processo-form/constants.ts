export type Aba =
  | 'dadosGerais'
  | 'valores'
  | 'comprador'
  | 'vendedor'
  | 'imovel'
  | 'etapas'
  | 'historico'
  | 'documentacao'
  | 'vinculo'
  | 'tarefas'
  | 'atendimento'

export const PROCESSO_FORM_ABAS: { id: Aba; label: string }[] = [
  { id: 'dadosGerais', label: 'Dados Gerais' },
  { id: 'valores', label: 'Valores' },
  { id: 'comprador', label: 'Comprador' },
  { id: 'vendedor', label: 'Vendedor' },
  { id: 'imovel', label: 'Imóvel' },
  { id: 'etapas', label: 'Etapas' },
  { id: 'historico', label: 'Histórico' },
  { id: 'documentacao', label: 'Documentação' },
  { id: 'vinculo', label: 'Vínculo' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'atendimento', label: 'Atendimento' },
]

export const PROCESSO_FORM_SECOES_DOC = [
  'Comprador - Pessoa Física',
  'Comprador - Pessoa Jurídica',
  'Vendedor - Pessoa Física',
  'Vendedor - Pessoa Jurídica',
  'Imóvel',
  'Formulários',
] as const

export const PROCESSO_FORM_DOCUMENTO_CATEGORIAS_COMPRADOR = [
  'Comprador - Pessoa Física',
  'Comprador - Pessoa Jurídica',
] as const

export const PROCESSO_FORM_DOCUMENTO_CATEGORIAS_VENDEDOR = [
  'Vendedor - Pessoa Física',
  'Vendedor - Pessoa Jurídica',
] as const

export const PROCESSO_FORM_REVISOR_PERFIS = ['Administrador', 'Analista', 'Gerente'] as const

export const PROCESSO_FORM_DECIMAL_FIELDS = [
  'valorCompraVenda',
  'valorAvaliacao',
  'valorRecursoProprio',
  'valorSubsidio',
  'valorFgts',
  'valorIq',
  'valorFinanciado',
  'valorParcela',
  'valorDespesas',
  'remuneracaoPerc',
  'remuneracaoValor',
  'taxa',
] as const

export const PROCESSO_FORM_CURRENCY_FIELDS = [
  'valorCompraVenda',
  'valorAvaliacao',
  'valorRecursoProprio',
  'valorSubsidio',
  'valorFgts',
  'valorIq',
  'valorFinanciado',
  'valorParcela',
  'valorDespesas',
  'remuneracaoValor',
] as const

export const PROCESSO_FORM_PERCENT_FIELDS = [
  'taxa',
  'remuneracaoPerc',
] as const

export const PROCESSO_FORM_INTERNAL_ONLY_FIELDS = [
  'valorSubsidio',
  'valorAvaliacao',
  'valorParcela',
  'taxa',
  'remuneracaoPerc',
  'remuneracaoValor',
] as const

export const PROCESSO_FORM_ENCAMINHAMENTOS = [
  'CENOP',
  'SICOB',
  'CEHOP',
  'INTERCERVICE',
  'FUNCHAL',
  'FINTECH',
  'ITAÚ',
] as const

export const PROCESSO_FORM_TAREFA_STATUS = [null, 'Pendente', 'Resolvida', 'Encerrada'] as const

export const PROCESSO_FORM_PRINT_STYLES = `
  .processo-print-report { display: none; }
  @media print {
    @page { margin: 12mm; size: A4; }
    body { background: #fff !important; color: #111827 !important; }
    body * { visibility: hidden; }
    .processo-print-report, .processo-print-report * { visibility: visible; }
    .processo-print-report {
      display: block !important;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 0;
      background: #fff;
      font-size: 11px;
      line-height: 1.35;
    }
    .processo-print-report table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    .processo-print-report th,
    .processo-print-report td {
      border: 1px solid #d1d5db;
      padding: 5px 6px;
      vertical-align: top;
    }
    .processo-print-report th {
      background: #f3f4f6 !important;
      font-weight: 700;
      text-align: left;
    }
    .processo-print-section {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 10px;
    }
    .no-print { display: none !important; }
    button, .no-print { display: none !important; }
  }
`

export const EMPTY_IMOVEL_FORM = {
  matricula: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
}

export const EMPTY_TAREFA_FORM = {
  executanteId: 0,
  solicitacao: '',
  dataLimite: '',
}

export const EMPTY_HISTORICO_FORM = {
  titulo: '',
  descricao: '',
}
