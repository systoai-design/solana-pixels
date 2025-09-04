import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tomdwpozafthjxgbvoau.supabase.co"
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM"

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
