import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0'

const archiveBucket = 'private-archives'
const allowedOrigins = new Set([
  'https://echo-trace-eight.vercel.app',
  'http://localhost:3000',
])

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin)
      ? origin
      : 'https://echo-trace-eight.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (origin && !allowedOrigins.has(origin)) {
    return json(request, 403, { error: 'Origin not allowed.' })
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }
  if (request.method !== 'POST') {
    return json(request, 405, { error: 'Method not allowed.' })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) throw new HttpError(500, 'Function is not configured.')

    const authorization = request.headers.get('Authorization')
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) throw new HttpError(401, 'Unauthorized')

    const clientOptions = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
    const userClient = createClient(url, anonKey, clientOptions)
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) throw new HttpError(401, 'Unauthorized')

    const admin = createClient(url, serviceKey, clientOptions)
    const { data: archiveRows, error: archiveError } = await admin
      .from('archive_files')
      .select('storage_path')
      .eq('user_id', user.id)
    if (archiveError) throw new HttpError(500, 'Archive metadata could not be read.')

    const userPrefix = `${user.id}/`
    const storagePaths = new Set<string>()
    for (const row of archiveRows ?? []) {
      const path = row.storage_path as string
      if (!path.startsWith(userPrefix)) throw new HttpError(500, 'Invalid archive ownership path.')
      storagePaths.add(path)
    }

    let offset = 0
    const pageSize = 100
    while (true) {
      const { data: objects, error: listError } = await admin.storage
        .from(archiveBucket)
        .list(user.id, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } })
      if (listError) throw new HttpError(500, 'Archive storage could not be listed.')
      for (const object of objects ?? []) storagePaths.add(`${userPrefix}${object.name}`)
      if (!objects || objects.length < pageSize) break
      offset += objects.length
    }

    const paths = [...storagePaths]
    for (let index = 0; index < paths.length; index += pageSize) {
      const { error: removalError } = await admin.storage
        .from(archiveBucket)
        .remove(paths.slice(index, index + pageSize))
      if (removalError) throw new HttpError(500, 'Archive storage could not be deleted.')
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) throw new HttpError(500, 'Auth account could not be deleted.')

    return json(request, 200, { deleted: true })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    console.error('delete-account failed', error instanceof Error ? error.message : 'Unknown error')
    return json(request, status, { error: 'Account deletion could not be completed.' })
  }
})
