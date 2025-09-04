import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { selectedArea, publicKey, isWar, creditsNeeded } = body

    // Input validation
    if (!selectedArea || typeof selectedArea !== 'object' || !selectedArea.x || !selectedArea.y || !selectedArea.width || !selectedArea.height) {
      return NextResponse.json({ error: "Invalid selected area provided." }, { status: 400 })
    }
    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: "Invalid public key provided." }, { status: 400 })
    }
    if (typeof creditsNeeded !== 'number' || creditsNeeded <= 0) {
      return NextResponse.json({ error: "Invalid credits needed." }, { status: 400 })
    }

    console.log(
      `[v0] Processing purchase: ${creditsNeeded} credits for ${selectedArea.width}x${selectedArea.height} area at (${selectedArea.x}, ${selectedArea.y}) by ${publicKey}`,
    )

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

    const { data: userId, error: userError } = await supabase.rpc("get_or_create_user", {
      wallet_addr: publicKey,
    })

    if (userError || !userId) {
      console.error("[v0] Error getting/creating user:", userError)
      return NextResponse.json({ error: "Failed to get user information." }, { status: 500 })
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

    // Perform atomic transaction for deduction and insertion
    const { data, error: txError } = await supabase.rpc('atomic_purchase', {
      p_wallet_address: publicKey,
      p_credits_needed: creditsNeeded,
      p_start_x: selectedArea.x,
      p_start_y: selectedArea.y,
      p_width: selectedArea.width,
      p_height: selectedArea.height,
      p_transaction_signature: transactionSignature,
      p_user_id: userId,
    })

    if (txError) {
      console.error("[v0] Atomic transaction error:", txError)
      return NextResponse.json({ error: "Failed to process purchase." }, { status: 500 })
    }

    const newCreditsBalance = data?.new_balance || currentCredits - creditsNeeded

    console.log(`[v0] Purchase completed successfully. New balance: ${newCreditsBalance}`)
    return NextResponse.json({ success: true, newCreditsBalance, transactionSignature })
  } catch (error) {
    console.error("[v0] Server-side purchase failed:", error)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
