/* ==========================================================================
   RollCall — application state & bootstrapping
   ========================================================================== */
let db = null;
let session = null; // {role:'admin'|'teacher', name, id}
let teachers = [], students = [], classes = [], attendanceSessions = [], announcements = [];

const CLASS_ICONS = ['#2563eb', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6'];
const todayISO = () => new Date(2026, 8, 3).toISOString().slice(0, 10);

/* ==========================================================================
   Login
   ========================================================================== */
function setLoginTab(tab) {
  document.getElementById('tabAdmin').classList.toggle('active', tab === 'admin');
  document.getElementById('tabTeacher').classList.toggle('active', tab === 'teacher');
  document.getElementById('teacherPickWrap').hidden = tab !== 'teacher';
  document.getElementById('pinLabel').textContent = tab === 'admin' ? 'Admin PIN' : 'Teacher PIN';
  document.getElementById('loginForm').dataset.tab = tab;
  document.getElementById('loginErr').hidden = true;
  if (tab === 'teacher') populateTeacherPicker();
}

function populateTeacherPicker() {
  const sel = document.getElementById('teacherPick');
  sel.innerHTML = teachers.length
    ? teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)} — ${escapeHtml(t.subject)}</option>`).join('')
    : `<option value="">No teachers added yet</option>`;
}

function handleLogin(e) {
  e.preventDefault();
  const tab = document.getElementById('loginForm').dataset.tab || 'admin';
  const pin = document.getElementById('pinInput').value.trim();
  const errEl = document.getElementById('loginErr');

  if (tab === 'admin') {
    if (pin === '2026') {
      session = { role: 'admin', name: 'Abdullah', id: 'admin' };
      enterApp();
    } else {
      errEl.textContent = 'Incorrect admin PIN.';
      errEl.hidden = false;
    }
    return false;
  }

  const tid = document.getElementById('teacherPick').value;
  const teacher = teachers.find(t => t.id === tid);
  if (!teacher) {
    errEl.textContent = 'Select a teacher first — ask admin to add one.';
    errEl.hidden = false;
    return false;
  }
  if (pin === (teacher.pin || '1234')) {
    session = { role: 'teacher', name: teacher.name, id: teacher.id };
    enterApp();
  } else {
    errEl.textContent = 'Incorrect teacher PIN.';
    errEl.hidden = false;
  }
  return false;
}

function enterApp() {
  localStorage.setItem('rollcall_session', JSON.stringify(session));
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('appRoot').hidden = false;
  applySessionChrome();
  showView('dashboard');
}

function logout() {
  session = null;
  localStorage.removeItem('rollcall_session');
  document.getElementById('appRoot').hidden = true;
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('pinInput').value = '';
}

function applySessionChrome() {
  const isAdmin = session.role === 'admin';
  document.getElementById('welcomeName').textContent = session.name;
  document.getElementById('profName').textContent = session.name;
  document.getElementById('profRole').textContent = isAdmin ? 'Administrator' : 'Teacher';
  document.getElementById('avatarInit').textContent = initials(session.name);
  document.querySelectorAll('.nav-item[data-view="teachers"], .nav-item[data-view="students"]').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
}

/* ==========================================================================
   Navigation
   ========================================================================== */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const target = document.getElementById('view-' + name);
  if (target) target.hidden = false;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));

  const titles = {
    dashboard: 'Dashboard', attendance: 'Take Attendance', teachers: 'Teachers',
    students: 'Students', reports: 'Reports', announcements: 'Announcements',
  };
  document.getElementById('pageTitle').textContent = titles[name] || name;

  if (name === 'attendance') renderAttendanceRoll();
}

document.getElementById('navList').addEventListener('click', e => {
  const btn = e.target.closest('.nav-item');
  if (btn) showView(btn.dataset.view);
});

/* ==========================================================================
   Small helpers
   ========================================================================== */
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function initials(name) {
  return String(name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function colorFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 62% 46%)`;
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
/** Sorts students by roll number (numeric when possible), falling back
 * to name so rows without a roll still land somewhere stable. */
function byRollThenName(a, b) {
  const ra = Number(a.roll), rb = Number(b.roll);
  if (!Number.isNaN(ra) && !Number.isNaN(rb) && ra !== rb) return ra - rb;
  return a.name.localeCompare(b.name);
}

/** Loose match key so "Class 10"/"A" and "class 10 "/"a" resolve to the
 * same class instead of silently forking into two rosters — used only to
 * find-or-create a class; every other lookup uses its stable `id`. */
