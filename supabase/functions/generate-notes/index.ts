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

const NOTES_PROMPT = `You are a study notes generator. Based on the course material below, generate comprehensive and well-structured study notes.

Organize the notes by topic. Use markdown formatting. Use headers, bullet points, and bold text where appropriate.

Return only the markdown content. No preamble, no explanation outside the notes.

Course material:
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

    // --- Rate Limit check (max 5 requests per minute) ---
    const rateLimit = await checkRateLimit(supabaseAdmin, user.id, "generate-notes", 5, 60000);
    if (!rateLimit.allowed) {
      const resetStr = rateLimit.resetTime ? rateLimit.resetTime.toLocaleTimeString() : "soon";
      return errorResponse(`Too many notes generation requests. Please try again after ${resetStr}.`, 429);
    }

    // --- Parse request body ---
    const body = await req.json();
    const { material_ids, subject_id } = body;

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
        // Download the image from Supabase Storage and base64 encode it
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

    // --- Call Gemini 1.5 Pro ---
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("gemini_api_key");
    if (!geminiApiKey) {
      return errorResponse("gemini_api_key is not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const combinedText = textParts.join("\n\n---\n\n").trim();

    if (combinedText.length === 0 && imageParts.length === 0) {
      return errorResponse(
        "The selected materials have no extracted text. This usually means the files were uploaded before a parsing fix. Please delete and re-upload them."
      );
    }

    const promptText = NOTES_PROMPT + combinedText;

    // Build content array: text prompt + any image parts
    const contentParts: any[] = [{ text: promptText }];
    for (const imgPart of imageParts) {
      contentParts.push(imgPart);
    }

    const result = await model.generateContent(contentParts);
    const generatedNotes = result.response.text();

    if (!generatedNotes) {
      return errorResponse("Gemini returned an empty response", 500);
    }

    // --- Extract a title from the markdown content ---
    let title = "Untitled Notes";
    const lines = generatedNotes
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith("```"));

    const headingLine = lines.find((line: string) => line.startsWith("#"));
    if (headingLine) {
      title = headingLine.replace(/^#+\s*/, "").trim();
    } else if (lines.length > 0) {
      const cleanLine = lines[0]
        .replace(/^[\s*#_-]+/, "")
        .replace(/[\s*#_-]+$/, "")
        .trim();
      if (cleanLine.length > 0) {
        title = cleanLine.substring(0, 100);
      }
    }

    // --- Insert into tbl_notes ---
    const { data: note, error: insertError } = await supabaseAdmin
      .from("tbl_notes")
      .insert({
        user_id: user.id,
        title,
        content: generatedNotes,
        material_ids,
        subject_id: subject_id && subject_id !== "" && subject_id !== "null" ? subject_id : null,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(
        `Failed to save notes: ${insertError.message}`,
        500
      );
    }

    return successResponse(note);
  } catch (err: any) {
    console.error("generate-notes error:", err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});
