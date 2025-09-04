import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.png`; // Unique name to avoid conflicts

    const { data, error } = await supabase.storage
      .from("pixel-images") // Replace with your bucket name
      .upload(fileName, file, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("[v0] Storage upload error:", error);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const { publicURL } = supabase.storage.from("pixel-images").getPublicUrl(data.path).data || {};

    if (!publicURL) {
      return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    console.log("[v0] Image uploaded successfully:", publicURL);
    return NextResponse.json({ url: publicURL });
  } catch (error) {
    console.error("[v0] Upload API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
