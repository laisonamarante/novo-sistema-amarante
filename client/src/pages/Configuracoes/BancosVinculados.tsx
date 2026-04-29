import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { Button, Select, Table, Modal } from '../../components/ui'
import { Trash2 } from 'lucide-react'

interface BancosVinculadosProps {
  subestabelecidoId: number
  onClose: () => void
}

export function BancosVinculados({ subestabelecidoId, onClose }: BancosVinculadosProps) {
  const [bancoId, setBancoId] = useState(0)
  const bancosList = trpc.cadastros.bancos.listar.useQuery()
  const vinculados = trpc.cadastros.subestabelecidos.bancosVinculados.useQuery({ subestabelecidoId })
  const vincular = trpc.cadastros.subestabelecidos.vincularBanco.useMutation({ onSuccess: () => vinculados.refetch() })
  const desvincular = trpc.cadastros.subestabelecidos.desvincularBanco.useMutation({ onSuccess: () => vinculados.refetch() })

  return (
    <Modal open={true} title="Bancos vinculados" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2 items-end">
          <Select label="Banco" value={bancoId} onChange={e=>setBancoId(Number(e.target.value))}
            options={(bancosList.data||[]).map((b:any)=>({value:b.id,label:b.nome}))} placeholder="Selecione..." />
          <Button onClick={()=>{ if(bancoId) vincular.mutate({ subestabelecidoId, bancoId }); setBancoId(0) }}>Adicionar</Button>
        </div>
        <Table headers={['Banco','']} empty={!vinculados.data?.length ? 'Nenhum banco vinculado.' : undefined}>
          {vinculados.data?.map((v:any) => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm">{v.bancoNome}</td>
              <td className="px-4 py-2 w-10">
                <button onClick={()=>desvincular.mutate({id:v.id})} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </Modal>
  )
}
