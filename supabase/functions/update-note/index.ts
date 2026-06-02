// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function successResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("Invalid or expired token", 401);
    }

    // --- Parse request body ---
    const body = await req.json();
    const { note_id, content } = body;

    if (!note_id) {
      return errorResponse("note_id is required");
    }

    if (content === undefined || content === null) {
      return errorResponse("content is required");
    }

    // --- Verify ownership ---
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("tbl_notes")
      .select("id, user_id")
      .eq("id", note_id)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Note not found", 404);
    }

    if (existing.user_id !== user.id) {
      return errorResponse("You do not have permission to edit this note", 403);
    }

    // --- Update the note ---
    const { data: updatedNote, error: updateError } = await supabaseAdmin
      .from("tbl_notes")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", note_id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(
        `Failed to update note: ${updateError.message}`,
        500
      );
    }

    return successResponse(updatedNote);
  } catch (err: any) {
    console.error("update-note error:", err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});
