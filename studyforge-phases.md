# StudyForge — MVP Phases & Tasks

---

## PHASE 1 — Project Setup & Auth
**Assigned Model: Gemini 3.5 (Medium) — General Tasks**
**Antigravity Mode: Planning**

- [x] Initialize React project with Vite
- [x] Install and configure TailwindCSS
- [x] Initialize Supabase project
- [x] Create all database tables using studyforge-schema.md in Supabase SQL editor
- [x] Create Supabase Storage bucket named `materials` with private access
- [x] Implement Supabase Auth email/password signup and login
- [x] Create login page with email and password fields
- [x] Create signup page with email and password fields
- [x] Add protected route wrapper that redirects to login if not authenticated
- [x] Add logout button in navbar
- [x] Verify auth flow works end to end

---

## PHASE 2 — File Upload & Parsing
**Assigned Model: Claude Opus 4.6 — Backend**
**Antigravity Mode: Planning**

- [x] Create Supabase Edge Function named `parse-material`
- [x] Inside `parse-material`, accept a multipart form upload containing the file
- [x] Detect file type from extension: pdf, docx, pptx, txt, jpg, jpeg, png, webp
- [x] For TXT: read raw string directly
- [x] For PDF: use pdf-parse to extract text from all pages
- [x] For DOCX: use mammoth to extract raw text
- [x] For PPTX: use pptx2json to extract text from all slides concatenated
- [x] For images (jpg, jpeg, png, webp): do not extract text. Store the file path only. Mark file_type as "image" in the database. Images will be sent directly to Gemini as base64 at generation time.
- [x] Upload the raw file to Supabase Storage under `materials/{user_id}/{filename}`
- [x] Insert a row into tbl_materials with file_name, file_type, storage_path, and extracted_text
- [x] Return the inserted material row as JSON response
- [x] Create the frontend upload page with drag and drop zone and a file input button as fallback
- [x] Show list of uploaded materials for the current user fetched from tbl_materials
- [x] Add delete button per material that removes from storage and database
- [x] Call the `parse-material` Edge Function on upload and show success or error

---

## PHASE 3 — Notes Generation & Editing
**Assigned Model: Claude Opus 4.6 — Backend | Gemini 3.1 Pro (High) — Frontend**
**Antigravity Mode: Planning**

### Backend (Claude Opus 4.6)
- [x] Create Supabase Edge Function named `generate-notes`
- [x] Accept a list of material_ids in the request body
- [x] Fetch extracted_text for each material_id from tbl_materials
- [x] For materials with file_type "image", fetch the file from Supabase Storage, base64 encode it, and include it as a Gemini multimodal image part alongside the text materials
- [x] Combine all text into one string
- [x] Call Gemini 1.5 Pro API with the notes generation prompt and combined content
- [x] Insert the returned markdown into tbl_notes with the title, content, and material_ids
- [x] Return the inserted note row as JSON response
- [x] Create Supabase Edge Function named `update-note`
- [x] Accept note_id and content in the request body
- [x] Update the note content and updated_at in tbl_notes
- [x] Return the updated note row

### Frontend (Gemini 3.1 Pro High)
- [x] Create notes list page showing all notes for the current user
- [x] Add a Generate Notes button that opens a modal to select which materials to include
- [x] Show checkboxes for each uploaded material the user has
- [x] On confirm, call the `generate-notes` Edge Function with selected material_ids
- [x] Show loading state while generating
- [x] On success, redirect to the note detail page
- [x] Create note detail page that renders the note content using TipTap in editable mode
- [x] On content change in TipTap, debounce 1 second then call `update-note` Edge Function
- [x] Show last saved timestamp

---

## PHASE 4 — Exam Generation
**Assigned Model: Claude Opus 4.6 — Backend | Gemini 3.1 Pro (High) — Frontend**
**Antigravity Mode: Planning**

### Backend (Claude Opus 4.6)
- [x] Create Supabase Edge Function named `generate-exam`
- [x] Accept material_ids, number of questions, and question type percentages (mc, id, tof, mtof, enum) in request body
- [x] Fetch extracted_text for each material_id
- [x] Handle image materials the same way as in generate-notes (base64 multimodal)
- [x] Combine all content
- [x] Call Gemini 1.5 Pro API with the exam generation prompt injecting N and the percentages
- [x] Parse the returned JSON array
- [x] Insert a row into tbl_exams with title, material_ids, and questions as jsonb
- [x] Return the inserted exam row

### Frontend (Gemini 3.1 Pro High)
- [x] Create exams list page showing all exams for the current user
- [x] Add a Generate Exam button that opens a configuration modal with:
  - [x] Material selector with checkboxes
  - [x] Number of questions input
  - [x] Five sliders for question type percentages (MC, ID, TOF, MTOF, ENUM) that always sum to 100
- [x] On confirm, call `generate-exam` Edge Function
- [x] Show loading state while generating
- [x] On success, redirect to exam detail page showing the exam is ready to take
- [x] Create exam detail page showing exam title and a Start Exam button

---

## PHASE 5 — Exam Taking & Results
**Assigned Model: Gemini 3.1 Pro (High) — Frontend | Gemini 3.5 (Medium) — General Tasks**
**Antigravity Mode: Planning**

### Exam Session (Gemini 3.1 Pro High)
- [x] Create exam session page that renders all questions from the exam's questions jsonb
- [x] For multiple_choice: render radio buttons for each choice
- [x] For true_or_false: render two radio buttons (True / False)
- [x] For modified_true_or_false: render four radio buttons (A, B, C, D) with the full choice text
- [x] For identification: render a text input
- [x] For enumeration: render multiple text inputs equal to the number of expected answers
- [x] Track user answers in React state keyed by question id
- [x] Add Submit button at the bottom that is only enabled when all questions are answered

### Scoring (Gemini 3.5 Medium)
- [x] On submit, score each question by comparing user answer to stored answer
- [x] For identification: compare case-insensitive trimmed strings
- [x] For enumeration: compare each item case-insensitive and trimmed, order does not matter
- [x] For all others: compare exact string match
- [x] Calculate score out of total
- [x] Insert a row into tbl_exam_sessions with exam_id, answers as jsonb, score, total, completed_at
- [x] Redirect to results page

### Results Page (Gemini 3.1 Pro High)
- [x] Show total score prominently (e.g. 18 / 25)
- [x] List every question with the question text, user answer, correct answer, correct/incorrect indicator, and Gemini explanation
- [x] Add a Retake button that creates a new session from the same exam questions

---

## PHASE 6 — History & Dashboard
**Assigned Model: Gemini 3.5 (Medium) — General Tasks**
**Antigravity Mode: Fast**

- [x] Create a dashboard home page with three sections: Materials, Notes, Exams
- [x] Each section shows count and a link to the full list page
- [x] Create exam history page showing all completed sessions for the current user from tbl_exam_sessions
- [x] Each session row shows: exam title, score, total, date completed
- [x] Clicking a session row opens the results page for that session (read-only, no retake from here)
- [x] Add navigation sidebar or top nav with links to: Dashboard, Materials, Notes, Exams, History

---

## Post-MVP (Do Not Implement)

- Google OAuth login
- Flashcard mode
- Timed exam mode
- Mobile responsive layout
- Sharing notes or exams with other users
- Folder or tag organization for materials
- AI chat with your notes
- Export notes to PDF