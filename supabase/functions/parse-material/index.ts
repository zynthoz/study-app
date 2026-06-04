// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileType(ext: string): string {
  const imageExts = ["jpg", "jpeg", "png", "webp"];
  if (imageExts.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  if (ext === "txt") return "txt";
  return "unknown";
}

/**
 * Extract text from a PPTX file using JSZip.
 * PPTX is a ZIP archive; slide content lives in ppt/slides/slide*.xml
 */
async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles: string[] = [];
  zip.forEach((relativePath: string) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
      slideFiles.push(relativePath);
    }
  });

  // Sort slides by number
  slideFiles.sort((a: string, b: string) => {
    const numA = parseInt(a.match(/slide(\d+)/i)?.[1] ?? "0");
    const numB = parseInt(b.match(/slide(\d+)/i)?.[1] ?? "0");
    return numA - numB;
  });

  const textParts: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)!.async("text");
    // Strip XML tags to get plain text
    const text = xml
      .replace(/<a:p[^>]*>/g, "\n")   // paragraph breaks
      .replace(/<[^>]+>/g, "")         // remove all tags
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n")     // collapse excessive newlines
      .trim();
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.join("\n\n---\n\n");
}

/**
 * Extract text from a DOCX file using mammoth.
 */
async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("https://esm.sh/mammoth@1.8.0");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

/**
 * Extract text from a PDF file using the Gemini API.
 * Gemini handles PDFs natively and works reliably in Supabase Edge Functions.
 */
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("gemini_api_key");
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured — cannot extract PDF text");
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  // Convert buffer to base64 for Gemini inline data
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    { text: "Extract all text content from this PDF document. Return ONLY the raw text, preserving paragraphs and structure. Do not add any commentary, headings, or formatting that is not in the original document." },
  ]);

  const text = result.response.text();
  if (!text || text.trim().length === 0) {
    throw new Error("Gemini returned empty text for this PDF");
  }
  console.log(`PDF text extracted successfully: ${text.length} characters`);
  return text;
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
    // --- Auth: extract user from JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("Invalid or expired token", 401);
    }

    // --- Rate Limit check (max 10 requests per minute) ---
    const rateLimit = await checkRateLimit(supabaseAdmin, user.id, "parse-material", 10, 60000);
    if (!rateLimit.allowed) {
      const resetStr = rateLimit.resetTime ? rateLimit.resetTime.toLocaleTimeString() : "soon";
      return errorResponse(`Too many upload requests. Please try again after ${resetStr}.`, 429);
    }

    // --- Parse multipart form data ---
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subjectId = formData.get("subject_id") as string | null;

    if (!file) {
      return errorResponse("No file provided in form data");
    }

    // --- Payload size check (max 10MB) ---
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File size exceeds the 10MB limit.", 400);
    }

    const fileName = file.name;
    const ext = getFileExtension(fileName);
    const fileType = getFileType(ext);

    if (fileType === "unknown") {
      return errorResponse(
        `Unsupported file type: .${ext}. Supported: pdf, docx, pptx, txt, jpg, jpeg, png, webp`
      );
    }

    // --- Read file into buffer ---
    const fileBuffer = await file.arrayBuffer();

    // --- Extract text based on file type ---
    let extractedText: string | null = null;

    if (fileType === "txt") {
      extractedText = new TextDecoder("utf-8").decode(fileBuffer);
    } else if (fileType === "pdf") {
      extractedText = await extractPdfText(fileBuffer);
    } else if (fileType === "docx") {
      extractedText = await extractDocxText(fileBuffer);
    } else if (fileType === "pptx") {
      extractedText = await extractPptxText(fileBuffer);
    }
    // For images, extractedText remains null

    // --- Upload file to Supabase Storage ---
    // Sanitize filename to only contain safe S3/Supabase storage key characters
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("materials")
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return errorResponse(`Storage upload failed: ${uploadError.message}`, 500);
    }

    // --- Insert row into tbl_materials ---
    const { data: material, error: insertError } = await supabaseAdmin
      .from("tbl_materials")
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_type: fileType,
        storage_path: storagePath,
        extracted_text: extractedText,
        subject_id: subjectId && subjectId !== "" && subjectId !== "null" ? subjectId : null,
      })
      .select()
      .single();

    if (insertError) {
      // Attempt to clean up the uploaded file if insert fails
      await supabaseAdmin.storage.from("materials").remove([storagePath]);
      return errorResponse(`Database insert failed: ${insertError.message}`, 500);
    }

    // --- Return the inserted material ---
    return new Response(JSON.stringify(material), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("parse-material error:", err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});
