# StudyForge — Agent Rules
## Place in `.agents/rules/studyforge-rules.md`

- All frontend components must be written in React with TailwindCSS only. No other UI libraries.
- All backend logic runs through Supabase (auth, database, storage). No separate backend server.
- Gemini 1.5 Pro is the only AI model used for all generation tasks (notes, exams, image understanding).
- All Gemini API calls are made from Supabase Edge Functions only. Never from the frontend directly.
- File parsing (PDF, DOCX, PPTX, TXT) happens inside Supabase Edge Functions using appropriate libraries.
- Images are base64 encoded and sent directly to Gemini as multimodal input. No OCR library needed.
- Notes are stored as markdown strings in the database. The frontend renders and edits them with TipTap.
- All exam questions are stored as JSON in the database. Never regenerate if already stored.
- Do not add any authentication beyond Supabase Auth email/password. No OAuth for MVP.
- Do not add loading skeletons, toast notifications, or animations in MVP. Functional only.
- Do not use any state management library. React useState and useContext only.
- Keep all components simple and flat. No deeply nested component trees.