function classMatchKey(cls, section) {
  return (cls.trim() + '|' + section.trim()).toLowerCase().replace(/\s+/g, ' ');
}

/** Returns the id of the class matching (cls, section), creating it in
 * the `classes` collection on first use. Students and attendance
 * sessions reference this id rather than re-deriving identity from text. */
async function findOrCreateClassId(cls, section) {
  const key = classMatchKey(cls, section);
  const existing = classes.find(c => classMatchKey(c.name, c.section) === key);
  if (existing) return existing.id;

  const doc = { name: cls.trim(), section: section.trim(), createdAt: Date.now() };
  if (db) {
    const ref = await db.collection('classes').add(doc);
    classes.push({ id: ref.id, ...doc });
    return ref.id;
  }
  const id = 'local' + Date.now();
  classes.push({ id, ...doc });
  return id;
}

/* ==========================================================================
   Persistence — the `db` capability keeps everyone's data in sync;
   without it the page still works, just local to this tab.
   ========================================================================== */
async function initDb() {
  db = await claude.use('db');
  const statusEl = document.getElementById('dbStatus');

  if (!db) {
    statusEl.textContent = 'offline (local only)';
    renderAll();
    return;
  }
  statusEl.textContent = 'synced';

  db.collection('teachers').onSnapshot(snap => {
    teachers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  }, () => { statusEl.textContent = 'sync error'; });

  db.collection('classes').onSnapshot(snap => {
    classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  }, () => { statusEl.textContent = 'sync error'; });

  db.collection('students').onSnapshot(snap => {
    students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  }, () => { statusEl.textContent = 'sync error'; });

  db.collection('attendance_sessions').onSnapshot(snap => {
    attendanceSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date + b.class).localeCompare(a.date + a.class));
    renderAll();
  }, () => { statusEl.textContent = 'sync error'; });

  db.collection('announcements').onSnapshot(snap => {
    announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderAll();
  }, () => { statusEl.textContent = 'sync error'; });
}

/* ==========================================================================
   Teachers
   ========================================================================== */
async function addTeacher(e) {
  e.preventDefault();
  const name = document.getElementById('tchName').value.trim();
  const subject = document.getElementById('tchSubject').value.trim();
  const pin = document.getElementById('tchPin').value.trim();
  if (!name || !subject || !pin) return false;

  const doc = { name, subject, pin, createdAt: Date.now() };
  if (db) await db.collection('teachers').add(doc);
  else { teachers.push({ id: 'local' + Date.now(), ...doc }); renderAll(); }

  e.target.reset();
  toast('Teacher added');
  return false;
}

async function removeTeacher(id) {
  if (db) await db.collection('teachers').doc(id).delete();
  else { teachers = teachers.filter(t => t.id !== id); renderAll(); }
}

/* ==========================================================================
   Students
   ========================================================================== */
async function addStudent(e) {
  e.preventDefault();
  const errEl = document.getElementById('stuErr');
  errEl.hidden = true;

  const name = document.getElementById('stuName').value.trim();
  const roll = document.getElementById('stuRoll').value.trim();
  const cls = document.getElementById('stuClass').value.trim();
  const section = document.getElementById('stuSection').value.trim();
  if (!name || !roll || !cls || !section) return false;

  // Check against an existing class before creating one, so a rejected
  // duplicate never leaves behind a class doc nobody asked for.
  const existingClass = classes.find(c => classMatchKey(c.name, c.section) === classMatchKey(cls, section));
  const rosterSoFar = existingClass ? students.filter(s => s.classId === existingClass.id) : [];
  if (rosterSoFar.some(s => String(s.roll) === roll)) {
    errEl.textContent = `Roll ${roll} is already used in ${cls} - ${section}.`;
    errEl.hidden = false;
    return false;
  }

  const classId = await findOrCreateClassId(cls, section);
  const doc = { name, roll, class: cls, section, classId, createdAt: Date.now() };
  if (db) await db.collection('students').add(doc);
  else { students.push({ id: 'local' + Date.now(), ...doc }); renderAll(); }

  e.target.reset();
  toast('Student added');
  return false;
}

async function removeStudent(id) {
  await purgeStudentFromAttendance(id);
  if (db) await db.collection('students').doc(id).delete();
  else { students = students.filter(s => s.id !== id); renderAll(); }
}

