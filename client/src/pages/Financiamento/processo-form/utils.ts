import { getStoredAuthToken } from '../../../lib/auth-storage'

export function formatDateBr(value: unknown) {
  if (!value) return ''

  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

export function formatDateTimeBr(value: unknown) {
  if (!value) return ''

  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

export function parseDecimalBr(value: unknown) {
  if (value === null || value === undefined || value === '') return ''

  const text = String(value)
    .trim()
    .replace(/[^\d,.-]/g, '')

  if (!text) return ''
  if (text.includes(',')) return text.replace(/\./g, '').replace(',', '.')
  return text
}

export function formatCurrencyBr(value: unknown) {
  const parsed = Number(parseDecimalBr(value))
  const amount = Number.isFinite(parsed) ? parsed : 0

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDecimalBr(value: unknown, fractionDigits = 2) {
  const parsed = Number(parseDecimalBr(value))
  const amount = Number.isFinite(parsed) ? parsed : 0

  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function buildDocumentoUrl(path: string) {
  if (!path) return ''

  const base = import.meta.env.BASE_URL || '/'
  const token = getStoredAuthToken()
  const cleanPath = path.startsWith('/uploads/') ? path.slice(1) : path

  return `${base}${cleanPath}?token=${encodeURIComponent(token)}`
}

export function filtrarDocumentosPorSecao(documentos: any[], secao: string) {
  return documentos.filter(
    (documento) =>
      (documento.secao || 'Geral') === secao ||
      (!documento.secao && secao === 'Formulários')
  )
}
