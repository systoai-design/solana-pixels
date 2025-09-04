import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export async function POST(req: Request) {
  try {
    const { publicKey, updatedBlock, signature, messageToSign } = await req.json();

    if (!publicKey || !updatedBlock || !signature || !messageToSign) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const encodedMessage = new TextEncoder().encode(messageToSign);
    const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const pubKeyBytes = new PublicKey(publicKey).toBytes();

    const verified = nacl.sign.detached.verify(encodedMessage, signatureBytes, pubKeyBytes);

    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    });

    // Find existing block to verify ownership
    const { data: existing, error: findError } = await supabase
      .from("pixel_blocks")
      .select("*")
      .eq("start_x", updatedBlock.x)
      .eq("start_y", updatedBlock.y)
      .eq("width", updatedBlock.width)
      .eq("height", updatedBlock.height)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (existing.wallet_address !== publicKey) {
      return NextResponse.json({ error: "Not the block owner" }, { status: 403 });
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from("pixel_blocks")
      .update({
        image_url: updatedBlock.imageUrl || null,
        link_url: updatedBlock.url || null,
        alt_text: updatedBlock.alt_text || null,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[v0] Database update error:", updateError);
      return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
    }

    console.log("[v0] Block updated successfully for:", publicKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Update block API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
