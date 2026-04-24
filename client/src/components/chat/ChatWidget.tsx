import { useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { MessageCircle, Send, X, Plus, ArrowLeft, Search, ExternalLink, Edit, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { usePermissoes } from '../../lib/permissoes'
import { Badge, Btn, Modal, Spinner } from '../ui'

type ChatView = 'conversas' | 'nova' | 'chat'
type ChatAbaInterna = 'ativas' | 'encerradas'
let audioContext: AudioContext | null = null
let fallbackAudio: HTMLAudioElement | null = null

function formatarHora(valor?: string | Date | null) {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!audioContext) audioContext = new AudioContextCtor()
  return audioContext
}

function habilitarSom() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    // Alguns navegadores só liberam áudio depois de interação do usuário.
  }

  try {
    if (!fallbackAudio) {
      fallbackAudio = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQ4AAAAA/////wAAAP///wAAAP//')
      fallbackAudio.volume = 0.4
    }
    fallbackAudio.play().then(() => {
      if (fallbackAudio) {
        fallbackAudio.pause()
        fallbackAudio.currentTime = 0
      }
    }).catch(() => {})
  } catch {
    // Fallback silencioso se o navegador bloquear.
  }
}

function tocarAviso() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.24)
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }

  try {
    if (!fallbackAudio) {
      fallbackAudio = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQ4AAAAA/////wAAAP///wAAAP//')
      fallbackAudio.volume = 0.4
    }
    fallbackAudio.currentTime = 0
    fallbackAudio.play().catch(() => {})
  } catch {
    // Sem ação: a notificação visual continua funcionando.
  }
}

function isMensagemSistema(texto?: string | null) {
  if (!texto) return false
  return texto.startsWith('Novo atendimento iniciado')
    || texto.startsWith('Conversa encerrada pela equipe Amarante')
    || texto.startsWith('Chamado transferido para')
    || texto.startsWith('Atendimento encerrado e novo assunto transferido para')
    || texto.startsWith('Novo assunto transferido por')
}

