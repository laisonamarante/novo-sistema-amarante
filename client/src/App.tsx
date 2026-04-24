import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { trpc, getTrpcClient } from './lib/trpc'
import { useAuth } from './lib/auth'
import { usePermissoes } from './lib/permissoes'
import { Layout } from './components/layout/Layout'
import { Login }          from './pages/Login'
import { Home }           from './pages/Home'
import { Compradores, Vendedores } from './pages/Cadastros/Compradores'
import { Processos }      from './pages/Financiamento/Processos'
import { ProcessoForm }   from './pages/Financiamento/ProcessoForm'
import { PreAnalise }     from './pages/Financiamento/PreAnalise'
import { Usuarios }       from './pages/Seguranca/Usuarios'
import { Tarefas }        from './pages/Seguranca/Tarefas'
import { Advertencias }   from './pages/Seguranca/Advertencias'
import { Avisos }         from './pages/Seguranca/Avisos'
import { Permissoes }     from './pages/Seguranca/Permissoes'
import { MeusArquivos }   from './pages/Arquivos/MeusArquivos'
import { RelProcessos }   from './pages/Relatorios/RelProcessos'
import { RelProducao }    from './pages/Relatorios/RelProducao'
import { RelParceiro }    from './pages/Relatorios/RelParceiro'
import { RelTarefas }     from './pages/Relatorios/RelTarefas'
import { BaterPonto }     from './pages/BaterPonto'
import { Configuracoes }  from './pages/Configuracoes'
import { ConfigurarFluxo } from './pages/Configuracoes/ConfigurarFluxo'

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#dc2626' }}>Algo deu errado</h2>
          <p style={{ color: '#666', margin: '16px 0' }}>{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/sistema' }}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          >
            Voltar ao início
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to='/login' replace />
  return <>{children}</>
}

function RequirePerm({ perm, children }: { perm: string; children: ReactNode }) {
  const { pode, isLoading } = usePermissoes()
  if (isLoading) return null
  if (!pode(perm)) return <Navigate to='/' replace />
  return <>{children}</>
}

function RequireAnyPerm({ perms, children }: { perms: string[]; children: ReactNode }) {
  const { pode, isLoading } = usePermissoes()
  if (isLoading) return null
  if (!perms.some(perm => pode(perm))) return <Navigate to='/' replace />
  return <>{children}</>
}

function RequireInterno({ children }: { children: ReactNode }) {
  const { isExterno, isLoading } = usePermissoes()
  if (isLoading) return null
  if (isExterno) return <Navigate to='/' replace />
  return <>{children}</>
}

const CONFIGURACOES_ROUTE_PERMS = [
  'menu:configuracoes',
  'cadastro:construtora',
  'cadastro:empreendimento',
  'cadastro:agencia',
  'cadastro:imovel',
  'cadastro:imobiliaria',
  'cadastro:corretor',
  'cadastro:parceiro',
  'cadastro:subestabelecido',
]

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
  }))
  const [trpcClient] = useState(() => getTrpcClient())

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename='/sistema'>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/' element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<RequirePerm perm='menu:home'><Home /></RequirePerm>} />
                {/* Cadastros */}
                <Route path='cadastros/compradores'        element={<RequirePerm perm='cadastro:comprador'><Compradores /></RequirePerm>} />
                <Route path='cadastros/compradores/novo'   element={<RequirePerm perm='cadastro:comprador:criar'><Compradores cadastroRota='novo' /></RequirePerm>} />
                <Route path='cadastros/compradores/:id'    element={<RequirePerm perm='cadastro:comprador:editar'><Compradores cadastroRota='editar' /></RequirePerm>} />
                <Route path='cadastros/vendedores'         element={<RequirePerm perm='cadastro:vendedor'><Vendedores /></RequirePerm>} />
                <Route path='cadastros/vendedores/novo'    element={<RequirePerm perm='cadastro:vendedor:criar'><Vendedores cadastroRota='novo' /></RequirePerm>} />
                <Route path='cadastros/vendedores/:id'     element={<RequirePerm perm='cadastro:vendedor:editar'><Vendedores cadastroRota='editar' /></RequirePerm>} />
                {/* Financiamento */}
                <Route path='financiamento/processos'      element={<RequirePerm perm='menu:processos'><Processos /></RequirePerm>} />
                <Route path='financiamento/processos/novo' element={<RequirePerm perm='processo:criar'><ProcessoForm /></RequirePerm>} />
                <Route path='financiamento/processos/:id'  element={<RequireAnyPerm perms={['menu:processos', 'processo:editar', 'processo:ver_todos']}><ProcessoForm /></RequireAnyPerm>} />
                <Route path='financiamento/pre-analise'    element={<RequireAnyPerm perms={['menu:pre_analise', 'home:pre_analise']}><PreAnalise /></RequireAnyPerm>} />
                <Route path='financiamento/tarefas'        element={<RequirePerm perm='menu:tarefas'><Tarefas /></RequirePerm>} />
                {/* Seguranca - protegido */}
                <Route path='seguranca/usuarios'           element={<RequirePerm perm='menu:usuarios'><Usuarios /></RequirePerm>} />
                <Route path='seguranca/tarefas'            element={<RequirePerm perm='menu:tarefas'><Tarefas /></RequirePerm>} />
                <Route path='seguranca/advertencias'       element={<RequirePerm perm='menu:advertencias'><Advertencias /></RequirePerm>} />
                <Route path='seguranca/avisos'             element={<RequirePerm perm='menu:avisos'><Avisos /></RequirePerm>} />
                <Route path='seguranca/permissoes'         element={<RequirePerm perm='menu:configuracoes'><Permissoes /></RequirePerm>} />
                {/* Arquivos - protegido */}
                <Route path='arquivos'                     element={<RequirePerm perm='menu:arquivos'><MeusArquivos /></RequirePerm>} />
                {/* Relatorios - protegido */}
                <Route path='relatorios/processos'         element={<RequirePerm perm='relatorio:processos'><RelProcessos /></RequirePerm>} />
                <Route path='relatorios/producao'          element={<RequirePerm perm='relatorio:producao'><RelProducao /></RequirePerm>} />
                <Route path='relatorios/parceiro'          element={<RequirePerm perm='relatorio:parceiro'><RelParceiro /></RequirePerm>} />
                <Route path='relatorios/tarefas'           element={<RequirePerm perm='relatorio:tarefas'><RelTarefas /></RequirePerm>} />
                {/* Outros */}
                <Route path='bater-ponto'                  element={<RequireInterno><BaterPonto /></RequireInterno>} />
                <Route path='configuracoes'                element={<RequireAnyPerm perms={CONFIGURACOES_ROUTE_PERMS}><Configuracoes /></RequireAnyPerm>} />
                <Route path='configuracoes/fluxo/:id'      element={<RequirePerm perm='menu:configuracoes'><ConfigurarFluxo /></RequirePerm>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  )
}
