# RollCall — Attendance System

A single-page school attendance app: admin/teacher login, student & teacher
management, taking attendance per class, a live dashboard, and reports.

## Files

- `index.html` — page shell: loads React, ReactDOM, Babel-standalone (for
  in-browser JSX) and Chart.js, then mounts `app.jsx` into `#root`
- `styles.css` — layout, color tokens, light/dark theme
- `app.jsx` — React components: login, sidebar/topbar, all six views,
  db-backed state via the `useCollection` hook, chart rendering

## Data

Each collection (`teachers`, `classes`, `students`, `attendance_sessions`,
`announcements`) is subscribed with `useCollection`, which wraps
`window.claude.use('db')` and re-renders on every snapshot — including
right after login, since it's plain React state rather than a manual
DOM update. Outside a published Claude Artifact `db` resolves to `null`
and reads/writes are skipped; see `App()` in `app.jsx`.

## Demo credentials

- Admin PIN: `2026`
- Teacher PIN: set per teacher when added (default `1234`)
