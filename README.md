# RollCall — Attendance System

A single-page school attendance app: admin/teacher login, student & teacher
management, taking attendance per class, a live dashboard, and reports.

## Files

- `index.html` — page structure (login screen + app shell, all six views)
- `styles.css` — layout, color tokens, light/dark theme
- `app.js` — state, login, navigation, CRUD, attendance flow, chart rendering

## Data

Reads and writes go through `window.claude.use('db')`, a realtime document
store provided when this page runs as a published Claude Artifact. Outside
that environment `db` resolves to `null` and the app falls back to
in-memory state for the current tab only — see `initDb()` in `app.js`.

## Demo credentials

- Admin PIN: `2026`
- Teacher PIN: set per teacher when added (default `1234`)
