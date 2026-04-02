export function exportToCSV(headers: string[], rows: any[][], filename: string) {
  const BOM = '\uFEFF'
  const csv = BOM + [
    headers.join(';'),
    ...rows.map(r => r.map(c => {
      const val = String(c ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ').replace(/\r/g, ' ')
      return `"${val}"`
    }).join(';'))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function hoje() {
  return new Date().toISOString().slice(0, 10)
}