import { useEffect, useMemo, useState } from 'react'
import { trpc } from '../../lib/trpc'
import { Alert, Btn, Card, PageHeader, Loading } from '../../components/ui'
import { Shield, Check, X } from 'lucide-react'

const PERFIS = ['Administrador', 'Analista', 'Gerente', 'Corretor', 'Imobiliária', 'Parceiro', 'Construtora', 'Subestabelecido']
const PERFIS_EXTERNOS = ['Corretor', 'Imobiliária', 'Parceiro', 'Construtora', 'Subestabelecido']

type UiPermissao = {
  id: string
  label: string
  recursos: string[]
}

type GrupoPermissao = {
  titulo: string
  descricao?: string
  recursos: UiPermissao[]
}

function recurso(id: string, label: string, recursos: string[]): UiPermissao {
  return { id, label, recursos }
}

function grupoCrud(titulo: string, base: string, extras: string[] = []): GrupoPermissao {
  return {
    titulo,
    recursos: [
      recurso(`${base}:visualizar`, 'Visualizar', [base, ...extras]),
      recurso(`${base}:gravar`, 'Gravar', [`${base}:criar`, `${base}:editar`]),
      recurso(`${base}:excluir`, 'Excluir', [`${base}:excluir`]),
    ],
  }
}

const GRUPOS: GrupoPermissao[] = [
  {
    titulo: 'Acesso Principal',
    descricao: 'Controla as telas principais do sistema.',
    recursos: [
      recurso('acesso:home', 'Home', ['menu:home']),
      recurso('acesso:cadastros', 'Cadastros', ['menu:cadastros']),
      recurso('acesso:processos', 'Processos', ['menu:processos']),
      recurso('acesso:pre-analise', 'Pré-Análise', ['menu:pre_analise']),
      recurso('acesso:arquivos', 'Arquivos', ['menu:arquivos']),
    ],
  },
  {
    titulo: 'Tela Inicial',
    descricao: 'Blocos e atalhos visíveis na Home.',
    recursos: [
      recurso('home:simuladores', 'Simuladores', ['home:simuladores']),
      recurso('home:portais', 'Acesso ao Portal', ['home:portais']),
      recurso('home:meus-processos', 'Meus Processos', ['home:meus_processos']),
      recurso('home:analise-coban', 'Análise COBAN', ['home:analise_coban']),
      recurso('home:pre-analise', 'Pré-Análise na Home', ['home:pre_analise']),
      recurso('home:tarefas', 'Tarefas na Home', ['home:tarefas']),
    ],
  },
  {
    titulo: 'Cadastro de Cliente',
    descricao: 'No sistema antigo, comprador e vendedor ficam no mesmo pacote operacional.',
    recursos: [
      recurso('cliente:visualizar', 'Visualizar', ['menu:cadastros', 'cadastro:comprador', 'cadastro:vendedor']),
      recurso('cliente:gravar', 'Gravar', [
        'cadastro:comprador:criar',
        'cadastro:comprador:editar',
        'cadastro:vendedor:criar',
        'cadastro:vendedor:editar',
      ]),
      recurso('cliente:excluir', 'Excluir', ['cadastro:comprador:excluir', 'cadastro:vendedor:excluir']),
    ],
  },
  grupoCrud('Cadastro de Imóvel', 'cadastro:imovel', ['menu:cadastros']),
  {
    titulo: 'Cadastro de Processo',
    recursos: [
      recurso('processo:visualizar', 'Visualizar', ['menu:processos']),
      recurso('processo:gravar', 'Gravar', ['processo:criar', 'processo:editar']),
      recurso('processo:arquivar', 'Arquivar', ['processo:arquivar']),
      recurso('processo:ver-todos', 'Ver todos os processos', ['processo:ver_todos']),
      recurso('processo:excluir', 'Excluir', ['processo:excluir']),
    ],
  },
  {
    titulo: 'Pré-Análise',
    recursos: [
      recurso('pre-analise:visualizar', 'Visualizar', ['menu:pre_analise']),
      recurso('pre-analise:gravar', 'Gravar', ['pre_analise:criar', 'pre_analise:editar', 'pre_analise:concluir']),
      recurso('pre-analise:excluir', 'Excluir', ['pre_analise:excluir']),
    ],
  },
  {
    titulo: 'Cadastros Externos de Apoio',
    descricao: 'Esses cadastros representam os agentes externos que usam o sistema.',
    recursos: [
      recurso('cadastro:construtora:visualizar', 'Construtora - Visualizar', ['cadastro:construtora', 'menu:cadastros']),
      recurso('cadastro:construtora:gravar', 'Construtora - Gravar', ['cadastro:construtora:criar', 'cadastro:construtora:editar']),
      recurso('cadastro:construtora:excluir', 'Construtora - Excluir', ['cadastro:construtora:excluir']),
      recurso('cadastro:empreendimento:visualizar', 'Empreendimento - Visualizar', ['cadastro:empreendimento', 'menu:cadastros']),
      recurso('cadastro:empreendimento:gravar', 'Empreendimento - Gravar', ['cadastro:empreendimento:criar', 'cadastro:empreendimento:editar']),
      recurso('cadastro:empreendimento:excluir', 'Empreendimento - Excluir', ['cadastro:empreendimento:excluir']),
      recurso('cadastro:agencia:visualizar', 'Agência - Visualizar', ['cadastro:agencia', 'menu:cadastros']),
      recurso('cadastro:agencia:gravar', 'Agência - Gravar', ['cadastro:agencia:criar', 'cadastro:agencia:editar']),
      recurso('cadastro:agencia:excluir', 'Agência - Excluir', ['cadastro:agencia:excluir']),
      recurso('cadastro:imobiliaria:visualizar', 'Imobiliária - Visualizar', ['cadastro:imobiliaria', 'menu:cadastros']),
      recurso('cadastro:imobiliaria:gravar', 'Imobiliária - Gravar', ['cadastro:imobiliaria:criar', 'cadastro:imobiliaria:editar']),
      recurso('cadastro:imobiliaria:excluir', 'Imobiliária - Excluir', ['cadastro:imobiliaria:excluir']),
      recurso('cadastro:corretor:visualizar', 'Corretor - Visualizar', ['cadastro:corretor', 'menu:cadastros']),
      recurso('cadastro:corretor:gravar', 'Corretor - Gravar', ['cadastro:corretor:criar', 'cadastro:corretor:editar']),
      recurso('cadastro:corretor:excluir', 'Corretor - Excluir', ['cadastro:corretor:excluir']),
      recurso('cadastro:parceiro:visualizar', 'Parceiro - Visualizar', ['cadastro:parceiro', 'menu:cadastros']),
      recurso('cadastro:parceiro:gravar', 'Parceiro - Gravar', ['cadastro:parceiro:criar', 'cadastro:parceiro:editar']),
      recurso('cadastro:parceiro:excluir', 'Parceiro - Excluir', ['cadastro:parceiro:excluir']),
      recurso('cadastro:subestabelecido:visualizar', 'Subestabelecido - Visualizar', ['cadastro:subestabelecido', 'menu:cadastros']),
      recurso('cadastro:subestabelecido:gravar', 'Subestabelecido - Gravar', ['cadastro:subestabelecido:criar', 'cadastro:subestabelecido:editar']),
      recurso('cadastro:subestabelecido:excluir', 'Subestabelecido - Excluir', ['cadastro:subestabelecido:excluir']),
    ],
  },
  {
    titulo: 'Configurações Internas',
    descricao: 'No sistema atual, bancos, modalidades, fluxos, etapas, situações e documentos compartilham o mesmo acesso interno.',
    recursos: [
      recurso('config:visualizar', 'Acessar configurações internas', ['menu:configuracoes']),
      recurso('config:usuarios', 'Usuários', ['menu:usuarios']),
      recurso('config:advertencias', 'Advertências', ['menu:advertencias']),
      recurso('config:avisos', 'Avisos', ['menu:avisos']),
    ],
  },
  {
    titulo: 'Tarefas',
    recursos: [
      recurso('tarefas:menu', 'Acessar tarefas', ['menu:tarefas']),
      recurso('tarefas:criar', 'Criar', ['tarefa:criar']),
      recurso('tarefas:resolver', 'Resolver', ['tarefa:resolver']),
      recurso('tarefas:visualizar', 'Visualizar', ['tarefa:visualizar']),
    ],
  },
  {
    titulo: 'Relatórios',
    recursos: [
      recurso('relatorios:menu', 'Menu Relatórios', ['menu:relatorios']),
      recurso('relatorios:processos', 'Processos por Etapa', ['relatorio:processos']),
      recurso('relatorios:producao', 'Produção', ['relatorio:producao']),
      recurso('relatorios:parceiro', 'Parceiro', ['relatorio:parceiro']),
      recurso('relatorios:tarefas', 'Tarefas', ['relatorio:tarefas']),
    ],
  },
]

