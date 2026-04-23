import { createClient } from "npm:@supabase/supabase-js@2.46.1";

type JsonBody = {
  path?: string;
  // base64 payload of the file content
  contentBase64?: string;
  contentType?: string;
};

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket") ?? "turbobujias-fullstack";

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      }
    );

    const contentTypeHeader = req.headers.get("content-type") ?? "";

    let path = "";
    let fileBytes: Uint8Array | null = null;
    let contentType = "application/octet-stream";

    if (contentTypeHeader.includes("multipart/form-data")) {
      // Expected fields:
      // - file: File
      // - path (optional): string. If not provided, uses file name.
      const form = await req.formData();
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ error: "Missing multipart field 'file'" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const pathFromForm = form.get("path");
      path = (typeof pathFromForm === "string" && pathFromForm.trim()) ? pathFromForm.trim() : (file.name || "upload");
      contentType = file.type || contentType;

      const arrayBuffer = await file.arrayBuffer();
      fileBytes = new Uint8Array(arrayBuffer);
    } else {
      const body = (await req.json()) as JsonBody;
      if (!body?.path || !body?.contentBase64) {
        return new Response(JSON.stringify({
          error: "For JSON mode send { path, contentBase64, contentType? }",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      path = body.path;
      contentType = body.contentType || contentType;
      fileBytes = base64ToUint8Array(body.contentBase64);
    }

    if (!path || !fileBytes) {
      return new Response(JSON.stringify({ error: "Missing path or file bytes" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    // Upsert so repeated uploads overwrite the same object.
    // For public buckets this makes it immediately readable.
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, fileBytes, {
        contentType,
        upsert: true,
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message, details: error }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);

    return new Response(
      JSON.stringify({
        bucket,
        path,
        publicUrl,
        data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
});
