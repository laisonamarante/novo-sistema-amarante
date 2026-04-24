export const DASHBOARD_SIMULADORES = [
  {
    nome: 'Banco do Brasil',
    url: 'https://cim-simulador-imovelproprio.apps.bb.com.br/simulacao-imobiliario/sobre-imovel',
    cor: 'bg-yellow-400',
    texto: 'text-blue-900',
  },
  {
    nome: 'Bradesco',
    url: 'https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/encontre-seu-credito/simuladores-imoveis.shtm#box1-comprar',
    cor: 'bg-red-700',
    texto: 'text-white',
  },
  {
    nome: 'Itau',
    url: 'https://www.itau.com.br/emprestimos-financiamentos#emprestimoOnlineSeg',
    cor: 'bg-orange-500',
    texto: 'text-white',
  },
] as const

export const DASHBOARD_PORTAIS = [
  { nome: 'Banco do Brasil', url: 'https://correspondente.bb.com.br/cbo-portal-acesso/#/login', cor: 'bg-yellow-400 text-blue-900' },
  { nome: 'Bradesco', url: 'https://wspf.banco.bradesco/wsImoveis/AreaRestrita/Default.aspx?ReturnUrl=%2fwsImoveis%2fAreaRestrita%2fConteudo%2fHome.aspx', cor: 'bg-red-700 text-white' },
  { nome: 'Funchal', url: 'https://formalizabra.creditoimobiliario.funchalnegocios.com.br/', cor: 'bg-orange-500 text-white' },
  { nome: 'Itau Imoveis', url: 'https://plataformaitauimoveis.cloud.itau.com.br/Portal', cor: 'bg-orange-500 text-white' },
  { nome: 'Trinus', url: 'https://crediblue.azo.blue/', cor: 'bg-cyan-600 text-white' },
  { nome: 'CashMe', url: 'https://institucional.cashme.com.br/login#ut=CASHMEMBER&ru=https://institucional.cashme.com.br/cashmember&pr=PORTAL_CASHMEMBER', cor: 'bg-green-600 text-white' },
  { nome: 'Bari', url: 'https://portal.parceirosbari.com.br/', cor: 'bg-gray-800 text-white' },
  { nome: 'C6Bank', url: 'https://c6imobiliario.com.br/simulacao?parceiro=29082442000106', cor: 'bg-black text-white' },
  { nome: 'Libra Credito', url: 'https://parceiros.libracredito.com.br/', cor: 'bg-blue-800 text-white' },
  { nome: 'HubSport PF', url: 'https://share.hsforms.com/1YgeKqRIMRQW-KClSp7ZW0wecp7j', cor: 'bg-orange-600 text-white' },
  { nome: 'HubSport PJ', url: 'https://share.hsforms.com/1wmGWD_KZQYCiDmI_Yirw8Aecp7j', cor: 'bg-orange-600 text-white' },
  { nome: 'Digisac', url: 'https://amarantecoban.digisac.app/login', cor: 'bg-blue-500 text-white' },
  { nome: 'Brasilseg', url: 'https://portal-parceiros.cld.brasilseg.com.br', cor: 'bg-yellow-500 text-blue-900' },
  { nome: 'Nexoos', url: 'https://parceiro.nexoos.com.br/', cor: 'bg-blue-500 text-white' },
  { nome: 'Makasi', url: 'https://auth.makasi.com.br/login', cor: 'bg-gray-700 text-white' },
  { nome: 'Creditas', url: 'https://parceiros.creditas.com.br/', cor: 'bg-green-600 text-white' },
  { nome: 'Daycoval', url: 'https://creditoimobiliario.daycoval.com.br', cor: 'bg-blue-700 text-white' },
  { nome: 'Pontte', url: 'https://bit.ly/LeadParceiroHE', cor: 'bg-teal-600 text-white' },
] as const

export const PRE_ANALISE_SITUACOES_FILTRO = ['Em análise', 'Aguardando análise'] as const
export const PRE_ANALISE_BANCOS_FILTRO = ['BB', 'Bradesco', 'Itau'] as const

export function toggleFiltroLista(lista: string[], valor: string) {
  return lista.includes(valor)
    ? lista.filter((item) => item !== valor)
    : [...lista, valor]
}
