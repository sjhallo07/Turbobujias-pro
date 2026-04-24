// inventory-mediator - scan + sell-confirmed via Supabase RPC
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function normalizeCodeTypeFromItem(item: any, code: string) {
  if (!item) return "code";
  if (item.upc === code) return "upc";
  if (item.ean === code) return "ean";
  if (item.sku === code) return "sku";
  return "code";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = String(payload?.action ?? "").toLowerCase();
  if (!action) return jsonResponse({ error: "Missing action" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  const qty = Number.isFinite(payload?.qty) ? payload.qty : 1;
  const wantImage = Boolean(payload?.want_image ?? false);
  const deviceFingerprint = typeof payload?.device_fingerprint === "string" ? payload.device_fingerprint.trim() : "";
  const source = typeof payload?.source === "string" ? payload.source : "payment-confirmed";

  if (!code) return jsonResponse({ error: "code is required" }, 400);

  if (action === "scan") {
    const selectCols = wantImage
      ? "id, sku, upc, ean, brand, model, type, thread, gap_mm, electrode, price_usd, quantity, image_urls"
      : "id, sku, upc, ean, brand, model, type, thread, gap_mm, electrode, price_usd, quantity";

    const { data: item, error } = await supabase
      .from("inventory_items")
      .select(selectCols)
      .or(`upc.eq.${code},ean.eq.${code},sku.eq.${code}`)
      .limit(1)
      .single();

    if (error) return jsonResponse({ error: error.message }, 400);
    if (!item) return jsonResponse({ error: "product_not_found" }, 404);

    return jsonResponse({ ok: true, item });
  }

  if (action === "sell_confirmed") {
    if (!deviceFingerprint) {
      return jsonResponse({ error: "device_fingerprint is required for one-time decrement" }, 400);
    }

    const q = Math.max(1, Math.floor(qty));

    // One-time per GLOBAL device per code.
    const { data: existing } = await supabase
      .from("inventory_device_scan_logs")
      .select("id")
      .eq("device_fingerprint", deviceFingerprint)
      .eq("code_used", code)
      .maybeSingle();

    if (existing?.id) {
      const { data: item } = await supabase
        .from("inventory_items")
        .select("id, sku, upc, ean, brand, model, type, thread, gap_mm, electrode, price_usd, quantity, image_urls")
        .or(`upc.eq.${code},ean.eq.${code},sku.eq.${code}`)
        .limit(1)
        .single();

      return jsonResponse({ ok: true, decremented: false, item });
    }

    // Decrement atomically via RPC (admin-gated by your JWT claim)
    const { data: decrementedItem, error: rpcError } = await supabase.rpc("sell_decrement", {
      p_code: code,
      p_qty: q,
      p_source: source,
    });

    if (rpcError) return jsonResponse({ error: rpcError.message }, 400);

    const codeType = normalizeCodeTypeFromItem(decrementedItem, code);

    // Log the device usage (no user_id required)
    const { error: logError } = await supabase
      .from("inventory_device_scan_logs")
      .insert({
        device_fingerprint: deviceFingerprint,
        code_used: code,
        code_type: codeType,
        qty: q,
        source,
      });

    if (logError) {
      console.warn("device log failed", logError);
    }

    return jsonResponse({ ok: true, decremented: true, item: decrementedItem });
  }

  return jsonResponse({ error: `unknown_action: ${action}` }, 400);
});
