import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0'

export const allowedOrigins = new Set([
  'https://echo-trace.com',
  'https://www.echo-trace.com',
  'https://echo-trace-eight.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
])

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://echo-trace-eight.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json' } })
}

function clientOptions() {
  return { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new HttpError(500, 'Billing is not configured.')
  return createClient(url, serviceKey, clientOptions())
}

export async function authenticatedUser(request: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) throw new HttpError(500, 'Billing is not configured.')
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new HttpError(401, 'Sign in to continue.')
  const client = createClient(url, anonKey, clientOptions())
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user?.email) throw new HttpError(401, 'Sign in to continue.')
  return user
}

export function assertRequest(request: Request) {
  const origin = request.headers.get('Origin')
  if (origin && !allowedOrigins.has(origin)) throw new HttpError(403, 'Origin not allowed.')
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.')
}
