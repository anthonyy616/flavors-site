import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GUEST_LIMIT_PER_HOUR = 5;
const USER_LIMIT_PER_HOUR = 15;

const ALLOWED_FLAVORS = ["Red velvet", "Chocolate", "Vanilla"];
const MAX_FREE_TEXT_LEN = 150;

// Very small denylist of instruction-like fragments to strip out of free-text
// fields. This is defense-in-depth, not a full prompt-injection filter —
// SDXL has no chat/instruction-following capability of its own, so the
// actual risk here is prompt abuse for off-brand content generation, not
// the model "talking back."
const INJECTION_PATTERNS = [
  /ignore (all|previous|the) instructions?/gi,
  /system prompt/gi,
  /you are (a|an)\b/gi,
  /disregard/gi,
];

function sanitizeFreeText(input: string): string {
  let s = (input || "").slice(0, MAX_FREE_TEXT_LEN);
  for (const pattern of INJECTION_PATTERNS) {
    s = s.replace(pattern, "");
  }
  // Keep to plain descriptive characters only.
  s = s.replace(/[^a-zA-Z0-9\s,.'-]/g, "");
  return s.trim();
}

function buildPrompt(fields: {
  size: string; color: string; flavor: string; icing: string; decorations: string;
}): string {
  const flavor = ALLOWED_FLAVORS.includes(fields.flavor) ? fields.flavor : "vanilla";
  const color = sanitizeFreeText(fields.color) || "white";
  const decorations = sanitizeFreeText(fields.decorations) || "simple elegant design";
  const icingText = fields.icing === "yes" ? "with a smooth special icing finish" : "";
  const sizeNum = /^[0-9]{1,2}$/.test(String(fields.size)) ? fields.size : "6";

  return `A detailed, appetizing ${sizeNum}-inch ${flavor} cake, ${color} color palette, ` +
    `${decorations}, ${icingText}, professional food photography, high resolution, realistic style`;
}

async function isRateLimited(actorKey: string, limit: number, admin: ReturnType<typeof createClient>) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("preview_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("actor_key", actorKey)
    .gte("created_at", oneHourAgo);

  if (error) return false; // fail open rather than blocking legitimate users on a DB hiccup
  return (count ?? 0) >= limit;
}

async function recordUsage(actorKey: string, admin: ReturnType<typeof createClient>) {
  await admin.from("preview_rate_limits").insert({ actor_key: actorKey });
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { size, color, flavor, icing, decorations } = body ?? {};

    if (!size || !flavor) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identify the actor: logged-in user id, or hashed IP for guests.
    const authHeader = req.headers.get("authorization") || "";
    let actorKey: string;
    let limit: number;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        actorKey = `user:${user.id}`;
        limit = USER_LIMIT_PER_HOUR;
      } else {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        actorKey = `ip:${await hashIp(ip)}`;
        limit = GUEST_LIMIT_PER_HOUR;
      }
    } else {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      actorKey = `ip:${await hashIp(ip)}`;
      limit = GUEST_LIMIT_PER_HOUR;
    }

    if (await isRateLimited(actorKey, limit, admin)) {
      return new Response(
        JSON.stringify({ error: "Preview limit reached. Please try again later." }),
        { status: 429, headers: corsHeaders }
      );
    }

    const prompt = buildPrompt({ size, color, flavor, icing, decorations });

    const falResponse = await fetch("https://fal.run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "square_hd",   // ~768x768-class output
        num_inference_steps: 4,     // fast/turbo-tier step count
        num_images: 1,
      }),
    });

    if (!falResponse.ok) {
      const errText = await falResponse.text();
      console.error("fal.ai error:", errText);
      return new Response(JSON.stringify({ error: "Preview generation failed" }), { status: 502, headers: corsHeaders });
    }

    const falData = await falResponse.json();
    const imageUrl = falData?.images?.[0]?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Preview generation failed" }), { status: 502, headers: corsHeaders });
    }

    await recordUsage(actorKey, admin);

    return new Response(JSON.stringify({ image_url: imageUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("generate-cake-preview error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: corsHeaders });
  }
});
