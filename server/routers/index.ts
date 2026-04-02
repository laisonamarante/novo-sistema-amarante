import { router } from '../trpc'
import { authRouter }           from './auth'
import { clientesRouter }       from './clientes'
import { processosRouter }      from './processos'
import { financeiroRouter }      from './financeiro'
import { tarefasRouter, preAnaliseRouter, pontoRouter, cadastrosRouter } from './cadastros'
import { advertenciasRouter, avisosRouter, permissoesRouter, permissoesPerfilRouter } from './advertencias'

export const appRouter = router({
  auth:         authRouter,
  clientes:     clientesRouter,
  processos:    processosRouter,
  financeiro:   financeiroRouter,
  tarefas:      tarefasRouter,
  preAnalise:   preAnaliseRouter,
  ponto:        pontoRouter,
  cadastros:    cadastrosRouter,
  advertencias: advertenciasRouter,
  avisos:       avisosRouter,
  permissoes:   permissoesRouter,
  permissoesPerfil: permissoesPerfilRouter,
})

export type AppRouter = typeof appRouter
