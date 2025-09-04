import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import nacl from "tweetnacl"
import { PublicKey } from "@solana/web3.js"

export async function POST(request: NextRequest) {
  try {
    const { publicKey, updatedBlock, signature, messageToSign } = await request.json()

    console.log("[v0] Update block API called:", {
      publicKey,
      blockPosition: `${updatedBlock.x},${updatedBlock.y}`,
      hasImage: !!updatedBlock.imageUrl,
      hasUrl: !!updatedBlock.url,
      hasAltText: !!updatedBlock.alt_text,
    })

    if (!publicKey || !updatedBlock || !signature || !messageToSign) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const encodedMessage = new TextEncoder().encode(messageToSign)
    const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0))
    const pubKeyBytes = new PublicKey(publicKey).toBytes()

    const verified = nacl.sign.detached.verify(encodedMessage, signatureBytes, pubKeyBytes)

    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

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

    const { data: existing, error: findError } = await supabase
      .from("pixel_blocks")
      .select("*")
      .eq("start_x", updatedBlock.x)
      .eq("start_y", updatedBlock.y)
      .eq("width", updatedBlock.width)
      .eq("height", updatedBlock.height)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 })
    }

    if (existing.wallet_address !== publicKey) {
      return NextResponse.json({ error: "Not the block owner" }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from("pixel_blocks")
      .update({
        image_url: updatedBlock.imageUrl || null,
        link_url: updatedBlock.url || null,
        alt_text: updatedBlock.alt_text || null,
      })
      .eq("id", existing.id)

    if (updateError) {
      console.error("[v0] Database update error:", updateError.message)
      return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 })
    }

    console.log("[v0] Successfully updated block in database for:", publicKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update block API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
