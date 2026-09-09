# AttendSmart Changelog

## Security Fixes (Commits 41-49, 56-57, 61)
- **C1** (41): Moved Supabase credentials to gitignored `config.js`
- **C2** (42): Sanitized search inputs to prevent SQL wildcard abuse
- **C3** (43): Escaped HTML attributes (`data-person`, `img alt`)
- **C4** (44): Fixed auth race condition — `currentUserRole` defaults to `null`
- **C5** (45): Added `.catch()` to unhandled promise rejections
- **C6** (46): Validated `localStorage` search results, clear after read
- **C7** (47): RLS — enforced `marked_by = auth.uid()` on attendance insert
- **C8** (48): Data integrity — changed attendance FK from `set null` to `restrict`
- **C9** (49): Removed admin role from registration, default to teacher
- **C56**: Only delete own attendance records during save
- **C57**: Strengthened RLS — require valid profile instead of just `authenticated`
- **C61**: Verify profile exists before allowing login

## Performance Fixes (Commits 50-54)
- **C50**: Added pagination to students and teachers tables (25/page)
- **C51**: Destroy old Chart.js instances before creating new ones
- **C52**: Parallelized dashboard loading with `Promise.all`
- **C53**: Added 200 row limit to report queries with user warning
- **C54**: Clear classes cache on add/edit/delete

## Database Improvements (Commit 55)
- Added composite indexes: `(date, teacher_id)`, `(date, student_id)`, `(date, class_id)`
- Added case-insensitive unique indexes for teacher/student codes
- Added unique constraint on `(name, section)` for classes
- Added profile email index

## Code Quality (Commits 58, 60, 62)
- **C58**: Deduplicated `debounce` to `ui.js`, guarded search init
- **C60**: Added `config.js` script tag to all HTML pages
- **C62**: Added debug console logs to login flow

## UI Fixes (Commits 39-40)
- **C39**: Fixed dark mode dropdown option text color
- **C40**: Fixed dark mode dropdown option visibility — solid bg + white text

---
Generated: $(date)
