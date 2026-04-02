import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { PageHeader, Card, Button, Loading } from '../components/ui'
import { Clock, LogIn, Coffee, RotateCcw, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'

const tipos = [
  { id: 'Entrada',       label: 'Entrada',         icon: <LogIn size={20}/>,     color: 'bg-green-500' },
  { id: 'SaidaAlmoco',   label: 'Saída Almoço',     icon: <Coffee size={20}/>,    color: 'bg-yellow-500' },
  { id: 'RetornoAlmoco', label: 'Retorno Almoço',   icon: <RotateCcw size={20}/>, color: 'bg-blue-500' },
  { id: 'Saida',         label: 'Saída',            icon: <LogOut size={20}/>,    color: 'bg-red-500' },
]

export function BaterPonto() {
  const { usuario } = useAuth()
  const hoje = new Date().toISOString().slice(0,10)
  const [obs, setObs] = useState('')

  const { data: pontos, isLoading, refetch } = trpc.ponto.meusDia.useQuery({ data: hoje })
  const bater = trpc.ponto.bater.useMutation({ onSuccess: () => { refetch(); setObs('') } })

  const agora = new Date()
  const hora  = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const data  = agora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  function calcHoras() {
    if (!pontos?.length) return '00:00'
    const entrada   = pontos.find((p:any) => p.tipo === 'Entrada')
    const saida     = pontos.find((p:any) => p.tipo === 'Saida')
    const saidaAlm  = pontos.find((p:any) => p.tipo === 'SaidaAlmoco')
    const retAlm    = pontos.find((p:any) => p.tipo === 'RetornoAlmoco')
    if (!entrada) return '00:00'
    const fim = saida ? new Date(saida.dataHora) : agora
    let total = (fim.getTime() - new Date(entrada.dataHora).getTime()) / 1000 / 60
    if (saidaAlm && retAlm) total -= (new Date(retAlm.dataHora).getTime() - new Date(saidaAlm.dataHora).getTime()) / 1000 / 60
    const h = Math.floor(total / 60)
    const m = Math.floor(total % 60)
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Controle de Ponto" />

      {/* Relógio */}
      <Card className="p-8 text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Clock size={24} className="text-blue-600" />
          <span className="text-5xl font-mono font-bold text-gray-800">{hora}</span>
        </div>
        <p className="text-gray-500 capitalize">{data}</p>
        <p className="text-blue-600 font-semibold mt-2">Olá, {usuario?.nome}!</p>
      </Card>

      {/* Botões de Ponto */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {tipos.map(t => {
          const jaBateu = pontos?.some((p:any) => p.tipo === t.id)
          return (
            <button key={t.id} disabled={jaBateu || bater.isPending}
              onClick={() => bater.mutate({ tipo: t.id as any, observacao: obs })}
              className={`${t.color} ${jaBateu ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'} text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-all shadow-md`}>
              {t.icon}
              <span className="font-semibold">{t.label}</span>
              {jaBateu && (
                <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                  {new Date(pontos?.find((p:any) => p.tipo === t.id)?.dataHora || 0).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Observação */}
      <Card className="p-4 mb-6">
        <label className="text-xs font-medium text-gray-700 block mb-2">Observação (opcional)</label>
        <input type="text" value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Saí mais cedo por consulta médica"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </Card>

      {/* Resumo do dia */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Resumo de Hoje</h3>
          <div className="text-right">
            <div className="text-xs text-gray-500">Horas trabalhadas</div>
            <div className="text-2xl font-bold text-blue-600 font-mono">{calcHoras()}</div>
          </div>
        </div>
        {isLoading ? <Loading/> : (
          <div className="space-y-2">
            {pontos?.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nenhum registro hoje.</p>}
            {pontos?.map((p:any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {tipos.find(t=>t.id===p.tipo)?.icon}
                  <span className="text-sm font-medium text-gray-700">{tipos.find(t=>t.id===p.tipo)?.label}</span>
                </div>
                <span className="text-sm font-mono text-gray-600">
                  {new Date(p.dataHora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
