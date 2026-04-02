import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { Btn, Card, PageHeader, Select, Loading } from '../../components/ui'
import { Shield, Check, X } from 'lucide-react'

const PERFIS = ['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Financeiro','Engenheiro','Atendente','Subestabelecido']

const GRUPOS: { titulo: string; recursos: { key: string; label: string }[] }[] = [
  { titulo: 'Menu Principal', recursos: [
    { key: 'menu:home', label: 'Home' },
    { key: 'menu:cadastros', label: 'Cadastros' },
    { key: 'menu:configuracoes', label: 'Configurações' },
    { key: 'menu:processos', label: 'Processos' },
    { key: 'menu:pre_analise', label: 'Pré-Análise' },
    { key: 'menu:contas_pagar', label: 'Contas a Pagar' },
    { key: 'menu:contas_receber', label: 'Contas a Receber' },
    { key: 'menu:fluxo_caixa', label: 'Fluxo de Caixa' },
    { key: 'menu:relatorios_fin', label: 'Relatórios Financeiros' },
    { key: 'menu:usuarios', label: 'Usuários' },
    { key: 'menu:advertencias', label: 'Advertências' },
    { key: 'menu:avisos', label: 'Avisos' },
    { key: 'menu:tarefas', label: 'Tarefas' },
    { key: 'menu:relatorios', label: 'Relatórios' },
    { key: 'menu:arquivos', label: 'Arquivos' },
  ]},
  { titulo: 'Tela Inicial (Home)', recursos: [
    { key: 'home:simuladores', label: 'Simuladores' },
    { key: 'home:portais', label: 'Acesso ao Portal' },
    { key: 'home:meus_processos', label: 'Meus Processos' },
    { key: 'home:analise_coban', label: 'Análise COBAN' },
    { key: 'home:pre_analise', label: 'Pré-Análise (Home)' },
    { key: 'home:tarefas', label: 'Tarefas (Home)' },
  ]},
  { titulo: 'Financiamento - Processos', recursos: [
    { key: 'processo:criar', label: 'Criar Processo' },
    { key: 'processo:editar', label: 'Editar Processo' },
    { key: 'processo:excluir', label: 'Excluir Processo' },
    { key: 'processo:arquivar', label: 'Arquivar Processo' },
    { key: 'processo:ver_todos', label: 'Ver Todos os Processos' },
  ]},
  { titulo: 'Financiamento - Pré-Análise', recursos: [
    { key: 'pre_analise:criar', label: 'Criar' },
    { key: 'pre_analise:editar', label: 'Editar' },
    { key: 'pre_analise:excluir', label: 'Excluir' },
    { key: 'pre_analise:concluir', label: 'Concluir' },
  ]},
  { titulo: 'Cadastros - Comprador/Vendedor/Imóvel', recursos: [
    { key: 'cadastro:comprador', label: 'Visualizar Comprador' },
    { key: 'cadastro:comprador:criar', label: 'Criar Comprador' },
    { key: 'cadastro:comprador:editar', label: 'Editar Comprador' },
    { key: 'cadastro:comprador:excluir', label: 'Excluir Comprador' },
    { key: 'cadastro:vendedor', label: 'Visualizar Vendedor' },
    { key: 'cadastro:vendedor:criar', label: 'Criar Vendedor' },
    { key: 'cadastro:vendedor:editar', label: 'Editar Vendedor' },
    { key: 'cadastro:vendedor:excluir', label: 'Excluir Vendedor' },
    { key: 'cadastro:imovel', label: 'Visualizar Imóvel' },
    { key: 'cadastro:imovel:criar', label: 'Criar Imóvel' },
    { key: 'cadastro:imovel:editar', label: 'Editar Imóvel' },
    { key: 'cadastro:imovel:excluir', label: 'Excluir Imóvel' },
  ]},
  { titulo: 'Cadastros - Construtora/Empreendimento', recursos: [
    { key: 'cadastro:construtora', label: 'Visualizar Construtora' },
    { key: 'cadastro:construtora:criar', label: 'Criar' },
    { key: 'cadastro:construtora:editar', label: 'Editar' },
    { key: 'cadastro:construtora:excluir', label: 'Excluir' },
    { key: 'cadastro:empreendimento', label: 'Visualizar Empreendimento' },
    { key: 'cadastro:empreendimento:criar', label: 'Criar' },
    { key: 'cadastro:empreendimento:editar', label: 'Editar' },
    { key: 'cadastro:empreendimento:excluir', label: 'Excluir' },
  ]},
  { titulo: 'Cadastros - Imobiliária/Corretor/Parceiro/Agência', recursos: [
    { key: 'cadastro:imobiliaria', label: 'Visualizar Imobiliária' },
    { key: 'cadastro:imobiliaria:criar', label: 'Criar' },
    { key: 'cadastro:imobiliaria:editar', label: 'Editar' },
    { key: 'cadastro:imobiliaria:excluir', label: 'Excluir' },
    { key: 'cadastro:corretor', label: 'Visualizar Corretor' },
    { key: 'cadastro:corretor:criar', label: 'Criar' },
    { key: 'cadastro:corretor:editar', label: 'Editar' },
    { key: 'cadastro:corretor:excluir', label: 'Excluir' },
    { key: 'cadastro:parceiro', label: 'Visualizar Parceiro' },
    { key: 'cadastro:parceiro:criar', label: 'Criar' },
    { key: 'cadastro:parceiro:editar', label: 'Editar' },
    { key: 'cadastro:parceiro:excluir', label: 'Excluir' },
    { key: 'cadastro:subestabelecido', label: 'Visualizar Subestabelecido' },
    { key: 'cadastro:subestabelecido:criar', label: 'Criar' },
    { key: 'cadastro:subestabelecido:editar', label: 'Editar' },
    { key: 'cadastro:subestabelecido:excluir', label: 'Excluir' },
    { key: 'cadastro:agencia', label: 'Visualizar Agência' },
    { key: 'cadastro:agencia:criar', label: 'Criar' },
    { key: 'cadastro:agencia:editar', label: 'Editar' },
    { key: 'cadastro:agencia:excluir', label: 'Excluir' },
  ]},
  { titulo: 'Financeiro', recursos: [
    { key: 'financeiro:pagar:criar', label: 'Criar Conta a Pagar' },
    { key: 'financeiro:pagar:editar', label: 'Editar Conta a Pagar' },
    { key: 'financeiro:pagar:excluir', label: 'Excluir Conta a Pagar' },
    { key: 'financeiro:receber:criar', label: 'Criar Conta a Receber' },
    { key: 'financeiro:receber:editar', label: 'Editar Conta a Receber' },
    { key: 'financeiro:receber:excluir', label: 'Excluir Conta a Receber' },
    { key: 'financeiro:fluxo:criar', label: 'Criar Lançamento Fluxo' },
    { key: 'financeiro:fluxo:excluir', label: 'Excluir Lançamento Fluxo' },
  ]},
  { titulo: 'Relatórios', recursos: [
    { key: 'relatorio:processos', label: 'Relatório de Processos' },
    { key: 'relatorio:producao', label: 'Relatório de Produção' },
    { key: 'relatorio:parceiro', label: 'Relatório de Parceiro' },
    { key: 'relatorio:tarefas', label: 'Relatório de Tarefas' },
    { key: 'relatorio:financeiro', label: 'Relatório Financeiro' },
  ]},
]

