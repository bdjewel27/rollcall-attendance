# AttendSmart — Attendance System

A school attendance system: login/register, admin dashboard, teacher &
student management, class-based roll call, and reports — built with plain
HTML/CSS/JavaScript and Supabase (Auth + Postgres DB).

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run [supabase/schema.sql](supabase/schema.sql)
   to create all tables, indexes, and row-level-security policies.
3. In your Supabase project settings (API section), copy the **Project URL**
   and **anon public key** into [js/supabaseClient.js](js/supabaseClient.js).
4. In Authentication → Providers, make sure **Email** sign-up is enabled.
   For local testing you can turn off "Confirm email" so accounts are
   usable immediately after registering.
5. Open `index.html` in a browser (or serve the folder with any static
   server, e.g. `npx serve .`) and register your first admin account.

## Pages

- `index.html` — Login
- `register.html` — Register (Admin/Teacher)
- `dashboard.html` — Stats, charts, recent attendance
- `teachers.html` — Teacher CRUD, search & filter
- `students.html` — Student CRUD, search & filter
- `classes.html` — Class/section management
- `attendance.html` — Take roll call per class, mark Present/Absent/Late,
  view attendance history
- `reports.html` — Date-range/class filtered reports, trend chart, CSV export

## Structure

- `css/style.css` — shared styles, fully responsive (sidebar collapses to a
  slide-in drawer on mobile)
- `js/supabaseClient.js` — Supabase connection config
- `js/ui.js` — shared sidebar/topbar shell, auth guard, toast helper
- `js/*.js` — one script per page

## Notes

- All CRUD operations go straight to Supabase from the browser using the
  anon key; RLS policies in `schema.sql` restrict access to authenticated
  users. Tighten the policies further (e.g. teachers only editing their own
  class) before using this in production.
- Attendance rows are unique per `(person_type, person_id, date, subject_id)`,
  so re-saving the same day updates the existing record instead of
  duplicating it.
