import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import {
  Home, Users, Settings, FileText, DollarSign, BarChart2,
  ChevronDown, ChevronRight, LogOut, Clock, Folder,
  AlertTriangle, Bell, CheckSquare, Building, Menu, X,
  Search, User
} from 'lucide-react'

interface MenuItem {
  label: string; icon?: any; path?: string
  children?: MenuItem[]; section?: string
}

const menu: MenuItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Cadastros', icon: Users, children: [
    { label: 'Comprador',       path: '/cadastros/compradores' },
    { label: 'Vendedor',        path: '/cadastros/vendedores' },
    { label: 'Modalidade',     path: '/configuracoes?tab=modalidades' },
    { label: 'Construtora',     path: '/configuracoes?tab=construtoras' },
    { label: 'Empreendimento',  path: '/configuracoes?tab=empreendimentos' },
    { label: 'Banco',           path: '/configuracoes?tab=bancos' },
    { label: 'Agência',         path: '/configuracoes?tab=agencias' },
    { label: 'Imóvel',          path: '/configuracoes?tab=imoveis' },
    { label: 'Imobiliária',     path: '/configuracoes?tab=imobiliarias' },
    { label: 'Corretor',        path: '/configuracoes?tab=corretores' },
    { label: 'Parceiro',        path: '/configuracoes?tab=parceiros' },
    { label: 'Subestabelecido', path: '/configuracoes?tab=subestabelecidos' },
  ]},
  { label: 'Configurações', icon: Settings, children: [
    { label: 'Situação',    path: '/configuracoes?tab=situacoes' },
    { label: 'Etapa',      path: '/configuracoes?tab=etapas' },
    { label: 'Fluxo',      path: '/configuracoes?tab=fluxos' },
    { label: 'Documentos', path: '/configuracoes?tab=documentosTipos' },
  ]},
  { label: 'financiamento', section: 'true' },
  { label: 'Processo',    icon: FileText, path: '/financiamento/processos' },
  { label: 'Pré-Análise', icon: Search,   path: '/financiamento/pre-analise' },
  { label: 'financeiro', section: 'true' },
  { label: 'Cadastros', icon: Building, children: [
    { label: 'Tipo de Despesa', path: '/configuracoes?tab=finTipoDespesas' },
    { label: 'Tipo de Receita', path: '/configuracoes?tab=finTipoReceitas' },
    { label: 'Devedor',         path: '/configuracoes?tab=finDevedores' },
    { label: 'Fornecedor',      path: '/configuracoes?tab=finFornecedores' },
    { label: 'Natureza',        path: '/configuracoes?tab=finNaturezas' },
    { label: 'Conta',           path: '/configuracoes?tab=finContas' },
    { label: 'Empresa',         path: '/configuracoes?tab=finEmpresas' },
  ]},
  { label: 'Contas a Pagar',   icon: DollarSign, path: '/financeiro/contas-pagar' },
  { label: 'Contas a Receber', icon: DollarSign, path: '/financeiro/contas-receber' },
  { label: 'Fluxo de Caixa',   icon: BarChart2,  path: '/financeiro/fluxo-caixa' },
  { label: 'Relatórios Fin.', icon: BarChart2, children: [
    { label: 'Contas a Pagar',   path: '/relatorios/financeiro?tipo=pagar' },
    { label: 'Contas a Receber', path: '/relatorios/financeiro?tipo=receber' },
    { label: 'Fluxo de Caixa',   path: '/relatorios/financeiro?tipo=fluxo' },
  ]},
  { label: 'segurança', section: 'true' },
  { label: 'Usuário',     icon: User,          path: '/seguranca/usuarios' },
  { label: 'Advertência', icon: AlertTriangle,  path: '/seguranca/advertencias' },
  { label: 'Aviso',       icon: Bell,           path: '/seguranca/avisos' },
  { label: 'Tarefas',     icon: CheckSquare,    path: '/seguranca/tarefas' },
  { label: 'Relatórios',  icon: BarChart2, children: [
    { label: 'Processos por Etapa', path: '/relatorios/processos' },
    { label: 'Produção',            path: '/relatorios/producao' },
    { label: 'Parceiro',            path: '/relatorios/parceiro' },
    { label: 'Tarefas',             path: '/relatorios/tarefas' },
  ]},
  { label: 'arquivos', section: 'true' },
  { label: 'Meus Arquivos', icon: Folder, path: '/arquivos' },
]

function MenuItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (item.section) return (
    <li className="px-4 pt-4 pb-1">
      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{item.label}</span>
    </li>
  )

  if (item.children) {
    const active = item.children.some(c => c.path && location.pathname.startsWith(c.path.split('?')[0]))
    return (
      <li>
        <button onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors
            ${active ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
          <span className="flex items-center gap-2">
            {item.icon && <item.icon size={15} />}{item.label}
          </span>
          {open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        </button>
        {open && <ul className="bg-blue-950">{item.children.map((c,i) => <MenuItem key={i} item={c} depth={depth+1}/>)}</ul>}
      </li>
    )
  }

  const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path||'__')
  return (
    <li>
      <Link to={item.path||'/'} className={`flex items-center gap-2 py-2 text-sm transition-colors
        ${depth>0?'pl-8 pr-4':'px-4'}
        ${active ? 'bg-blue-600 text-white font-medium' : 'text-blue-100 hover:bg-blue-800'}`}>
        {item.icon && <item.icon size={15}/>}{item.label}
      </Link>
    </li>
  )
}

export function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebar, setSidebar] = useState(true)
  const [busca, setBusca] = useState('')
  const [dropUser, setDropUser] = useState(false)

  const handleBusca = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && busca.trim()) {
      navigate(`/financiamento/processos?busca=${encodeURIComponent(busca)}`)
      setBusca('')
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebar?'w-56':'w-0'} bg-blue-900 flex-shrink-0 overflow-hidden transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-blue-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-blue-900 font-bold text-xs">A</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm">AMARANTE</div>
              <div className="text-blue-300 text-xs">Serviços Financeiros</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <ul>{menu.map((item,i) => <MenuItem key={i} item={item}/>)}</ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-blue-900 text-white px-4 py-2 flex items-center gap-3 shadow-md flex-shrink-0">
          <button onClick={() => setSidebar(s=>!s)} className="hover:text-blue-200 transition-colors">
            {sidebar ? <X size={20}/> : <Menu size={20}/>}
          </button>

          <div className="flex-1 max-w-md">
            <div className="flex items-center bg-blue-800 rounded px-3 py-1.5 gap-2">
              <Search size={15} className="text-blue-300"/>
              <input type="text" placeholder="Nome ou CPF..." value={busca}
                onChange={e=>setBusca(e.target.value)} onKeyDown={handleBusca}
                className="bg-transparent text-white placeholder-blue-300 text-sm outline-none flex-1 w-full"/>
            </div>
          </div>

          <Link to="/bater-ponto"
            className="bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors">
            <Clock size={15}/>Bater Ponto
          </Link>

          <div className="relative">
            <button onClick={() => setDropUser(d=>!d)}
              className="flex items-center gap-2 text-sm hover:text-blue-200 transition-colors">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={14}/>
              </div>
              <span className="hidden sm:inline">{usuario?.nome?.split(' ')[0]}</span>
              <ChevronDown size={13}/>
            </button>
            {dropUser && (
              <div className="absolute right-0 top-full mt-2 bg-white text-gray-800 rounded-lg shadow-xl w-48 z-50 border">
                <div className="px-4 py-2 border-b">
                  <p className="text-xs font-semibold text-gray-800">{usuario?.nome}</p>
                  <p className="text-xs text-gray-500">{usuario?.perfil}</p>
                </div>
                <Link to="/configuracoes?tab=senha" onClick={()=>setDropUser(false)}
                  className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors">Alterar Senha</Link>
                <button onClick={()=>{logout();navigate('/login')}}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600 transition-colors">
                  <LogOut size={14}/>Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
