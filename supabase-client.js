// supabase-client.js
// Single shared instance of the Supabase client to prevent multiple instances
window.supabaseClient = window.supabase.createClient(window.env.SUPABASE_URL, window.env.SUPABASE_KEY, {
    auth: { 
        persistSession: true, 
        autoRefreshToken: true,
        detectSessionInUrl: true 
    }
});
