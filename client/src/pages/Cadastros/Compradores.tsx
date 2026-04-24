import { useEffect, useState } from 'react'
import { usePermissoes } from '../../lib/permissoes'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { Table, Btn, PageHeader, Pagination, Input, Modal } from '../../components/ui'
import { formatCpfCnpj } from '../../lib/documento'
import { ClienteForm } from './ClienteForm'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

type CadastroAberto = number | 'novo' | null
type CadastroRota = 'novo' | 'editar'

function ClienteLista({ tipo, cadastroRota }: { tipo: 'Comprador' | 'Vendedor'; cadastroRota?: CadastroRota }) {
  const { pode } = usePermissoes()
  const { id } = useParams()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [pagina, setPagina] = useState(1)
  const utils = trpc.useUtils()

  const base = tipo === 'Comprador' ? '/cadastros/compradores' : '/cadastros/vendedores'
  const cadastroDaRota: CadastroAberto = cadastroRota === 'novo'
    ? 'novo'
    : cadastroRota === 'editar' && id && Number.isFinite(Number(id))
      ? Number(id)
      : null
  const [cadastroAberto, setCadastroAberto] = useState<CadastroAberto>(cadastroDaRota)

  const { data, isLoading } = trpc.clientes.listar.useQuery({ tipo, busca: buscaAtiva, pagina })
  const excluir = trpc.clientes.excluir.useMutation({ 
    onSuccess: () => {
      utils.clientes.listar.invalidate()
    }
  })

  const tipoLower = tipo === 'Comprador' ? 'comprador' : 'vendedor'
  const tituloModal = cadastroAberto === 'novo' ? `Novo ${tipo}` : `Editar ${tipo}`

  useEffect(() => {
    if (cadastroRota) setCadastroAberto(cadastroDaRota)
  }, [cadastroRota, cadastroDaRota])

  const fecharCadastro = () => {
    setCadastroAberto(null)
    if (cadastroRota) navigate(base, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={`Cadastro de ${tipo}`}
        actions={
          pode(`cadastro:${tipoLower}:criar`) ? (
            <Btn icon={<Plus size={15}/>} onClick={() => setCadastroAberto('novo')}>Novo</Btn>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-3">
        <div className="flex-1">
          <Input
            placeholder={`Digite o nome ou CPF para pesquisar...`}
            value={busca}
            mask="cpfCnpj"
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
                  <button type="button" onClick={() => setCadastroAberto(c.id)} className="text-blue-600 hover:text-blue-800" title="Editar">
                    <Edit size={15}/>
                  </button>
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
            <td className="px-4 py-3 font-mono text-sm text-gray-600">{formatCpfCnpj(c.cpfCnpj)}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.fone1}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.fone2}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.fone3}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
          </tr>
        ))}
      </Table>

      <Pagination pagina={pagina} total={data?.paginas || 1} onChange={setPagina}/>

      <Modal title={tituloModal} open={cadastroAberto !== null} onClose={fecharCadastro} size="full">
        {cadastroAberto !== null && (
          <ClienteForm
            key={`${tipo}-${cadastroAberto}`}
            tipo={tipo}
            clienteId={cadastroAberto}
            modoPopup
            onClose={fecharCadastro}
            onSaved={() => utils.clientes.listar.invalidate()}
          />
        )}
      </Modal>
    </div>
  )
}

export function Compradores({ cadastroRota }: { cadastroRota?: CadastroRota }) { return <ClienteLista tipo="Comprador" cadastroRota={cadastroRota}/> }
export function Vendedores({ cadastroRota }: { cadastroRota?: CadastroRota })  { return <ClienteLista tipo="Vendedor" cadastroRota={cadastroRota}/> }
