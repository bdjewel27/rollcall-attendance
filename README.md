# AttendSmart — Attendance System

A school attendance system: login/register, admin dashboard, teacher &
student management, class-based roll call, and reports — built with plain
HTML/CSS/JavaScript and Supabase (Auth + Postgres DB).

## Live Demo

Deployed on Netlify: [https://attendsmart-demo.netlify.app](https://attendsmart-demo.netlify.app)

## Features

- **Authentication** — Login/Register with Admin/Teacher roles
- **Dashboard** — Stats, charts (Present/Absent/Late/Leave), recent attendance
- **Teacher Management** — Add/Edit/Delete with Gmail & BD phone validation
- **Student Management** — Add/Edit/Delete with roll number, class assignment
- **Attendance** — Mark Present/Absent/Late/Leave per class, date-wise view
- **Reports** — Date-range filtered reports with trend chart, CSV & PDF export
- **Search** — Global search across students and teachers
- **Dark Mode** — Toggle between light/dark themes
- **Responsive** — Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Supabase (Auth + PostgreSQL)
- **Charts:** Chart.js
- **PDF Export:** jsPDF + AutoTable
- **Hosting:** Netlify (static site)

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/attendsmart.git
cd attendsmart
```

### 2. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the schema in SQL Editor:
   ```sql
   -- Copy contents of supabase/schema.sql
   ```
3. Copy your **Project URL** and **anon public key** from Project Settings → API
4. Paste them into `js/supabaseClient.js`:
   ```javascript
   const SUPABASE_URL = "https://your-project.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-key";
   ```

### 3. Auth Settings

- Authentication → Providers → Enable **Email**
- Turn off "Confirm email" for testing (optional)

### 4. Run Locally

```bash
# Option 1: Direct open (limited features)
open index.html

# Option 2: Static server (recommended)
npx serve .

# Option 3: Python
python -m http.server 8000
```

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Login page |
| `register.html` | Register (Admin/Teacher) |
| `dashboard.html` | Stats, charts, recent attendance |
| `teachers.html` | Teacher CRUD, search & filter |
| `students.html` | Student CRUD, search & filter |
| `classes.html` | Class/section management |
| `attendance.html` | Take roll call, mark attendance |
| `reports.html` | Filtered reports, export |
| `search-results.html` | Global search results |

## File Structure

```
├── css/
│   └── style.css          # Shared styles, responsive, dark mode
├── js/
│   ├── supabaseClient.js  # Supabase connection
│   ├── ui.js              # Shared shell, auth guard, toast
│   ├── dashboard.js       # Dashboard stats & charts
│   ├── attendance.js      # Roll call & history
│   ├── teachers.js        # Teacher CRUD
│   ├── students.js        # Student CRUD
│   ├── classes.js         # Class management
│   ├── reports.js         # Reports & exports
│   └── chart.min.js       # Chart.js library
├── supabase/
│   └── schema.sql         # Database schema & RLS policies
├── index.html             # Login
├── register.html          # Registration
├── dashboard.html         # Dashboard
├── attendance.html        # Attendance
├── teachers.html          # Teachers
├── students.html          # Students
├── classes.html           # Classes
├── reports.html           # Reports
├── search-results.html    # Search results
└── README.md              # This file
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

## Deployment

### Netlify (Recommended)

1. Push to GitHub
2. Connect repository on [netlify.com](https://netlify.com)
3. Build command: (leave empty)
4. Publish directory: `/`
5. Deploy!

### Vercel

```bash
npm i -g vercel
vercel
```

## Environment Variables

No environment variables needed — all config is in `js/supabaseClient.js`.

For production, consider:
- Moving Supabase credentials to environment variables
- Using a backend proxy for sensitive operations

## License

MIT License — free to use and modify.

## Credits

Built with ❤️ using Supabase and vanilla JavaScript.
