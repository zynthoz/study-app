# IndexAI (StudyForge) 🚀

IndexAI (previously StudyForge) is a premium, AI-powered study companion and academic workspace designed to streamline notes, material ingestion, exams, and flashcards. Underpinned by a dark, high-end "Void" theme with subtle glows, glassmorphism, and smooth transitions, IndexAI blends robust educational utilities with modern visual aesthetics.

---

## 🌟 Key Features

### 📂 1. Unified Workspace & Document Explorer
*   **Subject Navigation**: Organize materials into customized academic courses/subjects.
*   **Document Ingestion**: Seamlessly drag-and-drop or upload course files (PDFs, lectures, transcripts, notes) up to 10MB.
*   **Hierarchical Folders**: Structure your resources using interactive directory trees and tag filtering.

### 📝 2. Academic Rich-Text Note Editor
*   **Full WYSIWYG Suite**: Write and format notes using headings, lists, blockquotes, code blocks, undo/redo logs, and basic font styling.
*   **Academic Statistics**: Real-time monospace tracking of words, character counts, and calculated estimated read times.
*   **Robust Sync & Autosave**: Automatic background cloud syncing with a visual "Saved at..." timestamp status.

### 💬 3. Page-Integrated AI Study Assistant
*   **Context-Aware Chat**: Embedded side-by-side study panel powered by the **Gemini 3.1 Flash Lite API**. The assistant reads the note context in real time.
*   **Comprehensive Study Modes**: Prompt the assistant to explain complex concepts, summarize files, generate quizzes, or find key takeaways.
*   **Interactive Chat Sticky Panel**: Stays pinned beside you as you scroll through your documents on desktop viewports.

### 📑 4. Export to PDF
*   **Print-Ready Compilation**: Compile and export your generated study notes into clean, academic-styled PDFs using custom `@media print` rules.

### 👥 5. Real-Time Document Sharing
*   **Collaborative Access**: Instantly share specific study notes with fellow classmates by entering their email address.
*   **Granular Permission Controls**: Revoke access from individual users dynamically at any time.

### 🧠 6. AI Flashcard Generator & 3D Study Player
*   **Custom Deck Builder**: Select materials and select a target deck size (5 to 30 cards) to auto-generate decks.
*   **3D CSS Flip Player**: Highly immersive visual interface utilizing native 3D perspective flips for reviews.
*   **Keyboard Hotkeys**: Flip cards using `Space`, mark as master/known with `Right Arrow` (`k`), and mark for revision with `Left Arrow` (`p`).
*   **Mastery Recap Analytics**: Post-session stats card showing known-vs-practice ratios, total reviews, and visual accuracy percentage bars.

### ✍️ 7. AI Exam Builder & Session Tracker
*   **Exam Generation**: Generate customized diagnostic exams (up to 30 questions) directly from your course files.
*   **Interactive Sessions**: Real-time testing interface with active session timers and automated saving of incomplete sessions.
*   **Results Analytics**: Thorough breakdowns showcasing correct answers, student choices, detailed rationale, and score distributions.
*   **Historical Archive**: A persistent `History` tab containing past exam results and study records.

---

## 🛠️ Technology Stack

*   **Frontend Library**: React 19 + TypeScript + Vite
*   **Styling Engine**: Tailwind CSS (Tailwind v4) + CSS Custom Variables
*   **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth Services)
*   **Serverless Layer**: Supabase Edge Functions (Deno Runtime)
*   **Artificial Intelligence**: Google Gemini API (`gemini-3.1-flash-lite`)
*   **Icons & Visual Elements**: Lucide React

---

## 🔒 Security & Reliability

*   **Row-Level Security (RLS)**: PostgreSQL policies guard user-owned folders, documents, exams, and flashcards, guaranteeing that shared items are checked before serving.
*   **Database-Backed Rate Limiting**: The custom fixed-window rate limiter controls edge endpoint usage (e.g., chat, parser, generation calls) to avoid API token leaks and prevent billing abuses.
*   **Payload Validation**: Strictly enforces maximum file boundaries (10MB limits) and validates schema types during upload and generation pipelines.

---

## 🚀 Local Setup & Development

### Prerequisites
*   Node.js (v18+)
*   Supabase CLI (for local migrations and edge functions)

### Steps
1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd study-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables Configuration**:
    Create a `.env` file in the root folder with the following variables:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the local development server**:
    ```bash
    npm run dev
    ```

5.  **Compile production bundle**:
    ```bash
    npm run build
    ```

### Supabase Edge Functions
If you modify functions inside the `supabase/functions/` directory:
*   **Test local functions**:
    ```bash
    supabase functions serve
    ```
*   **Deploy changes**:
    ```bash
    supabase functions deploy <function-name> --project-ref <your-project-ref>
    ```