const TODAS_CHAVES_BRUTAS = Array.from(new Set(GRUPOS.flatMap(grupo => grupo.recursos.flatMap(recurso => recurso.recursos))))
const TODOS_IDS_UI = GRUPOS.flatMap(grupo => grupo.recursos.map(recurso => recurso.id))

function mapearPermissoesBrutas(lista?: { recurso: string; permitido: boolean }[]) {
  const mapa: Record<string, boolean> = {}
  TODAS_CHAVES_BRUTAS.forEach((recurso) => {
    mapa[recurso] = false
  })
  lista?.forEach((item) => {
    mapa[item.recurso] = item.permitido === true
  })
  return mapa
}

function mapearPermissoesUi(mapaBruto: Record<string, boolean>) {
  const mapaUi: Record<string, boolean> = {}
  GRUPOS.forEach((grupo) => {
    grupo.recursos.forEach((item) => {
      mapaUi[item.id] = item.recursos.length > 0 && item.recursos.every((recurso) => mapaBruto[recurso] === true)
    })
  })
  return mapaUi
}

function expandirPermissoesUi(mapaUi: Record<string, boolean>) {
  const mapaBruto: Record<string, boolean> = {}
  TODAS_CHAVES_BRUTAS.forEach((recurso) => {
    mapaBruto[recurso] = false
  })

  GRUPOS.forEach((grupo) => {
    grupo.recursos.forEach((item) => {
      item.recursos.forEach((recurso) => {
        mapaBruto[recurso] = mapaBruto[recurso] || mapaUi[item.id] === true
      })
    })
  })

  return mapaBruto
}

