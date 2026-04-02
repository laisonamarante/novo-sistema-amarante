import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useAuth } from '../lib/auth'
import { Loader2 } from 'lucide-react'

export function Login() {
  const navigate  = useNavigate()
  const { setAuth } = useAuth()
  const [login, setLogin]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro,  setErro]    = useState('')

  const mutation = trpc.auth.login.useMutation({
    onSuccess: (data) => { setAuth(data.token, data.usuario); navigate('/') },
    onError:   (e)    => setErro(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setErro('')
    if (!login || !senha) return setErro('Preencha usuário e senha')
    mutation.mutate({ login, senha })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 px-8 py-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-blue-900 font-black text-2xl">A</span>
          </div>
          <h1 className="text-white font-bold text-xl">AMARANTE</h1>
          <p className="text-blue-300 text-sm mt-1">Serviços Financeiros e Imobiliários</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input
              type="text" value={login} onChange={e => setLogin(e.target.value)}
              placeholder="Entre com o usuário..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Senha"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"/>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <button type="submit" disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {mutation.isPending && <Loader2 size={16} className="animate-spin"/>}
            Entrar
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">Sistema protegido • GoDaddy SSL</p>
        </div>
      </div>
    </div>
  )
}
