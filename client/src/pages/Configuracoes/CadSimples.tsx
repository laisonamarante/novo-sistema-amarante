import { useState } from 'react'
import { Button, Input, Select, Textarea, Table, Loading, Modal } from '../../components/ui'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { formatCnpj, formatCpf, formatCpfCnpj, type DocumentoMask } from '../../lib/documento'
import { usePermissoes } from '../../lib/permissoes'

export type CampoType = 'text' | 'select' | 'number' | 'checkbox' | 'textarea'

export interface CampoConfig {
  key: string
  label: string
  required?: boolean
  type?: CampoType
  options?: { value: string | number; label: string }[]
  hideTable?: boolean
}

export function campoDocumentoMask(campo: CampoConfig): DocumentoMask | undefined {
  const key = campo.key.toLowerCase()
  const label = campo.label.toLowerCase()

  if (key === 'cpf' || (label.includes('cpf') && !label.includes('cnpj'))) return 'cpf'
  if (key === 'cnpj' || (label.includes('cnpj') && !label.includes('cpf'))) return 'cnpj'
  if (key === 'cpfcnpj' || (label.includes('cpf') && label.includes('cnpj'))) return 'cpfCnpj'
  return undefined
}

export function formatarDocumento(mask: DocumentoMask, value: unknown) {
  if (mask === 'cpf') return formatCpf(value)
  if (mask === 'cnpj') return formatCnpj(value)
  return formatCpfCnpj(value)
}

export function useCrudPermissoes(base: string) {
  const { pode } = usePermissoes()
  return {
    podeVer: pode(base),
    podeCriar: pode(`${base}:criar`),
    podeEditar: pode(`${base}:editar`),
    podeExcluir: pode(`${base}:excluir`),
  }
}

export function mapUsuariosPorPerfil(usuarios: any[] | undefined, perfil: string) {
  return (usuarios || [])
    .filter((usuario: any) => usuario.perfil === perfil)
    .map((usuario: any) => ({ value: usuario.id, label: `${usuario.nome} (${usuario.login})` }))
}

interface CadSimplesProps {
  label: string
  novo?: string
  listarQuery: any
  criarMutation: any
  editarMutation?: any
  excluirMutation?: any
  campos: CampoConfig[]
  extraAction?: (item: any) => React.ReactNode
  podeCriar?: boolean
  podeEditar?: boolean
  podeExcluir?: boolean
  somenteLeituraEdicao?: boolean
}

