---
name: gemini-api
description: Use when making Gemini 1.5 Pro API calls inside Supabase Edge Functions. Provides the correct import, initialization, and multimodal input format.
---

# Gemini API Skill

## Import
```ts
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
```

## Initialize
```ts
const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY"));
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
```

## Text only call
```ts
const result = await model.generateContent(prompt);
const text = result.response.text();
```

## Multimodal call (text + images)
```ts
const result = await model.generateContent([
  { text: prompt },
  { inlineData: { mimeType: "image/jpeg", data: base64String } }
]);
const text = result.response.text();
```