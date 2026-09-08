(async function () {
  const content = renderShell("dashboard.html", "Dashboard", "Welcome back!");
  const auth = await requireAuth();
  if (!auth) return;

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="top">
          <div class="stat-icon" style="background:var(--blue)">👨‍🏫</div>
          <div><div class="label">Total Teachers</div><div class="value" id="statTeachers">-</div></div>
        </div>
        <div class="delta up" id="deltaTeachers"></div>
      </div>
      <div class="stat-card">
        <div class="top">
          <div class="stat-icon" style="background:var(--green)">🎓</div>
          <div><div class="label">Total Students</div><div class="value" id="statStudents">-</div></div>
        </div>
        <div class="delta up" id="deltaStudents"></div>
      </div>
      <div class="stat-card">
        <div class="top">
          <div class="stat-icon" style="background:var(--purple)">✅</div>
          <div><div class="label">Today Present</div><div class="value" id="statPresent">-</div></div>
        </div>
        <div class="delta up" id="deltaPresent"></div>
      </div>
      <div class="stat-card">
        <div class="top">
          <div class="stat-icon" style="background:var(--red)">❌</div>
          <div><div class="label">Today Absent</div><div class="value" id="statAbsent">-</div></div>
        </div>
        <div class="delta down" id="deltaAbsent"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Attendance Overview <span>(Last 7 days)</span></h3>
        <div id="chartEmpty" class="empty-state" style="display:none">No attendance data yet.</div>
        <canvas id="weekChart" height="110"></canvas>
      </div>
      <div class="panel">
        <h3>Attendance Summary <span>(This Month)</span></h3>
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
          <canvas id="donutChart" width="160" height="160" style="max-width:160px"></canvas>
          <div style="flex:1;min-width:140px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="width:10px;height:10px;border-radius:50%;background:var(--green);display:inline-block"></span> Present <strong id="sumPresent" style="margin-left:auto"></strong></div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="width:10px;height:10px;border-radius:50%;background:var(--red);display:inline-block"></span> Absent <strong id="sumAbsent"></strong></div>
            <div style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:var(--orange);display:inline-block"></span> Late <strong id="sumLate"></strong></div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>Recent Attendance</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>ID</th><th>Role</th><th>Class</th><th>Time</th><th>Status</th></tr></thead>
          <tbody id="recentBody"><tr><td colspan="6" class="empty-state">Loading...</td></tr></tbody>
        </table>
      </div>
      <a href="attendance.html" class="view-all">View All Attendance →</a>
    </div>
  `;

  await loadStats();
  await loadRecent();
  await loadWeekChart();
  await loadDonut();

  async function loadStats() {
    const { count: teacherCount } = await supabase.from("teachers").select("*", { count: "exact", head: true });
    const { count: studentCount } = await supabase.from("students").select("*", { count: "exact", head: true });
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayRows } = await supabase.from("attendance").select("status").eq("date", today);

    document.getElementById("statTeachers").textContent = teacherCount ?? 0;
    document.getElementById("statStudents").textContent = studentCount ?? 0;

    const present = (todayRows || []).filter((r) => r.status === "present" || r.status === "late").length;
    const absent = (todayRows || []).filter((r) => r.status === "absent").length;
    document.getElementById("statPresent").textContent = present;
    document.getElementById("statAbsent").textContent = absent;
    const total = present + absent || 1;
    document.getElementById("deltaPresent").textContent = `${Math.round((present / total) * 100)}% of total`;
    document.getElementById("deltaAbsent").textContent = `${Math.round((absent / total) * 100)}% of total`;
    document.getElementById("deltaTeachers").textContent = "Active";
    document.getElementById("deltaStudents").textContent = "Active";
  }

  async function loadRecent() {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, status, time_in, person_type, person_id, date")
      .order("created_at", { ascending: false })
      .limit(6);

    const tbody = document.getElementById("recentBody");
    if (error || !data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance records yet.</td></tr>`;
      return;
    }

    const rows = await Promise.all(
      data.map(async (r) => {
        const table = r.person_type === "teacher" ? "teachers" : "students";
        const codeCol = r.person_type === "teacher" ? "teacher_code" : "student_code";
        const { data: person } = await supabase.from(table).select(`full_name, ${codeCol}, class_id`).eq("id", r.person_id).single();
        let className = "-";
        if (person?.class_id) {
          const { data: cls } = await supabase.from("classes").select("name, section").eq("id", person.class_id).single();
          if (cls) className = `${cls.name}${cls.section ? " - " + cls.section : ""}`;
        }
        return { ...r, person, className };
      })
    );

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td><div class="person">
          <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.person?.full_name || "?")}" />
          ${escapeHtml(r.person?.full_name || "Unknown")}
        </div></td>
        <td>${escapeHtml(r.person?.teacher_code || r.person?.student_code || "-")}</td>
        <td>${r.person_type === "teacher" ? "Teacher" : "Student"}</td>
        <td>${escapeHtml(r.className)}</td>
        <td>${r.time_in ? r.time_in.slice(0, 5) : "-"}</td>
        <td><span class="badge ${r.status}">${r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
      </tr>`
      )
      .join("");
  }

  async function loadWeekChart() {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const { data } = await supabase.from("attendance").select("date, status").in("date", days);

    if (!data || data.length === 0) {
      document.getElementById("chartEmpty").style.display = "block";
      document.getElementById("weekChart").style.display = "none";
      return;
    }

    const present = days.map((d) => (data.filter((r) => r.date === d && (r.status === "present" || r.status === "late")).length));
    const absent = days.map((d) => (data.filter((r) => r.date === d && r.status === "absent").length));
    const late = days.map((d) => (data.filter((r) => r.date === d && r.status === "late").length));

    new Chart(document.getElementById("weekChart"), {
      type: "line",
      data: {
        labels: days.map((d) => new Date(d).toLocaleDateString("en-US", { weekday: "short" })),
        datasets: [
          { label: "Present", data: present, borderColor: "#16a34a", backgroundColor: "#16a34a", tension: 0.35 },
          { label: "Absent", data: absent, borderColor: "#ef4444", backgroundColor: "#ef4444", tension: 0.35 },
          { label: "Late", data: late, borderColor: "#f59e0b", backgroundColor: "#f59e0b", tension: 0.35 },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    });
  }

  async function loadDonut() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const { data } = await supabase.from("attendance").select("status").gte("date", monthStart);

    const present = (data || []).filter((r) => r.status === "present").length;
    const absent = (data || []).filter((r) => r.status === "absent").length;
    const late = (data || []).filter((r) => r.status === "late").length;
    const total = present + absent + late || 1;

    document.getElementById("sumPresent").textContent = `${present} (${Math.round((present / total) * 100)}%)`;
    document.getElementById("sumAbsent").textContent = `${absent} (${Math.round((absent / total) * 100)}%)`;
    document.getElementById("sumLate").textContent = `${late} (${Math.round((late / total) * 100)}%)`;

    new Chart(document.getElementById("donutChart"), {
      type: "doughnut",
      data: {
        labels: ["Present", "Absent", "Late"],
        datasets: [{ data: [present, absent, late], backgroundColor: ["#16a34a", "#ef4444", "#f59e0b"], borderWidth: 0 }],
      },
      options: { cutout: "72%", plugins: { legend: { display: false } } },
    });
  }
})();
