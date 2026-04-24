// Supabase Edge Function: import-inventory
// Body: { items: [{ sku, upc, ean, oem_code, title, condition, description, image_urls, stock, price }] }

type ItemIn = {
  sku: string;
  upc?: string | null;
  ean?: string | null;
  oem_code?: string | null;
  title?: string | null;
  condition?: string | null;
  description?: string | null;
  image_urls?: string[] | null;
  stock?: number | null;
  quantity?: number | null;
  price?: number | string | null;
};

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const auth = req.headers.get('authorization');
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) {
    return new Response(JSON.stringify({ error: 'Invalid payload. Expected { items: [...] }' }), { status: 400 });
  }

  const items: ItemIn[] = body.items;

  // Call the RPC via PostgREST, forwarding caller JWT so RLS can apply.
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/upsert_inventory_item`;

  let inserted = 0;
  let updated = 0;
  const errors: Array<{ sku: string; error: string }> = [];

  for (const item of items) {
    if (!item?.sku) {
      errors.push({ sku: '', error: 'Missing sku' });
      continue;
    }

    const quantity = toNumberOrNull(item.stock ?? item.quantity) ?? 0;
    const price = toNumberOrNull(item.price) ?? 0;

    const image_urls = Array.isArray(item.image_urls)
      ? item.image_urls.filter((x) => typeof x === 'string')
      : [];

    const payload = {
      p_sku: item.sku,
      p_upc: item.upc ?? null,
      p_ean: item.ean ?? null,
      p_oem_code: item.oem_code ?? null,
      p_title: item.title ?? null,
      p_condition: item.condition ?? null,
      p_description: item.description ?? null,
      p_image_urls: image_urls,
      p_quantity: quantity,
      p_price: price,
    };

    const r = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const t = await r.text();
      errors.push({ sku: item.sku, error: t.slice(0, 500) });
      continue;
    }

    const result = await r.json().catch(() => null);
    const action = Array.isArray(result) ? result[0]?.action : result?.action;
    if (action === 'inserted') inserted++;
    else updated++;
  }

  return new Response(
    JSON.stringify({ ok: errors.length === 0, inserted, updated, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
