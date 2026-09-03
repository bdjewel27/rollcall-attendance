const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ==========================================================================
   Small helpers (pure functions, no DOM/React dependency)
   ========================================================================== */
const todayISO = () => new Date(2026, 8, 3).toISOString().slice(0, 10);

function initials(name) {
  return String(name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function colorFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 62% 46%)`;
}
function classMatchKey(cls, section) {
  return (cls.trim() + '|' + section.trim()).toLowerCase().replace(/\s+/g, ' ');
}
function byRollThenName(a, b) {
  const ra = Number(a.roll), rb = Number(b.roll);
  if (!Number.isNaN(ra) && !Number.isNaN(rb) && ra !== rb) return ra - rb;
  return a.name.localeCompare(b.name);
}

/* ==========================================================================
   Data hook — subscribes to one db collection, empty array when db is null.
   Rendering follows React state, so there's no "loaded but not shown"
   gap: whatever the snapshot delivers re-renders immediately, login
   included, with no extra wiring needed.
   ========================================================================== */
function useCollection(db, name, sortFn) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!db) { setItems([]); return; }
    const unsub = db.collection(name).onSnapshot(
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(sortFn ? [...docs].sort(sortFn) : docs);
      },
      err => console.error(`${name} sync error:`, err),
    );
    return unsub;
  }, [db, name]);
  return items;
}

/* ==========================================================================
   Toasts
   ========================================================================== */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback(msg => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);
  return [toasts, push];
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => <div className="toast" key={t.id}>{t.msg}</div>)}
    </div>
  );
}

/* ==========================================================================
   Icons — small inline SVGs reused across the sidebar and cards
   ========================================================================== */
const Icon = {
  brand: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>,
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  attendance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>,
  teachers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>,
  students: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>,
  announcements: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l18-5-5 18-4-8-9-5Z"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  hat: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5Z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>,
  teacherIcon2: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M15 14.7c2.7.4 4.3 2 4.7 4.3"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="m8 13 3 3 5-6"/></svg>,
  cross: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="m9 10 5 5m0-5-5 5"/></svg>,
  fingerprint: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"/><path d="M6 10v1a6 6 0 0 0 12 0v-1M9 21h6M12 18v3"/></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M9 3v18M4 8h5M4 16h5M15 12h5"/></svg>,
  megaphone: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M11 5.9V4a1 1 0 0 0-1.7-.7L6 6.7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2l3.3 3.4a1 1 0 0 0 1.7-.7v-1.9M18 9a4 4 0 0 1 0 6"/></svg>,
};

/* ==========================================================================
   Login screen
   ========================================================================== */
function LoginScreen({ teachers, onLogin }) {
  const [tab, setTab] = useState('admin');
  const [teacherId, setTeacherId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  function submit(e) {
    e.preventDefault();
    if (tab === 'admin') {
      if (pin === '2026') onLogin({ role: 'admin', name: 'Abdullah', id: 'admin' });
      else setErr('Incorrect admin PIN.');
      return;
    }
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) { setErr('Select a teacher first — ask admin to add one.'); return; }
    if (pin === (teacher.pin || '1234')) onLogin({ role: 'teacher', name: teacher.name, id: teacher.id });
    else setErr('Incorrect teacher PIN.');
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">{Icon.brand}</div>
          <div><div className="login-brand-name">RollCall</div><div className="login-brand-sub">Attendance System</div></div>
        </div>
        <h2>Sign in</h2>
        <p className="sub">Log in to take attendance, manage students and teachers.</p>
        <div className="tab-row">
          <button type="button" className={`tab-btn ${tab === 'admin' ? 'active' : ''}`} onClick={() => { setTab('admin'); setErr(''); }}>Admin</button>
          <button type="button" className={`tab-btn ${tab === 'teacher' ? 'active' : ''}`} onClick={() => { setTab('teacher'); setErr(''); }}>Teacher</button>
        </div>
        {err && <div className="login-err">{err}</div>}
        <form onSubmit={submit}>
          {tab === 'teacher' && (
            <div className="field">
              <label>Teacher</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
                <option value="">{teachers.length ? 'Select a teacher' : 'No teachers added yet'}</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>{tab === 'admin' ? 'Admin PIN' : 'Teacher PIN'}</label>
            <input type="password" inputMode="numeric" autoComplete="off" required placeholder="Enter PIN"
              value={pin} onChange={e => setPin(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Sign In</button>
        </form>
        <div className="login-hint">Demo credentials — Admin PIN <b className="mono">2026</b>. Teacher PIN is set when a teacher is added (default <b className="mono">1234</b>).</div>
        <div className="security-note">⚠ Demo-only security: PINs are stored in plain text and anyone with this page's link can read them. Don't reuse a real password here, and don't use this login as-is for sensitive records.</div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Sidebar & Topbar
   ========================================================================== */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Icon.dashboard, adminOnly: false },
  { id: 'attendance', label: 'Take Attendance', icon: Icon.attendance, adminOnly: false },
  { id: 'teachers', label: 'Teachers', icon: Icon.teachers, adminOnly: true },
  { id: 'students', label: 'Students', icon: Icon.students, adminOnly: true },
  { id: 'reports', label: 'Reports', icon: Icon.reports, adminOnly: false },
  { id: 'announcements', label: 'Announcements', icon: Icon.announcements, adminOnly: false },
];

function Sidebar({ view, setView, isAdmin }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">{Icon.brand}</div>
        <div><div className="brand-name">RollCall</div><div className="brand-sub">Attendance System</div></div>
      </div>
      <nav>
        {NAV_ITEMS.filter(n => !n.adminOnly || isAdmin).map(n => (
          <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
            <span className="left">{n.icon}{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="year-card">
        {Icon.hat}
        <div><div className="l1">Academic Year</div><div className="l2">2025 - 2026</div></div>
      </div>
    </aside>
  );
}

const PAGE_TITLES = { dashboard: 'Dashboard', attendance: 'Take Attendance', teachers: 'Teachers', students: 'Students', reports: 'Reports', announcements: 'Announcements' };

function Topbar({ view, session, announcementsCount, onLogout }) {
  const todayStr = useMemo(() => new Date(2026, 8, 3).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-btn" aria-label="Toggle menu">{Icon.menu}</button>
        <div>
          <h1 className="page-title">{PAGE_TITLES[view] || view}</h1>
          <div className="page-sub">Welcome back, <b>{session.name}</b></div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="pill">{Icon.calendar}<span>{todayStr}</span></div>
        <div className="bell">{Icon.bell}<span className="dot">{announcementsCount}</span></div>
        <div className="profile">
          <div className="avatar">{initials(session.name)}</div>
          <div><div className="name">{session.name}</div><div className="role">{session.role === 'admin' ? 'Administrator' : 'Teacher'}</div></div>
        </div>
        <button className="logout-btn" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

/* ==========================================================================
   Dashboard
   ========================================================================== */
function DashboardCharts({ attendanceSessions }) {
  const lineRef = useRef(null);
  const donutRef = useRef(null);
  const lineChart = useRef(null);
  const donutChart = useRef(null);

  const totals = useMemo(() => {
    const t = { present: 0, absent: 0, late: 0 };
    attendanceSessions.forEach(a => {
      t.present += a.counts?.present || 0;
      t.absent += a.counts?.absent || 0;
      t.late += a.counts?.late || 0;
    });
    return t;
  }, [attendanceSessions]);

  useEffect(() => {
    const isDark = () => {
      const t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const gridColor = isDark() ? '#232c47' : '#e6e9f0';
    const tickColor = isDark() ? '#a6b0cc' : '#5b6478';

    const days = [...Array(7)].map((_, i) => {
      const d = new Date(2026, 8, 3);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const byDay = days.map(d => {
      const sessions = attendanceSessions.filter(a => a.date === d);
      return {
        present: sessions.reduce((n, a) => n + (a.counts?.present || 0), 0),
        absent: sessions.reduce((n, a) => n + (a.counts?.absent || 0), 0),
        late: sessions.reduce((n, a) => n + (a.counts?.late || 0), 0),
      };
    });
    const labels = days.map(d => new Date(d + 'T00:00:00').toLocaleDateString([], { weekday: 'short' }));

    lineChart.current?.destroy();
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Present', data: byDay.map(d => d.present), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.08)', fill: true, tension: .4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#22c55e' },
          { label: 'Absent', data: byDay.map(d => d.absent), borderColor: '#ef4444', tension: .4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#ef4444' },
          { label: 'Late', data: byDay.map(d => d.late), borderColor: '#f59e0b', tension: .4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#f59e0b' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: tickColor }, border: { display: false } },
          x: { grid: { display: false }, ticks: { color: tickColor }, border: { display: false } },
        },
      },
    });

    donutChart.current?.destroy();
    const vals = [totals.present, totals.absent, totals.late];
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: { labels: ['Present', 'Absent', 'Late'], datasets: [{ data: vals.some(v => v > 0) ? vals : [1, 0, 0], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } },
    });

    return () => { lineChart.current?.destroy(); donutChart.current?.destroy(); };
  }, [attendanceSessions, totals]);

  const grand = totals.present + totals.absent + totals.late;
  const overallPct = grand ? Math.round(totals.present / grand * 100) : 0;

  return (
    <div className="grid3">
      <div className="card">
        <div className="card-head">
          <div className="card-title">Attendance Overview <span>Last 7 days</span></div>
          <div className="legend"><span><i style={{ background: 'var(--green)' }}></i>Present</span><span><i style={{ background: 'var(--red)' }}></i>Absent</span><span><i style={{ background: 'var(--amber)' }}></i>Late</span></div>
        </div>
        <div className="chart-wrap"><canvas ref={lineRef}></canvas></div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Attendance Summary <span>Overall</span></div></div>
        <div className="donut-wrap">
          <div className="donut-canvas">
            <canvas ref={donutRef}></canvas>
            <div className="donut-center"><div className="pct">{overallPct}%</div><div className="lbl">Present</div></div>
          </div>
          <div className="donut-legend">
            <div className="dl-row"><span className="dl-left"><i style={{ background: 'var(--green)' }}></i>Present</span><span className="dl-right">{totals.present}</span></div>
            <div className="dl-row"><span className="dl-left"><i style={{ background: 'var(--red)' }}></i>Absent</span><span className="dl-right">{totals.absent}</span></div>
            <div className="dl-row"><span className="dl-left"><i style={{ background: 'var(--amber)' }}></i>Late</span><span className="dl-right">{totals.late}</span></div>
          </div>
        </div>
        <div className="card-foot"><div>Sessions Taken<b>{attendanceSessions.length}</b></div><div>Overall Attendance<b className="accent">{overallPct}%</b></div></div>
      </div>
      <div className="rail">
        <div className="card checkin">
          <div className="ring">{Icon.fingerprint}</div>
          <div className="card-title" style={{ marginBottom: 6 }}>Quick Check-In</div>
          <p>Jump straight to today's attendance sheet</p>
          <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('rollcall:go', { detail: 'attendance' }))}>Take Attendance</button>
        </div>
      </div>
    </div>
  );
}

const CLASS_ICON_COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6'];

function DashboardView({ teachers, students, classes, attendanceSessions }) {
  const todaysSessions = attendanceSessions.filter(a => a.date === todayISO());
  const todayPresent = todaysSessions.reduce((n, a) => n + (a.counts?.present || 0), 0);
  const todayAbsent = todaysSessions.reduce((n, a) => n + (a.counts?.absent || 0), 0);
  const todayMarked = todayPresent + todayAbsent + todaysSessions.reduce((n, a) => n + (a.counts?.late || 0), 0);

  const recentRows = useMemo(() => {
    const rows = [];
    attendanceSessions.slice(0, 8).forEach(a => {
      Object.entries(a.records || {}).forEach(([sid, status]) => {
        const s = students.find(x => x.id === sid);
        if (s) rows.push({ name: s.name, id: s.id, meta: a.class, time: a.time || '', status });
      });
    });
    return rows.slice(0, 10);
  }, [attendanceSessions, students]);

  return (
    <div className="view">
      <section className="stats">
        <div className="stat-card"><div className="stat-icon blue">{Icon.teacherIcon2}</div><div><div className="stat-label">Total Teachers</div><div className="stat-value">{teachers.length}</div><div className="stat-delta up">Active staff</div></div></div>
        <div className="stat-card"><div className="stat-icon green">{Icon.teacherIcon2}</div><div><div className="stat-label">Total Students</div><div className="stat-value">{students.length}</div><div className="stat-delta up">Enrolled</div></div></div>
        <div className="stat-card"><div className="stat-icon violet">{Icon.check}</div><div><div className="stat-label">Today Present</div><div className="stat-value">{todayPresent}</div><div className="stat-delta up">{todayMarked ? Math.round(todayPresent / todayMarked * 100) + '% of marked' : 'No sessions today'}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">{Icon.cross}</div><div><div className="stat-label">Today Absent</div><div className="stat-value">{todayAbsent}</div><div className="stat-delta warn">{todayMarked ? Math.round(todayAbsent / todayMarked * 100) + '% of marked' : 'No sessions today'}</div></div></div>
      </section>

      <DashboardCharts attendanceSessions={attendanceSessions} />

      <section className="grid3">
        <div className="table-card" style={{ gridColumn: '1 / span 2' }}>
          <div className="card-head"><div className="card-title">Recent Attendance</div></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Name</th><th>ID</th><th>Role</th><th>Class / Subject</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                {recentRows.map((s, i) => (
                  <tr key={i}>
                    <td><div className="person"><div className="mini-avatar" style={{ background: colorFor(s.id) }}>{initials(s.name)}</div>{s.name}</div></td>
                    <td className="mono">{s.id.slice(0, 8)}</td><td>Student</td><td>{s.meta}</td><td className="mono">{s.time}</td>
                    <td><span className={`badge ${s.status}`}>{s.status[0].toUpperCase() + s.status.slice(1)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentRows.length === 0 && <div className="empty-state">No attendance taken yet — go to Take Attendance to get started.</div>}
        </div>
        <div className="rail">
          <div className="card">
            <div className="card-head"><div className="card-title">Today's Classes</div></div>
            {classes.length === 0
              ? <div className="empty-state">No classes yet — add students to create one.</div>
              : classes.slice(0, 5).map((c, i) => {
                  const done = todaysSessions.some(a => a.classId === c.id);
                  const count = students.filter(s => s.classId === c.id).length;
                  return (
                    <div className="class-row" key={c.id}>
                      <div className="class-icon" style={{ background: CLASS_ICON_COLORS[i % CLASS_ICON_COLORS.length] }}>{Icon.book}</div>
                      <div><div className="class-name">{c.name} - {c.section}</div><div className="class-meta">{count} students</div></div>
                      <span className={`status-chip ${done ? 'done' : 'upcoming'}`}>{done ? 'Taken' : 'Pending'}</span>
                    </div>
                  );
                })}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   Take Attendance
   ========================================================================== */
function AttendanceView({ db, classes, students, attendanceSessions, session, toast }) {
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState({});

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const roster = useMemo(
    () => students.filter(s => s.classId === classId).sort(byRollThenName),
    [students, classId],
  );

  useEffect(() => {
    const init = {};
    roster.forEach(s => { init[s.id] = 'present'; });
    setMarks(init);
  }, [classId, roster.length]);

  function setMark(sid, mark) { setMarks(m => ({ ...m, [sid]: mark })); }
  function markAllPresent() {
    const all = {};
    roster.forEach(s => { all[s.id] = 'present'; });
    setMarks(all);
  }

  async function save() {
    if (!classId || !roster.length) { toast('Add students to a class first'); return; }
    const cls = classes.find(c => c.id === classId);
    const label = `${cls.name} - ${cls.section}`;
    const records = {};
    roster.forEach(s => { records[s.id] = marks[s.id] || 'present'; });
    const counts = { present: 0, absent: 0, late: 0 };
    Object.values(records).forEach(v => counts[v]++);

    const doc = {
      date, class: label, classId, records, counts,
      takenBy: session.name,
      time: new Date(2026, 8, 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      savedAt: Date.now(),
    };
    const docId = date + '_' + classId;
    try {
      if (db) await db.collection('attendance_sessions').doc(docId).set(doc);
      toast(`Attendance saved for ${label}`);
    } catch (err) {
      console.error('saveAttendance failed:', err);
      toast(`Couldn't save attendance (${err?.code || err?.message || 'unknown error'})`);
    }
  }

  return (
    <div className="view">
      <div className="card">
        <div className="filter-row">
          <div className="field">
            <label>Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}>
              {classes.length === 0 && <option value="">No classes yet</option>}
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
            </select>
          </div>
          <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <button className="btn-ghost" onClick={markAllPresent}>Mark all present</button>
        </div>

        {roster.length === 0
          ? <div className="empty-state">No students in this class yet. Add students first.</div>
          : roster.map((s, i) => (
              <div className="roll-row" key={s.id}>
                <div className="roll-idx">{s.roll ?? '—'}</div>
                <div className="mini-avatar" style={{ background: colorFor(s.id) }}>{initials(s.name)}</div>
                <div><div className="roll-name">{s.name}</div><div className="roll-meta">{s.class} - {s.section}</div></div>
                <div className="seg">
                  <button type="button" className={`p ${marks[s.id] === 'present' ? 'on' : ''}`} onClick={() => setMark(s.id, 'present')}>Present</button>
                  <button type="button" className={`a ${marks[s.id] === 'absent' ? 'on' : ''}`} onClick={() => setMark(s.id, 'absent')}>Absent</button>
                  <button type="button" className={`l ${marks[s.id] === 'late' ? 'on' : ''}`} onClick={() => setMark(s.id, 'late')}>Late</button>
                </div>
              </div>
            ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn-primary small" onClick={save}>Save Attendance</button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Teachers
   ========================================================================== */
function TeachersView({ db, teachers, isAdmin, toast }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  async function addTeacher(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim() || !subject.trim() || !pin.trim()) return;
    try {
      const doc = { name: name.trim(), subject: subject.trim(), pin: pin.trim(), createdAt: Date.now() };
      if (db) await db.collection('teachers').add(doc);
      setName(''); setSubject(''); setPin('');
      toast('Teacher added');
    } catch (e2) {
      console.error('addTeacher failed:', e2);
      setErr(`Couldn't save the teacher (${e2?.code || e2?.message || 'unknown error'}). Try again.`);
    }
  }

  async function removeTeacher(id) {
    try {
      if (db) await db.collection('teachers').doc(id).delete();
      toast('Teacher removed');
    } catch (e2) {
      console.error('removeTeacher failed:', e2);
      toast(`Couldn't remove teacher (${e2?.code || e2?.message || 'unknown error'})`);
    }
  }

  return (
    <div className="view">
      <div className="grid3" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Add Teacher</div></div>
          <form onSubmit={addTeacher}>
            <div className="field"><label>Full name</label><input required placeholder="e.g. Farah Rahman" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field"><label>Subject</label><input required placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} /></div>
            <div className="field"><label>Login PIN</label><input required pattern="[0-9]{4,6}" placeholder="4-6 digit PIN" value={pin} onChange={e => setPin(e.target.value)} /></div>
            {err && <div className="login-err">{err}</div>}
            <button className="btn-primary" type="submit">Add Teacher</button>
          </form>
        </div>
        <div className="table-card">
          <div className="card-head"><div className="card-title">All Teachers</div></div>
          <div className="security-note">⚠ PINs below are stored in plain text and visible to anyone with this page's link.</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Name</th><th>ID</th><th>Subject</th><th>PIN</th><th></th></tr></thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id}>
                    <td><div className="person"><div className="mini-avatar" style={{ background: colorFor(t.id) }}>{initials(t.name)}</div>{t.name}</div></td>
                    <td className="mono">{t.id.slice(0, 8)}</td><td>{t.subject}</td><td className="mono">{t.pin}</td>
                    <td>{isAdmin && <button className="btn-ghost" onClick={() => removeTeacher(t.id)}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {teachers.length === 0 && <div className="empty-state">No teachers yet — add the first one.</div>}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Students
   ========================================================================== */
function StudentsView({ db, students, classes, isAdmin, toast }) {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [err, setErr] = useState('');

  async function findOrCreateClassId(clsName, sectionName) {
    const key = classMatchKey(clsName, sectionName);
    const existing = classes.find(c => classMatchKey(c.name, c.section) === key);
    if (existing) return existing.id;
    const doc = { name: clsName.trim(), section: sectionName.trim(), createdAt: Date.now() };
    const ref = await db.collection('classes').add(doc);
    return ref.id;
  }

  async function addStudent(e) {
    e.preventDefault();
    setErr('');
    const n = name.trim(), r = roll.trim(), c = cls.trim(), sec = section.trim();
    if (!n || !r || !c || !sec) return;

    const existingClass = classes.find(x => classMatchKey(x.name, x.section) === classMatchKey(c, sec));
    const rosterSoFar = existingClass ? students.filter(s => s.classId === existingClass.id) : [];
    if (rosterSoFar.some(s => String(s.roll) === r)) {
      setErr(`Roll ${r} is already used in ${c} - ${sec}.`);
      return;
    }

    try {
      const classId = await findOrCreateClassId(c, sec);
      const doc = { name: n, roll: r, class: c, section: sec, classId, createdAt: Date.now() };
      if (db) await db.collection('students').add(doc);
      setName(''); setRoll(''); setCls(''); setSection('');
      toast('Student added');
    } catch (e2) {
      console.error('addStudent failed:', e2);
      setErr(`Couldn't save the student (${e2?.code || e2?.message || 'unknown error'}). Try again.`);
    }
  }

  async function purgeStudentFromAttendance(studentId) {
    const snap = await db.collection('attendance_sessions').get();
    for (const doc of snap.docs) {
      const a = doc.data();
      if (!a.records || !(studentId in a.records)) continue;
      const records = { ...a.records };
      delete records[studentId];
      const counts = { present: 0, absent: 0, late: 0 };
      Object.values(records).forEach(v => counts[v]++);
      if (Object.keys(records).length > 0) {
        await db.collection('attendance_sessions').doc(doc.id).set({ ...a, records, counts });
      } else {
        await db.collection('attendance_sessions').doc(doc.id).delete();
      }
    }
  }

  async function removeStudent(id) {
    try {
      if (db) { await purgeStudentFromAttendance(id); await db.collection('students').doc(id).delete(); }
      toast('Student removed');
    } catch (e2) {
      console.error('removeStudent failed:', e2);
      toast(`Couldn't remove student (${e2?.code || e2?.message || 'unknown error'})`);
    }
  }

  const sorted = useMemo(() => [...students].sort(byRollThenName), [students]);

  return (
    <div className="view">
      <div className="grid3" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Add Student</div></div>
          <form onSubmit={addStudent}>
            <div className="field"><label>Full name</label><input required placeholder="e.g. Nadia Karim" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field"><label>Roll</label><input required type="number" min="1" step="1" placeholder="e.g. 12" value={roll} onChange={e => setRoll(e.target.value)} /></div>
            <div className="field"><label>Class</label><input required placeholder="e.g. Class 10" value={cls} onChange={e => setCls(e.target.value)} /></div>
            <div className="field"><label>Section</label><input required placeholder="e.g. A" value={section} onChange={e => setSection(e.target.value)} /></div>
            {err && <div className="login-err">{err}</div>}
            <button className="btn-primary" type="submit">Add Student</button>
          </form>
        </div>
        <div className="table-card">
          <div className="card-head"><div className="card-title">All Students</div></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Roll</th><th>Name</th><th>ID</th><th>Class</th><th>Section</th><th></th></tr></thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.id}>
                    <td className="mono">{s.roll ?? '—'}</td>
                    <td><div className="person"><div className="mini-avatar" style={{ background: colorFor(s.id) }}>{initials(s.name)}</div>{s.name}</div></td>
                    <td className="mono">{s.id.slice(0, 8)}</td><td>{s.class}</td><td>{s.section}</td>
                    <td>{isAdmin && <button className="btn-ghost" onClick={() => removeStudent(s.id)}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {students.length === 0 && <div className="empty-state">No students yet — add the first one.</div>}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Reports
   ========================================================================== */
function ReportsView({ attendanceSessions }) {
  return (
    <div className="view">
      <div className="table-card">
        <div className="card-head"><div className="card-title">Attendance Sessions</div></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Taken by</th></tr></thead>
            <tbody>
              {attendanceSessions.map(a => (
                <tr key={a.id}>
                  <td className="mono">{a.date}</td><td>{a.class}</td>
                  <td><span className="badge present">{a.counts?.present || 0}</span></td>
                  <td><span className="badge absent">{a.counts?.absent || 0}</span></td>
                  <td><span className="badge late">{a.counts?.late || 0}</span></td>
                  <td>{a.takenBy || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {attendanceSessions.length === 0 && <div className="empty-state">No sessions recorded yet.</div>}
      </div>
    </div>
  );
}

/* ==========================================================================
   Announcements
   ========================================================================== */
function AnnouncementsView({ db, announcements, session, toast }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  async function post(e) {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    try {
      const doc = { title: title.trim(), desc: desc.trim(), createdAt: Date.now(), by: session.name };
      if (db) await db.collection('announcements').add(doc);
      setTitle(''); setDesc('');
      toast('Announcement posted');
    } catch (err) {
      console.error('addAnnouncement failed:', err);
      toast(`Couldn't post announcement (${err?.code || err?.message || 'unknown error'})`);
    }
  }

  return (
    <div className="view">
      <div className="grid3" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Post Announcement</div></div>
          <form onSubmit={post}>
            <div className="field"><label>Title</label><input required placeholder="e.g. Staff Meeting" value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div className="field"><label>Details</label><input required placeholder="Short description" value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <button className="btn-primary" type="submit">Post</button>
          </form>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">All Announcements</div></div>
          {announcements.map(a => (
            <div className="ann-row" key={a.id}>
              <div className="ann-icon" style={{ background: '#2563eb' }}>{Icon.megaphone}</div>
              <div><div className="ann-title">{a.title}<span className="new-dot"></span></div><div className="ann-desc">{a.desc}</div><div className="ann-time">by {a.by || 'Admin'}</div></div>
            </div>
          ))}
          {announcements.length === 0 && <div className="empty-state">No announcements yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   App shell (logged-in state)
   ========================================================================== */
function AppShell({ db, dbStatus, session, onLogout, teachers, classes, students, attendanceSessions, announcements, toast }) {
  const [view, setView] = useState('dashboard');
  const isAdmin = session.role === 'admin';

  useEffect(() => {
    const goTo = e => setView(e.detail);
    window.addEventListener('rollcall:go', goTo);
    return () => window.removeEventListener('rollcall:go', goTo);
  }, []);

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} isAdmin={isAdmin} />
      <div className="main">
        <Topbar view={view} session={session} announcementsCount={announcements.length} onLogout={onLogout} />
        <div className="content">
          {view === 'dashboard' && <DashboardView teachers={teachers} students={students} classes={classes} attendanceSessions={attendanceSessions} />}
          {view === 'attendance' && <AttendanceView db={db} classes={classes} students={students} attendanceSessions={attendanceSessions} session={session} toast={toast} />}
          {view === 'teachers' && isAdmin && <TeachersView db={db} teachers={teachers} isAdmin={isAdmin} toast={toast} />}
          {view === 'students' && isAdmin && <StudentsView db={db} students={students} classes={classes} isAdmin={isAdmin} toast={toast} />}
          {view === 'reports' && <ReportsView attendanceSessions={attendanceSessions} />}
          {view === 'announcements' && <AnnouncementsView db={db} announcements={announcements} session={session} toast={toast} />}
        </div>
        <footer>
          <span>© 2026 RollCall. All rights reserved.</span>
          <span><span className="mono">{dbStatus}</span><span style={{ marginLeft: 16 }}>Version 2.0.0 (React)</span></span>
        </footer>
      </div>
    </div>
  );
}

/* ==========================================================================
   Root
   ========================================================================== */
function App() {
  const [db, setDb] = useState(null);
  const [dbStatus, setDbStatus] = useState('connecting…');
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rollcall_session') || 'null'); } catch { return null; }
  });
  const [toasts, toast] = useToasts();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('db') : null;
      if (cancelled) return;
      setDb(d);
      setDbStatus(d ? 'synced' : 'offline (local only)');
    })();
    return () => { cancelled = true; };
  }, []);

  const teachers = useCollection(db, 'teachers');
  const classes = useCollection(db, 'classes');
  const students = useCollection(db, 'students');
  const attendanceSessions = useCollection(db, 'attendance_sessions', (a, b) => (b.date + b.class).localeCompare(a.date + a.class));
  const announcements = useCollection(db, 'announcements', (a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  function login(newSession) {
    localStorage.setItem('rollcall_session', JSON.stringify(newSession));
    setSession(newSession);
  }
  function logout() {
    localStorage.removeItem('rollcall_session');
    setSession(null);
  }

  return (
    <>
      {session
        ? <AppShell db={db} dbStatus={dbStatus} session={session} onLogout={logout}
            teachers={teachers} classes={classes} students={students}
            attendanceSessions={attendanceSessions} announcements={announcements} toast={toast} />
        : <LoginScreen teachers={teachers} onLogin={login} />}
      <ToastStack toasts={toasts} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
