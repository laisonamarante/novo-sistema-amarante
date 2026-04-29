import { Plus, Trash2 } from 'lucide-react'
import { Btn, Table } from '../../../../components/ui'
import { formatCpfCnpj } from '../../../../lib/documento'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  onAbrirIncluirVendedor: () => void
  onRemoverVendedor: (clienteId: number) => void
  onTogglePropriedade: (clienteId: number, atual: boolean) => void
  vendedorData: any[]
}

export function AbaVendedor({
  onAbrirIncluirVendedor,
  onRemoverVendedor,
  onTogglePropriedade,
  vendedorData,
}: Props) {
  const { permissoes } = useProcessoFormContext()
  const { podeIncluirVendedor, podeAlterarVendedor } = permissoes

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Vendedores vinculados</h3>
        {podeIncluirVendedor && (
          <Btn size="sm" icon={<Plus size={13} />} onClick={onAbrirIncluirVendedor}>
            Incluir Vendedor
          </Btn>
        )}
      </div>
      {vendedorData.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum vendedor vinculado.</p>
      ) : (
        <Table headers={['CPF/CNPJ', 'Nome', 'Email', 'Telefone', 'Proponente', '']}>
          {vendedorData.map((v: any) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono">{formatCpfCnpj(v.cpfCnpj)}</td>
              <td className="px-4 py-3 text-sm font-medium">{v.nome}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{v.email || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{v.fone1 || '—'}</td>
              <td className="px-4 py-3 text-center">
                {podeAlterarVendedor ? (
                  <button
                    onClick={() => onTogglePropriedade(v.id, !!v.proponente)}
                    className={v.proponente ? 'text-yellow-500' : 'text-gray-300'}
                    title="Proponente"
                  >
                    <span style={{ fontSize: '18px' }}>★</span>
                  </button>
                ) : (
                  <span
                    className={v.proponente ? 'text-yellow-500' : 'text-gray-300'}
                    style={{ fontSize: '18px' }}
                  >
                    ★
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {podeAlterarVendedor && (
                  <button
                    onClick={() => onRemoverVendedor(v.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
