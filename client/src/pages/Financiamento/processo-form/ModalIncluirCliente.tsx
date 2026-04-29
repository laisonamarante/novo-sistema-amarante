import { Modal, Input, Btn } from '../../../components/ui'
import { Search } from 'lucide-react'
import { formatCpfCnpj } from '../../../lib/documento'

interface ModalIncluirClienteProps {
  tipo: 'Comprador' | 'Vendedor'
  open: boolean
  onClose: () => void
  busca: string
  onChangeBusca: (v: string) => void
  modoManual: boolean
  onChangeModoManual: (v: boolean) => void
  clientesQuery: { isLoading?: boolean; data?: { lista?: any[] } | null | undefined } | any
  idsJaVinculados: number[]
  onSelecionarCliente: (clienteId: number) => void
  clienteManualNome: string
  onChangeClienteManualNome: (v: string) => void
  clienteManualCpf: string
  onChangeClienteManualCpf: (v: string) => void
  loadingCriar: boolean
  onCriarCliente: () => void
}

export function ModalIncluirCliente({
  tipo,
  open,
  onClose,
  busca,
  onChangeBusca,
  modoManual,
  onChangeModoManual,
  clientesQuery,
  idsJaVinculados,
  onSelecionarCliente,
  clienteManualNome,
  onChangeClienteManualNome,
  clienteManualCpf,
  onChangeClienteManualCpf,
  loadingCriar,
  onCriarCliente,
}: ModalIncluirClienteProps) {
  const titulo = `Incluir ${tipo}`
  const tipoLower = tipo.toLowerCase()

  return (
    <Modal title={titulo} open={open} onClose={onClose} size="lg">
      <div className="space-y-4">
        {!modoManual ? (
          <>
            <div className="relative">
              <Input
                label="Buscar por nome ou CPF"
                value={busca}
                onChange={e => onChangeBusca(e.target.value)}
                placeholder="Digite pelo menos 2 caracteres..."
              />
              <Search size={14} className="absolute right-3 top-9 text-gray-400" />
            </div>
            {busca.length >= 2 && (
              <div className="border rounded max-h-60 overflow-y-auto">
                {clientesQuery.isLoading && <div className="p-3 text-center text-gray-400 text-sm">Buscando...</div>}
                {clientesQuery.data?.lista?.length === 0 && (
                  <div className="p-3 text-center text-gray-400 text-sm">Nenhum {tipoLower} encontrado.</div>
                )}
                {(clientesQuery.data?.lista || []).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => onSelecionarCliente(c.id)}
                    disabled={idsJaVinculados.includes(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 text-sm transition-colors ${idsJaVinculados.includes(c.id) ? 'opacity-50 bg-gray-50' : ''}`}
                  >
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-gray-400 ml-2">{formatCpfCnpj(c.cpfCnpj)}</span>
                    {c.email && <span className="text-gray-400 ml-2 text-xs">{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="pt-2 border-t">
              <Btn variant="ghost" size="sm" onClick={() => onChangeModoManual(true)}>+ Cadastrar novo {tipoLower}</Btn>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome *" value={clienteManualNome} onChange={e => onChangeClienteManualNome(e.target.value)} />
              <Input label="CPF/CNPJ *" mask="cpfCnpj" value={clienteManualCpf} onChange={e => onChangeClienteManualCpf(e.target.value)} />
            </div>
            <div className="flex justify-between">
              <Btn variant="ghost" size="sm" onClick={() => onChangeModoManual(false)}>Voltar para busca</Btn>
              <Btn size="sm" loading={loadingCriar} onClick={onCriarCliente}>Cadastrar e vincular</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
