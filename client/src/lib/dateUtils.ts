/** Formata data do banco para dd/mm/yyyy sem bug de timezone */
export function fmtDateBR(d: any): string {
  if (!d) return '--'
  // Se é Date object, converter para ISO string primeiro
  if (d instanceof Date) {
    d = d.toISOString()
  }
  const s = String(d)
  // Extrair YYYY-MM-DD do inicio (funciona para '2026-04-01', '2026-04-01T00:00:00.000Z', etc)
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return match[3] + '/' + match[2] + '/' + match[1]
  }
  // Fallback
  const dt = new Date(s)
  if (isNaN(dt.getTime())) return '--'
  return dt.toLocaleDateString('pt-BR')
}
