function escapeCsv(value: unknown) {
  const text = value == null ? '' : Array.isArray(value) ? value.join('|') : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return [headers.map(escapeCsv).join(','), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))].join('\n')
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
