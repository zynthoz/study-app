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

/**
 * Map image file_type to a MIME type for Gemini multimodal input.
 */
function imageMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext] || "image/jpeg";
}

/**
 * Convert an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

    // --- Rate Limit check (max 5 requests per minute) ---
    const rateLimit = await checkRateLimit(supabaseAdmin, user.id, "generate-flashcards", 5, 60000);
    if (!rateLimit.allowed) {
      const resetStr = rateLimit.resetTime ? rateLimit.resetTime.toLocaleTimeString() : "soon";
      return errorResponse(`Too many flashcard generation requests. Please try again after ${resetStr}.`, 429);
    }

    // --- Parse request body ---
    const body = await req.json();
    const { material_ids, num_cards, subject_id } = body;

    if (
      !material_ids ||
      !Array.isArray(material_ids) ||
      material_ids.length === 0
    ) {
      return errorResponse(
        "material_ids is required and must be a non-empty array"
      );
    }

    // --- Material quantity check (max 5 selected) ---
    const MAX_MATERIALS = 5;
    if (material_ids.length > MAX_MATERIALS) {
      return errorResponse(`You can select a maximum of ${MAX_MATERIALS} materials at a time.`, 400);
    }

    if (!num_cards || typeof num_cards !== "number" || num_cards < 1) {
      return errorResponse("num_cards is required and must be a number >= 1");
    }

    // --- Card quantity limit (max 30 cards) ---
    const MAX_CARDS = 30;
    if (num_cards > MAX_CARDS) {
      return errorResponse(`Maximum number of flashcards per set is ${MAX_CARDS}.`, 400);
    }

    // --- Fetch materials ---
    const { data: materials, error: fetchError } = await supabaseAdmin
      .from("tbl_materials")
      .select("*")
      .in("id", material_ids)
      .eq("user_id", user.id);

    if (fetchError) {
      return errorResponse(
        `Failed to fetch materials: ${fetchError.message}`,
        500
      );
    }

    if (!materials || materials.length === 0) {
      return errorResponse("No materials found for the provided IDs");
    }

    // --- Build Gemini input parts ---
    const textParts: string[] = [];
    const imageParts: Array<{
      inlineData: { mimeType: string; data: string };
    }> = [];

    for (const material of materials) {
      if (material.file_type === "image") {
        const { data: fileData, error: downloadError } =
          await supabaseAdmin.storage
            .from("materials")
            .download(material.storage_path);

        if (downloadError || !fileData) {
          console.warn(
            `Skipping image ${material.file_name}: ${downloadError?.message}`
          );
          continue;
        }

        const buffer = await fileData.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        const mimeType = imageMimeType(material.file_name);

        imageParts.push({
          inlineData: { mimeType, data: base64 },
        });
      } else if (material.extracted_text) {
        textParts.push(material.extracted_text);
      }
    }

    if (textParts.length === 0 && imageParts.length === 0) {
      return errorResponse(
        "No content found in the selected materials. Ensure at least one material has extracted text or is an image."
      );
    }

    // --- Call Gemini API ---
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("gemini_api_key");
    if (!geminiApiKey) {
      return errorResponse("gemini_api_key is not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const combinedText = textParts.join("\n\n---\n\n");

    const promptText = `You are a professional study flashcard generator. Based on the study material below, generate exactly ${num_cards} flashcards.

Each flashcard must contain:
1. "front": A concise, clear question, key concept, or term.
2. "back": A concise definition, answer, or explanation that is easy to recall.

Keep the front and back texts clear, readable, and highly focused for active recall study sessions.

Return JSON matching the following schema:
{
  "title": "A descriptive, concise title for this flashcard deck based on the content",
  "cards": [
    {
      "id": number,
      "front": "string term or question",
      "back": "string definition or answer"
    }
  ]
}

Study material:
${combinedText}`;

    const contentParts: any[] = [{ text: promptText }];
    for (const imgPart of imageParts) {
      contentParts.push(imgPart);
    }

    const result = await model.generateContent(contentParts);
    const responseText = result.response.text();

    if (!responseText) {
      return errorResponse("Gemini returned an empty response", 500);
    }

    let deckData;
    try {
      deckData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON:", responseText);
      return errorResponse("Failed to parse the generated flashcards from Gemini", 500);
    }

    const title = deckData.title || "Untitled Flashcard Set";
    const cards = deckData.cards || [];

    if (!Array.isArray(cards) || cards.length === 0) {
      return errorResponse("No flashcards generated", 500);
    }

    // --- Insert into tbl_flashcards ---
    const { data: deck, error: insertError } = await supabaseAdmin
      .from("tbl_flashcards")
      .insert({
        user_id: user.id,
        title,
        cards,
        material_ids,
        subject_id: subject_id && subject_id !== "" && subject_id !== "null" ? subject_id : null,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(
        `Failed to save flashcard deck: ${insertError.message}`,
        500
      );
    }

    return successResponse(deck);
  } catch (err: any) {
    console.error("generate-flashcards error:", err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});
