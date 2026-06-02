# StudyForge — Row Level Security & Storage Policies

## Run these in the Supabase SQL Editor

### 1. Enable RLS on tbl_materials

```sql
ALTER TABLE tbl_materials ENABLE ROW LEVEL SECURITY;

-- Users can read their own materials
CREATE POLICY "Users can read own materials"
  ON tbl_materials FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own materials
CREATE POLICY "Users can insert own materials"
  ON tbl_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own materials
CREATE POLICY "Users can delete own materials"
  ON tbl_materials FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own materials
CREATE POLICY "Users can update own materials"
  ON tbl_materials FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2. Enable RLS on other tables (for future phases)

```sql
ALTER TABLE tbl_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes"
  ON tbl_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes"
  ON tbl_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes"
  ON tbl_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes"
  ON tbl_notes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE tbl_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own exams"
  ON tbl_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams"
  ON tbl_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exams"
  ON tbl_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exams"
  ON tbl_exams FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE tbl_exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON tbl_exam_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions"
  ON tbl_exam_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3. Storage Policies for the `materials` bucket

Go to **Storage → materials → Policies** in the Supabase Dashboard and add these policies:

**SELECT (download) policy:**
- Policy name: `Users can download own materials`
- Target roles: `authenticated`
- Policy expression: `(bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1])`

**INSERT (upload) policy:**
- Policy name: `Users can upload own materials`
- Target roles: `authenticated`
- Policy expression: `(bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1])`

**DELETE policy:**
- Policy name: `Users can delete own materials`
- Target roles: `authenticated`
- Policy expression: `(bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1])`

> **Note:** The Edge Function uses the `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, so the upload/insert from the Edge Function will always work. These policies are for the frontend client-side operations (like delete from storage).
