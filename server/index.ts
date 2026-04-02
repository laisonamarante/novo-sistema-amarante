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

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://34.28.158.70',
  'http://34.28.158.70:3000',
  'http://34.28.158.70:3060',
  'http://100.96.30.33:3000',
  'http://100.96.30.33:3060',
  'http://localhost:5173',
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true)
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
