import { Plus, Trash2 } from 'lucide-react'
import { Btn, Table } from '../../../../components/ui'
import { formatCpfCnpj } from '../../../../lib/documento'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  onAbrirIncluirComprador: () => void
  onRemoverComprador: (clienteId: number) => void
  onTogglePropriedade: (clienteId: number, atual: boolean) => void
  compradorData: any[]
}

export function AbaComprador({
  onAbrirIncluirComprador,
  onRemoverComprador,
  onTogglePropriedade,
  compradorData,
}: Props) {
  const { isEdicao, permissoes } = useProcessoFormContext()
  const { podeEditarDadosProcesso } = permissoes

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Compradores vinculados</h3>
        {podeEditarDadosProcesso && (
          <Btn size="sm" icon={<Plus size={13} />} onClick={onAbrirIncluirComprador}>
            Incluir Comprador
          </Btn>
        )}
      </div>
      {compradorData.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum comprador vinculado.</p>
      ) : (
        <Table headers={['CPF/CNPJ', 'Nome', 'Email', 'Telefone', 'Proponente', '']}>
          {compradorData.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono">{formatCpfCnpj(c.cpfCnpj)}</td>
              <td className="px-4 py-3 text-sm font-medium">{c.nome}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{c.email || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{c.fone1 || '—'}</td>
              <td className="px-4 py-3 text-center">
                {isEdicao && podeEditarDadosProcesso ? (
                  <button
                    onClick={() => onTogglePropriedade(c.id, !!c.proponente)}
                    className={c.proponente ? 'text-yellow-500' : 'text-gray-300'}
                    title="Proponente"
                  >
                    <span style={{ fontSize: '18px' }}>★</span>
                  </button>
                ) : (
                  <span
                    className={c.proponente ? 'text-yellow-500' : 'text-gray-300'}
                    style={{ fontSize: '18px' }}
                  >
                    ★
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {podeEditarDadosProcesso && (
                  <button
                    onClick={() => onRemoverComprador(c.id)}
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
