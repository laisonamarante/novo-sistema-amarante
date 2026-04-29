import { createContext, useContext, type ReactNode } from 'react'

/**
 * Context interno do ProcessoForm.
 *
 * Objetivo: REDUZIR PROP DRILLING entre o ProcessoForm e os componentes
 * de aba extraídos. NÃO muda comportamento — só centraliza dados/derivados
 * que várias abas precisam ler.
 *
 * Mutations e estados de modais continuam vivendo no parent (ProcessoForm),
 * porque ainda há acoplamento forte com side-effects, navegação e callbacks
 * que misturam várias abas.
 */

export interface ProcessoFormPermissoes {
  isExterno: boolean
  isAdmin: boolean
  isRevisor: boolean
  podeSalvarProcesso: boolean
  podeGerenciarProcesso: boolean
  podeEditarDadosProcesso: boolean
  processoTravadoParaExterno: boolean
  podeIncluirVendedor: boolean
  podeIncluirImovel: boolean
  podeAlterarVendedor: boolean
  podeAlterarImovel: boolean
  podeGerenciarDocumentos: boolean
  modoSomenteLeitura: boolean
  podeCriarTarefa: boolean
  existeTarefaPendente: boolean
}

export interface ProcessoFormContextValue {
  // Identidade do processo
  id: string | undefined
  isEdicao: boolean

  // Dados do processo (raw da query)
  processo: any

  // Estado master do form
  form: any
  setForm: React.Dispatch<React.SetStateAction<any>>
  setF: (key: string, value: any) => void

  // Helpers de UI
  getUserName: (uid: number | null | undefined) => string

  // Dados auxiliares (queries listar)
  bancos: any[]
  agencias: any[]
  modalidades: any[]
  modalidadesFiltradas: any[]
  fluxos: any[]
  fluxosFiltrados: any[]
  situacoes: any[]
  usuarios: any[]
  usuariosInternos: any[]
  usuariosExecutantesTarefa: any[]
  parceiros: any[]
  corretores: any[]
  imobiliarias: any[]
  construtoras: any[]

  // Histórico (já com join de usuário) e pendências derivadas
  historicoData: any[]
  pendencias: any[]
  tarefasAbertas: any[]

  // Permissões derivadas
  permissoes: ProcessoFormPermissoes

  // Callbacks
  marcarAlteracaoAtendimento: (opcoes?: { exigirAgora?: boolean; irParaAtendimento?: boolean }) => void
}

const ProcessoFormContext = createContext<ProcessoFormContextValue | null>(null)

export function useProcessoFormContext(): ProcessoFormContextValue {
  const ctx = useContext(ProcessoFormContext)
  if (!ctx) {
    throw new Error('useProcessoFormContext deve ser usado dentro de <ProcessoFormProvider>.')
  }
  return ctx
}

interface ProviderProps {
  value: ProcessoFormContextValue
  children: ReactNode
}

export function ProcessoFormProvider({ value, children }: ProviderProps) {
  return <ProcessoFormContext.Provider value={value}>{children}</ProcessoFormContext.Provider>
}
