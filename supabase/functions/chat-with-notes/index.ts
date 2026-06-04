// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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

const SYSTEM_PROMPT = `You are an intelligent study assistant embedded inside a note-taking app called IndexAI. The user is viewing one of their study notes and chatting with you about it.

Your job:
- Answer questions about the note content accurately and helpfully.
- Explain concepts, define terms, and clarify confusing sections.
- Help the user study by quizzing them if they ask.
- Summarize sections or the whole note on request.
- Suggest connections and deeper insights based on the content.

Rules:
- Base your answers on the note content provided. If the answer isn't in the note, say so but still try to help with your general knowledge.
- Keep responses concise and well-formatted. Use markdown formatting (bold, lists, code blocks) when helpful.
- Be encouraging and supportive — you're a study buddy.
- Never refuse a reasonable study-related question.
`;

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

    // --- Rate Limit check (max 10 messages per minute) ---
    const rateLimit = await checkRateLimit(
      supabaseAdmin,
      user.id,
      "chat-with-notes",
      10,
      60000
    );
    if (!rateLimit.allowed) {
      const resetStr = rateLimit.resetTime
        ? rateLimit.resetTime.toLocaleTimeString()
        : "soon";
      return errorResponse(
        `Too many chat requests. Please try again after ${resetStr}.`,
        429
      );
    }

    // --- Parse request body ---
    const body = await req.json();
    const { note_id, message, history } = body;

    if (!note_id || typeof note_id !== "string") {
      return errorResponse("note_id is required");
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return errorResponse("message is required and must be non-empty");
    }

    // --- Fetch the note ---
    const { data: note, error: fetchError } = await supabaseAdmin
      .from("tbl_notes")
      .select("title, content, user_id")
      .eq("id", note_id)
      .single();

    if (fetchError || !note) {
      return errorResponse("Note not found", 404);
    }

    // Verify ownership (allow shared notes too — basic check)
    if (note.user_id !== user.id) {
      // Check if this note is shared with the user
      const { data: share } = await supabaseAdmin
        .from("tbl_shares")
        .select("id")
        .eq("note_id", note_id)
        .eq("receiver_email", user.email)
        .maybeSingle();

      if (!share) {
        return errorResponse("You don't have access to this note", 403);
      }
    }

    // --- Build Gemini conversation ---
    const geminiApiKey =
      Deno.env.get("GEMINI_API_KEY") || Deno.env.get("gemini_api_key");
    if (!geminiApiKey) {
      return errorResponse("Gemini API key is not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    // Build the context with note content
    const noteContext = `--- NOTE TITLE ---
${note.title || "Untitled"}

--- NOTE CONTENT ---
${note.content || "(empty note)"}
--- END OF NOTE ---`;

    // Build conversation history for the model
    const conversationParts: any[] = [];

    // System instruction + note context as the first user turn
    conversationParts.push({
      role: "user",
      parts: [
        {
          text: `${SYSTEM_PROMPT}\n\nHere is the note the user is currently viewing:\n\n${noteContext}\n\nPlease acknowledge that you've read the note and are ready to help. Keep it very brief.`,
        },
      ],
    });

    conversationParts.push({
      role: "model",
      parts: [
        {
          text: "I've read through your note. I'm ready to help — ask me anything about it!",
        },
      ],
    });

    // Append conversation history (last 10 exchanges)
    if (history && Array.isArray(history)) {
      const trimmedHistory = history.slice(-20); // max 20 messages (10 exchanges)
      for (const msg of trimmedHistory) {
        conversationParts.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Start chat with history
    const chat = model.startChat({
      history: conversationParts,
    });

    // Send the user's new message
    const result = await chat.sendMessage(message.trim());
    const reply = result.response.text();

    if (!reply) {
      return errorResponse("AI returned an empty response", 500);
    }

    return successResponse({ reply });
  } catch (err: any) {
    console.error("chat-with-notes error:", err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});
