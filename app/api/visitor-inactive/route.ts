import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    await supabase.from("visitors").update({ is_active: false }).eq("session_id", sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking visitor inactive:", error)
    return NextResponse.json({ error: "Failed to update visitor status" }, { status: 500 })
  }
}
