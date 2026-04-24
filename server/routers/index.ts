import { router } from '../trpc'
import { authRouter }           from './auth'
import { clientesRouter }       from './clientes'
import { processosRouter }      from './processos'
import { tarefasRouter, preAnaliseRouter, pontoRouter, cadastrosRouter } from './cadastros'
import { advertenciasRouter, avisosRouter, permissoesRouter, permissoesPerfilRouter } from './advertencias'
import { chatRouter } from './chat'

export const appRouter = router({
  auth:         authRouter,
  clientes:     clientesRouter,
  processos:    processosRouter,
  tarefas:      tarefasRouter,
  preAnalise:   preAnaliseRouter,
  ponto:        pontoRouter,
  cadastros:    cadastrosRouter,
  advertencias: advertenciasRouter,
  avisos:       avisosRouter,
  permissoes:   permissoesRouter,
  permissoesPerfil: permissoesPerfilRouter,
  chat:         chatRouter,
})

export type AppRouter = typeof appRouter
