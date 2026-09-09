# AttendSmart — Attendance System

A school attendance system: login/register, admin dashboard, teacher &
student management, class-based roll call, and reports — built with React,
Vite, and Supabase (Auth + Postgres DB).

## Features

- **Authentication** — Login/Register with Admin/Teacher roles
- **Dashboard** — Stats, charts, and recent attendance
- **Teacher Management** — Add/Edit/Delete teacher records
- **Student Management** — Add/Edit/Delete student records
- **Attendance** — Mark attendance per class and date
- **Reports** — Date-range filtered reports and exports
- **Search** — Global search across students and teachers
- **Responsive** — Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend:** React 19, React Router, Vite
- **Backend:** Supabase (Auth + PostgreSQL)
- **Charts:** Chart.js

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/attendsmart.git
cd rollcall-attendance
npm install
```

### 2. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the schema in SQL Editor:
   ```sql
   -- Copy contents of supabase/schema.sql
   ```
3. Copy your **Project URL** and **anon public key** from Project Settings → API
4. Configure them in `src/lib/supabaseClient.js`:
   ```javascript
   const SUPABASE_URL = "https://your-project.supabase.co"
   const SUPABASE_ANON_KEY = "your-anon-key"
   ```

### 3. Auth Settings

- Authentication → Providers → Enable **Email**
- Turn off "Confirm email" for testing (optional)

### 4. Run Locally

```bash
npm run dev
```

## Pages

| Route | Description |
|------|-------------|
| `/login` | Login page |
| `/register` | Register page |
| `/` | Dashboard |
| `/teachers` | Teacher management |
| `/students` | Student management |
| `/classes` | Class management |
| `/attendance` | Attendance roll call |
| `/reports` | Reports and exports |
| `/search` | Global search results |

## File Structure

```
├── src/
│   ├── components/        # Shared React layout and auth components
│   ├── context/           # Authentication context
│   ├── lib/               # Supabase client and utilities
│   ├── pages/             # React route pages
│   ├── App.jsx            # Application routes
│   └── main.jsx           # React entry point
├── supabase/
│   └── schema.sql         # Database schema & RLS policies
├── index.html             # Vite HTML entry
├── package.json            # React/Vite scripts and dependencies
└── vite.config.js          # Vite configuration
```

## Security

- **RLS Policies** — Row Level Security enabled on all tables
- **Role-based Access** — Admin can manage all, Teacher can only mark attendance
- **Server-side Verification** — Role re-verified on every admin action
- **Input Validation** — Gmail only, BD phone 11 digits
- **FK Constraints** — Proper foreign key relationships

## Database Schema

```
profiles    → extends auth.users (role: admin/teacher)
classes     → name, section, academic_year
teachers    → code, name, email, phone, class_id, status
students    → code, name, roll_no, email, phone, class_id, status
attendance  → teacher_id/student_id, class_id, date, status, time_in
```

## Build

```bash
npm run build
```

The production output is generated in `dist/`.

## License

MIT License — free to use and modify.

## Credits

Built with React, Vite, and Supabase.
