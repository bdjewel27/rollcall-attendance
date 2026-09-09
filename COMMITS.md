9e4f6d2 COMMIT 62: Debug - add console logs to login flow
a9b6a6f COMMIT 61: Security - verify profile exists before allowing login
093e415 COMMIT 60: Deploy - add config.js script tag to all HTML pages
4ee7095 COMMIT 59: Deploy - include config.js for GitHub Pages
b61ae02 COMMIT 58: Code quality - deduplicate debounce to ui.js, guard search init
5ab5fd5 COMMIT 57: Security - strengthen RLS: require valid profile instead of just authenticated
c1e2f7d COMMIT 56: Security - only delete own attendance records during save
b6720ab COMMIT 55: Database - add composite indexes, case-insensitive codes, class uniqueness
febfc37 COMMIT 54: Performance - clear classes cache on add/edit/delete
e2183df COMMIT 53: Performance - add 200 row limit to report queries with user warning
d275dcb COMMIT 52: Performance - parallelize dashboard data loading with Promise.all
83b8c25 COMMIT 51: Performance - destroy old Chart instances before creating new ones
4f97fac COMMIT 50: Performance - add pagination to students and teachers tables
64b3a8a COMMIT 49: Security - remove admin role from registration, default to teacher
362abae COMMIT 48: Data integrity - change attendance FK from set null to restrict
09ef597 COMMIT 47: Security - RLS: enforce marked_by = auth.uid() on attendance insert
4fe1261 COMMIT 46: Security - validate localStorage search results, clear after read
3e996eb COMMIT 45: Reliability - add .catch() to unhandled promise rejections
ea0de07 COMMIT 44: Security - fix auth race condition, default role null until resolved
5155619 COMMIT 43: Security - escape HTML attributes in data-person and img alt
59bdd47 COMMIT 42: Security - sanitize search inputs to prevent SQL wildcard abuse
1066e6c COMMIT 41: Security - move Supabase credentials to gitignored config.js
0b8712f COMMIT 40: Fix dark mode dropdown option visibility - solid bg + white text
0fdd5b5 COMMIT 39: Fix dark mode dropdown option text color in attendance
278feb3 COMMIT 37: Update README and clean up for GitHub release
98076ee COMMIT 36: Security hardening - server-side role verification
7c5df7f COMMIT 35: Improve UI/UX - loading states, error handling, mobile responsiveness
65f789c COMMIT 34: Enhance reports with detailed breakdown and improved exports
3088787 COMMIT 33: Add status filter to reports and improve filter labels
f3ff667 COMMIT 32: Add marked_by tracking for attendance records
