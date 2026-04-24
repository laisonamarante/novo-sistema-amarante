import express from 'express'
import cors from 'cors'
import path from 'path'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext } from './context'
import { uploadRouter } from './upload'
import jwt from 'jsonwebtoken'

const app = express()
const PORT = process.env.PORT || 3050

function normalizarOrigem(origin: string) {
  return origin.trim().replace(/\/$/, '')
}

const configuredOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
]
  .filter((origin): origin is string => Boolean(origin?.trim()))
  .map(normalizarOrigem)

const devOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...devOrigins]))

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(normalizarOrigem(origin))) cb(null, true)
    else cb(null, false)
  },
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))

app.use('/uploads', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token as string
  if (!token) return res.status(401).json({ error: 'Nao autorizado' })
  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalido' })
  }
}, express.static(path.join(process.cwd(), 'uploads')))

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))
app.use('/api', uploadRouter)
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date() }))

app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT))
