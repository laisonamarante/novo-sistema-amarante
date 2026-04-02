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
import { ClienteForm }    from './pages/Cadastros/ClienteForm'
import { Processos }      from './pages/Financiamento/Processos'
import { ProcessoForm }   from './pages/Financiamento/ProcessoForm'
import { PreAnalise }     from './pages/Financiamento/PreAnalise'
import { ContasPagar }    from './pages/Financeiro/ContasPagar'
import { ContasReceber }  from './pages/Financeiro/ContasReceber'
import { FluxoCaixa }     from './pages/Financeiro/FluxoCaixa'
import { Usuarios }       from './pages/Seguranca/Usuarios'
import { Tarefas }        from './pages/Seguranca/Tarefas'
import { Advertencias }   from './pages/Seguranca/Advertencias'
import { Avisos }         from './pages/Seguranca/Avisos'
import { Permissoes }     from './pages/Seguranca/Permissoes'
import { MeusArquivos }   from './pages/Arquivos/MeusArquivos'
import { RelProcessos }   from './pages/Relatorios/RelProcessos'
import { RelProducao }    from './pages/Relatorios/RelProducao'
import { RelParceiro }    from './pages/Relatorios/RelParceiro'
import { RelFinanceiro }  from './pages/Relatorios/RelFinanceiro'
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
                <Route index element={<Home />} />
                {/* Cadastros */}
                <Route path='cadastros/compradores'        element={<Compradores />} />
                <Route path='cadastros/compradores/novo'   element={<ClienteForm tipo='Comprador' />} />
                <Route path='cadastros/compradores/:id'    element={<ClienteForm tipo='Comprador' />} />
                <Route path='cadastros/vendedores'         element={<Vendedores />} />
                <Route path='cadastros/vendedores/novo'    element={<ClienteForm tipo='Vendedor' />} />
                <Route path='cadastros/vendedores/:id'     element={<ClienteForm tipo='Vendedor' />} />
                {/* Financiamento */}
                <Route path='financiamento/processos'      element={<Processos />} />
                <Route path='financiamento/processos/novo' element={<ProcessoForm />} />
                <Route path='financiamento/processos/:id'  element={<ProcessoForm />} />
                <Route path='financiamento/pre-analise'    element={<PreAnalise />} />
                {/* Financeiro - protegido */}
                <Route path='financeiro/contas-pagar'      element={<RequirePerm perm='menu:contas_pagar'><ContasPagar /></RequirePerm>} />
                <Route path='financeiro/contas-receber'    element={<RequirePerm perm='menu:contas_receber'><ContasReceber /></RequirePerm>} />
                <Route path='financeiro/fluxo-caixa'       element={<RequirePerm perm='menu:fluxo_caixa'><FluxoCaixa /></RequirePerm>} />
                {/* Seguranca - protegido */}
                <Route path='seguranca/usuarios'           element={<RequirePerm perm='menu:usuarios'><Usuarios /></RequirePerm>} />
                <Route path='seguranca/tarefas'            element={<RequirePerm perm='menu:tarefas'><Tarefas /></RequirePerm>} />
                <Route path='seguranca/advertencias'       element={<RequirePerm perm='menu:advertencias'><Advertencias /></RequirePerm>} />
                <Route path='seguranca/avisos'             element={<RequirePerm perm='menu:avisos'><Avisos /></RequirePerm>} />
                <Route path='seguranca/permissoes'         element={<RequirePerm perm='menu:configuracoes'><Permissoes /></RequirePerm>} />
                {/* Arquivos - protegido */}
                <Route path='arquivos'                     element={<RequirePerm perm='menu:arquivos'><MeusArquivos /></RequirePerm>} />
                {/* Relatorios - protegido */}
                <Route path='relatorios/processos'         element={<RequirePerm perm='menu:relatorios'><RelProcessos /></RequirePerm>} />
                <Route path='relatorios/producao'          element={<RequirePerm perm='menu:relatorios'><RelProducao /></RequirePerm>} />
                <Route path='relatorios/parceiro'          element={<RequirePerm perm='menu:relatorios'><RelParceiro /></RequirePerm>} />
                <Route path='relatorios/financeiro'        element={<RequirePerm perm='menu:relatorios_fin'><RelFinanceiro /></RequirePerm>} />
                <Route path='relatorios/tarefas'           element={<RequirePerm perm='menu:relatorios'><RelTarefas /></RequirePerm>} />
                {/* Outros */}
                <Route path='bater-ponto'                  element={<BaterPonto />} />
                <Route path='configuracoes'                element={<RequirePerm perm='menu:configuracoes'><Configuracoes /></RequirePerm>} />
                <Route path='configuracoes/fluxo/:id'      element={<RequirePerm perm='menu:configuracoes'><ConfigurarFluxo /></RequirePerm>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  )
}