export function Permissoes() {
  const [perfilSelecionado, setPerfilSelecionado] = useState('Parceiro')
  const [draftPerms, setDraftPerms] = useState<Record<string, boolean>>(() => mapearPermissoesUi(mapearPermissoesBrutas()))
  const utils = trpc.useUtils()

  const { data: permissoes, isLoading } = trpc.permissoesPerfil.listarPorPerfil.useQuery(
    { perfil: perfilSelecionado },
    { enabled: !!perfilSelecionado }
  )

  const salvarLote = trpc.permissoesPerfil.salvarLote.useMutation({
    onSuccess: async (_, variables) => {
      await utils.permissoesPerfil.listarPorPerfil.invalidate({ perfil: variables.perfil })
      await utils.permissoesPerfil.meuPerfil.invalidate()
    },
    onError: () => {
      window.alert('Não foi possível salvar as permissões. Tente novamente.')
    },
  })

  const rawMap = useMemo(() => mapearPermissoesBrutas(permissoes), [permissoes])
  const permMap = useMemo(() => mapearPermissoesUi(rawMap), [rawMap])

  useEffect(() => {
    setDraftPerms(permMap)
  }, [perfilSelecionado, permMap])

  const alteracoesPendentes = TODOS_IDS_UI.filter((recurso) => (draftPerms[recurso] ?? false) !== (permMap[recurso] ?? false))
  const temAlteracoesPendentes = alteracoesPendentes.length > 0

  useEffect(() => {
    if (!temAlteracoesPendentes) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [temAlteracoesPendentes])

  const toggle = (recurso: string) => {
    setDraftPerms((atual) => ({
      ...atual,
      [recurso]: !(atual[recurso] === true),
    }))
  }

  const totalPermitidos = Object.values(draftPerms).filter(Boolean).length
  const totalRecursos = TODOS_IDS_UI.length

  const salvarAlteracoes = async (perfil = perfilSelecionado) => {
    const bruto = expandirPermissoesUi(draftPerms)
    await salvarLote.mutateAsync({
      perfil,
      permissoes: TODAS_CHAVES_BRUTAS.map((recurso) => ({
        recurso,
        permitido: bruto[recurso] === true,
      })),
    })
  }

  const trocarPerfil = async (novoPerfil: string) => {
    if (novoPerfil === perfilSelecionado) return

    if (temAlteracoesPendentes) {
      const salvarAntes = window.confirm(
        `Existem ${alteracoesPendentes.length} alterações não salvas no perfil ${perfilSelecionado}. Clique OK para salvar antes de trocar de perfil.`
      )

      if (!salvarAntes) return

      await salvarAlteracoes(perfilSelecionado)
    }

    setPerfilSelecionado(novoPerfil)
  }

  const descartarAlteracoes = () => {
    setDraftPerms(permMap)
  }

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
            {PERFIS.map((perfil) => (
              <button
                key={perfil}
                onClick={() => { void trocarPerfil(perfil) }}
                disabled={salvarLote.isPending}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  perfil === perfilSelecionado
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {perfil}
              </button>
            ))}
          </div>
          {permissoes && (
            <span className="text-xs text-gray-400 ml-auto">
              {totalPermitidos}/{totalRecursos} permissões ativas
            </span>
          )}
        </div>
      </Card>

      {isLoading ? <Loading /> : (
        <div className="space-y-4">
          {PERFIS_EXTERNOS.includes(perfilSelecionado) && (
            <Alert
              type="info"
              message="Perfis externos no sistema antigo trabalham com uma matriz mais enxuta: cliente, imóvel, processo e pré-análise, sempre limitados ao próprio escopo."
            />
          )}

          {temAlteracoesPendentes && (
            <Alert
              type="warning"
              message={`Há ${alteracoesPendentes.length} alterações pendentes neste perfil. Clique em "Salvar alterações" antes de sair desta página.`}
            />
          )}

          {GRUPOS.map((grupo) => (
            <Card key={grupo.titulo} className="p-4">
              <div className="mb-3 border-b pb-2">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{grupo.titulo}</h3>
                {grupo.descricao && <p className="text-xs text-gray-500 mt-1">{grupo.descricao}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {grupo.recursos.map((item) => {
                  const permitido = draftPerms[item.id] === true
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      disabled={salvarLote.isPending}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                        permitido
                          ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <span className="font-medium text-left">{item.label}</span>
                      {permitido ? (
                        <Check size={16} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <X size={16} className="text-red-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          ))}

          <Card className="sticky bottom-4 p-4 border-blue-200 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Salvar permissões do perfil {perfilSelecionado}</p>
                <p className="text-xs text-gray-500">
                  {temAlteracoesPendentes
                    ? `${alteracoesPendentes.length} alterações aguardando confirmação.`
                    : 'Nenhuma alteração pendente no momento.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Btn
                  variant="secondary"
                  onClick={descartarAlteracoes}
                  disabled={!temAlteracoesPendentes || salvarLote.isPending}
                >
                  Descartar
                </Btn>
                <Btn
                  onClick={() => { void salvarAlteracoes() }}
                  loading={salvarLote.isPending}
                  disabled={!temAlteracoesPendentes}
                >
                  Salvar alterações
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