/** Strips a removed student's entry out of every attendance session that
 * recorded them, recomputing that session's counts — otherwise the
 * session keeps an orphaned id and its counts stop matching the roster.
 * A session left with no records after the removal is dropped entirely. */
async function purgeStudentFromAttendance(studentId) {
  const affected = attendanceSessions.filter(a => a.records && studentId in a.records);

  for (const session of affected) {
    const records = { ...session.records };
    delete records[studentId];

    const counts = { present: 0, absent: 0, late: 0 };
    Object.values(records).forEach(v => counts[v]++);

    const stillHasRecords = Object.keys(records).length > 0;

    if (db) {
      const ref = db.collection('attendance_sessions').doc(session.id);
      if (stillHasRecords) {
        // update() merges nested objects rather than replacing them, so a
        // deleted key would silently survive — set() replaces the document.
        const { id: _id, ...rest } = session;
        await ref.set({ ...rest, records, counts });
      } else {
        await ref.delete();
      }
    } else if (stillHasRecords) {
      session.records = records;
      session.counts = counts;
    } else {
      attendanceSessions = attendanceSessions.filter(a => a.id !== session.id);
    }
  }
}

/* ==========================================================================
   Announcements
   ========================================================================== */
async function addAnnouncement(e) {
  e.preventDefault();
  const title = document.getElementById('annTitle').value.trim();
  const desc = document.getElementById('annDesc').value.trim();
  if (!title || !desc) return false;

  const doc = { title, desc, createdAt: Date.now(), by: session.name };
  if (db) await db.collection('announcements').add(doc);
  else { announcements.unshift({ id: 'local' + Date.now(), ...doc }); renderAll(); }

  e.target.reset();
  toast('Announcement posted');
  return false;
}

/* ==========================================================================
   Attendance taking
   ========================================================================== */
let currentMarks = {}; // studentId -> 'present' | 'absent' | 'late'

function classOptions() {
  const set = new Map();
  classes.forEach(c => set.set(c.id, `${c.name} - ${c.section}`));
  return set;
}

function refreshClassSelect() {
  const sel = document.getElementById('attClassSel');
  const opts = classOptions();
  const prev = sel.value;

  sel.innerHTML = opts.size
    ? [...opts.entries()].map(([k, label]) => `<option value="${k}">${escapeHtml(label)}</option>`).join('')
    : `<option value="">No classes yet</option>`;

  if ([...opts.keys()].includes(prev)) sel.value = prev;
  if (!document.getElementById('attDate').value) document.getElementById('attDate').value = todayISO();
}

function renderAttendanceRoll() {
  refreshClassSelect();
  const classId = document.getElementById('attClassSel').value;
  const wrap = document.getElementById('attRollWrap');
  const emptyEl = document.getElementById('attRollEmpty');
  const roster = students.filter(s => s.classId === classId).sort(byRollThenName);

  currentMarks = {};
  if (!roster.length) {
    wrap.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  wrap.innerHTML = roster.map(s => {
    currentMarks[s.id] = 'present';
    return `<div class="roll-row">
      <div class="roll-idx">${escapeHtml(s.roll ?? '—')}</div>
      <div class="mini-avatar" style="background:${colorFor(s.id)}">${initials(s.name)}</div>
      <div><div class="roll-name">${escapeHtml(s.name)}</div><div class="roll-meta">${escapeHtml(s.class)} - ${escapeHtml(s.section)}</div></div>
      <div class="seg" data-sid="${s.id}">
        <button type="button" class="p on" onclick="setMark('${s.id}','present',this)">Present</button>
        <button type="button" class="a" onclick="setMark('${s.id}','absent',this)">Absent</button>
        <button type="button" class="l" onclick="setMark('${s.id}','late',this)">Late</button>
      </div>
    </div>`;
  }).join('');
}

function setMark(sid, mark, btn) {
  currentMarks[sid] = mark;
  const seg = btn.closest('.seg');
  seg.querySelectorAll('button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function markAll(mark) {
  document.querySelectorAll('#attRollWrap .seg').forEach(seg => {
    currentMarks[seg.dataset.sid] = mark;
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.classList.contains(mark[0])));
  });
}

