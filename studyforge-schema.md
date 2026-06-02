---
trigger: always_on
---

# StudyForge — Database Schema
## Run in Supabase SQL Editor

-- tbl_users is handled by Supabase Auth. No custom table needed.

create table tbl_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  file_name text,
  file_type text,
  storage_path text,
  extracted_text text,
  created_at timestamptz default now()
);

create table tbl_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text,
  content text,
  material_ids uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tbl_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text,
  material_ids uuid[],
  questions jsonb,
  created_at timestamptz default now()
);

create table tbl_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  exam_id uuid references tbl_exams,
  answers jsonb,
  score integer,
  total integer,
  completed_at timestamptz
);