// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

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

    // --- Parse request body ---
    const body = await req.json();
    const { material_ids, num_questions, percentages, subject_id } = body;

    if (
      !material_ids ||
      !Array.isArray(material_ids) ||
      material_ids.length === 0
    ) {
      return errorResponse(
        "material_ids is required and must be a non-empty array"
      );
    }

    if (!num_questions || typeof num_questions !== "number" || num_questions < 1) {
      return errorResponse("num_questions is required and must be a number >= 1");
    }

    if (!percentages || typeof percentages !== "object") {
      return errorResponse("percentages is required and must be an object");
    }

    const { mc, id, tof, mtof, enum: enumeration } = percentages;
    if (
      typeof mc !== "number" ||
      typeof id !== "number" ||
      typeof tof !== "number" ||
      typeof mtof !== "number" ||
      typeof enumeration !== "number"
    ) {
      return errorResponse("All percentage values must be numbers");
    }

    const sum = mc + id + tof + mtof + enumeration;
    if (Math.abs(sum - 100) > 0.1) {
      return errorResponse(`Question type percentages must sum to 100, got ${sum}`);
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
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const combinedText = textParts.join("\n\n---\n\n");

    const promptText = `You are an exam question generator. Based on the study material below, generate exactly ${num_questions} exam questions.

Distribute the question types using approximately these proportions:
- Multiple choice: ${mc}%
- Identification: ${id}%
- True or False: ${tof}%
- Modified True or False: ${mtof}%
- Enumeration: ${enumeration}%

The proportions are a guide. If the content does not support a type well, substitute with a more fitting type. Always prioritize question quality over hitting exact percentages.

For Modified True or False, always use exactly these four choices:
A: Both statements are True.
B: Both statements are False.
C: The first statement is True, and the second is False.
D: The first statement is False, and the second is True.

Return JSON matching the following schema:
{
  "title": "A descriptive, concise title for this exam based on the content",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice" | "identification" | "true_or_false" | "modified_true_or_false" | "enumeration",
      "question": "string question text",
      "choices": ["choice 1", "choice 2", ...], // Array of choices. For identification and enumeration, this must be an empty array []. For true_or_false, this must be exactly ["True", "False"]. For modified_true_or_false, it must be the standard A/B/C/D choices listed above.
      "answer": "string or array", // Correct answer. For multiple_choice and modified_true_or_false, this must be "A", "B", "C", or "D". For true_or_false, this must be "True" or "False". For identification, this is the correct answer string. For enumeration, this must be a JSON array of strings containing all correct answers.
      "explanation": "string explanation of why the answer is correct"
    }
  ]
}

Study material:
${combinedText}`;

    // Build content array: text prompt + any image parts
    const contentParts: any[] = [{ text: promptText }];
    for (const imgPart of imageParts) {
      contentParts.push(imgPart);
    }

    const result = await model.generateContent(contentParts);
    const responseText = result.response.text();

    if (!responseText) {
      return errorResponse("Gemini returned an empty response", 500);
    }

    let examData;
    try {
      examData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON:", responseText);
      return errorResponse("Failed to parse the generated questions from Gemini", 500);
    }

    const title = examData.title || "Untitled Exam";
    const questions = examData.questions || [];

    if (!Array.isArray(questions) || questions.length === 0) {
      return errorResponse("No questions generated", 500);
    }

    // --- Insert into tbl_exams ---
    const { data: exam, error: insertError } = await supabaseAdmin
      .from("tbl_exams")
      .insert({
        user_id: user.id,
        title,
        questions,
        material_ids,
        subject_id: subject_id && subject_id !== "" && subject_id !== "null" ? subject_id : null,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(
        `Failed to save exam: ${insertError.message}`,
        500
      );
    }

    return successResponse(exam);
  } catch (err: any) {
    console.error("generate-exam error:", err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});
