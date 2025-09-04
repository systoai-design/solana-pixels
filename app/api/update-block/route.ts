import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { publicKey, updatedBlock } = await request.json()

    console.log("[v0] Update block API called:", {
      publicKey,
      blockPosition: `${updatedBlock.x},${updatedBlock.y}`,
      hasImage: !!updatedBlock.imageUrl,
      hasUrl: !!updatedBlock.url,
      hasAltText: !!updatedBlock.alt_text,
    })

    const supabase = createServerClient(
      "https://tomdwpozafthjxgbvoau.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU",
      {
        cookies: {
          get: () => null,
          set: () => {},
          remove: () => {},
        },
      },
    )

    // Update the pixel block in database
    const { data, error } = await supabase
      .from("pixel_blocks")
      .update({
        image_url: updatedBlock.imageUrl,
        link_url: updatedBlock.url,
        alt_text: updatedBlock.alt_text,
      })
      .eq("start_x", updatedBlock.x)
      .eq("start_y", updatedBlock.y)
      .eq("width", updatedBlock.width)
      .eq("height", updatedBlock.height)
      .eq("wallet_address", publicKey)
      .select()

    if (error) {
      console.error("[v0] Database update error:", error.message)
      return NextResponse.json({ error: `Database update failed: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log("[v0] No matching block found for update")
      return NextResponse.json({ error: "Block not found or not owned by wallet" }, { status: 404 })
    }

    console.log("[v0] Successfully updated block in database:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Update block API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
