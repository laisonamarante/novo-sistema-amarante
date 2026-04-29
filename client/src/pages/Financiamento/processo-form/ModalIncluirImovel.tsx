import { Modal, Input, Btn } from '../../../components/ui'
import { Search } from 'lucide-react'

interface ImovelForm {
  matricula: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

interface ModalIncluirImovelProps {
  open: boolean
  onClose: () => void
  busca: string
  onChangeBusca: (v: string) => void
  modoManual: boolean
  onChangeModoManual: (v: boolean) => void
  imoveisFiltrados: any[]
  imoveisIdsVinculados: number[]
  onSelecionarImovel: (imovelId: number) => void
  imovelForm: ImovelForm
  onChangeImovelForm: (updater: (prev: ImovelForm) => ImovelForm) => void
  loadingCriar: boolean
  onCriarImovel: () => void
}

export function ModalIncluirImovel({
  open,
  onClose,
  busca,
  onChangeBusca,
  modoManual,
  onChangeModoManual,
  imoveisFiltrados,
  imoveisIdsVinculados,
  onSelecionarImovel,
  imovelForm,
  onChangeImovelForm,
  loadingCriar,
  onCriarImovel,
}: ModalIncluirImovelProps) {
  return (
    <Modal title="Incluir Imóvel" open={open} onClose={onClose} size="lg">
      <div className="space-y-4">
        {!modoManual ? (
          <>
            <div className="relative">
              <Input
                label="Buscar por matricula, endereco ou cidade"
                value={busca}
                onChange={e => onChangeBusca(e.target.value)}
                placeholder="Digite para filtrar..."
              />
              <Search size={14} className="absolute right-3 top-9 text-gray-400" />
            </div>
            <div className="border rounded max-h-60 overflow-y-auto">
              {imoveisFiltrados.length === 0 && <div className="p-3 text-center text-gray-400 text-sm">Nenhum imóvel encontrado.</div>}
              {imoveisFiltrados.slice(0, 20).map((im: any) => (
                <button
                  key={im.id}
                  onClick={() => onSelecionarImovel(im.id)}
                  disabled={imoveisIdsVinculados.includes(im.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 text-sm transition-colors ${imoveisIdsVinculados.includes(im.id) ? 'opacity-50 bg-gray-50' : ''}`}
                >
                  <span className="font-medium">{im.matricula ? `[${im.matricula}] ` : ''}{im.endereco}{im.numero ? `, ${im.numero}` : ''}</span>
                  <span className="text-gray-400 ml-2">{im.cidade}/{im.uf}</span>
                </button>
              ))}
            </div>
            <div className="pt-2 border-t">
              <Btn variant="ghost" size="sm" onClick={() => onChangeModoManual(true)}>+ Cadastrar novo imovel</Btn>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Matrícula" value={imovelForm.matricula} onChange={e => onChangeImovelForm(p => ({ ...p, matricula: e.target.value }))} />
              <Input label="Endereço *" value={imovelForm.endereco} onChange={e => onChangeImovelForm(p => ({ ...p, endereco: e.target.value }))} />
              <Input label="Numero" value={imovelForm.numero} onChange={e => onChangeImovelForm(p => ({ ...p, numero: e.target.value }))} />
              <Input label="Bairro" value={imovelForm.bairro} onChange={e => onChangeImovelForm(p => ({ ...p, bairro: e.target.value }))} />
              <Input label="Cidade *" value={imovelForm.cidade} onChange={e => onChangeImovelForm(p => ({ ...p, cidade: e.target.value }))} />
              <Input label="UF *" value={imovelForm.uf} onChange={e => onChangeImovelForm(p => ({ ...p, uf: e.target.value }))} maxLength={2} />
              <Input label="CEP" value={imovelForm.cep} onChange={e => onChangeImovelForm(p => ({ ...p, cep: e.target.value }))} />
            </div>
            <div className="flex justify-between">
              <Btn variant="ghost" size="sm" onClick={() => onChangeModoManual(false)}>Voltar para busca</Btn>
              <Btn size="sm" loading={loadingCriar} onClick={onCriarImovel}>Cadastrar e vincular</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
