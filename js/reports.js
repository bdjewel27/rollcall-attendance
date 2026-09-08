(async function () {
  const content = renderShell("reports.html", "Reports", "Attendance analytics & exports");
  const auth = await requireAuth();
  if (!auth) return;

  let classes = [];
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  content.innerHTML = `
    <div class="panel" style="margin-bottom:18px">
      <div class="form-row">
        <div class="form-group"><label>From</label><input type="date" id="fromDate" value="${monthAgo}" /></div>
        <div class="form-group"><label>To</label><input type="date" id="toDate" value="${today}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select id="classSel"><option value="">All Classes</option></select></div>
        <div class="form-group"><label>Person Type</label>
          <select id="typeSel"><option value="">All</option><option value="student">Students</option><option value="teacher">Teachers</option></select>
        </div>
      </div>
      <button class="btn btn-primary" id="runBtn">Generate Report</button>
      <button class="btn btn-outline" id="exportBtn">Export CSV</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Records</div><div class="value" id="rTotal">-</div></div>
      <div class="stat-card"><div class="label">Present</div><div class="value" id="rPresent" style="color:var(--green)">-</div></div>
      <div class="stat-card"><div class="label">Absent</div><div class="value" id="rAbsent" style="color:var(--red)">-</div></div>
      <div class="stat-card"><div class="label">Attendance Rate</div><div class="value" id="rRate">-</div></div>
    </div>

    <div class="panel" style="margin-bottom:18px">
      <h3>Trend</h3>
      <canvas id="trendChart" height="90"></canvas>
    </div>

    <div class="panel">
      <h3>Detailed Records</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Class</th><th>Date</th><th>Status</th></tr></thead>
          <tbody id="reportBody"><tr><td colspan="5" class="empty-state">Run a report to see records.</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  let chart;
  let lastRows = [];

  await loadClasses();
  document.getElementById("runBtn").onclick = runReport;
  document.getElementById("exportBtn").onclick = exportCsv;
  await runReport();

  async function loadClasses() {
    const { data } = await supabase.from("classes").select("*").order("name");
    classes = data || [];
    document.getElementById("classSel").innerHTML =
      `<option value="">All Classes</option>` + classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.section ? " - " + escapeHtml(c.section) : ""}</option>`).join("");
  }

  async function runReport() {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    const classId = document.getElementById("classSel").value;
    const type = document.getElementById("typeSel").value;

    let query = supabase.from("attendance").select("*").gte("date", from).lte("date", to).order("date", { ascending: true });
    if (classId) query = query.eq("class_id", classId);
    if (type) query = query.eq("person_type", type);

    const { data, error } = await query;
    const tbody = document.getElementById("reportBody");

    if (error || !data) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Failed to load report.</td></tr>`;
      return;
    }

    const rows = await Promise.all(
      data.map(async (r) => {
        const table = r.person_type === "teacher" ? "teachers" : "students";
        const { data: person } = await supabase.from(table).select("full_name").eq("id", r.person_id).single();
        const cls = classes.find((c) => c.id === r.class_id);
        return { ...r, personName: person?.full_name || "Unknown", className: cls ? `${cls.name}${cls.section ? " - " + cls.section : ""}` : "-" };
      })
    );
    lastRows = rows;

    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    const late = rows.filter((r) => r.status === "late").length;
    document.getElementById("rTotal").textContent = total;
    document.getElementById("rPresent").textContent = present;
    document.getElementById("rAbsent").textContent = absent;
    document.getElementById("rRate").textContent = total ? Math.round(((present + late) / total) * 100) + "%" : "-";

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No records for this filter.</td></tr>`;
    } else {
      tbody.innerHTML = rows
        .slice(-50)
        .reverse()
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.personName)}</td>
          <td>${r.person_type === "teacher" ? "Teacher" : "Student"}</td>
          <td>${escapeHtml(r.className)}</td>
          <td>${r.date}</td>
          <td><span class="badge ${r.status}">${r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
        </tr>`
        )
        .join("");
    }

    renderTrend(rows);
  }

  function renderTrend(rows) {
    const byDate = {};
    rows.forEach((r) => {
      byDate[r.date] = byDate[r.date] || { present: 0, absent: 0, late: 0 };
      byDate[r.date][r.status]++;
    });
    const dates = Object.keys(byDate).sort();

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("trendChart"), {
      type: "bar",
      data: {
        labels: dates,
        datasets: [
          { label: "Present", data: dates.map((d) => byDate[d].present), backgroundColor: "#16a34a" },
          { label: "Absent", data: dates.map((d) => byDate[d].absent), backgroundColor: "#ef4444" },
          { label: "Late", data: dates.map((d) => byDate[d].late), backgroundColor: "#f59e0b" },
        ],
      },
      options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: "bottom" } } },
    });
  }

  function exportCsv() {
    if (lastRows.length === 0) return toast("Nothing to export", "error");
    const header = ["Name", "Role", "Class", "Date", "Status"];
    const csvRows = lastRows.map((r) => [r.personName, r.person_type, r.className, r.date, r.status]);
    const csv = [header, ...csvRows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
})();
