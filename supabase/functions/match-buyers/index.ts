import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type MatchBuyersRequest = {
  productName: string;
  hsCode?: string;
  targetRegion?: string;
  targetCountry?: string;
};

type BuyerMatch = {
  id: string;
  name: string;
  country?: string;
  region?: string;
  category?: string;
  hsCode?: string;
  trustScore?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  matchScore: number; // similarity score from vector search
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateInput(payload: any): MatchBuyersRequest {
  const productName = String(payload?.productName ?? "").trim();
  const hsCode = payload?.hsCode ? String(payload.hsCode).trim() : undefined;
  const targetRegion = payload?.targetRegion
    ? String(payload.targetRegion).trim()
    : undefined;
  const targetCountry = payload?.targetCountry
    ? String(payload.targetCountry).trim()
    : undefined;

  if (!productName) throw new Error("Product name is required.");
  if (productName.length > 200)
    throw new Error("Product name must be under 200 characters.");
  if (hsCode && hsCode.length > 20) throw new Error("HS code looks invalid.");
  if (targetRegion && targetRegion.length > 60)
    throw new Error("Target region must be under 60 characters.");
  if (targetCountry && targetCountry.length > 60)
    throw new Error("Target country must be under 60 characters.");

  return { productName, hsCode, targetRegion, targetCountry };
}

/**
 * NOTE: Kept provider-agnostic for easy Express migration later.
 * Env:
 *  - EMBEDDING_PROVIDER: "openai" | "gemini"
 *  - OPENAI_API_KEY: string (if openai)
 *  - GEMINI_API_KEY: string (if gemini)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const provider = (Deno.env.get("EMBEDDING_PROVIDER") || "openai").toLowerCase();

  if (provider === "openai") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is not configured.");

    // OpenAI embeddings endpoint
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Good default embedding model (you can swap later)
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Embedding provider error (openai): ${resp.status} ${t}`);
    }

    const data = await resp.json();
    const vec = data?.data?.[0]?.embedding;
    if (!Array.isArray(vec)) throw new Error("Invalid embedding response.");
    return vec as number[];
  }

  if (provider === "gemini") {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("GEMINI_API_KEY is not configured.");

    // Gemini embeddings endpoint (text-embedding)
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Embedding provider error (gemini): ${resp.status} ${t}`);
    }

    const data = await resp.json();
    const vec = data?.embedding?.values;
    if (!Array.isArray(vec)) throw new Error("Invalid embedding response.");
    return vec as number[];
  }

  throw new Error(
    `Unsupported EMBEDDING_PROVIDER="${provider}". Use "openai" or "gemini".`,
  );
}

/**
 * Pinecone query via REST.
 * Env:
 *  - PINECONE_API_KEY
 *  - PINECONE_INDEX_HOST  (example: tradeflow-products-xxxx.svc.apw5.pinecone.io)
 */
async function pineconeQuery(vector: number[], topK = 10) {
  const apiKey = Deno.env.get("PINECONE_API_KEY");
  const host = Deno.env.get("PINECONE_INDEX_HOST");

  if (!apiKey || !host) {
    throw new Error(
      "Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX_HOST.",
    );
  }

  const resp = await fetch(`https://${host}/query`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector,
      topK,
      includeMetadata: true,
      // Only buyers (assuming your metadata.type is "buyer")
      filter: { type: { $eq: "buyer" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Pinecone query error: ${resp.status} ${t}`);
  }

  return await resp.json();
}

function buildQueryText(req: MatchBuyersRequest) {
  // Keep it deterministic, good for embeddings & easy Express migration
  const parts: string[] = [];
  parts.push(`Product: ${req.productName}`);
  if (req.hsCode) parts.push(`HS Code: ${req.hsCode}`);
  if (req.targetRegion) parts.push(`Target Region: ${req.targetRegion}`);
  if (req.targetCountry) parts.push(`Target Country: ${req.targetCountry}`);
  return parts.join("\n");
}

function mapPineconeMatchesToBuyers(matches: any[]): BuyerMatch[] {
  return (matches || []).map((m: any) => {
    const md = m?.metadata || {};
    return {
      id: String(m?.id ?? crypto.randomUUID()),
      name: String(md?.name ?? "Unknown Buyer"),
      country: md?.country ? String(md.country) : undefined,
      region: md?.region ? String(md.region) : undefined,
      category: md?.category ? String(md.category) : undefined,
      hsCode: md?.hs_code ? String(md.hs_code) : undefined,
      trustScore:
        typeof md?.trust_score === "number"
          ? md.trust_score
          : undefined,
      minOrderQty:
        typeof md?.min_order_qty === "number"
          ? md.min_order_qty
          : undefined,
      maxOrderQty:
        typeof md?.max_order_qty === "number"
          ? md.max_order_qty
          : undefined,
      matchScore: typeof m?.score === "number" ? m.score : 0,
    };
  });
}

async function persistSearch(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string | null,
  req: MatchBuyersRequest,
) {
  // Use the user's JWT from the request for user_id association.
  // Keeps it easy to port to Express later (token in Authorization header).
  if (!authHeader) return;

  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // If user isn't valid/authenticated, insert will fail (fine).
  // This is minimal persistence – just the search input.
  await sb.from("buyer_searches").insert({
    product_name: req.productName,
    hs_code: req.hsCode ?? null,
    target_region: req.targetRegion ?? null,
    target_country: req.targetCountry ?? null,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const parsed = validateInput(payload);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase env missing: SUPABASE_URL or SUPABASE_ANON_KEY.");
    }

    const authHeader = req.headers.get("Authorization"); // Bearer <jwt> from client invoke


    // try {
    //   await persistSearch(supabaseUrl, supabaseAnonKey, authHeader, parsed);
    // } catch (e) {

      console.warn("Persistence warning:", e);
    }


    const queryText = buildQueryText(parsed);


    const vector = await generateEmbedding(queryText);


    const pinecone = await pineconeQuery(vector, 8);

    // 4) Map results
    const buyers = mapPineconeMatchesToBuyers(pinecone?.matches || []);

    return jsonRes({
      buyers,
      meta: {
        source: "pinecone",
        count: buyers.length,
      },
    });
  } catch (error) {
    console.error("Error in match-buyers function:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    // Friendly status mapping
    if (message.toLowerCase().includes("not configured")) {
      return jsonRes({ error: message }, 500);
    }

    return jsonRes({ error: message }, 500);
  }
});
