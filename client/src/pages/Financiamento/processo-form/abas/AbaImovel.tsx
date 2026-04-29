import { Plus, Trash2 } from 'lucide-react'
import { Btn, Table } from '../../../../components/ui'
import { useProcessoFormContext } from '../ProcessoFormContext'

interface Props {
  onAbrirIncluirImovel: () => void
  onRemoverImovel: (imovelId: number) => void
  imovelData: any[]
}

export function AbaImovel({ onAbrirIncluirImovel, onRemoverImovel, imovelData }: Props) {
  const { permissoes } = useProcessoFormContext()
  const { podeIncluirImovel, podeAlterarImovel } = permissoes

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Imóveis vinculados</h3>
        {podeIncluirImovel && (
          <Btn size="sm" icon={<Plus size={13} />} onClick={onAbrirIncluirImovel}>
            Incluir Imóvel
          </Btn>
        )}
      </div>
      {imovelData.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum imóvel vinculado.</p>
      ) : (
        <Table headers={['Matrícula', 'Endereço', 'Número', 'Complemento', 'Cidade', 'UF', 'CEP', '']}>
          {imovelData.map((im: any) => (
            <tr key={im.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono">{im.matricula || '—'}</td>
              <td className="px-4 py-3 text-sm">{im.endereco || '—'}</td>
              <td className="px-4 py-3 text-sm">{im.numero || '—'}</td>
              <td className="px-4 py-3 text-sm">{im.complemento || '—'}</td>
              <td className="px-4 py-3 text-sm">{im.cidade}</td>
              <td className="px-4 py-3 text-sm">{im.uf}</td>
              <td className="px-4 py-3 text-sm">{im.cep || '—'}</td>
              <td className="px-4 py-3">
                {podeAlterarImovel && (
                  <button
                    onClick={() => onRemoverImovel(im.id)}
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
