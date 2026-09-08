(async function () {
  const content = renderShell("attendance.html", "Attendance", "Take & review attendance");
  const auth = await requireAuth();
  if (!auth) return;

  let classes = [];
  let people = [];
  let existing = {}; // person_id -> status
  const today = new Date().toISOString().slice(0, 10);

  content.innerHTML = `
    <div class="panel" style="margin-bottom:18px">
      <h3>Take Roll Call</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Class</label>
          <select id="classSel"><option value="">Select a class</option></select>
        </div>
        <div class="form-group">
          <label>Person Type</label>
          <select id="typeSel">
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="dateSel" value="${today}" />
        </div>
        <div class="form-group">
          <label>Quick Actions</label>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" id="markAllPresent">All Present</button>
            <button class="btn btn-outline btn-sm" id="markAllAbsent">All Absent</button>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Code</th><th style="width:320px">Status</th></tr></thead>
          <tbody id="rollBody"><tr><td colspan="3" class="empty-state">Select a class to begin.</td></tr></tbody>
        </table>
      </div>
      <div style="margin-top:18px;text-align:right">
        <button class="btn btn-primary" id="saveBtn">Save Attendance</button>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <h3>Attendance History</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Class</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
          <tbody id="historyBody"><tr><td colspan="6" class="empty-state">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  await loadClasses();
  await loadHistory();

  document.getElementById("classSel").onchange = loadRoll;
  document.getElementById("typeSel").onchange = loadRoll;
  document.getElementById("dateSel").onchange = loadRoll;
  document.getElementById("markAllPresent").onclick = () => setAll("present");
  document.getElementById("markAllAbsent").onclick = () => setAll("absent");
  document.getElementById("saveBtn").onclick = saveAttendance;

  async function loadClasses() {
    const { data } = await supabase.from("classes").select("*").order("name");
    classes = data || [];
    document.getElementById("classSel").innerHTML =
      `<option value="">Select a class</option>` +
      classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.section ? " - " + escapeHtml(c.section) : ""}</option>`).join("");
  }

  async function loadRoll() {
    const classId = document.getElementById("classSel").value;
    const type = document.getElementById("typeSel").value;
    const date = document.getElementById("dateSel").value;
    const tbody = document.getElementById("rollBody");

    if (!classId) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Select a class to begin.</td></tr>`;
      return;
    }

    const table = type === "teacher" ? "teachers" : "students";
    const { data } = await supabase.from(table).select("*").eq("class_id", classId).eq("status", "active").order("full_name");
    people = data || [];

    const { data: att } = await supabase
      .from("attendance")
      .select("person_id, status")
      .eq("date", date)
      .eq("person_type", type)
      .in("person_id", people.map((p) => p.id).length ? people.map((p) => p.id) : ["00000000-0000-0000-0000-000000000000"]);

    existing = {};
    (att || []).forEach((a) => (existing[a.person_id] = a.status));

    if (people.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No ${type}s in this class.</td></tr>`;
      return;
    }

    tbody.innerHTML = people
      .map(
        (p) => `
      <tr data-person="${p.id}">
        <td><div class="person">
          <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name)}" />
          ${escapeHtml(p.full_name)}
        </div></td>
        <td>${escapeHtml(p.teacher_code || p.student_code || "-")}</td>
        <td>
          <div style="display:flex;gap:6px" class="status-group" data-person="${p.id}">
            ${["present", "absent", "late"]
              .map(
                (s) => `<button type="button" class="btn btn-sm status-btn ${existing[p.id] === s ? "btn-primary" : "btn-outline"}" data-status="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`
              )
              .join("")}
          </div>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".status-btn").forEach((btn) => {
      btn.onclick = () => {
        const group = btn.closest(".status-group");
        const pid = group.dataset.person;
        existing[pid] = btn.dataset.status;
        group.querySelectorAll(".status-btn").forEach((b) => b.className = "btn btn-sm status-btn btn-outline");
        btn.className = "btn btn-sm status-btn btn-primary";
      };
    });
  }

  function setAll(status) {
    document.querySelectorAll(".status-group").forEach((group) => {
      const pid = group.dataset.person;
      existing[pid] = status;
      group.querySelectorAll(".status-btn").forEach((b) => {
        b.className = "btn btn-sm status-btn " + (b.dataset.status === status ? "btn-primary" : "btn-outline");
      });
    });
  }

  async function saveAttendance() {
    const classId = document.getElementById("classSel").value;
    const type = document.getElementById("typeSel").value;
    const date = document.getElementById("dateSel").value;

    if (!classId || people.length === 0) return toast("Select a class first", "error");

    const rows = people
      .filter((p) => existing[p.id])
      .map((p) => ({
        person_type: type,
        person_id: p.id,
        class_id: classId,
        date,
        status: existing[p.id],
        marked_by: auth.user.id,
      }));

    if (rows.length === 0) return toast("Mark at least one status", "error");

    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "person_type,person_id,date,subject_id" });
    if (error) return toast(error.message, "error");
    toast(`Attendance saved for ${rows.length} ${type}(s)`);
    loadHistory();
  }

  async function loadHistory() {
    const tbody = document.getElementById("historyBody");
    const { data, error } = await supabase
      .from("attendance")
      .select("id, status, time_in, date, person_type, person_id, class_id")
      .order("created_at", { ascending: false })
      .limit(15);

    if (error || !data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance history yet.</td></tr>`;
      return;
    }

    const rows = await Promise.all(
      data.map(async (r) => {
        const table = r.person_type === "teacher" ? "teachers" : "students";
        const { data: person } = await supabase.from(table).select("full_name").eq("id", r.person_id).single();
        let className = "-";
        if (r.class_id) {
          const cls = classes.find((c) => c.id === r.class_id);
          if (cls) className = `${cls.name}${cls.section ? " - " + cls.section : ""}`;
        }
        return { ...r, person, className };
      })
    );

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.person?.full_name || "Unknown")}</td>
        <td>${r.person_type === "teacher" ? "Teacher" : "Student"}</td>
        <td>${escapeHtml(r.className)}</td>
        <td>${r.date}</td>
        <td>${r.time_in ? r.time_in.slice(0, 5) : "-"}</td>
        <td><span class="badge ${r.status}">${r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
      </tr>`
      )
      .join("");
  }
})();
