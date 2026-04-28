import { useState } from 'react'
import { usePermissoes } from '../../lib/permissoes'
import { Link, useSearchParams } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { Table, Btn, PageHeader, Pagination, Input, Select, Badge } from '../../components/ui'
import { Plus, Edit, Archive } from 'lucide-react'

export function Processos() {
  const { pode, isExterno } = usePermissoes()
  const [params] = useSearchParams()
  const [filtros, setFiltros] = useState({
    busca: params.get('busca')||'',
    bancoId:0, situacaoId:0, etapaId:0, agenciaId:0, modalidadeId:0,
    parceiroId:0, corretorId:0, imobiliariaId:0, construtoraId:0,
    concluidos:false, arquivados:false, reprovados:false, codigo:0
  })
  const [ativos, setAtivos]   = useState({ ...filtros, pagina:1 })

  const { data, isLoading } = trpc.processos.listar.useQuery(ativos)
  const bancos      = trpc.cadastros.bancos.listar.useQuery()
  const situacoes   = trpc.cadastros.situacoes.listar.useQuery(undefined, { enabled: !isExterno })
  const etapasList  = trpc.cadastros.etapas.listar.useQuery({}, { enabled: !isExterno })
  const agenciasList = trpc.cadastros.agencias.listar.useQuery({}, { enabled: !isExterno })
  const modalidadesList = trpc.cadastros.modalidades.listar.useQuery(undefined, { enabled: !isExterno })
  const parceirosList   = trpc.cadastros.parceiros.listar.useQuery(undefined, { enabled: !isExterno })
  const corretoresList  = trpc.cadastros.corretores.listar.useQuery(undefined, { enabled: !isExterno })
  const imobiliariasList = trpc.cadastros.imobiliarias.listar.useQuery(undefined, { enabled: !isExterno })
  const construtorasList = trpc.cadastros.construtoras.listar.useQuery(undefined, { enabled: !isExterno })
  const utils     = trpc.useUtils()
  const arquivar  = trpc.processos.arquivar.useMutation({ onSuccess: () => utils.processos.listar.invalidate() })

  const aplicarFiltros = () => setAtivos({...filtros, pagina:1})

  return (
    <div>
      <PageHeader title="Processos de Financiamento"
        actions={pode('processo:criar') ? <Link to="/financiamento/processos/novo"><Btn icon={<Plus size={15}/>}>Novo</Btn></Link> : undefined}/>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        {/* Cliente - full width */}
        <Input label="Cliente" value={filtros.busca} placeholder=""
          onChange={e=>setFiltros(p=>({...p,busca:e.target.value}))}
          onKeyDown={e=>e.key==='Enter'&&aplicarFiltros()}/>

        {/* Banco | Situação | Etapa */}
        <div className={`grid gap-4 mt-3 ${isExterno ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-3'}`}>
          <Select label="Banco" value={filtros.bancoId} onChange={e=>setFiltros(p=>({...p,bancoId:Number(e.target.value)}))}
            options={(bancos.data||[]).map(b=>({value:b.id,label:b.nome}))}/>
          {isExterno && (
            <Input label="Código" value={filtros.codigo||""} type="number" onChange={e=>setFiltros(p=>({...p,codigo:Number(e.target.value)||0}))}/>
          )}
          {!isExterno && (
            <>
              <Select label="Situação" value={filtros.situacaoId} onChange={e=>setFiltros(p=>({...p,situacaoId:Number(e.target.value)}))}
                options={(situacoes.data||[]).map(s=>({value:s.id,label:s.nome}))}/>
              <Select label="Etapa" value={filtros.etapaId} onChange={e=>setFiltros(p=>({...p,etapaId:Number(e.target.value)}))}
                options={(etapasList.data||[]).map(e=>({value:e.id,label:e.nome}))}/>
            </>
          )}
        </div>

        {!isExterno && (
          <>
            {/* Agência | Modalidade | Construtora */}
            <div className="grid grid-cols-3 gap-4 mt-3">
              <Select label="Agência" value={filtros.agenciaId} onChange={e=>setFiltros(p=>({...p,agenciaId:Number(e.target.value)}))}
                options={(agenciasList.data||[]).map(a=>({value:a.id,label:a.nome}))}/>
              <Select label="Modalidade" value={filtros.modalidadeId} onChange={e=>setFiltros(p=>({...p,modalidadeId:Number(e.target.value)}))}
                options={(modalidadesList.data||[]).map(m=>({value:m.id,label:m.nome}))}/>
              <Select label="Construtora" value={filtros.construtoraId} onChange={e=>setFiltros(p=>({...p,construtoraId:Number(e.target.value)}))}
                options={(construtorasList.data||[]).map(c=>({value:c.id,label:c.nome}))}/>
            </div>

            {/* Corretor | Imobiliária | Parceiro */}
            <div className="grid grid-cols-3 gap-4 mt-3">
              <Select label="Corretor" value={filtros.corretorId} onChange={e=>setFiltros(p=>({...p,corretorId:Number(e.target.value)}))}
                options={(corretoresList.data||[]).map(c=>({value:c.id,label:c.nome}))}/>
              <Select label="Imobiliária" value={filtros.imobiliariaId} onChange={e=>setFiltros(p=>({...p,imobiliariaId:Number(e.target.value)}))}
                options={(imobiliariasList.data||[]).map(i=>({value:i.id,label:i.nome}))}/>
              <Select label="Parceiro" value={filtros.parceiroId} onChange={e=>setFiltros(p=>({...p,parceiroId:Number(e.target.value)}))}
                options={(parceirosList.data||[]).map(p=>({value:p.id,label:p.nome}))}/>
            </div>
          </>
        )}

        {/* Código | Checkboxes | Pesquisar */}
        <div className="flex items-end gap-4 mt-3 flex-wrap">
          {!isExterno && (
            <Input label="Código" value={filtros.codigo||""} type="number" onChange={e=>setFiltros(p=>({...p,codigo:Number(e.target.value)||0}))} className="w-36"/>
          )}
          <div className="flex gap-4 pb-2 text-sm">
            {[['concluidos','Processos Concluídos'],['reprovados','Processos Reprovados'],['arquivados','Processos Arquivados']].map(([k,l]) => (
              <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={(filtros as any)[k]} onChange={e=>setFiltros(p=>({...p,[k]:e.target.checked}))} className="rounded"/>
                {l}
              </label>
            ))}
          </div>
          <div className="ml-auto">
            <Btn onClick={aplicarFiltros}>Pesquisar</Btn>
          </div>
        </div>
      </div>

      <Table headers={['','Código','Nº Proposta','Comprador','Vendedor','Agência','Modalidade','Etapa','Evolução']} loading={isLoading}
        empty={!data?.lista.length ? 'Nenhum processo encontrado.' : undefined}>
        {data?.lista.map(p => (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <div className="flex gap-2">
                {pode("processo:editar") && <Link to={`/financiamento/processos/${p.id}`} className="text-blue-600 hover:text-blue-800"><Edit size={15}/></Link>}
                {pode("processo:excluir") && <button onClick={()=>confirm('Arquivar?')&&arquivar.mutate({id:p.id})} className="text-yellow-600 hover:text-yellow-800"><Archive size={15}/></button>}
              </div>
            </td>
            <td className="px-4 py-3"><Link to={`/financiamento/processos/${p.id}`} className="font-bold text-blue-600 hover:underline">{p.id}</Link></td>
            <td className="px-4 py-3 text-sm text-gray-600">{p.numProposta||'—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{p.compradorNome||'—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{p.vendedorNome||'—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{p.agenciaNome||'—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{p.modalidadeNome||'—'}</td>
            <td className="px-4 py-3">
              {p.etapaNome && <Badge label={p.etapaNome} color="bg-yellow-100 text-yellow-700"/>}
              {!!p.reprovado&&<Badge label="Reprovado"/>}
              {!!p.arquivado&&<Badge label="Arquivado"/>}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">{p.totalEtapas ? `${p.etapaAtual||0} de ${p.totalEtapas}` : '—'}</td>
          </tr>
        ))}
      </Table>
      <Pagination pagina={ativos.pagina} total={20} onChange={p=>setAtivos(a=>({...a,pagina:p}))}/>
    </div>
  )
}
