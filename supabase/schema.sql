-- AttendSmart Database Schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor.

-- Profiles: extends auth.users with role info
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'admin' check (role in ('admin','teacher')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Classes (e.g. "Class 10 - A")
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text,
  academic_year text default '2024-2025',
  created_at timestamptz default now()
);

-- Subjects
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  class_id uuid references classes(id) on delete set null,
  created_at timestamptz default now()
);

-- Teachers
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  teacher_code text unique not null,
  full_name text not null,
  email text,
  phone text,
  subject_id uuid references subjects(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  photo_url text,
  status text default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now()
);

-- Students
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique not null,
  full_name text not null,
  email text,
  phone text,
  class_id uuid references classes(id) on delete set null,
  roll_no text,
  photo_url text,
  status text default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now()
);

-- Attendance records
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  person_type text not null check (person_type in ('teacher','student')),
  person_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  date date not null default current_date,
  time_in time default current_time,
  status text not null check (status in ('present','absent','late')),
  marked_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (person_type, person_id, date, subject_id)
);

-- Announcements
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_attendance_date on attendance(date);
create index if not exists idx_attendance_person on attendance(person_type, person_id);

-- Row Level Security
alter table profiles enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;
alter table announcements enable row level security;

-- Simple policy: any authenticated user can read/write (tighten later per-role)
create policy "auth read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "auth insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "auth update own profile" on profiles for update using (auth.uid() = id);

create policy "auth all classes" on classes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all subjects" on subjects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all teachers" on teachers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all students" on students for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all attendance" on attendance for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all announcements" on announcements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
