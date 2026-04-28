import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { PageHeader, Card, Button, Select, Input, Table, Loading } from '../../components/ui'
import { Download } from 'lucide-react'
import { exportToCSV, hoje } from './exportCSV'

export function RelProcessos() {
  const [filtros, setFiltros] = useState<any>({})
  const [buscou, setBuscou] = useState(false)
  const [tipoData, setTipoData] = useState<'ativo'|'concluido'|'reprovado'>('ativo')
  const [pendente, setPendente] = useState(false)
  const [atrasados, setAtrasados] = useState(false)
  const [exibirAtendimento, setExibirAtendimento] = useState(false)

  const bancos       = trpc.cadastros.bancos.listar.useQuery()
  const situacoes    = trpc.cadastros.situacoes.listar.useQuery()
  const etapas       = trpc.cadastros.etapas.listar.useQuery({})
  const parceiros    = trpc.cadastros.parceiros.listar.useQuery()
  const responsaveis = trpc.cadastros.usuarios.listar.useQuery()
  const construtoras = trpc.cadastros.construtoras.listar.useQuery()
  const corretores   = trpc.cadastros.corretores.listar.useQuery()
  const agencias     = trpc.cadastros.agencias.listar.useQuery({ bancoId: filtros.bancoId })
  const imobiliarias = trpc.cadastros.imobiliarias.listar.useQuery()

  const { data, isLoading } = trpc.processos.listar.useQuery({
    ...filtros,
    somenteConcluidos: tipoData === 'concluido',
    somenteReprovados: tipoData === 'reprovado',
    reprovados: tipoData === 'reprovado',
    pendente,
    atrasados,
    pagina: 1,
  }, {
    enabled: buscou,
  })

  function setF(k:string,v:any) { setFiltros((f:any)=>({...f,[k]:v})) }

  const total = data?.lista?.length || 0

  function handleExport() {
    if (!data?.lista?.length) return
    const headers = ['Codigo','N Proposta','Comprador','Banco','Agencia','Modalidade','Etapa Atual','Responsavel','Parceiro','Dias',...(exibirAtendimento ? ['Atendimento'] : [])]
    const rows = data.lista.map((p:any) => [
      p.id,
      p.numProposta || '',
      p.compradorNome || '',
      p.bancoNome || '',
      p.agenciaNome || '',
      p.modalidadeNome || '',
      p.etapaNome || '',
      p.responsavelNome || '',
      p.parceiroNome || '',
      Math.floor((Date.now() - new Date(p.criadoEm).getTime()) / 86400000),
      ...(exibirAtendimento ? [p.ultimoAtendimento || ''] : []),
    ])
    exportToCSV(headers, rows, `relatorio_processos_${hoje()}.csv`)
  }

  return (
    <div>
      <PageHeader title="Relatório de Processo por Etapa"
        actions={<Button variant="secondary" onClick={handleExport}><Download size={14}/> Exportar Excel</Button>} />

      <Card className="p-4 mb-4">
        <div className="space-y-3">
          {/* Banco + Agência */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Banco" value={filtros.bancoId||''} onChange={e=>setF('bancoId',Number(e.target.value)||undefined)}
              options={(bancos.data||[]).map((b:any)=>({value:b.id,label:b.nome}))} />
            <Select label="Agência" value={filtros.agenciaId||''} onChange={e=>setF('agenciaId',Number(e.target.value)||undefined)}
              options={(agencias.data||[]).map((a:any)=>({value:a.id,label:a.nome}))} />
          </div>
          {/* Situação + Etapa */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Situação" value={filtros.situacaoId||''} onChange={e=>setF('situacaoId',Number(e.target.value)||undefined)}
              options={(situacoes.data||[]).map((s:any)=>({value:s.id,label:s.nome}))} />
            <Select label="Etapa" value={filtros.etapaId||''} onChange={e=>setF('etapaId',Number(e.target.value)||undefined)}
              options={(etapas.data||[]).map((e:any)=>({value:e.id,label:e.nome}))} />
          </div>
          {/* Parceiro + Usuário */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Parceiro" value={filtros.parceiroId||''} onChange={e=>setF('parceiroId',Number(e.target.value)||undefined)}
              options={(parceiros.data||[]).map((p:any)=>({value:p.id,label:p.nome}))} />
            <Select label="Usuário" value={filtros.responsavelId||''} onChange={e=>setF('responsavelId',Number(e.target.value)||undefined)}
              options={(responsaveis.data||[]).map((u:any)=>({value:u.id,label:u.nome}))} />
          </div>
          {/* Construtora + Corretor */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Construtora" value={filtros.construtoraId||''} onChange={e=>setF('construtoraId',Number(e.target.value)||undefined)}
              options={(construtoras.data||[]).map((c:any)=>({value:c.id,label:c.nome}))} />
            <Select label="Corretor" value={filtros.corretorId||''} onChange={e=>setF('corretorId',Number(e.target.value)||undefined)}
              options={(corretores.data||[]).map((c:any)=>({value:c.id,label:c.nome}))} />
          </div>
          {/* Imobiliária */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Imobiliária" value={filtros.imobiliariaId||''} onChange={e=>setF('imobiliariaId',Number(e.target.value)||undefined)}
              options={(imobiliarias.data||[]).map((i:any)=>({value:i.id,label:i.nome}))} />
          </div>
          {/* Período */}
          <div className="flex items-end gap-2">
            <Input label="Período" type="date" value={filtros.dataInicio||''} onChange={e=>setF('dataInicio',e.target.value||undefined)} />
            <span className="pb-2 text-sm text-gray-500">à</span>
            <Input label="" type="date" value={filtros.dataFim||''} onChange={e=>setF('dataFim',e.target.value||undefined)} />
          </div>

          {/* Tipo de processo */}
          <div className="flex items-center gap-4 flex-wrap pt-2">
            {(['ativo','reprovado','concluido'] as const).map(t => (
              <label key={t} className="flex items-center gap-1 cursor-pointer text-sm">
                <input type="radio" name="tipoProc" checked={tipoData===t} onChange={()=>setTipoData(t)}/>
                {t === 'ativo' ? 'Ativo' : t === 'concluido' ? 'Concluído' : 'Reprovado'}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1 cursor-pointer text-sm">
              <input type="checkbox" checked={pendente} onChange={e=>setPendente(e.target.checked)}/>
              Pendente
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-sm">
              <input type="checkbox" checked={atrasados} onChange={e=>setAtrasados(e.target.checked)}/>
              Atrasados
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-sm">
              <input type="checkbox" checked={exibirAtendimento} onChange={e=>setExibirAtendimento(e.target.checked)}/>
              Exibir Atendimento
            </label>
            <div className="ml-auto">
              <Button onClick={() => setBuscou(true)}>Pesquisar</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? <Loading/> : (
          <Table
            headers={['Código','Nº Proposta','Comprador','Banco','Agência','Modalidade','Etapa Atual','Responsável','Parceiro','Dias',...(exibirAtendimento?['Atendimento']:[])]}
            empty={!data?.lista.length ? 'Nenhum registro.' : undefined}>
            {data?.lista.map((p:any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link to={`/financiamento/processos/${p.id}`} className="text-blue-600 font-bold hover:underline text-sm">#{p.id}</Link>
                </td>
                <td className="px-3 py-2 text-xs font-mono text-gray-600">{p.numProposta||'—'}</td>
                <td className="px-3 py-2 text-xs text-gray-700 font-medium">{p.compradorNome||'--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{p.bancoNome||'--'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{p.agenciaNome||'--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{p.modalidadeNome||'--'}</td>
                <td className="px-3 py-2 text-xs">{p.etapaNome||'--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{p.responsavelNome||'--'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{p.parceiroNome||'--'}</td>
                <td className="px-3 py-2 text-xs font-mono">
                  <span className={`font-medium ${Math.floor((Date.now()-new Date(p.criadoEm).getTime())/86400000) > 30 ? 'text-red-600' : 'text-gray-600'}`}>
                    {Math.floor((Date.now()-new Date(p.criadoEm).getTime())/86400000)}d
                  </span>
                </td>
                {exibirAtendimento && <td className="px-3 py-2 text-xs text-gray-600">{p.ultimoAtendimento || '--'}</td>}
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
