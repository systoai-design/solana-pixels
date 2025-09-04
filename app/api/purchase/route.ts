import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: Request) {
  try {
    const { selectedArea, publicKey, isWar, userCredits, creditsNeeded } = await req.json()

    console.log(
      `[v0] Processing purchase: ${creditsNeeded} credits for ${selectedArea.width}x${selectedArea.height} area`,
    )

    const supabaseUrl = "https://tomdwpozafthjxgbvoau.supabase.co"
    // You need to replace this with your actual SERVICE ROLE KEY from Supabase dashboard
    const supabaseServiceKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU" // Replace with actual service role key

    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { data: userId, error: userError } = await supabase.rpc("get_or_create_user", {
      wallet_addr: publicKey,
    })

    if (userError || !userId) {
      console.error("[v0] Error getting/creating user:", userError)
      return NextResponse.json({ error: "Failed to get user information." }, { status: 500 })
    }

    // Fetch and check current credits (This is now done securely on the server)
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
          error: `Insufficient credits. Need ${creditsNeeded}, have ${currentCredits}`,
        },
        { status: 400 },
      )
    }

    const newCreditsBalance = currentCredits - creditsNeeded

    // Update credits
    const { error: updateError } = await supabase.from("wallet_credits").upsert({
      wallet_address: publicKey,
      credits: newCreditsBalance,
      updated_at: new Date().toISOString(),
    })

    if (updateError) {
      console.error("[v0] Server-side credit deduction error:", updateError)
      return NextResponse.json({ error: "Failed to deduct credits." }, { status: 500 })
    }

    const transactionSignature = `${isWar ? "war" : "credit"}_purchase_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const { error: blockError } = await supabase.from("pixel_blocks").insert({
      start_x: selectedArea.x,
      start_y: selectedArea.y,
      width: selectedArea.width,
      height: selectedArea.height,
      owner_id: userId,
      wallet_address: publicKey,
      transaction_signature: transactionSignature,
      total_price: creditsNeeded,
      created_at: new Date().toISOString(),
    })

    if (blockError) {
      console.error("[v0] Server-side block save error:", blockError)
      await supabase.from("wallet_credits").upsert({
        wallet_address: publicKey,
        credits: currentCredits,
        updated_at: new Date().toISOString(),
      })
      return NextResponse.json({ error: "Failed to save purchase to database." }, { status: 500 })
    }

    console.log(`[v0] Purchase completed successfully. New balance: ${newCreditsBalance}`)
    return NextResponse.json({ success: true, newCreditsBalance, transactionSignature })
  } catch (error) {
    console.error("[v0] Server-side purchase failed:", error)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
