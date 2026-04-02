import { useState } from "react"
import { trpc } from "../../lib/trpc"
import { PageHeader, Card, Btn, Modal, Input, Select, Badge, Spinner } from "../../components/ui"
import { Plus, Edit, Trash2, Search, Eye, Printer } from "lucide-react"

const SITUACOES = ['Em análise', 'Aguardando análise', 'Apto', 'Não apto', 'Concluída'] as const
const BANCOS_FILTRO = ['Banco do Brasil', 'Bradesco', 'Itaú'] as const


const fmtDate = (d: any) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yyyy = dt.getFullYear();
  return dd+"/"+mm+"/"+yyyy;
};

export function PreAnalise() {
  const [filtro, setFiltro] = useState("")
  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([])
  const [filtroBancos, setFiltroBancos] = useState<string[]>([])
  const [modalNova, setModalNova] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalVisualizar, setModalVisualizar] = useState(false)
  const [selecionada, setSelecionada] = useState<any>(null)

  const preAnalise = trpc.preAnalise.listar.useQuery({ pagina: 1 })
  const utils = trpc.useUtils()

  const excluir = trpc.preAnalise.excluir.useMutation({
    onSuccess: () => utils.preAnalise.listar.invalidate()
  })

  const toggleFiltro = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const dados = (preAnalise.data || []).filter(p => {
    if (filtro) {
      const termo = filtro.toLowerCase()
      if (!(p.nome || '').toLowerCase().includes(termo) && !(p.cpfCnpj || '').includes(termo)) return false
    }
    if (filtroSituacao.length > 0 && !filtroSituacao.includes(p.situacao || 'Aguardando análise')) return false
    if (filtroBancos.length > 0) {
      const bancosItem = (p.bancos || '').split(',').map((b: string) => b.trim())
      if (!filtroBancos.some(fb => bancosItem.some((bi: string) => bi.toLowerCase().includes(fb.toLowerCase())))) return false
    }
    return true
  })

  return (
    <>
      <PageHeader title="Pré Análise"
        actions={<Btn onClick={() => setModalNova(true)}><Plus className="w-4 h-4 mr-1" /> Nova Pré-Análise</Btn>} />

      <Card className="p-4 mb-4">
        <div className="space-y-3">
          {/* Banco(s) checkboxes */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">Banco(s)</span>
            {BANCOS_FILTRO.map(b => (
              <label key={b} className="flex items-center gap-1 cursor-pointer text-sm">
                <input type="checkbox" checked={filtroBancos.includes(b)} onChange={() => toggleFiltro(filtroBancos, b, setFiltroBancos)} className="rounded text-blue-600" />
                {b}
              </label>
            ))}
          </div>
          {/* CPF/CNPJ | Solicitante */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="CPF/CNPJ" value={filtro} onChange={e => setFiltro(e.target.value)} />
            <Select label="Solicitante" value="" onChange={() => {}}
              options={[]} />
          </div>
          {/* Nome | Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={filtro} onChange={e => setFiltro(e.target.value)} />
            <Select label="Responsável" value="" onChange={() => {}}
              options={[]} />
          </div>
          {/* Situação | Pesquisar */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select label="Situação" value={filtroSituacao[0]||''} onChange={e => setFiltroSituacao(e.target.value ? [e.target.value] : [])}
                options={SITUACOES.map(s => ({value:s,label:s}))} />
            </div>
            <Btn onClick={() => preAnalise.refetch()}>Pesquisar</Btn>
          </div>
        </div>
      </Card>

      <Card>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-left">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Banco</th>
                <th className="px-4 py-3 text-left">Observação</th>
                <th className="px-4 py-3 text-left">Solicitante</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preAnalise.isLoading && (
                <tr><td colSpan={10} className="py-8 text-center"><Spinner size={20} /></td></tr>
              )}
              {!preAnalise.isLoading && dados.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center text-gray-400">Nenhuma pré-análise encontrada</td></tr>
              )}
              {dados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <button onClick={() => { if (confirm('Excluir esta pré-análise?')) excluir.mutate({ id: p.id }) }}
                      className="text-red-500 hover:text-red-700" title="Excluir">✕</button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={p.situacao || 'Aguardando análise'} color={
                      (p.situacao || '').includes('Em análise') ? 'bg-yellow-100 text-yellow-800' :
                      (p.situacao || '').includes('Aguardando') ? 'bg-blue-100 text-blue-800' :
                      p.situacao === 'Apto' ? 'bg-green-100 text-green-800' :
                      p.situacao === 'Não apto' ? 'bg-red-100 text-red-800' :
                      p.situacao === 'Concluída' ? 'bg-gray-100 text-gray-600' :
                      undefined
                    } />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{p.cpfCnpj}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">R$ {Number(p.valorFinanciamento || 0).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-gray-600">{p.bancos}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{(p as any).observacao || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(p as any).solicitanteNome || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate((p as any).criadoEm)}</td>
                  <td className="px-4 py-3 text-gray-600">{(p as any).responsavelNome || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nova */}
      <Modal title="Nova Pré-Análise" open={modalNova} onClose={() => setModalNova(false)} size="lg">
        <NovaPreAnalise onClose={() => setModalNova(false)} />
      </Modal>

      {/* Modal Editar */}
      <Modal title="Alterar Pré-Análise" open={modalEditar} onClose={() => { setModalEditar(false); setSelecionada(null) }} size="lg">
        {selecionada && <EditarPreAnalise item={selecionada} onClose={() => { setModalEditar(false); setSelecionada(null) }} />}
      </Modal>

      {/* Modal Visualizar */}
      <Modal title="Visualizar Pré-Análise" open={modalVisualizar} onClose={() => { setModalVisualizar(false); setSelecionada(null) }}>
        {selecionada && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Nome:</span> <strong>{selecionada.nome}</strong></div>
              <div><span className="text-gray-500">CPF/CNPJ:</span> <strong>{selecionada.cpfCnpj}</strong></div>
              <div><span className="text-gray-500">Banco(s):</span> {selecionada.bancos}</div>
              <div><span className="text-gray-500">Valor:</span> R$ {Number(selecionada.valorFinanciamento || 0).toLocaleString('pt-BR')}</div>
              <div><span className="text-gray-500">Situação:</span> {selecionada.situacao || 'Aguardando'}</div>
              <div><span className="text-gray-500">Estado Civil:</span> {selecionada.estadoCivil || '-'}</div>
              <div><span className="text-gray-500">CEP:</span> {selecionada.cep || '-'}</div>
              <div><span className="text-gray-500">Nome da Mãe:</span> {selecionada.nomeMae || '-'}</div>
            </div>
            {selecionada.retorno && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 text-xs font-medium block mb-1">Retorno:</span>
                <p className="text-gray-700">{selecionada.retorno}</p>
              </div>
            )}
            {selecionada.observacao && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 text-xs font-medium block mb-1">Observação:</span>
                <p className="text-gray-700">{selecionada.observacao}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Btn variant="ghost" onClick={() => { setModalVisualizar(false); setSelecionada(null) }}>Fechar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function NovaPreAnalise({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({ nome: '', cpfCnpj: '', dataNascimento: '', valorFinanciamento: '', estadoCivil: 'Solteiro', cpfConjuge: '', nomeConjuge: '', nomeMae: '', cep: '', observacao: '' })
  const [bancosSel, setBancosSel] = useState<string[]>([])

  const criar = trpc.preAnalise.criar.useMutation({
    onSuccess: () => { utils.preAnalise.listar.invalidate(); onClose() }
  })

  const toggleBanco = (b: string) => setBancosSel(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Banco(s)</label>
        <div className="flex gap-3">
          {['Banco do Brasil', 'Bradesco', 'Itaú'].map(b => (
            <label key={b} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={bancosSel.includes(b)} onChange={() => toggleBanco(b)} className="rounded" />
              {b}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
        <Input label="CPF/CNPJ" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} />
        <Input label="Data Nascimento" type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} />
        <Input label="Valor Financiamento" value={form.valorFinanciamento} onChange={e => setForm(f => ({ ...f, valorFinanciamento: e.target.value }))} placeholder="0,00" />
        <Select label="Estado Civil" value={form.estadoCivil} onChange={e => setForm(f => ({ ...f, estadoCivil: e.target.value }))}
          options={[{ value: 'Solteiro', label: 'Solteiro' }, { value: 'Casado', label: 'Casado' }]} />
        <Input label="CEP" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} />
      </div>
      {form.estadoCivil === 'Casado' && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="CPF Cônjuge" value={form.cpfConjuge} onChange={e => setForm(f => ({ ...f, cpfConjuge: e.target.value }))} />
          <Input label="Nome Cônjuge" value={form.nomeConjuge} onChange={e => setForm(f => ({ ...f, nomeConjuge: e.target.value }))} />
        </div>
      )}
      <Input label="Nome da Mãe" value={form.nomeMae} onChange={e => setForm(f => ({ ...f, nomeMae: e.target.value }))} />
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Observação</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.observacao}
          onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={criar.isPending} onClick={() => criar.mutate({ ...form, bancos: bancosSel.join(','), estadoCivil: form.estadoCivil as 'Solteiro'|'Casado'|undefined })}>Salvar</Btn>
      </div>
    </div>
  )
}

function EditarPreAnalise({ item, onClose }: { item: any; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    situacao: item.situacao || 'Aguardando análise',
    observacao: item.observacao || '',
    retorno: item.retorno || '',
    permitirReenvio: item.permitirReenvio || false,
  })

  const atualizar = trpc.preAnalise.atualizar.useMutation({
    onSuccess: () => { utils.preAnalise.listar.invalidate(); onClose() }
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div><span className="text-gray-500">Nome:</span> <strong>{item.nome}</strong></div>
        <div><span className="text-gray-500">CPF/CNPJ:</span> <strong>{item.cpfCnpj}</strong></div>
        <div><span className="text-gray-500">Banco(s):</span> {item.bancos}</div>
        <div><span className="text-gray-500">Valor:</span> R$ {Number(item.valorFinanciamento || 0).toLocaleString('pt-BR')}</div>
      </div>
      <Select label="Situação" value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))}
        options={SITUACOES.map(s => ({ value: s, label: s }))} />
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Observação</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.observacao}
          onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.permitirReenvio} onChange={e => setForm(f => ({ ...f, permitirReenvio: e.target.checked }))} className="rounded" />
        Permitir o reenvio
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn loading={atualizar.isPending} onClick={() => atualizar.mutate({ id: item.id, ...form })}>Salvar</Btn>
      </div>
    </div>
  )
}
