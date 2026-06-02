---
name: supabase-edge
description: Use when creating or editing Supabase Edge Functions. Provides CORS headers, Supabase client setup, and standard response patterns for Deno.
---

# Supabase Edge Function Skill

## CORS Headers (always include at the top of every Edge Function)
```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

if (req.method === "OPTIONS") {
  return new Response("ok", { headers: corsHeaders });
}
```

## Supabase Client inside Edge Function
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);
```

## Standard JSON response
```ts
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  status: 200,
});
```

## Notes
- All Edge Functions run on Deno. Use Deno-compatible imports only.
- Store the Gemini API key in Supabase project secrets as `GEMINI_API_KEY`.
- Access it inside Edge Functions via `Deno.env.get("GEMINI_API_KEY")`.
- For file parsing inside Deno, use CDN imports from esm.sh for pdf-parse, mammoth, pptx2json.
- Always return JSON responses with appropriate HTTP status codes.