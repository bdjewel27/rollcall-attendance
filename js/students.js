(async function () {
  const content = renderShell("students.html", "Students", "Manage student records");
  const auth = await requireAuth();
  if (!auth) return;

  let classes = [];
  let editingId = null;

  content.innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="searchInput" placeholder="Search by name or code..." />
        <select id="classFilter"><option value="">All Classes</option></select>
        <select id="statusFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <button class="btn btn-primary" id="addBtn">+ Add Student</button>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Code</th><th>Roll No</th><th>Class</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="tbody"><tr><td colspan="7" class="empty-state">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  buildModal();
  await loadClasses();
  await loadStudents();

  document.getElementById("addBtn").onclick = () => openModal();
  document.getElementById("searchInput").oninput = debounce(loadStudents, 300);
  document.getElementById("classFilter").onchange = loadStudents;
  document.getElementById("statusFilter").onchange = loadStudents;

  async function loadClasses() {
    const { data } = await supabase.from("classes").select("*").order("name");
    classes = data || [];
    const sel = document.getElementById("classFilter");
    sel.innerHTML = `<option value="">All Classes</option>` + classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.section ? " - " + escapeHtml(c.section) : ""}</option>`).join("");
  }

  async function loadStudents() {
    const tbody = document.getElementById("tbody");
    const search = document.getElementById("searchInput").value.trim();
    const classId = document.getElementById("classFilter").value;
    const status = document.getElementById("statusFilter").value;

    let query = supabase.from("students").select("*").order("created_at", { ascending: false });
    if (search) query = query.or(`full_name.ilike.%${search}%,student_code.ilike.%${search}%`);
    if (classId) query = query.eq("class_id", classId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No students found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data
      .map((s) => {
        const cls = classes.find((c) => c.id === s.class_id);
        return `
        <tr>
          <td><div class="person">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.full_name)}" />
            ${escapeHtml(s.full_name)}
          </div></td>
          <td>${escapeHtml(s.student_code)}</td>
          <td>${escapeHtml(s.roll_no || "-")}</td>
          <td>${cls ? escapeHtml(cls.name) + (cls.section ? " - " + escapeHtml(cls.section) : "") : "-"}</td>
          <td>${escapeHtml(s.phone || "-")}</td>
          <td><span class="badge ${s.status === "active" ? "present" : "absent"}">${s.status}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" data-edit="${s.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${s.id}">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openModal(data.find((s) => s.id === b.dataset.edit))));
    tbody.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => deleteStudent(b.dataset.del)));
  }

  async function deleteStudent(id) {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Student deleted");
    loadStudents();
  }

  function buildModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "studentModal";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3 id="modalTitle">Add Student</h3>
          <button class="modal-close" id="modalClose">&times;</button>
        </div>
        <form id="studentForm">
          <div class="form-group"><label>Full Name</label><input type="text" id="f_name" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Student Code</label><input type="text" id="f_code" required /></div>
            <div class="form-group"><label>Roll No</label><input type="text" id="f_roll" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Class</label><select id="f_class"><option value="">— None —</option></select></div>
            <div class="form-group"><label>Status</label>
              <select id="f_status"><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Email</label><input type="email" id="f_email" /></div>
            <div class="form-group"><label>Phone</label><input type="text" id="f_phone" /></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Save Student</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("modalClose").onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    document.getElementById("studentForm").onsubmit = saveStudent;
  }

  function openModal(student) {
    editingId = student?.id || null;
    document.getElementById("modalTitle").textContent = student ? "Edit Student" : "Add Student";
    document.getElementById("f_name").value = student?.full_name || "";
    document.getElementById("f_code").value = student?.student_code || "";
    document.getElementById("f_roll").value = student?.roll_no || "";
    document.getElementById("f_email").value = student?.email || "";
    document.getElementById("f_phone").value = student?.phone || "";
    document.getElementById("f_status").value = student?.status || "active";
    const classSel = document.getElementById("f_class");
    classSel.innerHTML = `<option value="">— None —</option>` + classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.section ? " - " + escapeHtml(c.section) : ""}</option>`).join("");
    classSel.value = student?.class_id || "";
    document.getElementById("studentModal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("studentModal").classList.remove("open");
  }

  async function saveStudent(e) {
    e.preventDefault();
    const payload = {
      full_name: document.getElementById("f_name").value.trim(),
      student_code: document.getElementById("f_code").value.trim(),
      roll_no: document.getElementById("f_roll").value.trim() || null,
      email: document.getElementById("f_email").value.trim() || null,
      phone: document.getElementById("f_phone").value.trim() || null,
      status: document.getElementById("f_status").value,
      class_id: document.getElementById("f_class").value || null,
    };

    const { error } = editingId
      ? await supabase.from("students").update(payload).eq("id", editingId)
      : await supabase.from("students").insert([payload]);

    if (error) return toast(error.message, "error");
    toast(editingId ? "Student updated" : "Student added");
    closeModal();
    loadStudents();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
})();
