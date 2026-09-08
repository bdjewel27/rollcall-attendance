// ---- Supabase configuration ----
// Replace these two values with your own project's credentials
// (Project Settings -> API in your Supabase dashboard).
const SUPABASE_URL = "https://nxfkknhjljhqqtzvamme.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t-HaiZ-k8bI0yv_HppJdOw_1KgSbG4j";

// Overwrite (not redeclare) the global `supabase` namespace object from the
// CDN script with the actual client instance, so every other script on the
// page can keep using the bare `supabase.from(...)` / `supabase.auth...` calls.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
