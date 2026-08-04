const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'application/json', 'text/csv',
])

export function validateArchiveFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: 'Files must be 10 MB or smaller.' }
  if (!ALLOWED_TYPES.has(file.type)) return { valid: false, error: 'Use an image, PDF, TXT, JSON, or CSV file.' }
  if (!file.name.trim() || file.name.length > 180) return { valid: false, error: 'Use a shorter file name.' }
  return { valid: true, error: null }
}

export function safeStorageName(name: string) {
  const extension = name.includes('.') ? `.${name.split('.').pop()?.toLowerCase()}` : ''
  return `${crypto.randomUUID()}${extension.replace(/[^.a-z0-9]/g, '')}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
