import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authorization = request.headers.get('Authorization')
    if (!url || !anonKey || !serviceKey || !authorization) throw new Error('Unauthorized')

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error } = await userClient.auth.getUser()
    if (error || !user) throw new Error('Unauthorized')

    const admin = createClient(url, serviceKey)
    const { data: files } = await admin.from('archive_files').select('storage_path').eq('user_id', user.id)
    const paths = (files ?? []).map((file: { storage_path: string }) => file.storage_path)
    if (paths.length) await admin.storage.from('private-archives').remove(paths)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Account deletion could not be completed.' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
