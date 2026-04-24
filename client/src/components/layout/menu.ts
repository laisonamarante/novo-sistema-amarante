import type { LucideIcon } from 'lucide-react'
import {
  Home,
  Users,
  Settings,
  FileText,
  BarChart2,
  Folder,
  Shield,
  ExternalLink,
  Calculator,
} from 'lucide-react'
import { DASHBOARD_PORTAIS, DASHBOARD_SIMULADORES } from '../../pages/home/constants'

export interface MenuItem {
  label: string
  icon?: LucideIcon
  path?: string
  externalUrl?: string
  children?: MenuItem[]
  section?: string
  perm?: string
  perms?: string[]
}

export const menu: MenuItem[] = [
  { label: 'Home', icon: Home, path: '/', perm: 'menu:home' },
  {
    label: 'Simuladores',
    icon: Calculator,
    perm: 'home:simuladores',
    children: DASHBOARD_SIMULADORES.map(simulador => ({
      label: simulador.nome,
      externalUrl: simulador.url,
    })),
  },
  {
    label: 'Acesso ao Portal',
    icon: ExternalLink,
    perm: 'home:portais',
    children: DASHBOARD_PORTAIS.map(portal => ({
      label: portal.nome,
      externalUrl: portal.url,
    })),
  },
  {
    label: 'Cadastros',
    icon: Users,
    perm: 'menu:cadastros',
    children: [
      { label: 'Comprador', path: '/cadastros/compradores', perm: 'cadastro:comprador' },
      { label: 'Vendedor', path: '/cadastros/vendedores', perm: 'cadastro:vendedor' },
      { label: 'Modalidade', path: '/configuracoes?tab=modalidades', perm: 'menu:configuracoes' },
      { label: 'Construtora', path: '/configuracoes?tab=construtoras', perm: 'cadastro:construtora' },
      { label: 'Empreendimento', path: '/configuracoes?tab=empreendimentos', perm: 'cadastro:empreendimento' },
      { label: 'Banco', path: '/configuracoes?tab=bancos', perm: 'menu:configuracoes' },
      { label: 'Agência', path: '/configuracoes?tab=agencias', perm: 'cadastro:agencia' },
      { label: 'Imóvel', path: '/configuracoes?tab=imoveis', perm: 'cadastro:imovel' },
      { label: 'Imobiliária', path: '/configuracoes?tab=imobiliarias', perm: 'cadastro:imobiliaria' },
      { label: 'Corretor', path: '/configuracoes?tab=corretores', perm: 'cadastro:corretor' },
      { label: 'Parceiro', path: '/configuracoes?tab=parceiros', perm: 'cadastro:parceiro' },
      { label: 'Subestabelecido', path: '/configuracoes?tab=subestabelecidos', perm: 'cadastro:subestabelecido' },
    ],
  },
  {
    label: 'Configurações',
    icon: Settings,
    perm: 'menu:configuracoes',
    children: [
      { label: 'Situação', path: '/configuracoes?tab=situacoes', perm: 'menu:configuracoes' },
      { label: 'Etapa', path: '/configuracoes?tab=etapas', perm: 'menu:configuracoes' },
      { label: 'Fluxo', path: '/configuracoes?tab=fluxos', perm: 'menu:configuracoes' },
      { label: 'Documentos', path: '/configuracoes?tab=documentosTipos', perm: 'menu:configuracoes' },
    ],
  },
  {
    label: 'Financiamento',
    icon: FileText,
    children: [
      { label: 'Processo', path: '/financiamento/processos', perm: 'menu:processos' },
      { label: 'Pré-Análise', path: '/financiamento/pre-analise', perms: ['menu:pre_analise', 'home:pre_analise'] },
      { label: 'Tarefas', path: '/financiamento/tarefas', perm: 'menu:tarefas' },
    ],
  },
  {
    label: 'Segurança',
    icon: Shield,
    children: [
      { label: 'Usuário', path: '/seguranca/usuarios', perm: 'menu:usuarios' },
      { label: 'Permissões', path: '/seguranca/permissoes', perm: 'menu:configuracoes' },
      { label: 'Advertência', path: '/seguranca/advertencias', perm: 'menu:advertencias' },
      { label: 'Aviso', path: '/seguranca/avisos', perm: 'menu:avisos' },
    ],
  },
  {
    label: 'Relatórios',
    icon: BarChart2,
    children: [
      { label: 'Processos por Etapa', path: '/relatorios/processos', perm: 'relatorio:processos' },
      { label: 'Produção', path: '/relatorios/producao', perm: 'relatorio:producao' },
      { label: 'Parceiro', path: '/relatorios/parceiro', perm: 'relatorio:parceiro' },
      { label: 'Tarefas', path: '/relatorios/tarefas', perm: 'relatorio:tarefas' },
    ],
  },
  { label: 'Meus Arquivos', icon: Folder, path: '/arquivos', perm: 'menu:arquivos' },
]
