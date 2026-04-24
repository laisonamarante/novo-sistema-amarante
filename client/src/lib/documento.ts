export type DocumentoMask = 'cpf' | 'cnpj' | 'cpfCnpj'

export function somenteDigitos(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function limitarDocumento(value: unknown, max: number) {
  return somenteDigitos(value).slice(0, max)
}

export function formatCpf(value: unknown) {
  const digits = limitarDocumento(value, 11)
  if (!digits) return ''

  let formatted = digits.slice(0, 3)
  if (digits.length > 3) formatted += `.${digits.slice(3, 6)}`
  if (digits.length > 6) formatted += `.${digits.slice(6, 9)}`
  if (digits.length > 9) formatted += `-${digits.slice(9, 11)}`
  return formatted
}

export function formatCnpj(value: unknown) {
  const digits = limitarDocumento(value, 14)
  if (!digits) return ''

  let formatted = digits.slice(0, 2)
  if (digits.length > 2) formatted += `.${digits.slice(2, 5)}`
  if (digits.length > 5) formatted += `.${digits.slice(5, 8)}`
  if (digits.length > 8) formatted += `/${digits.slice(8, 12)}`
  if (digits.length > 12) formatted += `-${digits.slice(12, 14)}`
  return formatted
}

export function formatCpfCnpj(value: unknown) {
  const digits = limitarDocumento(value, 14)
  if (!digits) return ''
  return digits.length <= 11 ? formatCpf(digits) : formatCnpj(digits)
}

export function normalizarDocumentoPorMascara(value: unknown, mask: DocumentoMask) {
  const digits = somenteDigitos(value)
  if (mask === 'cpf') return digits.slice(0, 11)
  return digits.slice(0, 14)
}
