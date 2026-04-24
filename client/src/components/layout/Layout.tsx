import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { usePermissoes } from '../../lib/permissoes'
import { menu, type MenuItem as SidebarMenuItem } from './menu'
import { QuickProcessSearch } from './QuickProcessSearch'
import { ChatWidget } from '../chat/ChatWidget'
import logoAmarante from '../../assets/logo-amarante-branca.png'
import {
  ChevronDown, ChevronRight, LogOut, Clock,
  Menu, X,
  User
} from 'lucide-react'

function filtrarMenu(items: SidebarMenuItem[], pode: (perm: string) => boolean): SidebarMenuItem[] {
  const filtrados: SidebarMenuItem[] = []

  for (const item of items) {
    if (item.section) {
      filtrados.push(item)
      continue
    }

    if (item.perm && !pode(item.perm)) continue
    if (item.perms && !item.perms.some(perm => pode(perm))) continue

    if (item.children) {
      const filhos = filtrarMenu(item.children, pode)
      if (!filhos.length) continue
      filtrados.push({ ...item, children: filhos })
      continue
    }

    filtrados.push(item)
  }

  return filtrados.filter((item, index) => {
    if (!item.section) return true
    const proximo = filtrados.slice(index + 1).find(candidate => !candidate.section)
    return Boolean(proximo)
  })
}

function itemAtivo(item: SidebarMenuItem, pathname: string): boolean {
  if (item.path) {
    return item.path === '/' ? pathname === '/' : pathname.startsWith(item.path.split('?')[0])
  }
  return item.children?.some(child => itemAtivo(child, pathname)) || false
}

type OpenMenus = Record<number, string | undefined>

function MenuItem({
  item,
  depth = 0,
  openMenus,
  setOpenMenus,
}: {
  item: SidebarMenuItem
  depth?: number
  openMenus: OpenMenus
  setOpenMenus: (menus: OpenMenus) => void
}) {
  const location = useLocation()
  const key = `${depth}:${item.path || item.label}`
  const open = openMenus[depth] === key

  const closeMenus = () => setOpenMenus({})

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'popup=yes,width=1200,height=800,noopener,noreferrer')
    closeMenus()
  }

  if (item.section) return (
    <li className="px-4 pt-4 pb-1">
      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{item.label}</span>
    </li>
  )

  if (item.children) {
    const active = itemAtivo(item, location.pathname)
    return (
      <li className="relative">
        <button
          onClick={() => {
            if (open) {
              setOpenMenus(Object.fromEntries(Object.entries(openMenus).filter(([level]) => Number(level) < depth)))
              return
            }
            setOpenMenus({
              ...Object.fromEntries(Object.entries(openMenus).filter(([level]) => Number(level) < depth)),
              [depth]: key,
            })
          }}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors
            ${depth > 0 ? 'min-w-56' : ''}
            ${active ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
          <span className="flex items-center gap-2">
            {item.icon && <item.icon size={15} />}{item.label}
          </span>
          <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
        </button>
        {open && (
          <ul className="absolute left-full top-0 z-50 min-w-56 rounded-r-lg border border-blue-800 bg-blue-950 py-1 shadow-2xl">
            {item.children.map((c,i) => (
              <MenuItem key={`${key}:${i}`} item={c} depth={depth+1} openMenus={openMenus} setOpenMenus={setOpenMenus}/>
            ))}
          </ul>
        )}
      </li>
    )
  }

  const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path||'__')
  if (item.externalUrl) {
    return (
      <li>
        <button
          type="button"
          onClick={() => openExternal(item.externalUrl!)}
          className={`flex w-full items-center gap-2 py-2 text-left text-sm text-blue-100 transition-colors hover:bg-blue-800
            ${depth>0?'px-4 min-w-56':'px-4'}`}>
          {item.icon && <item.icon size={15}/>}{item.label}
        </button>
      </li>
    )
  }

  return (
    <li>
      <Link to={item.path||'/'} className={`flex items-center gap-2 py-2 text-sm transition-colors
        ${depth>0?'px-4 min-w-56':'px-4'}
        ${active ? 'bg-blue-600 text-white font-medium' : 'text-blue-100 hover:bg-blue-800'}`}
        onClick={closeMenus}>
        {item.icon && <item.icon size={15}/>}{item.label}
      </Link>
    </li>
  )
}

export function Layout() {
  const { usuario, logout } = useAuth()
  const { pode, isExterno } = usePermissoes()
  const navigate = useNavigate()
  const [sidebar, setSidebar] = useState(true)
  const [dropUser, setDropUser] = useState(false)
  const [openMenus, setOpenMenus] = useState<OpenMenus>({})

  const menuVisivel = filtrarMenu(menu, pode)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebar?'w-56 overflow-visible':'w-0 overflow-hidden'} bg-blue-900 flex-shrink-0 transition-all duration-300 flex flex-col relative z-40`}>
        <Link
          to="/"
          onClick={() => setOpenMenus({})}
          className="h-16 px-4 border-b border-blue-800 flex-shrink-0 flex items-center hover:bg-blue-800 transition-colors"
          aria-label="Voltar para a Home">
          <img
            src={logoAmarante}
            alt="Amarante"
            className="h-10 w-full object-contain object-left"
          />
        </Link>
        <nav className="flex-1 overflow-visible py-2">
          <ul>{menuVisivel.map((item,i) => <MenuItem key={i} item={item} openMenus={openMenus} setOpenMenus={setOpenMenus}/>)}</ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-blue-900 text-white px-4 py-2 flex items-center gap-3 shadow-md flex-shrink-0">
          <button onClick={() => { setSidebar(s=>!s); setOpenMenus({}) }} className="hover:text-blue-200 transition-colors">
            {sidebar ? <X size={20}/> : <Menu size={20}/>}
          </button>

          <div className="flex-1 max-w-md">
            <QuickProcessSearch />
          </div>

          {!isExterno && (
            <Link to="/bater-ponto"
              className="bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors">
              <Clock size={15}/>Bater Ponto
            </Link>
          )}

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
        <ChatWidget />
      </div>
    </div>
  )
}
