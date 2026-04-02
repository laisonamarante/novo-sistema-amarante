import { useState } from 'react'
import { usePermissoes } from '../../lib/permissoes'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { Table, Btn, PageHeader, Pagination, Input } from '../../components/ui'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

function ClienteLista({ tipo }: { tipo: 'Comprador' | 'Vendedor' }) {
  const { pode } = usePermissoes()
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [pagina, setPagina] = useState(1)
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.clientes.listar.useQuery({ tipo, busca: buscaAtiva, pagina })
  const excluir = trpc.clientes.excluir.useMutation({ 
    onSuccess: () => {
      utils.clientes.listar.invalidate()
    }
  })

  const base = tipo === 'Comprador' ? '/cadastros/compradores' : '/cadastros/vendedores'
  const tipoLower = tipo === 'Comprador' ? 'comprador' : 'vendedor'

  return (
    <div>
      <PageHeader
        title={`Cadastro de ${tipo}`}
        actions={
          pode(`cadastro:${tipoLower}:criar`) ? (
            <Link to={`${base}/novo`}>
              <Btn icon={<Plus size={15}/>}>Novo</Btn>
            </Link>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-3">
        <div className="flex-1">
          <Input
            placeholder={`Digite o nome ou CPF para pesquisar...`}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setBuscaAtiva(busca), setPagina(1))}
          />
        </div>
        <Btn variant="secondary" icon={<Search size={15}/>}
          onClick={() => { setBuscaAtiva(busca); setPagina(1) }}>
          Pesquisar
        </Btn>
      </div>

      <Table
        headers={['', 'Nome', 'CPF/CNPJ', 'Fone 1', 'Fone 2', 'Fone 3', 'E-mail']}
        loading={isLoading}
        empty={data?.lista.length === 0 ? 'Nenhum registro encontrado.' : undefined}
      >
        {data?.lista.map(c => (
          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center gap-2">
                {pode(`cadastro:${tipoLower}:editar`) && (
                  <Link to={`${base}/${c.id}`} className="text-blue-600 hover:text-blue-800" title="Editar">
                    <Edit size={15}/>
                  </Link>
                )}
                {pode(`cadastro:${tipoLower}:excluir`) && (
                  <button
                    onClick={() => { if(confirm('Excluir este registro?')) excluir.mutate({ id: c.id }) }}
                    className="text-red-500 hover:text-red-700" title="Excluir">
                    <Trash2 size={15}/>
                  </button>
                )}
              </div>
            </td>
            <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
            <td className="px-4 py-3 font-mono text-sm text-gray-600">{c.cpfCnpj}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.fone1}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.fone2}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.fone3}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
          </tr>
        ))}
      </Table>

      <Pagination pagina={pagina} total={data?.paginas || 1} onChange={setPagina}/>
    </div>
  )
}

export function Compradores() { return <ClienteLista tipo="Comprador"/> }
export function Vendedores()  { return <ClienteLista tipo="Vendedor"/> }
