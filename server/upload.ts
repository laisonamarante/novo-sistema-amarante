import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const router = express.Router()

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.zip', '.rar', '.7z',
]
const MAX_FILE_SIZE = 25 * 1024 * 1024

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, unique + ext)
  }
})

function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Tipo de arquivo nao permitido: ' + ext))
  }
}

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter })

function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Nao autorizado' })
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET nao configurado')
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Token invalido' })
  }
}

router.post('/upload', authMiddleware, upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  res.json({
    ok: true,
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    path: '/uploads/' + req.file.filename,
  })
})

router.post('/upload/multiple', authMiddleware, upload.array('files', 10), (req: any, res) => {
  const files = (req.files as Express.Multer.File[]).map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    size: f.size,
    path: '/uploads/' + f.filename,
  }))
  res.json({ ok: true, files })
})

router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Arquivo muito grande (max 25MB)' })
    return res.status(400).json({ error: err.message })
  }
  if (err) return res.status(400).json({ error: err.message })
  next()
})

export { router as uploadRouter }
