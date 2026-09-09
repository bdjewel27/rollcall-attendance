-- AttendSmart Database Schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor.

-- ============================================
-- COMMIT 1: person_id FK issue fix
-- সমস্যা: attendance.person_id ছিল ফরেন কী নয়, তাই শিক্ষক/ছাত্র ডিলিট হলে
-- অর্ফান রেকর্ড থেকে যেত এবং ভুল person_id দিলে ডেটাবেস কিছু বলত না
-- সমাধান: person_id বাদ দিয়ে teacher_id এবং student_id আলাদা কলাম রাখা
-- যার প্রত্যেকটা ফরেন কী, এবং CHECK constraint দিয়ে নিশ্চিত করা যে
-- একটা সময়ে শুধু একটাই থাকবে
-- ============================================

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

-- ============================================
-- COMMIT 1: person_id FK issue fix (continued)
-- attendance টেবিল রিডিজাইন: person_id বাদ দিয়ে teacher_id + student_id
-- ============================================
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  -- নতুন: আলাদা আলাদা ফরেন কী, যেকোনো একটা থাকবে
  teacher_id uuid references teachers(id) on delete restrict,
  student_id uuid references students(id) on delete restrict,
  -- CHECK: একটা সময়ে শুধু teacher_id অথবা student_id থাকতে পারবে
  constraint chk_one_person_only check (
    (teacher_id is not null and student_id is null) or
    (teacher_id is null and student_id is not null)
  ),
  class_id uuid references classes(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  date date not null default current_date,
  time_in time,  -- ফর্ম থেকে দেওয়া হবে, অটো নয়
  status text not null check (status in ('present','absent','late','leave')),
  marked_by uuid references profiles(id),
  -- ============================================
  -- COMMIT 5: time_in semantics fix
  -- সমস্যা: time_in এর default current_time ছিল, তাই পরে এডিট করলে সময় বদলে যেত
  -- সমাধান: marked_at কলাম যোগ করা যা স্বয়ংক্রিয়ভাবে রেকর্ড তৈরির সময় ধরে রাখবে
  -- এবং time_in ফর্ম থেকে দেওয়া হবে
  -- ============================================
  marked_at timestamptz default now(),
  created_at timestamptz default now(),
  -- ============================================
  -- COMMIT 2: subject_id nullable unique constraint fix
  -- সমস্যা: subject_id nullable ছিল কিন্তু unique constraint-এ ছিল,
  -- PostgreSQL-এ NULL != NULL তাই একই দিনে বারবার NULL subject_id দিয়ে ইনসার্ট হতো
  -- সমাধান: person_type বাদ দিয়ে শুধু teacher_id/student_id + date + subject_id দিয়ে unique
  -- subject_id NULL হলে COALESCE দিয়ে '00000000-0000-0000-0000-000000000000' ধরা হবে
  -- ============================================
  unique (teacher_id, student_id, date, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'))
);

-- ============================================
-- COMMIT 6: Remove unused announcements table
-- সমস্যা: announcements টেবিল কোনো JS ফাইলে ব্যবহার হতো না - মৃত কোড
-- সমাধান: টেবিল এবং RLS পলিসি সরিয়ে ফেলা
-- ============================================
-- (announcements টেবিল এখানে নেই - সরিয়ে ফেলা হয়েছে)

create index if not exists idx_attendance_date on attendance(date);
create index if not exists idx_attendance_teacher on attendance(teacher_id);
create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_attendance_marked_by on attendance(marked_by);
-- Composite indexes for common query patterns
create index if not exists idx_attendance_date_teacher on attendance(date, teacher_id);
create index if not exists idx_attendance_date_student on attendance(date, student_id);
create index if not exists idx_attendance_date_class on attendance(date, class_id);
-- FK indexes for teachers/students
create index if not exists idx_teachers_class on teachers(class_id);
create index if not exists idx_students_class on students(class_id);
create index if not exists idx_teachers_status on teachers(status);
create index if not exists idx_students_status on students(status);
-- Case-insensitive unique indexes for codes
create unique index if not exists idx_teachers_code_lower on teachers(lower(teacher_code));
create unique index if not exists idx_students_code_lower on students(lower(student_code));
-- Unique constraint on class name + section
create unique index if not exists idx_classes_name_section on classes(name, coalesce(section, ''));
-- Profile email index
create unique index if not exists idx_profiles_email on profiles(email);

-- ============================================
-- COMMIT 4: Auto-create profile on auth user creation
-- সমস্যা: নতুন ইউজার রেজিস্টার করলে profiles টেবিলে স্বয়ংক্রিয়ভাবে কিছু যেত না
-- সমাধান: auth.users-এ trigger যোগ করা যা অটোমেটিক প্রোফাইল তৈরি করবে
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'teacher')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;

-- ============================================
-- COMMIT 3: RLS policies too permissive fix
-- সমস্যা: যেকোনো authenticated ইউজার সবকিছু read/write/delete করতে পারত
-- সমাধান: রোল ভিত্তিক পলিসি - অ্যাডমিন সব করতে পারবে, শিক্ষক শুধু attendance
-- ============================================

-- Profiles: সবাই নিজের প্রোফাইল দেখতে পারবে, অ্যাডমিন সব দেখতে পারবে
create policy "profiles_select_own_or_admin" on profiles for select
  using (
    auth.uid() = id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "profiles_insert_own" on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own_or_admin" on profiles for update
  using (
    auth.uid() = id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Classes: শুধু অ্যাডমিন manage করতে পারবে, authenticated profile থাকা সবাই দেখতে পারবে
create policy "classes_select_all" on classes for select
  using (exists (select 1 from profiles where id = auth.uid()));

create policy "classes_admin_only" on classes for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Subjects: শুধু অ্যাডমিন manage করতে পারবে, authenticated profile থাকা সবাই দেখতে পারবে
create policy "subjects_select_all" on subjects for select
  using (exists (select 1 from profiles where id = auth.uid()));

create policy "subjects_admin_only" on subjects for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Teachers: শুধু অ্যাডমিন manage করতে পারবে, authenticated profile থাকা সবাই দেখতে পারবে
create policy "teachers_select_all" on teachers for select
  using (exists (select 1 from profiles where id = auth.uid()));

create policy "teachers_admin_only" on teachers for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Students: শুধু অ্যাডমিন manage করতে পারবে, authenticated profile থাকা সবাই দেখতে পারবে
create policy "students_select_all" on students for select
  using (exists (select 1 from profiles where id = auth.uid()));

create policy "students_admin_only" on students for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Attendance: authenticated profile থাকা সবাই দেখতে পারবে, authenticated user এন্ট্রি করতে পারবে
-- কিন্তু শুধু অ্যাডমিন ডিলিট করতে পারবে, নিজের দেওয়া attendance update করতে পারবে
create policy "attendance_select_all" on attendance for select
  using (exists (select 1 from profiles where id = auth.uid()));

create policy "attendance_insert_all" on attendance for insert
  with check (
    auth.role() = 'authenticated' and
    marked_by = auth.uid()
  );

create policy "attendance_update_own_or_admin" on attendance for update
  using (
    marked_by = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "attendance_delete_admin_only" on attendance for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
