import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hsbkabcobmyyyvsuuvep.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYmthYmNvYm15eXl2c3V1dmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTA3MzUsImV4cCI6MjA4OTc4NjczNX0.u93xX4XEspSNC0JNf5HUzQdKWkOFniZLTVOOxDWIqMU'

export const supabase = createClient(supabaseUrl, supabaseKey)