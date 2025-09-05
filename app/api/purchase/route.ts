import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { selectedArea, publicKey, isWar, creditsNeeded } = body

    // Input validation
    if (
      !selectedArea ||
      typeof selectedArea !== "object" ||
      !selectedArea.x ||
      !selectedArea.y ||
      !selectedArea.width ||
      !selectedArea.height
    ) {
      return NextResponse.json({ error: "Invalid selected area provided." }, { status: 400 })
    }
    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json({ error: "Invalid public key provided." }, { status: 400 })
    }
    if (typeof creditsNeeded !== "number" || creditsNeeded <= 0) {
      return NextResponse.json({ error: "Invalid credits needed." }, { status: 400 })
    }

    console.log(
      `[v0] Processing purchase: ${creditsNeeded} credits for ${selectedArea.width}x${selectedArea.height} area at (${selectedArea.x}, ${selectedArea.y}) by ${publicKey}`,
    )

    const supabaseUrl = "https://tomdwpozafthjxgbvoau.supabase.co"
    const supabaseServiceKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU"

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[v0] Missing Supabase environment variables")
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
    }

    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    let { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", publicKey)
      .maybeSingle()

    if (userError) {
      console.error("[v0] Error fetching user:", userError)
      return NextResponse.json({ error: "Failed to get user information." }, { status: 500 })
    }

    // Create user if doesn't exist
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          wallet_address: publicKey,
          total_pixels_owned: 0,
          total_spent: 0,
        })
        .select("id")
        .single()

      if (createError) {
        console.error("[v0] Error creating user:", createError)
        return NextResponse.json({ error: "Failed to create user." }, { status: 500 })
      }
      user = newUser
    }

    // Fetch current credits
    const { data: currentWallet, error: fetchError } = await supabase
      .from("wallet_credits")
      .select("credits")
      .eq("wallet_address", publicKey)
      .maybeSingle()

    if (fetchError) {
      console.error("[v0] Error fetching current credits:", fetchError)
      return NextResponse.json({ error: "Failed to fetch current credits." }, { status: 500 })
    }

    const currentCredits = currentWallet?.credits || 0

    if (currentCredits < creditsNeeded) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Required: ${creditsNeeded}, Available: ${currentCredits}`,
        },
        { status: 400 },
      )
    }

    // Generate transaction signature
    const prefix = isWar ? "war" : "credit"
    const transactionSignature = `${prefix}_purchase_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // First, deduct credits
    const newBalance = currentCredits - creditsNeeded
    const { error: creditError } = await supabase
      .from("wallet_credits")
      .update({ credits: newBalance })
      .eq("wallet_address", publicKey)

    if (creditError) {
      console.error("[v0] Error updating credits:", creditError)
      return NextResponse.json({ error: "Failed to deduct credits." }, { status: 500 })
    }

    // Then, create pixel block
    const { error: blockError } = await supabase.from("pixel_blocks").insert({
      start_x: selectedArea.x,
      start_y: selectedArea.y,
      width: selectedArea.width,
      height: selectedArea.height,
      wallet_address: publicKey,
      owner_id: user.id,
      transaction_signature: transactionSignature,
      total_price: creditsNeeded,
    })

    if (blockError) {
      console.error("[v0] Error creating pixel block:", blockError)
      // Rollback credits if block creation fails
      await supabase.from("wallet_credits").update({ credits: currentCredits }).eq("wallet_address", publicKey)
      return NextResponse.json({ error: "Failed to create pixel block." }, { status: 500 })
    }

    // Update user stats
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        total_pixels_owned: selectedArea.width * selectedArea.height,
        total_spent: creditsNeeded,
      })
      .eq("id", user.id)

    if (userUpdateError) {
      console.error("[v0] Error updating user stats:", userUpdateError)
      // Continue anyway as this is not critical
    }

    console.log(`[v0] Purchase completed successfully. New balance: ${newBalance}`)
    return NextResponse.json({ success: true, newCreditsBalance: newBalance, transactionSignature })
  } catch (error) {
    console.error("[v0] Server-side purchase failed:", error)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
