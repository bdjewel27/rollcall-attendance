import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://nxfkknhjljhqqtzvamme.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_t-HaiZ-k8bI0yv_HppJdOw_1KgSbG4j"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
