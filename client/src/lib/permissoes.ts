import { trpc } from './trpc'

export function usePermissoes() {
  const { data, isLoading } = trpc.permissoesPerfil.meuPerfil.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const pode = (recurso: string): boolean => {
    // Admin tem acesso a tudo
    if (data?.perfil === "Administrador") return true
    // Se nao carregou permissoes ainda, bloquear (exceto loading)
    if (!data?.permissoes) return false
    // Se recurso nao esta no mapa, NAO permitir (default deny)
    if (data.permissoes[recurso] === undefined) return false
    return data.permissoes[recurso] === true
  }

  const perfil = data?.perfil || ''
  const isExterno = ['Parceiro','Corretor','Imobiliária','Construtora','Subestabelecido'].includes(perfil)
  const isAdmin = perfil === 'Administrador'

  const parceiroId = data?.parceiroId || null
  const corretorId = data?.corretorId || null
  const imobiliariaId = data?.imobiliariaId || null
  const constutoraId = data?.constutoraId || null
  const subestabelecidoId = data?.subestabelecidoId || null

  return { pode, perfil, isExterno, isAdmin, isLoading, parceiroId, corretorId, imobiliariaId, constutoraId, subestabelecidoId }
}