async function saveAttendance() {
  const classId = document.getElementById('attClassSel').value;
  const date = document.getElementById('attDate').value || todayISO();
  if (!classId) { toast('Add students to a class first'); return; }

  const roster = students.filter(s => s.classId === classId);
  if (!roster.length) return;

  const label = `${roster[0].class} - ${roster[0].section}`;
  const records = {};
  roster.forEach(s => { records[s.id] = currentMarks[s.id] || 'present'; });

  const counts = { present: 0, absent: 0, late: 0 };
  Object.values(records).forEach(v => counts[v]++);

  const doc = {
    date, class: label, classId, records, counts,
    takenBy: session.name,
    time: new Date(2026, 8, 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    savedAt: Date.now(),
  };
  const docId = date + '_' + classId;

  if (db) {
    await db.collection('attendance_sessions').doc(docId).set(doc);
  } else {
    attendanceSessions = attendanceSessions.filter(a => a.id !== docId);
    attendanceSessions.unshift({ id: docId, ...doc });
    renderAll();
  }
  toast(`Attendance saved for ${label}`);
}

/* ==========================================================================
   Rendering — dashboard stats, charts and every table on the page
   ========================================================================== */
let lineChart, donutChart;

function renderAll() {
  if (!session) return;

  document.getElementById('statTeachers').textContent = teachers.length;
  document.getElementById('statStudents').textContent = students.length;

  const todaysSessions = attendanceSessions.filter(a => a.date === todayISO());
  const todayPresent = todaysSessions.reduce((n, a) => n + (a.counts?.present || 0), 0);
  const todayAbsent = todaysSessions.reduce((n, a) => n + (a.counts?.absent || 0), 0);
  const todayMarked = todayPresent + todayAbsent + todaysSessions.reduce((n, a) => n + (a.counts?.late || 0), 0);

  document.getElementById('statPresent').textContent = todayPresent;
  document.getElementById('statAbsent').textContent = todayAbsent;
  document.getElementById('statPresentPct').textContent = todayMarked ? Math.round(todayPresent / todayMarked * 100) + '% of marked' : 'No sessions today';
  document.getElementById('statAbsentPct').textContent = todayMarked ? Math.round(todayAbsent / todayMarked * 100) + '% of marked' : 'No sessions today';

  const totals = { present: 0, absent: 0, late: 0 };
  attendanceSessions.forEach(a => {
    totals.present += a.counts?.present || 0;
    totals.absent += a.counts?.absent || 0;
    totals.late += a.counts?.late || 0;
  });
  const grand = totals.present + totals.absent + totals.late;
  const overallPct = grand ? Math.round(totals.present / grand * 100) : 0;

  document.getElementById('sumPresent').textContent = totals.present;
  document.getElementById('sumAbsent').textContent = totals.absent;
  document.getElementById('sumLate').textContent = totals.late;
  document.getElementById('sumSessions').textContent = attendanceSessions.length;
  document.getElementById('sumOverall').textContent = overallPct + '%';
  document.getElementById('donutPct').textContent = overallPct + '%';

  renderCharts(totals);
  renderRecentAttendance();
  renderTodaysClasses();
  renderTeacherTable();
  renderStudentTable();
  renderReports();
  renderAnnouncements();

  if (!document.getElementById('view-attendance').hidden) renderAttendanceRoll();
}

function renderCharts(totals) {
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

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
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

  if (donutChart) donutChart.destroy();
  const vals = [totals.present, totals.absent, totals.late];
  donutChart = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: { labels: ['Present', 'Absent', 'Late'], datasets: [{ data: vals.some(v => v > 0) ? vals : [1, 0, 0], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } },
  });
}

function renderRecentAttendance() {
  const rows = [];
  attendanceSessions.slice(0, 8).forEach(a => {
    Object.entries(a.records || {}).forEach(([sid, status]) => {
      const s = students.find(x => x.id === sid);
      if (s) rows.push({ name: s.name, id: s.id, role: 'Student', meta: a.class, time: a.time || '', status });
    });
  });

  const tbody = document.getElementById('attTbody');
  document.getElementById('attEmpty').hidden = rows.length > 0;
  tbody.innerHTML = rows.slice(0, 10).map(s => `
    <tr><td><div class="person"><div class="mini-avatar" style="background:${colorFor(s.id)}">${initials(s.name)}</div>${escapeHtml(s.name)}</div></td>
    <td class="mono">${s.id.slice(0, 8)}</td><td>${s.role}</td><td>${escapeHtml(s.meta)}</td><td class="mono">${escapeHtml(s.time)}</td>
    <td><span class="badge ${s.status}">${s.status[0].toUpperCase() + s.status.slice(1)}</span></td></tr>`).join('');
}