export function ChatWidget() {
  const { usuario } = useAuth()
  const { isExterno } = usePermissoes()
  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ChatView>('conversas')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [processoPopupId, setProcessoPopupId] = useState<number | null>(null)
  const [modalEncerrar, setModalEncerrar] = useState(false)
  const [modalTransferir, setModalTransferir] = useState(false)
  const [levarResumoAtendimento, setLevarResumoAtendimento] = useState(true)
  const [abaInterna, setAbaInterna] = useState<ChatAbaInterna>('ativas')
  const [transferirParaId, setTransferirParaId] = useState('')
  const [transferirComentario, setTransferirComentario] = useState('')
  const [transferirLevarResumoAtendimento, setTransferirLevarResumoAtendimento] = useState(true)
  const [targetId, setTargetId] = useState('')
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const mensagensRef = useRef<HTMLDivElement | null>(null)
  const ultimoTotalNaoLidas = useRef<number | null>(null)
  const ultimaMensagemAvisada = useRef<number | null>(null)
  const conversaAvisada = useRef<number | null>(null)

  const totalNaoLidas = trpc.chat.totalNaoLidas.useQuery(undefined, {
    refetchInterval: 5000,
  })
  const conversas = trpc.chat.listarConversas.useQuery(undefined, {
    enabled: open,
    refetchInterval: 5000,
  })
  const usuarios = trpc.chat.usuariosDisponiveis.useQuery(undefined, {
    enabled: open && (view === 'nova' || modalTransferir),
  })
  const mensagens = trpc.chat.mensagens.useQuery(
    { conversaId: activeId ?? -1 },
    {
      enabled: open && view === 'chat' && !!activeId,
      refetchInterval: 3000,
    }
  )

  const criarOuAbrir = trpc.chat.criarOuAbrir.useMutation({
    onSuccess: (res) => {
      setActiveId(res.id)
      setView('chat')
      setTargetId('')
      setErro('')
      utils.chat.listarConversas.invalidate()
      utils.chat.totalNaoLidas.invalidate()
    },
    onError: (error) => setErro(error.message),
  })

  const enviarMensagem = trpc.chat.enviarMensagem.useMutation({
    onSuccess: () => {
      setTexto('')
      setErro('')
      utils.chat.mensagens.invalidate()
      utils.chat.listarConversas.invalidate()
      utils.chat.totalNaoLidas.invalidate()
    },
    onError: (error) => setErro(error.message),
  })
  const encerrarConversa = trpc.chat.encerrar.useMutation({
    onSuccess: async () => {
      setModalEncerrar(false)
      setErro('')
      await utils.chat.listarConversas.invalidate()
      await utils.chat.mensagens.invalidate()
      await utils.chat.totalNaoLidas.invalidate()
      if (processoPopupId) await utils.processos.buscar.invalidate({ id: processoPopupId })
      setView('conversas')
      setAbaInterna('encerradas')
    },
    onError: (error) => setErro(error.message),
  })
  const transferirConversa = trpc.chat.transferir.useMutation({
    onSuccess: async () => {
      setModalTransferir(false)
      setTransferirParaId('')
      setErro('')
      setView('conversas')
      setAbaInterna('ativas')
      await utils.chat.listarConversas.invalidate()
      await utils.chat.mensagens.invalidate()
      await utils.chat.totalNaoLidas.invalidate()
    },
    onError: (error) => setErro(error.message),
  })
  const encerrarETransferirConversa = trpc.chat.encerrarETransferir.useMutation({
    onSuccess: async () => {
      setModalTransferir(false)
      setTransferirParaId('')
      setTransferirComentario('')
      setTransferirLevarResumoAtendimento(true)
      setErro('')
      setView('conversas')
      setAbaInterna('encerradas')
      await utils.chat.listarConversas.invalidate()
      await utils.chat.mensagens.invalidate()
      await utils.chat.totalNaoLidas.invalidate()
    },
    onError: (error) => setErro(error.message),
  })

  const naoLidas = Number(totalNaoLidas.data?.total || 0)

  useEffect(() => {
    const unlock = () => habilitarSom()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (ultimoTotalNaoLidas.current !== null && naoLidas > ultimoTotalNaoLidas.current) {
      tocarAviso()
    }
    ultimoTotalNaoLidas.current = naoLidas
  }, [naoLidas])

  useEffect(() => {
    if (!usuario) return
    const lista = mensagens.data || []
    const ultimaRecebida = [...lista]
      .reverse()
      .find((mensagem: any) => Number(mensagem.remetenteId) !== usuario.id)

    if (!ultimaRecebida?.id) return

    if (conversaAvisada.current !== activeId) {
      conversaAvisada.current = activeId
      ultimaMensagemAvisada.current = Number(ultimaRecebida.id)
      return
    }

    if (Number(ultimaRecebida.id) !== ultimaMensagemAvisada.current) {
      ultimaMensagemAvisada.current = Number(ultimaRecebida.id)
      tocarAviso()
    }
  }, [mensagens.data, usuario])

  useEffect(() => {
    if (view !== 'chat') return
    mensagensRef.current?.scrollTo({ top: mensagensRef.current.scrollHeight })
  }, [view, mensagens.data?.length])

  if (!usuario) return null

  const usuariosFiltrados = (usuarios.data || []).filter((u: any) => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return true
    return `${u.nome} ${u.perfil}`.toLowerCase().includes(termo)
  })

  const conversaAtiva = (conversas.data || []).find((c: any) => Number(c.id) === activeId)
  const conversaEncerrada = conversaAtiva?.status === 'encerrada'
  const todasConversas = conversas.data || []
  const conversasAtivas = todasConversas.filter((conversa: any) => conversa.status !== 'encerrada')
  const conversasEncerradas = todasConversas.filter((conversa: any) => conversa.status === 'encerrada')
  const conversasVisiveis = isExterno
    ? todasConversas
    : abaInterna === 'ativas'
      ? conversasAtivas
      : conversasEncerradas
  const usuariosInternosTransferencia = (usuarios.data || []).filter((u: any) =>
    ['Administrador', 'Gerente', 'Analista'].includes(u.perfil) && Number(u.id) !== usuario.id
  )

  const iniciarConversa = () => {
    const usuarioId = Number(targetId)
    if (!usuarioId) {
      setErro('Selecione um usuário para iniciar a conversa.')
      return
    }
    criarOuAbrir.mutate({ usuarioId })
  }

  const enviar = () => {
    if (!activeId) return
    const textoLimpo = texto.trim()
    if (!textoLimpo) return
    enviarMensagem.mutate({ conversaId: activeId, texto: textoLimpo })
  }

  const transferir = () => {
    if (!activeId) return
    const novoInternoId = Number(transferirParaId)
    if (!novoInternoId) {
      setErro('Selecione o usuário interno que vai receber o chamado.')
      return
    }
    transferirConversa.mutate({ conversaId: activeId, novoInternoId })
  }

  const encerrarETransferir = () => {
    if (!activeId) return
    const novoInternoId = Number(transferirParaId)
    if (!novoInternoId) {
      setErro('Selecione o usuário interno que vai receber o novo assunto.')
      return
    }
    const comentario = transferirComentario.trim()
    if (!comentario) {
      setErro('Informe o que a pessoa quer tratar com o novo responsável.')
      return
    }
    encerrarETransferirConversa.mutate({
      conversaId: activeId,
      novoInternoId,
      comentario,
      levarParaAtendimento: transferirLevarResumoAtendimento,
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          habilitarSom()
          setOpen((current) => !current)
          setErro('')
        }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-xl transition hover:bg-blue-600"
        aria-label="Abrir chat interno">
        <MessageCircle size={24} />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <section className="fixed bottom-24 right-5 z-50 flex h-[560px] max-h-[calc(100vh-7rem)] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white">
            <div>
              <h2 className="text-sm font-semibold">Chat Amarante</h2>
              <p className="text-xs text-blue-200">Atendimento interno da plataforma</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-blue-800" aria-label="Fechar chat">
              <X size={18} />
            </button>
          </header>

          {erro && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {erro}
            </div>
          )}

          {view === 'conversas' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold text-gray-800">Conversas</span>
                <button
                  type="button"
                  onClick={() => {
                    setView('nova')
                    setBusca('')
                    setErro('')
                  }}
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  <Plus size={14} /> Nova
                </button>
              </div>
              {!isExterno && (
                <div className="flex gap-2 border-b bg-gray-50 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setAbaInterna('ativas')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${abaInterna === 'ativas' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-blue-50'}`}>
                    Ativas ({conversasAtivas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaInterna('encerradas')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${abaInterna === 'encerradas' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-blue-50'}`}>
                    Encerradas ({conversasEncerradas.length})
                  </button>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversas.isLoading && <p className="px-4 py-6 text-center text-sm text-gray-400">Carregando conversas...</p>}
                {!conversas.isLoading && !conversasVisiveis.length && (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    {abaInterna === 'encerradas' && !isExterno ? 'Nenhuma conversa encerrada.' : <>Nenhuma conversa ainda. Use <strong>Nova</strong> para começar.</>}
                  </div>
                )}
                {conversasVisiveis.map((conversa: any) => (
                  <button
                    type="button"
                    key={conversa.id}
                    onClick={() => {
                      setActiveId(Number(conversa.id))
                      setView('chat')
                      setErro('')
                    }}
                    className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition hover:bg-blue-50">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {String(conversa.outroUsuarioNome || '?').slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-800">{conversa.outroUsuarioNome}</p>
                        {Number(conversa.naoLidas || 0) > 0 && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{conversa.naoLidas}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{conversa.outroUsuarioPerfil}</p>
                      {conversa.status === 'encerrada' && <p className="mt-1 text-[11px] font-semibold text-gray-400">Encerrada</p>}
                      <p className="mt-1 truncate text-xs text-gray-600">{conversa.ultimaMensagem || 'Sem mensagens ainda'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'nova' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <button type="button" onClick={() => setView('conversas')} className="rounded p-1 hover:bg-gray-100" aria-label="Voltar">
                  <ArrowLeft size={18} />
                </button>
                <span className="text-sm font-semibold text-gray-800">Nova conversa</span>
              </div>

              <div className="border-b px-4 py-3">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Buscar usuário</label>
                <div className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2">
                  <Search size={14} className="text-gray-400" />
                  <input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    className="w-full text-sm outline-none"
                    placeholder="Nome ou perfil..."
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {usuariosFiltrados.map((u: any) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setTargetId(String(u.id))}
                    className={`flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-blue-50 ${targetId === String(u.id) ? 'bg-blue-50' : ''}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.nome}</p>
                      <p className="text-xs text-gray-500">{u.perfil}</p>
                    </div>
                    {targetId === String(u.id) && <span className="text-xs font-bold text-blue-700">Selecionado</span>}
                  </button>
                ))}
                {!usuarios.isLoading && !usuariosFiltrados.length && (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhum usuário disponível.</p>
                )}
              </div>

              <div className="border-t p-4">
                <button
                  type="button"
                  onClick={iniciarConversa}
                  disabled={criarOuAbrir.isPending}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                  {criarOuAbrir.isPending ? 'Abrindo...' : 'Iniciar conversa'}
                </button>
              </div>
            </div>
          )}

          {view === 'chat' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <button type="button" onClick={() => setView('conversas')} className="rounded p-1 hover:bg-gray-100" aria-label="Voltar">
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{conversaAtiva?.outroUsuarioNome || 'Conversa'}</p>
                  <p className="text-xs text-gray-500">
                    {conversaAtiva?.outroUsuarioPerfil || ''}
                    {conversaEncerrada ? ' - Encerrada' : ''}
                  </p>
                </div>
                {!isExterno && !conversaEncerrada && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferirParaId('')
                        setTransferirComentario('')
                        setTransferirLevarResumoAtendimento(true)
                        setModalTransferir(true)
                      }}
                      className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                      Transferir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLevarResumoAtendimento(true)
                        setModalEncerrar(true)
                      }}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                      Encerrar
                    </button>
                  </div>
                )}
              </div>

              <div ref={mensagensRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-3">
                {conversaEncerrada && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                    Este atendimento está encerrado. Envie uma nova mensagem por aqui para iniciar um novo atendimento neste mesmo chat.
                  </div>
                )}
                {(mensagens.data || []).map((m: any) => {
                  const minha = Number(m.remetenteId) === usuario.id
                  const sistema = isMensagemSistema(m.texto)
                  if (sistema) {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <div className="max-w-[92%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 shadow-sm">
                          <div className="mb-1 font-semibold uppercase tracking-wide text-amber-700">Registro do atendimento</div>
                          <p className="whitespace-pre-wrap break-words text-left">{m.texto}</p>
                          <span className="mt-1 block text-[10px] text-amber-600">{formatarHora(m.criadoEm)}</span>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${minha ? 'bg-blue-700 text-white' : 'bg-white text-gray-800'}`}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className={`text-[11px] font-semibold ${minha ? 'text-blue-100' : 'text-gray-500'}`}>{m.remetenteNome}</span>
                          <span className={`text-[10px] ${minha ? 'text-blue-100' : 'text-gray-400'}`}>{formatarHora(m.criadoEm)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                        {!isExterno && m.processoIdDetectado && (
                          <div className={`mt-2 rounded-lg border p-2 text-xs ${minha ? 'border-blue-300 bg-blue-800' : 'border-blue-100 bg-blue-50'}`}>
                            <p className="font-semibold">Processo #{m.processoIdDetectado}</p>
                            {m.processoCompradorNome && <p className={minha ? 'text-blue-100' : 'text-gray-600'}>{m.processoCompradorNome}</p>}
                            {m.processoNumProposta && <p className={minha ? 'text-blue-100' : 'text-gray-600'}>Proposta: {m.processoNumProposta}</p>}
                            <button
                              type="button"
                              onClick={() => setProcessoPopupId(Number(m.processoIdDetectado))}
                              className={`mt-2 inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${minha ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                              <ExternalLink size={12} /> Abrir processo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {!mensagens.isLoading && !(mensagens.data || []).length && (
                  <p className="py-8 text-center text-sm text-gray-400">Envie a primeira mensagem.</p>
                )}
              </div>

              <div className="border-t bg-white p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        enviar()
                      }
                    }}
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={conversaEncerrada ? 'Digite para iniciar um novo atendimento...' : 'Digite sua mensagem...'}
                  />
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={enviarMensagem.isPending || !texto.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
                    aria-label="Enviar mensagem">
                    <Send size={18} />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Dica: mencione nº do processo, proposta, CPF/CNPJ ou nome para tentar localizar o processo.</p>
              </div>
            </div>
          )}
        </section>
      )}

      {!isExterno && (
        <ProcessoChatPopup processoId={processoPopupId} onClose={() => setProcessoPopupId(null)} />
      )}

      {!isExterno && modalEncerrar && (
        <Modal title="Encerrar conversa" open={modalEncerrar} onClose={() => setModalEncerrar(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ao encerrar, este atendimento sai de Ativas e vai para Encerradas. Se alguém enviar nova mensagem depois, um novo atendimento começa neste mesmo chat.
            </p>
            <label className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={levarResumoAtendimento}
                onChange={(event) => setLevarResumoAtendimento(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Levar resumo da conversa para o atendimento
                <span className="block text-xs text-gray-500">Se houver processo vinculado ou citado no chat, o resumo será registrado no atendimento dele.</span>
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setModalEncerrar(false)}>Cancelar</Btn>
              <Btn
                variant="danger"
                loading={encerrarConversa.isPending}
                onClick={() => activeId && encerrarConversa.mutate({
                  conversaId: activeId,
                  levarParaAtendimento: levarResumoAtendimento,
                })}>
                Encerrar chat
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {!isExterno && modalTransferir && (
        <Modal title="Transferir chamado" open={modalTransferir} onClose={() => setModalTransferir(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Escolha o usuário interno que deve receber o atendimento. Você pode transferir o assunto atual ou encerrar este assunto e abrir um novo para outro responsável.
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Novo responsável interno
              <select
                value={transferirParaId}
                onChange={(event) => setTransferirParaId(event.target.value)}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {usuariosInternosTransferencia.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Comentário para encerrar e transferir novo assunto
              <textarea
                rows={4}
                value={transferirComentario}
                onChange={(event) => setTransferirComentario(event.target.value)}
                placeholder="Explique o que a pessoa quer tratar com o novo responsável..."
                className="resize-none rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={transferirLevarResumoAtendimento}
                onChange={(event) => setTransferirLevarResumoAtendimento(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ao encerrar este assunto, levar resumo para o atendimento
                <span className="block text-xs text-gray-500">Se houver processo vinculado ou citado no chat, o resumo será registrado no atendimento dele.</span>
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setModalTransferir(false)}>Cancelar</Btn>
              <Btn
                loading={transferirConversa.isPending}
                disabled={!transferirParaId}
                onClick={transferir}>
                Transferir atual
              </Btn>
              <Btn
                loading={encerrarETransferirConversa.isPending}
                disabled={!transferirParaId || !transferirComentario.trim()}
                onClick={encerrarETransferir}>
                Encerrar e transferir
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function ProcessoChatPopup({ processoId, onClose }: { processoId: number | null; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [editandoContrato, setEditandoContrato] = useState(false)
  const [contratoForm, setContratoForm] = useState({
    numProposta: '',
    numContrato: '',
    dataEmissaoContrato: '',
    dataAssinatura: '',
    dataPagtoVendedor: '',
  })
  const [acaoAberta, setAcaoAberta] = useState<'tarefa' | 'atendimento' | null>(null)
  const [erroAcao, setErroAcao] = useState('')
  const [tarefaForm, setTarefaForm] = useState({ executanteId: 0, solicitacao: '', dataLimite: '' })
  const [novoAtendimento, setNovoAtendimento] = useState('')
  const processo = trpc.processos.buscar.useQuery({ id: processoId ?? -1 }, { enabled: !!processoId })
  const resultados = trpc.processos.listar.useQuery(
    { pagina: 1, busca: String(processoId ?? ''), arquivados: true, reprovados: true },
    { enabled: !!processoId }
  )
  const usuarios = trpc.cadastros.usuarios.listar.useQuery(undefined, { enabled: !!processoId })
  const atualizar = trpc.processos.atualizar.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      await utils.processos.listar.invalidate()
      setEditandoContrato(false)
      setErroAcao('')
    },
    onError: (err) => setErroAcao(err.message),
  })
  const criarTarefa = trpc.tarefas.criar.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      await utils.tarefas.minhasTarefas.invalidate()
      setAcaoAberta(null)
      setErroAcao('')
      setTarefaForm({ executanteId: 0, solicitacao: '', dataLimite: '' })
    },
    onError: (err) => setErroAcao(err.message),
  })
  const adicionarAtendimento = trpc.processos.adicionarAtendimento.useMutation({
    onSuccess: async () => {
      if (processoId) await utils.processos.buscar.invalidate({ id: processoId })
      setAcaoAberta(null)
      setErroAcao('')
      setNovoAtendimento('')
    },
    onError: (err) => setErroAcao(err.message),
  })

  useEffect(() => {
    const detalhe = processo.data as any
    if (!detalhe) return
    setContratoForm({
      numProposta: detalhe.numProposta || '',
      numContrato: detalhe.numContrato || '',
      dataEmissaoContrato: toDateInput(detalhe.dataEmissaoContrato),
      dataAssinatura: toDateInput(detalhe.dataAssinatura),
      dataPagtoVendedor: toDateInput(detalhe.dataPagtoVendedor),
    })
  }, [(processo.data as any)?.id])

  if (!processoId) return null
  const resumo = (resultados.data?.lista || []).find((item: any) => Number(item.id) === Number(processoId))
  const usuariosTarefa = getUsuariosTarefa(usuarios.data || [], resumo)

  const salvarContrato = () => {
    if (!processoId) return
    setErroAcao('')
    atualizar.mutate({
      id: processoId,
      numProposta: contratoForm.numProposta || undefined,
      numContrato: contratoForm.numContrato || undefined,
      dataEmissaoContrato: contratoForm.dataEmissaoContrato || undefined,
      dataAssinatura: contratoForm.dataAssinatura || undefined,
      dataPagtoVendedor: contratoForm.dataPagtoVendedor || undefined,
    })
  }

  const salvarTarefa = () => {
    if (!processoId || !tarefaForm.executanteId || !tarefaForm.solicitacao.trim()) return
    setErroAcao('')
    criarTarefa.mutate({
      processoId,
      executanteId: tarefaForm.executanteId,
      solicitacao: tarefaForm.solicitacao.trim(),
      dataLimite: tarefaForm.dataLimite || undefined,
    })
  }

  const salvarAtendimento = () => {
    if (!processoId || !novoAtendimento.trim()) return
    setErroAcao('')
    adicionarAtendimento.mutate({ processoId, descricao: novoAtendimento.trim() })
  }

  return (
    <Modal title={`Processo #${processoId}`} open={!!processoId} onClose={onClose} size="xl">
      {(processo.isLoading || resultados.isLoading) && <div className="flex justify-center py-10"><Spinner size={28} /></div>}
      {erroAcao && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erroAcao}</div>}
      {!processo.isLoading && processo.data && (
        <ProcessoChatResumo
          processo={processo.data as any}
          resumo={resumo}
          onClose={onClose}
          editandoContrato={editandoContrato}
          setEditandoContrato={setEditandoContrato}
          contratoForm={contratoForm}
          setContratoForm={setContratoForm}
          salvarContrato={salvarContrato}
          salvandoContrato={atualizar.isPending}
          acaoAberta={acaoAberta}
          setAcaoAberta={setAcaoAberta}
          tarefaForm={tarefaForm}
          setTarefaForm={setTarefaForm}
          usuariosTarefa={usuariosTarefa}
          salvarTarefa={salvarTarefa}
          salvandoTarefa={criarTarefa.isPending}
          novoAtendimento={novoAtendimento}
          setNovoAtendimento={setNovoAtendimento}
          salvarAtendimento={salvarAtendimento}
          salvandoAtendimento={adicionarAtendimento.isPending}
        />
      )}
      {!processo.isLoading && !processo.data && (
        <p className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-500">Não consegui carregar esse processo.</p>
      )}
    </Modal>
  )
}

function formatarData(valor?: string | Date | null) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

function toDateInput(value: unknown) {
  if (!value) return ''
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function dinheiro(valor: unknown) {
  const numero = Number(valor || 0)
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ProcessoChatResumo({
  processo,
  resumo,
  onClose,
  editandoContrato,
  setEditandoContrato,
  contratoForm,
  setContratoForm,
  salvarContrato,
  salvandoContrato,
  acaoAberta,
  setAcaoAberta,
  tarefaForm,
  setTarefaForm,
  usuariosTarefa,
  salvarTarefa,
  salvandoTarefa,
  novoAtendimento,
  setNovoAtendimento,
  salvarAtendimento,
  salvandoAtendimento,
}: {
  processo: any
  resumo: any
  onClose: () => void
  editandoContrato: boolean
  setEditandoContrato: (value: boolean) => void
  contratoForm: { numProposta: string; numContrato: string; dataEmissaoContrato: string; dataAssinatura: string; dataPagtoVendedor: string }
  setContratoForm: Dispatch<SetStateAction<{ numProposta: string; numContrato: string; dataEmissaoContrato: string; dataAssinatura: string; dataPagtoVendedor: string }>>
  salvarContrato: () => void
  salvandoContrato: boolean
  acaoAberta: 'tarefa' | 'atendimento' | null
  setAcaoAberta: (value: 'tarefa' | 'atendimento' | null) => void
  tarefaForm: { executanteId: number; solicitacao: string; dataLimite: string }
  setTarefaForm: Dispatch<SetStateAction<{ executanteId: number; solicitacao: string; dataLimite: string }>>
  usuariosTarefa: { value: number; label: string }[]
  salvarTarefa: () => void
  salvandoTarefa: boolean
  novoAtendimento: string
  setNovoAtendimento: (value: string) => void
  salvarAtendimento: () => void
  salvandoAtendimento: boolean
}) {
  const proponente = processo.compradores?.find((item: any) => item.proponente)?.cliente || processo.compradores?.[0]?.cliente
  const vendedor = processo.vendedores?.[0]?.cliente
  const imovel = processo.imoveis?.[0]?.imovel
  const etapaAtual = processo.etapas?.find((item: any) => !item.etapa?.concluido)
  const statusLabel = processo.reprovado ? 'Reprovado' : processo.arquivado ? 'Arquivado' : 'Ativo'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={statusLabel} />
          {(resumo?.etapaNome || etapaAtual?.etapaNome) && <Badge label={resumo?.etapaNome || etapaAtual?.etapaNome} color="bg-yellow-100 text-yellow-700" />}
        </div>
        <Link to={`/financiamento/processos/${processo.id}`} onClick={onClose}>
          <Btn size="sm" icon={<ExternalLink size={13} />}>Entrar no processo</Btn>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ResumoCard titulo="Proponente">
          <ResumoLinha label="Nome" value={proponente?.nome || resumo?.compradorNome} />
          <ResumoLinha label="CPF/CNPJ" value={proponente?.cpfCnpj} />
          <ResumoLinha label="Telefone" value={proponente?.fone1 || proponente?.fone2 || proponente?.fone3} />
          <ResumoLinha label="E-mail" value={proponente?.email} />
        </ResumoCard>

        <ResumoCard titulo="Operação">
          <ResumoLinha label="Banco" value={resumo?.bancoNome || processo.bancoNome} />
          <ResumoLinha label="Agência" value={resumo?.agenciaNome || processo.agenciaNome} />
          <ResumoLinha label="Modalidade" value={resumo?.modalidadeNome || processo.modalidadeNome} />
          <ResumoLinha label="Valor financiado" value={dinheiro(processo.valorFinanciado)} />
          <ResumoLinha label="Valor compra/venda" value={dinheiro(processo.valorCompraVenda)} />
          <ResumoLinha label="Valor parcela" value={dinheiro(processo.valorParcela)} />
        </ResumoCard>

        <ResumoCard
          titulo="Contrato"
          action={<button type="button" onClick={() => setEditandoContrato(!editandoContrato)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>}>
          {editandoContrato ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickInput label="Nº Proposta" value={contratoForm.numProposta} onChange={(value) => setContratoForm((form) => ({ ...form, numProposta: value }))} />
              <QuickInput label="Nº Contrato" value={contratoForm.numContrato} onChange={(value) => setContratoForm((form) => ({ ...form, numContrato: value }))} />
              <QuickInput label="Data emissão contrato" type="date" value={contratoForm.dataEmissaoContrato} onChange={(value) => setContratoForm((form) => ({ ...form, dataEmissaoContrato: value }))} />
              <QuickInput label="Data assinatura" type="date" value={contratoForm.dataAssinatura} onChange={(value) => setContratoForm((form) => ({ ...form, dataAssinatura: value }))} />
              <QuickInput label="Data pagto vendedor" type="date" value={contratoForm.dataPagtoVendedor} onChange={(value) => setContratoForm((form) => ({ ...form, dataPagtoVendedor: value }))} />
              <div className="flex items-end gap-2">
                <Btn size="sm" loading={salvandoContrato} onClick={salvarContrato}>Salvar</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEditandoContrato(false)}>Cancelar</Btn>
              </div>
            </div>
          ) : (
            <>
              <ResumoLinha label="Nº Proposta" value={processo.numProposta} />
              <ResumoLinha label="Nº Contrato" value={processo.numContrato} />
              <ResumoLinha label="Emissão" value={formatarData(processo.dataEmissaoContrato)} />
              <ResumoLinha label="Assinatura" value={formatarData(processo.dataAssinatura)} />
              <ResumoLinha label="Data pagto vendedor" value={formatarData(processo.dataPagtoVendedor)} />
            </>
          )}
        </ResumoCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResumoCard titulo="Vínculo">
          <ResumoLinha label="Parceiro" value={resumo?.parceiroNome || processo.parceiroNome} />
          <ResumoLinha label="Corretor" value={resumo?.corretorNome || processo.corretorNome} />
          <ResumoLinha label="Imobiliária" value={resumo?.imobiliariaNome || processo.imobiliariaNome} />
          <ResumoLinha label="Construtora" value={resumo?.construtoraNome || processo.construtoraNome} />
          <ResumoLinha label="Responsável" value={resumo?.responsavelNome || processo.responsavelNome} />
        </ResumoCard>

        <ResumoCard titulo="Imóvel">
          <ResumoLinha label="Endereço" value={imovel?.endereco} />
          <ResumoLinha label="Cidade/UF" value={[imovel?.cidade, imovel?.uf].filter(Boolean).join('/')} />
          <ResumoLinha label="Matrícula" value={imovel?.matricula} />
        </ResumoCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResumoCard titulo="Vendedor">
          <ResumoLinha label="Nome" value={vendedor?.nome || resumo?.vendedorNome} />
          <ResumoLinha label="CPF/CNPJ" value={vendedor?.cpfCnpj} />
          <ResumoLinha label="Telefone" value={vendedor?.fone1 || vendedor?.fone2 || vendedor?.fone3} />
        </ResumoCard>

        <ResumoCard
          titulo="Tarefas"
          action={<Btn size="sm" icon={<Plus size={13} />} onClick={() => setAcaoAberta(acaoAberta === 'tarefa' ? null : 'tarefa')}>Nova</Btn>}>
          {processo.tarefas?.length ? processo.tarefas.slice(0, 4).map((tarefa: any) => (
            <div key={tarefa.id} className="rounded border bg-white px-3 py-2 text-xs">
              <strong>#{tarefa.id}</strong> {tarefa.solicitacao}
              <span className="ml-2 text-gray-500">{tarefa.status}</span>
            </div>
          )) : <p className="text-sm text-gray-500">Nenhuma tarefa.</p>}
          {acaoAberta === 'tarefa' && (
            <ActionPanel title="Nova tarefa" onClose={() => setAcaoAberta(null)}>
              <QuickSelect
                label="Executante"
                value={tarefaForm.executanteId}
                onChange={(value) => setTarefaForm((form) => ({ ...form, executanteId: Number(value) }))}
                placeholder="Selecione..."
                options={usuariosTarefa}
              />
              <QuickTextarea label="Solicitação" rows={4} value={tarefaForm.solicitacao} onChange={(value) => setTarefaForm((form) => ({ ...form, solicitacao: value }))} />
              <QuickInput label="Data limite" type="date" value={tarefaForm.dataLimite} onChange={(value) => setTarefaForm((form) => ({ ...form, dataLimite: value }))} />
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={() => setAcaoAberta(null)}>Cancelar</Btn>
                <Btn loading={salvandoTarefa} disabled={!tarefaForm.executanteId || !tarefaForm.solicitacao.trim()} onClick={salvarTarefa}>Criar tarefa</Btn>
              </div>
            </ActionPanel>
          )}
        </ResumoCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResumoCard
          titulo="Atendimento"
          action={<Btn size="sm" icon={<MessageSquare size={13} />} onClick={() => setAcaoAberta(acaoAberta === 'atendimento' ? null : 'atendimento')}>Novo</Btn>}>
          {processo.atendimentos?.length ? processo.atendimentos.slice(0, 5).map((atendimento: any) => (
            <div key={atendimento.id} className="rounded border bg-white px-3 py-2 text-xs">
              {atendimento.descricao}
              <span className="block text-gray-500">{formatarData(atendimento.criadoEm)}</span>
            </div>
          )) : <p className="text-sm text-gray-500">Nenhum atendimento.</p>}
          {acaoAberta === 'atendimento' && (
            <ActionPanel title="Novo atendimento" onClose={() => setAcaoAberta(null)}>
              <QuickTextarea label="Atendimento" rows={4} value={novoAtendimento} onChange={setNovoAtendimento} />
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={() => setAcaoAberta(null)}>Cancelar</Btn>
                <Btn loading={salvandoAtendimento} disabled={!novoAtendimento.trim()} onClick={salvarAtendimento}>Salvar</Btn>
              </div>
            </ActionPanel>
          )}
        </ResumoCard>

        <ResumoCard titulo="Histórico">
          {processo.historico?.length ? processo.historico.slice(0, 5).map((historico: any) => (
            <div key={historico.id} className="rounded border bg-white px-3 py-2 text-xs">
              {historico.titulo || historico.descricao}
              <span className="block text-gray-500">{formatarData(historico.criadoEm)}</span>
            </div>
          )) : <p className="text-sm text-gray-500">Nenhum histórico.</p>}
        </ResumoCard>
      </div>
    </div>
  )
}

function ActionPanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-blue-900">{title}</h3>
        <button type="button" onClick={onClose} className="text-sm text-blue-600 hover:text-blue-800">Fechar</button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function QuickInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}

function QuickSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: number
  onChange: (value: string) => void
  options: { value: number; label: string }[]
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function QuickTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="resize-none rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}

function getUsuariosTarefa(usuarios: any[], processoResumo: any) {
  const idsExternosVinculados = new Set(
    [
      processoResumo?.parceiroUsuarioId,
      processoResumo?.corretorUsuarioId,
      processoResumo?.imobiliariaUsuarioId,
      processoResumo?.construtoraUsuarioId,
    ].filter(Boolean).map(Number)
  )

  return usuarios
    .filter((usuario: any) =>
      ['Administrador', 'Gerente', 'Analista'].includes(usuario.perfil) || idsExternosVinculados.has(Number(usuario.id))
    )
    .map((usuario: any) => ({
      value: usuario.id,
      label: idsExternosVinculados.has(Number(usuario.id)) ? `${usuario.nome} (${usuario.perfil})` : usuario.nome,
    }))
}

function ResumoCard({ titulo, action, children }: { titulo: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-800">{titulo}</h3>
        {action}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  )
}

function ResumoLinha({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <span className="font-semibold text-gray-700">{label}: </span>
      <span className="text-gray-700">{value ? String(value) : '—'}</span>
    </div>
  )
}