export function CadSimples({ label, novo, listarQuery, criarMutation, editarMutation, excluirMutation, campos, extraAction, podeCriar = true, podeEditar = true, podeExcluir = true, somenteLeituraEdicao = false }: CadSimplesProps) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Record<string,any>>({})
  const [editId, setEditId] = useState<number|null>(null)
  const { data, isLoading, refetch } = listarQuery

  const onSuccess = () => { setModal(false); refetch(); setForm({}); setEditId(null) }
  const criar = criarMutation({ onSuccess })
  const editar = editarMutation ? editarMutation({ onSuccess }) : null
  const excluir = excluirMutation ? excluirMutation({ onSuccess: () => refetch() }) : null

  function set(k:string, v:any) { setForm(f=>({...f,[k]:v})) }

  function openEdit(item: any) {
    if (!podeEditar) return
    const f: Record<string,any> = {}
    campos.forEach(c => {
      if (c.type === 'checkbox') f[c.key] = !!item[c.key]
      else if (c.type === 'number') f[c.key] = item[c.key] != null ? item[c.key] : ''
      else f[c.key] = item[c.key] ?? ''
    })
    setForm(f); setEditId(item.id); setModal(true)
  }

  function openNew() {
    if (!podeCriar) return
    const f: Record<string,any> = {}
    campos.forEach(c => { f[c.key] = c.type === 'checkbox' ? false : '' })
    setForm(f); setEditId(null); setModal(true)
  }

  function handleSave() {
    if (editId && !podeEditar) return
    if (!editId && !podeCriar) return

    const cleaned: Record<string,any> = {}
    campos.forEach(c => {
      const val = form[c.key]
      if (c.type === 'checkbox') { cleaned[c.key] = !!val }
      else if (c.type === 'number') { cleaned[c.key] = val !== '' && val != null ? Number(val) : undefined }
      else if (c.type === 'select') {
        if (val === '' || val == null) { cleaned[c.key] = undefined }
        else { const n = Number(val); cleaned[c.key] = !isNaN(n) && c.options?.some(o => o.value === n) ? n : val }
      } else { cleaned[c.key] = val || undefined }
    })
    if (editId && editar) editar.mutate({ ...cleaned, id: editId })
    else if (editId) criar.mutate({ ...cleaned, id: editId })
    else criar.mutate(cleaned)
  }

  const tableCampos = campos.filter(c => !c.hideTable)
  const mostrarColunaAcoes = !!extraAction || (podeEditar && !!editarMutation) || (podeExcluir && !!excluirMutation)
  const modoSomenteLeitura = somenteLeituraEdicao && editId !== null

  function renderCellValue(item: any, campo: CampoConfig) {
    const val = item[campo.key]
    const documentoMask = campoDocumentoMask(campo)
    if (campo.type === 'checkbox') return val ? '✓' : '—'
    if (campo.type === 'select' && campo.options) {
      const opt = campo.options.find(o => String(o.value) === String(val))
      return opt ? opt.label : (val || '—')
    }
    if (documentoMask && val) return formatarDocumento(documentoMask, val)
    return val || '—'
  }

  function renderFormField(c: CampoConfig) {
    const ft = c.type || 'text'
    const documentoMask = campoDocumentoMask(c)
    if (ft === 'select') return <Select key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]??''} onChange={e=>set(c.key,e.target.value)} options={c.options||[]} placeholder="Selecione..." disabled={modoSomenteLeitura} />
    if (ft === 'checkbox') return <label key={c.key} className={`flex items-center gap-2 py-1 ${modoSomenteLeitura ? 'cursor-default opacity-80' : 'cursor-pointer'}`}><input type="checkbox" checked={!!form[c.key]} onChange={e=>set(c.key,e.target.checked)} disabled={modoSomenteLeitura} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700">{c.label}</span></label>
    if (ft === 'textarea') return <Textarea key={c.key} label={c.label+(c.required?' *':'')} value={form[c.key]||''} onChange={e=>set(c.key,e.target.value)} rows={3} disabled={modoSomenteLeitura} />
    if (ft === 'number') return <Input key={c.key} type="number" label={c.label+(c.required?' *':'')} value={form[c.key]??''} onChange={e=>set(c.key,e.target.value)} disabled={modoSomenteLeitura} />
    return <Input key={c.key} label={c.label+(c.required?' *':'')} mask={documentoMask} value={form[c.key]||''} onChange={e=>set(c.key,e.target.value)} disabled={modoSomenteLeitura} />
  }

  const saving = editar ? (editId ? editar.isPending : criar.isPending) : criar.isPending

  return (
    <div>
      {podeCriar && (
        <div className="flex justify-end mb-3"><Button size="sm" onClick={openNew}><Plus size={13}/> {novo||'Novo'} {label}</Button></div>
      )}
      {isLoading ? <Loading/> : (
        <Table headers={[...tableCampos.map(c=>c.label), ...(mostrarColunaAcoes ? ['Ações'] : [])]} empty={!data?.length ? 'Nenhum registro' : ''}>
          {data?.map((item:any) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {tableCampos.map(c => <td key={c.key} className="px-4 py-2 text-sm text-gray-700">{renderCellValue(item, c)}</td>)}
              {mostrarColunaAcoes && (
                <td className="px-4 py-2"><div className="flex gap-1">
                  {podeEditar && (
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil size={13} className="text-blue-500"/></Button>
                  )}
                  {podeExcluir && excluir && (
                    <Button size="sm" variant="ghost" onClick={() => { if(confirm('Excluir este registro?')) excluir.mutate({ id: item.id }) }}><Trash2 size={13} className="text-red-500"/></Button>
                  )}
                  {extraAction && extraAction(item)}
                </div></td>
              )}
            </tr>
          ))}
        </Table>
      )}
      <Modal open={modal} title={(modoSomenteLeitura ? 'Visualizar ' : editId ? 'Editar ' : (novo||'Novo') + ' ') + label} onClose={() => setModal(false)}>
        <div className="space-y-3">
          {campos.map(c => renderFormField(c))}
          <div className="flex gap-3 pt-2">
            {!modoSomenteLeitura && <Button className="flex-1 justify-center" onClick={handleSave} loading={saving}>Salvar</Button>}
            <Button variant="secondary" className="flex-1 justify-center" onClick={()=>setModal(false)}>{modoSomenteLeitura ? 'Fechar' : 'Cancelar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