function renderTodaysClasses() {
  const opts = [...classOptions().entries()];
  const list = document.getElementById('classList');
  if (!opts.length) {
    list.innerHTML = `<div class="empty-state">No classes yet — add students to create one.</div>`;
    return;
  }

  const todaysSessions = attendanceSessions.filter(a => a.date === todayISO());
  list.innerHTML = opts.slice(0, 5).map(([classId, label], i) => {
    const done = todaysSessions.some(a => a.classId === classId);
    return `<div class="class-row">
      <div class="class-icon" style="background:${CLASS_ICONS[i % CLASS_ICONS.length]}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M9 3v18M4 8h5M4 16h5M15 12h5"/></svg></div>
      <div><div class="class-name">${escapeHtml(label)}</div><div class="class-meta">${students.filter(s => s.classId === classId).length} students</div></div>
      <span class="status-chip ${done ? 'done' : 'upcoming'}">${done ? 'Taken' : 'Pending'}</span>
    </div>`;
  }).join('');
}

function renderTeacherTable() {
  const tbody = document.getElementById('teacherTbody');
  document.getElementById('teacherEmpty').hidden = teachers.length > 0;
  tbody.innerHTML = teachers.map(t => `
    <tr><td><div class="person"><div class="mini-avatar" style="background:${colorFor(t.id)}">${initials(t.name)}</div>${escapeHtml(t.name)}</div></td>
    <td class="mono">${t.id.slice(0, 8)}</td><td>${escapeHtml(t.subject)}</td><td class="mono">${escapeHtml(t.pin)}</td>
    <td>${session.role === 'admin' ? `<button class="btn-ghost" onclick="removeTeacher('${t.id}')">Remove</button>` : ''}</td></tr>`).join('');
}

function renderStudentTable() {
  const tbody = document.getElementById('studentTbody');
  document.getElementById('studentEmpty').hidden = students.length > 0;
  const sorted = [...students].sort(byRollThenName);
  tbody.innerHTML = sorted.map(s => `
    <tr><td class="mono">${escapeHtml(s.roll ?? '—')}</td>
    <td><div class="person"><div class="mini-avatar" style="background:${colorFor(s.id)}">${initials(s.name)}</div>${escapeHtml(s.name)}</div></td>
    <td class="mono">${s.id.slice(0, 8)}</td><td>${escapeHtml(s.class)}</td><td>${escapeHtml(s.section)}</td>
    <td>${session.role === 'admin' ? `<button class="btn-ghost" onclick="removeStudent('${s.id}')">Remove</button>` : ''}</td></tr>`).join('');
}

function renderReports() {
  const tbody = document.getElementById('reportTbody');
  document.getElementById('reportEmpty').hidden = attendanceSessions.length > 0;
  tbody.innerHTML = attendanceSessions.map(a => `
    <tr><td class="mono">${a.date}</td><td>${escapeHtml(a.class)}</td>
    <td><span class="badge present">${a.counts?.present || 0}</span></td>
    <td><span class="badge absent">${a.counts?.absent || 0}</span></td>
    <td><span class="badge late">${a.counts?.late || 0}</span></td>
    <td>${escapeHtml(a.takenBy || '')}</td></tr>`).join('');
}

function renderAnnouncements() {
  document.getElementById('annBadge').textContent = announcements.length;
  const row = a => `<div class="ann-row">
    <div class="ann-icon" style="background:#2563eb"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M11 5.9V4a1 1 0 0 0-1.7-.7L6 6.7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2l3.3 3.4a1 1 0 0 0 1.7-.7v-1.9M18 9a4 4 0 0 1 0 6"/></svg></div>
    <div><div class="ann-title">${escapeHtml(a.title)}<span class="new-dot"></span></div><div class="ann-desc">${escapeHtml(a.desc)}</div><div class="ann-time">by ${escapeHtml(a.by || 'Admin')}</div></div></div>`;
  document.getElementById('annListFull').innerHTML = announcements.map(row).join('');
  document.getElementById('annEmpty').hidden = announcements.length > 0;
}

/* ==========================================================================
   Boot
   ========================================================================== */
document.getElementById('todayStr').textContent =
  new Date(2026, 8, 3).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
setLoginTab('admin');

(async () => {
  await initDb();
  try {
    const saved = JSON.parse(localStorage.getItem('rollcall_session') || 'null');
    if (saved) { session = saved; enterApp(); }
  } catch (_) { /* corrupted or missing session — show the login screen */ }
})();