export function Permissoes() {
  const [perfilSelecionado, setPerfilSelecionado] = useState('Parceiro')
  const utils = trpc.useUtils()

  const { data: permissoes, isLoading } = trpc.permissoesPerfil.listarPorPerfil.useQuery(
    { perfil: perfilSelecionado },
    { enabled: !!perfilSelecionado }
  )

  const atualizar = trpc.permissoesPerfil.atualizar.useMutation({
    onSuccess: () => utils.permissoesPerfil.listarPorPerfil.invalidate({ perfil: perfilSelecionado })
  })

  const permMap: Record<string, boolean> = {}
  permissoes?.forEach(p => { permMap[p.recurso] = p.permitido })

  const toggle = (recurso: string) => {
    const atual = permMap[recurso] !== false
    atualizar.mutate({ perfil: perfilSelecionado, recurso, permitido: !atual })
  }

  const totalPermitidos = Object.values(permMap).filter(v => v).length
  const totalRecursos = GRUPOS.reduce((acc, g) => acc + g.recursos.length, 0)

  return (
    <div>
      <PageHeader title="Permissões por Perfil" />

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Perfil:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PERFIS.map(p => (
              <button key={p} onClick={() => setPerfilSelecionado(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  p === perfilSelecionado
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {p}
              </button>
            ))}
          </div>
          {permissoes && (
            <span className="text-xs text-gray-400 ml-auto">
              {totalPermitidos}/{totalRecursos} recursos permitidos
            </span>
          )}
        </div>
      </Card>

      {isLoading ? <Loading /> : (
        <div className="space-y-4">
          {GRUPOS.map(grupo => (
            <Card key={grupo.titulo} className="p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider border-b pb-2">
                {grupo.titulo}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {grupo.recursos.map(r => {
                  const permitido = permMap[r.key] !== false
                  return (
                    <button key={r.key} onClick={() => toggle(r.key)}
                      disabled={atualizar.isPending}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                        permitido
                          ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}>
                      <span className="font-medium">{r.label}</span>
                      {permitido
                        ? <Check size={16} className="text-green-600" />
                        : <X size={16} className="text-red-500" />
                      }
                    </button>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
