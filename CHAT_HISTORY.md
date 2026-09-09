# AttendSmart Chat History

Exported: 2026-09-10

## Conversation

### 2026-09-10 - Project readiness

User shared the local AttendSmart project at:

`C:\Users\SUNDARBAN IT\OneDrive\Desktop\rollcall-attendance`

The project contains a plain HTML/CSS/JavaScript attendance system backed by Supabase.

### Project review

The review confirmed that JavaScript syntax checks pass. The main findings were:

- Attendance records may be duplicated when saved again because the unique key includes nullable `subject_id`.
- Profile creation during registration can fail when Supabase email confirmation is enabled.
- The public registration form allows anyone to select the `admin` role.
- Authenticated users currently have broad CRUD access under the RLS policies.
- Attendance reload does not filter by `class_id`.
- UTC date formatting can show the wrong local day.
- Search input is interpolated directly into Supabase filter expressions.
- Dashboard and reports use many per-record requests and may slow down with larger datasets.

### Language preference

User requested that the findings be explained in Bangla.

### GitHub repository

The local repository is connected to:

https://github.com/bdjewel27/rollcall-attendance

The active branch is `main`.

### Git identity correction

User reported that the displayed name was `mashureAmag` and requested that the repository use the GitHub username `bdjewel27` for future commits.

The local repository Git identity is configured as:

- Name: `bdjewel27`
- Email: `bdjewel27@users.noreply.github.com`

### React rebuild and deployment

User requested that the project use React instead of raw JavaScript.

- Restored the React 19 + Vite frontend under `src/`.
- Removed the legacy page-level `js/` source and stale compiled `static/` files.
- Added a Vite source entry at `src/index.html`.
- Configured Vite to build from the React source and output to `dist/`.
- Added a GitHub Actions workflow to build and deploy the React app to GitHub Pages.
- Verified the production build succeeds.

The live application is available at:

https://bdjewel27.github.io/rollcall-attendance/

The latest React deployment fix was committed as:

https://github.com/bdjewel27/rollcall-attendance/commit/e82cd05

### Chat log export

User requested that this chat log be pushed to GitHub. This file is maintained as the project conversation history.
