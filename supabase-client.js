// supabase-client.js
// Single shared instance of the Supabase client to prevent multiple instances
const supabaseClient = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
console.log('supabaseClient:', supabaseClient);